import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function PATCH(
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

    const resolvedParams = await params;
    const returnId = resolvedParams.id;
    const data = await req.json();
    const { status, notes, userId } = data;

    // Validate required fields
    if (!status) {
      return NextResponse.json(
        { error: "Status is required" },
        { status: 400 }
      );
    }

    // Check if return exists
    const returnData = await prisma.return.findUnique({
      where: { id: returnId },
    });

    if (!returnData) {
      return NextResponse.json(
        { error: "Return not found" },
        { status: 404 }
      );
    }

    // Update return status
    const updateData: any = {
      status,
      notes: notes || returnData.notes,
    };

    // Update refund status based on return status
    if (status === "APPROVED") {
      updateData.refundStatus = "PENDING";
    } else if (status === "COMPLETED") {
      updateData.refundStatus = "PROCESSED";
    } else if (status === "REJECTED") {
      updateData.refundStatus = "REJECTED";
    }

    // Update return
    const updatedReturn = await prisma.return.update({
      where: { id: returnId },
      data: updateData,
      include: {
        Store: true,
        Customer: true,
        ReturnItem: {
          include: {
            Product: true,
          },
        },
        User: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    // If status is COMPLETED, update inventory
    if (status === "COMPLETED") {
      // Process each return item
      for (const item of updatedReturn.ReturnItem || []) {
        // Get the product's inventory in the store
        const inventoryItem = await prisma.inventoryItem.findFirst({
          where: {
            productId: item.productId,
            storeId: updatedReturn.storeId,
          },
        });

        if (inventoryItem) {
          // Decrease inventory quantity
          await prisma.inventoryItem.update({
            where: { id: inventoryItem.id },
            data: {
              quantity: {
                decrement: item.quantity,
              },
            },
          });

          // Create inventory transaction record
          try {
            const { randomUUID } = require("crypto");
            await prisma.$queryRaw`
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
                ${randomUUID()},
                ${inventoryItem.id},
                'RETURN',
                ${-item.quantity},
                ${inventoryItem.quantity + item.quantity},
                ${inventoryItem.quantity},
                'RETURN',
                ${`Return #${updatedReturn.returnNumber}`},
                ${userId || session.user.id},
                ${new Date()},
                ${new Date()}
              )
            `;
          } catch (error) {
            console.error("Error creating inventory transaction:", error);
            // Continue with the process even if transaction creation fails
          }
        }
      }
    }

    // Create audit log
    await createAuditLog({
      entityType: 'Return',
      entityId: returnId,
      action: 'UPDATE',
      details: {
        returnNumber: updatedReturn.returnNumber,
        oldStatus: returnData.status,
        newStatus: status,
        notes,
        userId: userId || session.user.id,
      },
    });

    // Transform the data to match the expected format in the client component
    const formattedReturnData = {
      ...updatedReturn,
      store: updatedReturn.Store,
      customer: updatedReturn.Customer,
      items: (updatedReturn.ReturnItem || []).map(item => ({
        ...item,
        product: item.Product
      })),
      processedBy: updatedReturn.User,
    };

    return NextResponse.json(formattedReturnData);
  } catch (error) {
    console.error("Error updating return status:", error);
    return NextResponse.json(
      { error: "Failed to update return status" },
      { status: 500 }
    );
  }
}





