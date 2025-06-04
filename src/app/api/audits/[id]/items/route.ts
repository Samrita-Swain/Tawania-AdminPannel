import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditItemStatus } from '@prisma/client';

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

    // Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const zoneId = url.searchParams.get("zone");
    const search = url.searchParams.get("search");

    // Build filters
    const filters: any = {
      auditId,
    };

    if (status) {
      filters.status = status;
    }

    if (search) {
      filters.OR = [
        { product: { name: { contains: search, mode: 'insensitive' } } },
        { product: { sku: { contains: search, mode: 'insensitive' } } },
      ];
    }

    // If zone is specified, filter by bins in that zone
    if (zoneId) {
      // Get all bins in the zone
      const bins = await prisma.warehouseBin.findMany({
        where: {
          shelf: {
            aisle: {
              zoneId,
            },
          },
        },
        select: {
          id: true,
        },
      });

      const binIds = bins.map(bin => bin.id);

      if (binIds.length > 0) {
        filters.inventoryItem = {
          binId: {
            in: binIds,
          },
        };
      }
    }

    // Get audit items
    const items = await prisma.auditItem.findMany({
      where: filters,
      include: {
        product: {
          include: {
            inventoryItems: {
              select: {
                costPrice: true,
              },
              take: 1,
            },
          },
        },
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
      orderBy: [
        {
          product: {
            name: "asc",
          },
        },
      ],
    });

    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching audit items:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit items" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== AUDIT ITEMS UPDATE API CALLED ===");

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
    const data = await req.json();
    const { items } = data;

    console.log("Audit items update request:", { auditId, itemsCount: items?.length, userId: session.user.id });

    if (!items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "No items provided" },
        { status: 400 }
      );
    }

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

    // Check if audit is in progress
    if (audit.status !== "IN_PROGRESS") {
      return NextResponse.json(
        { error: "Audit must be in progress to update items" },
        { status: 400 }
      );
    }

    // Update items
    const updatedItems = await Promise.all(
      items.map(async (item: any) => {
        const { id, actualQuantity, notes } = item;

        // Validate item
        if (!id) {
          throw new Error("Item ID is required");
        }

        if (actualQuantity === undefined || actualQuantity === null) {
          throw new Error("Actual quantity is required");
        }

        if (actualQuantity < 0) {
          throw new Error("Actual quantity cannot be negative");
        }

        // Get expected quantity
        const auditItem = await prisma.auditItem.findUnique({
          where: {
            id,
          },
        });

        if (!auditItem) {
          throw new Error(`Audit item with ID ${id} not found`);
        }

        // Calculate variance
        const variance = actualQuantity - auditItem.expectedQuantity;

        // Determine status using the correct enum values from Prisma
        let status: AuditItemStatus;
        if (variance !== 0) {
          status = AuditItemStatus.DISCREPANCY;
        } else {
          status = AuditItemStatus.COUNTED;
        }

        // Update audit item with correct field names
        return prisma.auditItem.update({
          where: {
            id,
          },
          data: {
            actualQuantity: actualQuantity,
            variance: variance,
            status,
            notes: notes || null,
          },
        });
      })
    );

    // Check if all items have been counted
    const totalItems = await prisma.auditItem.count({
      where: {
        auditId,
      },
    });

    const countedItems = await prisma.auditItem.count({
      where: {
        auditId,
        status: {
          in: ["COUNTED", "DISCREPANCY", "RECONCILED"],
        },
      },
    });

    // If all items have been counted, suggest completing the audit
    const isComplete = totalItems === countedItems;

    console.log("Audit items update successful:", { updatedCount: updatedItems.length, isComplete });

    return NextResponse.json({
      items: updatedItems,
      isComplete,
      message: "Audit items updated successfully"
    });
  } catch (error) {
    console.error("=== ERROR IN AUDIT ITEMS UPDATE API ===");
    console.error("Error updating audit items:", error);

    let errorMessage = "Failed to update audit items";
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



