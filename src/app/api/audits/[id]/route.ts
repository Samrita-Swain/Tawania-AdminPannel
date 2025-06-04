import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryStatus } from '@prisma/client';

function debugPrismaModels() {
  console.log('Available Prisma models:', Object.keys(prisma));
}

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    // Get audit details
    const audit = await prisma.audit.findUnique({
      where: {
        id: auditId,
      },
      include: {
        warehouse: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        assignments: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
        items: {
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
        },
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ audit });
  } catch (error) {
    console.error("Error fetching audit:", error);
    return NextResponse.json(
      { error: "Failed to fetch audit" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    debugPrismaModels();
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await params to fix Next.js error
    const { id: auditId } = await params;
    const data = await req.json();

    // Check if audit exists
    const existingAudit = await prisma.audit.findUnique({
      where: {
        id: auditId,
      },
    });

    if (!existingAudit) {
      return NextResponse.json(
        { error: "Audit not found" },
        { status: 404 }
      );
    }

    // Extract data
    const {
      warehouseId,
      startDate,
      endDate,
      notes,
      status,
      zones = [],
      users = []
    } = data;

    // Validate status transition
    if (status && !isValidStatusTransition(existingAudit.status, status)) {
      return NextResponse.json(
        { error: `Invalid status transition from ${existingAudit.status} to ${status}` },
        { status: 400 }
      );
    }

    // Update audit
    const updatedAudit = await prisma.$transaction(async (tx) => {
      // Update audit record
      const audit = await tx.audit.update({
        where: {
          id: auditId,
        },
        data: {
          warehouseId: warehouseId || undefined,
          startDate: startDate ? new Date(startDate) : undefined,
          endDate: endDate ? new Date(endDate) : null,
          notes: notes !== undefined ? notes : undefined,
          status: status || undefined,
        },
      });

      // If users are provided, update assignments
      if (users.length > 0) {
        // Delete existing assignments
        await tx.auditAssignment.deleteMany({
          where: {
            auditId,
          },
        });

        // Create new assignments
        await tx.auditAssignment.createMany({
          data: users.map((userId: string) => ({
            auditId,
            userId,
            assignedZones: zones.length > 0 ? JSON.stringify(zones) : null,
          })),
        });
      }

      // If status is changed to COMPLETED, update inventory based on audit findings
      if (status === "COMPLETED" && existingAudit.status !== "COMPLETED") {
        // Get all audit items
        const allAuditItems = await tx.auditItem.findMany({
          where: {
            auditId,
          },
          include: {
            inventoryItem: true,
          },
        });

        // Process each audit item
        for (const item of allAuditItems) {
          // If item was never counted, assume expected quantity as counted quantity
          const countedQuantity = item.countedQuantity !== null ? item.countedQuantity : item.expectedQuantity;
          const variance = countedQuantity - item.expectedQuantity;

          // Determine the final status
          let finalStatus: string;
          if (item.countedQuantity === null) {
            // Item was never counted, mark as counted with no variance
            finalStatus = "COUNTED";
          } else if (variance !== 0) {
            // Item has variance, mark as reconciled
            finalStatus = "RECONCILED";
          } else {
            // Item was counted with no variance
            finalStatus = "COUNTED";
          }

          // Update audit item with final status and quantities
          await tx.auditItem.update({
            where: {
              id: item.id,
            },
            data: {
              countedQuantity: countedQuantity,
              discrepancy: variance,
              status: finalStatus,
              countedAt: item.countedAt || new Date(),
              countedById: item.countedById || session.user.id,
            },
          });

          // Only update inventory and create transactions for items with actual changes
          if (item.countedQuantity !== null && variance !== 0) {
            // Update inventory item quantity
            await tx.inventoryItem.update({
              where: {
                id: item.inventoryItemId,
              },
              data: {
                quantity: countedQuantity,
                status: countedQuantity > 0 ? InventoryStatus.AVAILABLE : InventoryStatus.EXPIRED,
              },
            });

            // Create inventory transaction record
            try {
              await tx.$queryRaw`
                INSERT INTO "InventoryTransaction" (
                  "id",
                  "inventoryItemId",
                  "transactionType",
                  "quantity",
                  "previousQuantity",
                  "newQuantity",
                  "reason",
                  "notes",
                  "createdById",
                  "createdAt",
                  "updatedAt"
                ) VALUES (
                  ${crypto.randomUUID()},
                  ${item.inventoryItemId},
                  'AUDIT_ADJUSTMENT',
                  ${Math.abs(variance)},
                  ${item.expectedQuantity},
                  ${countedQuantity},
                  'AUDIT',
                  ${'Audit adjustment from audit ' + audit.referenceNumber},
                  ${session.user.id},
                  ${new Date()},
                  ${new Date()}
                )
              `;
            } catch (error) {
              console.error("Failed to create inventory transaction:", error);
              // Continue with the rest of the process even if transaction creation fails
            }
          }
        }

        // Set end date if not already set
        if (!audit.endDate) {
          await tx.audit.update({
            where: {
              id: auditId,
            },
            data: {
              endDate: new Date(),
            },
          });
        }
      }

      // Fix for existing completed audits: if audit is already completed but items have wrong status
      if (status === "COMPLETED" && existingAudit.status === "COMPLETED") {
        // Check if any items have PENDING status
        const pendingItems = await tx.auditItem.findMany({
          where: {
            auditId,
            status: "PENDING",
          },
        });

        // If there are pending items in a completed audit, fix them
        if (pendingItems.length > 0) {
          for (const item of pendingItems) {
            await tx.auditItem.update({
              where: {
                id: item.id,
              },
              data: {
                countedQuantity: item.expectedQuantity,
                discrepancy: 0,
                status: "COUNTED",
                countedAt: new Date(),
                countedById: session.user.id,
              },
            });
          }
        }
      }

      // Return updated audit with related data
      return await tx.audit.findUnique({
        where: {
          id: auditId,
        },
        include: {
          warehouse: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignments: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          items: {
            include: {
              product: true,
              inventoryItem: true,
            },
          },
        },
      });
    });

    return NextResponse.json({ audit: updatedAudit });
  } catch (error) {
    console.error("Error updating audit:", error);
    return NextResponse.json(
      { error: "Failed to update audit" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
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

    // Check if audit exists
    const existingAudit = await prisma.audit.findUnique({
      where: {
        id: auditId,
      },
    });

    if (!existingAudit) {
      return NextResponse.json(
        { error: "Audit not found" },
        { status: 404 }
      );
    }

    // Only allow deletion of PLANNED audits
    if (existingAudit.status !== "PLANNED") {
      return NextResponse.json(
        {
          error: "Only planned audits can be deleted. Consider cancelling the audit instead.",
          suggestion: "Use PUT to update the status to CANCELLED"
        },
        { status: 400 }
      );
    }

    // Delete audit and related records
    await prisma.$transaction([
      prisma.auditItem.deleteMany({
        where: {
          auditId,
        },
      }),
      prisma.auditAssignment.deleteMany({
        where: {
          auditId,
        },
      }),
      prisma.audit.delete({
        where: {
          id: auditId,
        },
      }),
    ]);

    return NextResponse.json({
      message: "Audit deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting audit:", error);
    return NextResponse.json(
      { error: "Failed to delete audit" },
      { status: 500 }
    );
  }
}

// Helper function to validate status transitions
function isValidStatusTransition(currentStatus: string, newStatus: string): boolean {
  const validTransitions: Record<string, string[]> = {
    "PLANNED": ["IN_PROGRESS", "CANCELLED"],
    "IN_PROGRESS": ["COMPLETED", "CANCELLED"],
    "COMPLETED": [],
    "CANCELLED": [],
  };

  return validTransitions[currentStatus]?.includes(newStatus) || false;
}






