import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await params to fix Next.js error
    const { id: auditId } = await params;

    // Get audit
    const audit = await prisma.audit.findUnique({
      where: {
        id: auditId,
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit not found" },
        { status: 404 }
      );
    }

    // Check if audit can be started
    if (audit.status !== "PLANNED") {
      return NextResponse.json(
        { error: "Only planned audits can be started" },
        { status: 400 }
      );
    }

    // Update audit status to IN_PROGRESS
    await prisma.audit.update({
      where: {
        id: auditId,
      },
      data: {
        status: "IN_PROGRESS",
      },
    });

    // Redirect to audit count page
    return NextResponse.redirect(new URL(`/audits/${auditId}/count`, req.url));
  } catch (error) {
    console.error("Error starting audit:", error);
    return NextResponse.json(
      { error: "Failed to start audit" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== START AUDIT API CALLED ===");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("No session found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await params to fix Next.js error
    const { id: auditId } = await params;
    console.log("Starting audit:", auditId);

    // Get audit with items
    const audit = await prisma.audit.findUnique({
      where: {
        id: auditId,
      },
      include: {
        items: true,
        warehouse: true,
      },
    });

    if (!audit) {
      console.log("Audit not found:", auditId);
      return NextResponse.json(
        { error: "Audit not found" },
        { status: 404 }
      );
    }

    console.log("Audit found:", { id: audit.id, status: audit.status, itemsCount: audit.items.length });

    // Check if audit can be started
    if (audit.status !== "PLANNED") {
      console.log("Audit cannot be started, current status:", audit.status);
      return NextResponse.json(
        { error: "Only planned audits can be started" },
        { status: 400 }
      );
    }

    // If audit has no items, generate them from inventory
    if (audit.items.length === 0) {
      console.log("No audit items found, generating from inventory...");

      try {
        // Get all inventory items for the warehouse
        const inventoryItems = await prisma.inventoryItem.findMany({
          where: {
            warehouseId: audit.warehouseId,
            quantity: {
              gt: 0, // Only items with quantity > 0
            },
          },
          include: {
            product: true,
          },
        });

        console.log("Found inventory items:", inventoryItems.length);

        if (inventoryItems.length === 0) {
          return NextResponse.json(
            { error: "No inventory items found in this warehouse to audit" },
            { status: 400 }
          );
        }

        // Create audit items
        const auditItemsData = inventoryItems.map(item => ({
          auditId: audit.id,
          productId: item.productId,
          inventoryItemId: item.id,
          expectedQuantity: item.quantity,
          status: "PENDING" as const,
        }));

        await prisma.auditItem.createMany({
          data: auditItemsData,
        });

        console.log("Created audit items:", auditItemsData.length);
      } catch (itemError) {
        console.error("Error generating audit items:", itemError);
        return NextResponse.json(
          { error: "Failed to generate audit items from inventory" },
          { status: 500 }
        );
      }
    }

    // Update audit status to IN_PROGRESS
    const updatedAudit = await prisma.audit.update({
      where: {
        id: auditId,
      },
      data: {
        status: "IN_PROGRESS",
      },
      include: {
        warehouse: true,
        items: {
          include: {
            product: true,
            inventoryItem: {
              include: {
                bin: {
                  include: {
                    shelf: {
                      include: {
                        aisle: {
                          include: {
                            zone: true,
                          },
                        },
                      },
                    },
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log("Audit started successfully:", { id: updatedAudit.id, itemsCount: updatedAudit.items.length });

    return NextResponse.json({
      audit: updatedAudit,
      message: "Audit started successfully",
      itemsGenerated: updatedAudit.items.length
    });
  } catch (error) {
    console.error("=== ERROR IN START AUDIT API ===");
    console.error("Error starting audit:", error);

    let errorMessage = "Failed to start audit";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error message:", errorMessage);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}
