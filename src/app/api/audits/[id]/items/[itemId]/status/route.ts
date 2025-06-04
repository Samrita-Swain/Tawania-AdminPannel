import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { AuditItemStatus } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string; itemId: string }> }
) {
  try {
    console.log("=== UPDATE AUDIT ITEM STATUS API CALLED ===");

    // Check if audit model exists
    if (!('audit' in prisma)) {
      console.log("Audit model not available");
      return NextResponse.json(
        { error: "Audit functionality not available" },
        { status: 503 }
      );
    }

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("No session found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: auditId, itemId } = await params;
    const { status, notes, actualQuantity } = await req.json();

    console.log("Updating audit item status:", {
      auditId,
      itemId,
      status,
      notes,
      actualQuantity,
      userId: session.user.id
    });

    // Validate status only if provided
    const validStatuses: AuditItemStatus[] = ["PENDING", "COUNTED", "DISCREPANCY", "RECONCILED"];
    if (status && !validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status. Must be one of: " + validStatuses.join(", ") },
        { status: 400 }
      );
    }

    // Check if audit exists and is accessible
    // @ts-ignore - Dynamically access the model
    const audit = await prisma.audit.findUnique({
      where: { id: auditId },
      include: {
        items: {
          where: { id: itemId },
          include: {
            product: true,
          },
        },
      },
    });

    if (!audit) {
      console.log("Audit not found:", auditId);
      return NextResponse.json(
        { error: "Audit not found" },
        { status: 404 }
      );
    }

    const auditItem = audit.items[0];
    if (!auditItem) {
      console.log("Audit item not found:", itemId);
      return NextResponse.json(
        { error: "Audit item not found" },
        { status: 404 }
      );
    }

    console.log("Audit item found:", auditItem.product.name);

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
    };

    // Add notes if provided
    if (notes) {
      updateData.notes = notes;
    }

    // Handle actual quantity and variance calculation
    if (actualQuantity !== undefined && actualQuantity !== null) {
      updateData.countedQuantity = actualQuantity;

      // Calculate discrepancy (actual - expected)
      const discrepancy = actualQuantity - auditItem.expectedQuantity;
      updateData.discrepancy = discrepancy;

      // Auto-determine status based on discrepancy
      if (discrepancy === 0) {
        updateData.status = "COUNTED";
      } else {
        updateData.status = "DISCREPANCY";
      }

      console.log("Auto-calculated discrepancy:", {
        expected: auditItem.expectedQuantity,
        actual: actualQuantity,
        discrepancy: discrepancy,
        autoStatus: updateData.status
      });
    } else {
      // If no actual quantity provided, use the provided status
      updateData.status = status as AuditItemStatus;
    }

    // If status is being set to COUNTED, DISCREPANCY, or RECONCILED, record who counted it
    if (["COUNTED", "DISCREPANCY", "RECONCILED"].includes(updateData.status)) {
      updateData.countedById = session.user.id;
      updateData.countedAt = new Date();
    }

    // Update audit item status
    // @ts-ignore - Dynamically access the model
    const updatedAuditItem = await prisma.auditItem.update({
      where: { id: itemId },
      data: updateData,
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
    });

    console.log("Audit item status updated successfully:", {
      productName: updatedAuditItem.product.name,
      newStatus: updatedAuditItem.status
    });

    // Calculate updated progress for the audit
    // @ts-ignore - Dynamically access the model
    const allAuditItems = await prisma.auditItem.findMany({
      where: { auditId: auditId },
      select: { status: true },
    });

    const totalItems = allAuditItems.length;
    const countedItems = allAuditItems.filter(item =>
      item.status === "COUNTED" ||
      item.status === "RECONCILED" ||
      item.status === "DISCREPANCY"
    ).length;

    // Progress is 100% only when all items are COUNTED or RECONCILED (no discrepancies)
    const perfectlyCountedItems = allAuditItems.filter(item =>
      item.status === "COUNTED" || item.status === "RECONCILED"
    ).length;
    const progress = totalItems > 0 ? Math.round((perfectlyCountedItems / totalItems) * 100) : 0;

    console.log("Updated audit progress:", {
      totalItems,
      countedItems,
      progress: `${progress}%`
    });

    // Create audit log entry (if audit system is available)
    try {
      // Check if audit log system exists
      const auditLogExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables
          WHERE table_name = 'AuditLog'
        );
      `;

      if (auditLogExists) {
        await prisma.$executeRaw`
          INSERT INTO "AuditLog" (
            "id",
            "entityType",
            "entityId",
            "action",
            "details",
            "userId",
            "userName",
            "createdAt"
          ) VALUES (
            gen_random_uuid(),
            'AuditItem',
            ${itemId},
            'UPDATE',
            ${JSON.stringify({
              auditId,
              productName: updatedAuditItem.product.name,
              oldStatus: auditItem.status,
              newStatus: updatedAuditItem.status,
              notes,
              progress: `${progress}%`,
            })},
            ${session.user.id},
            ${session.user.name || session.user.email},
            NOW()
          )
        `;
        console.log("Audit log created");
      }
    } catch (auditLogError) {
      console.error("Error creating audit log:", auditLogError);
      // Continue with the process even if audit log creation fails
    }

    // If audit is now 100% complete, we could auto-update audit status
    if (progress === 100 && audit.status === "IN_PROGRESS") {
      try {
        // @ts-ignore - Dynamically access the model
        await prisma.audit.update({
          where: { id: auditId },
          data: {
            status: "COMPLETED",
            endDate: new Date(),
            updatedAt: new Date(),
          },
        });
        console.log("Audit automatically completed due to 100% progress");
      } catch (auditUpdateError) {
        console.error("Error auto-completing audit:", auditUpdateError);
        // Continue even if audit auto-completion fails
      }
    }

    return NextResponse.json({
      auditItem: updatedAuditItem,
      progress: {
        totalItems,
        countedItems,
        percentage: progress,
      },
      message: `Audit item status updated to ${updatedAuditItem.status}`,
    });
  } catch (error) {
    console.error("=== ERROR IN UPDATE AUDIT ITEM STATUS API ===");
    console.error("Error updating audit item status:", error);

    let errorMessage = "Failed to update audit item status";
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
