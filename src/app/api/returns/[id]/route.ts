import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

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

    const returnId = params.id;

    // Get return details
    const returnData = await prisma.return.findUnique({
      where: {
        id: returnId,
      },
      include: {
        store: true,
        customer: true,
        processedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        sale: {
          select: {
            id: true,
            receiptNumber: true,
            saleDate: true,
            items: {
              include: {
                product: true,
              },
            },
          },
        },
        items: {
          include: {
            product: true,
            saleItem: {
              include: {
                product: true,
              },
            },
          },
        },
        qualityControls: {
          include: {
            items: {
              include: {
                product: true,
              },
            },
          },
        },
      },
    });

    if (!returnData) {
      return NextResponse.json(
        { error: "Return not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(returnData);
  } catch (error) {
    console.error("Error fetching return:", error);
    return NextResponse.json(
      { error: "Failed to fetch return" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const returnId = params.id;
    const data = await req.json();
    
    // Check if return exists
    const existingReturn = await prisma.return.findUnique({
      where: {
        id: returnId,
      },
    });

    if (!existingReturn) {
      return NextResponse.json(
        { error: "Return not found" },
        { status: 404 }
      );
    }

    // Extract data
    const { 
      status,
      refundMethod,
      refundStatus,
      notes,
    } = data;

    // Update return
    const updatedReturn = await prisma.return.update({
      where: {
        id: returnId,
      },
      data: {
        status: status || existingReturn.status,
        refundMethod: refundMethod || existingReturn.refundMethod,
        refundStatus: refundStatus || existingReturn.refundStatus,
        notes: notes !== undefined ? notes : existingReturn.notes,
      },
      include: {
        store: true,
        customer: true,
        processedBy: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      entityType: "Return",
      entityId: returnId,
      action: "UPDATE",
      details: {
        status,
        refundStatus,
      },
    });

    // If approved, create quality control
    if (status === "APPROVED" && existingReturn.status !== "APPROVED") {
      // Find a warehouse associated with the store
      const store = await prisma.store.findUnique({
        where: {
          id: existingReturn.storeId,
        },
      });

      if (store) {
        // Find the first warehouse (assuming there's at least one)
        const warehouse = await prisma.warehouse.findFirst({
          where: {
            isActive: true,
          },
        });

        if (warehouse) {
          // Get return items
          const returnItems = await prisma.returnItem.findMany({
            where: {
              returnId,
            },
            include: {
              product: true,
            },
          });

          // Generate reference number for QC
          const date = new Date();
          const year = date.getFullYear().toString().slice(-2);
          const month = (date.getMonth() + 1).toString().padStart(2, "0");
          const day = date.getDate().toString().padStart(2, "0");
          
          const count = await prisma.qualityControl.count({
            where: {
              createdAt: {
                gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
                lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
              },
            },
          });
          
          const sequence = (count + 1).toString().padStart(3, "0");
          const referenceNumber = `QC-${year}${month}${day}-${sequence}`;

          // Create quality control
          await prisma.qualityControl.create({
            data: {
              referenceNumber,
              type: "RETURN",
              status: "PENDING",
              warehouseId: warehouse.id,
              returnId,
              inspectionDate: new Date(),
              inspectedById: session.user.id,
              notes: `Quality control for return ${existingReturn.returnNumber}`,
              items: {
                create: returnItems.map(item => ({
                  productId: item.productId,
                  quantity: item.quantity,
                  passedQuantity: 0,
                  failedQuantity: 0,
                  pendingQuantity: item.quantity,
                  status: "PENDING",
                })),
              },
            },
          });
        }
      }
    }

    // If refund processed, update customer loyalty points if applicable
    if (refundStatus === "PROCESSED" && existingReturn.refundStatus !== "PROCESSED" && existingReturn.customerId) {
      // Get the customer
      const customer = await prisma.customer.findUnique({
        where: {
          id: existingReturn.customerId,
        },
      });

      if (customer && customer.loyaltyPoints > 0) {
        // Calculate points to deduct (1 point per dollar)
        const pointsToDeduct = Math.min(
          Math.floor(existingReturn.totalAmount),
          customer.loyaltyPoints
        );

        if (pointsToDeduct > 0) {
          // Update customer loyalty points
          await prisma.customer.update({
            where: {
              id: existingReturn.customerId,
            },
            data: {
              loyaltyPoints: {
                decrement: pointsToDeduct,
              },
            },
          });

          // Create loyalty transaction
          await prisma.loyaltyTransaction.create({
            data: {
              customerId: existingReturn.customerId,
              programId: (await prisma.loyaltyProgram.findFirst({
                where: {
                  isActive: true,
                },
              }))?.id || "",
              points: pointsToDeduct,
              type: "REDEEM",
              description: `Points deducted for return ${existingReturn.returnNumber}`,
            },
          });
        }
      }
    }

    return NextResponse.json({
      return: updatedReturn,
    });
  } catch (error) {
    console.error("Error updating return:", error);
    return NextResponse.json(
      { error: "Failed to update return" },
      { status: 500 }
    );
  }
}
