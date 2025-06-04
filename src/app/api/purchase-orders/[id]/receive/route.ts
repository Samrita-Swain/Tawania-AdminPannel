import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
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

    const purchaseOrderId = params.id;
    const data = await req.json();
    const { items, notes } = data;

    // Validate required fields
    if (!items || !items.length) {
      return NextResponse.json(
        { error: "No items to receive" },
        { status: 400 }
      );
    }

    // Get purchase order
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: {
        id: purchaseOrderId,
      },
      include: {
        items: true,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Check if purchase order can be received
    if (purchaseOrder.status !== "ORDERED" && purchaseOrder.status !== "PARTIAL") {
      return NextResponse.json(
        { error: "Purchase order must be in ORDERED or PARTIAL status to receive items" },
        { status: 400 }
      );
    }

    // Process the receipt
    const result = await prisma.$transaction(async (tx) => {
      // Update each item
      for (const receivedItem of items) {
        const orderItem = purchaseOrder.items.find(item => item.id === receivedItem.id);
        
        if (!orderItem) {
          throw new Error(`Item with ID ${receivedItem.id} not found in purchase order`);
        }
        
        // Validate received quantity
        const newReceivedQuantity = orderItem.receivedQuantity + receivedItem.quantity;
        if (newReceivedQuantity > orderItem.orderedQuantity) {
          throw new Error(`Cannot receive more than ordered quantity for item ${orderItem.id}`);
        }
        
        // Update the order item
        await tx.purchaseOrderItem.update({
          where: {
            id: orderItem.id,
          },
          data: {
            receivedQuantity: newReceivedQuantity,
          },
        });
        
        // Create or update inventory item
        const existingInventory = await tx.inventoryItem.findFirst({
          where: {
            productId: orderItem.productId,
            warehouseId: purchaseOrder.warehouseId,
          },
        });
        
        if (existingInventory) {
          // Update existing inventory
          await tx.inventoryItem.update({
            where: {
              id: existingInventory.id,
            },
            data: {
              quantity: existingInventory.quantity + receivedItem.quantity,
              costPrice: orderItem.unitPrice, // Update cost price to latest purchase price
            },
          });
        } else {
          // Create new inventory item
          await tx.inventoryItem.create({
            data: {
              productId: orderItem.productId,
              warehouseId: purchaseOrder.warehouseId,
              quantity: receivedItem.quantity,
              costPrice: orderItem.unitPrice,
            },
          });
        }
      }
      
      // Check if all items are fully received
      const updatedItems = await tx.purchaseOrderItem.findMany({
        where: {
          purchaseOrderId,
        },
      });
      
      const allItemsReceived = updatedItems.every(item => item.receivedQuantity === item.orderedQuantity);
      const anyItemsReceived = updatedItems.some(item => item.receivedQuantity > 0);
      
      // Update purchase order status
      let newStatus = purchaseOrder.status;
      if (allItemsReceived) {
        newStatus = "RECEIVED";
      } else if (anyItemsReceived) {
        newStatus = "PARTIAL";
      }
      
      // Update purchase order
      const updatedOrder = await tx.purchaseOrder.update({
        where: {
          id: purchaseOrderId,
        },
        data: {
          status: newStatus,
          deliveredDate: newStatus === "RECEIVED" ? new Date() : undefined,
          notes: notes ? `${purchaseOrder.notes ? purchaseOrder.notes + "\n\n" : ""}${notes}` : undefined,
          updatedById: session.user.id,
        },
        include: {
          supplier: true,
          warehouse: true,
          items: {
            include: {
              product: true,
            },
          },
        },
      });
      
      return updatedOrder;
    });

    return NextResponse.json({ 
      purchaseOrder: result,
      message: "Items received successfully" 
    });
  } catch (error) {
    console.error("Error receiving purchase order items:", error);
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Failed to receive purchase order items" },
      { status: 500 }
    );
  }
}
