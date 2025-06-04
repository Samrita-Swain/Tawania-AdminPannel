import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryStatus } from "@prisma/client";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const inventoryId = resolvedParams.id;
    const data = await req.json();
    const { adjustmentType, quantity, reason, notes } = data;

    console.log("Adjusting inventory item:", {
      inventoryId,
      adjustmentType,
      quantity,
      reason
    });

    // Validate required fields
    if (!adjustmentType || quantity === undefined || !reason) {
      return NextResponse.json(
        { error: "Missing required fields: adjustmentType, quantity, reason" },
        { status: 400 }
      );
    }

    // Fetch the inventory item
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    // Calculate new quantity
    let newQuantity: number;
    switch (adjustmentType) {
      case "add":
        newQuantity = inventoryItem.quantity + quantity;
        break;
      case "remove":
        newQuantity = Math.max(0, inventoryItem.quantity - quantity);
        break;
      case "set":
        newQuantity = quantity;
        break;
      default:
        return NextResponse.json(
          { error: "Invalid adjustment type. Must be 'add', 'remove', or 'set'" },
          { status: 400 }
        );
    }

    // Determine new status based on quantity
    const newStatus = newQuantity > 0 ? InventoryStatus.AVAILABLE : InventoryStatus.OUT_OF_STOCK;

    // Update the inventory item
    const updatedInventoryItem = await prisma.inventoryItem.update({
      where: { id: inventoryId },
      data: {
        quantity: newQuantity,
        status: newStatus,
        updatedAt: new Date(),
      },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    });

    // Try to create a transaction record if the table exists
    try {
      await prisma.inventoryTransaction.create({
        data: {
          inventoryItemId: inventoryId,
          type: adjustmentType.toUpperCase(),
          quantity: adjustmentType === "remove" ? -quantity : quantity,
          reason: reason.toUpperCase(),
          notes: notes || null,
          userId: session.user?.id || null,
          createdAt: new Date(),
        }
      });
      console.log("Transaction record created");
    } catch (transactionError) {
      console.log("Could not create transaction record (table may not exist):", transactionError);
      // Continue without transaction record if table doesn't exist
    }

    console.log("Inventory adjustment completed:", {
      inventoryId,
      oldQuantity: inventoryItem.quantity,
      newQuantity,
      adjustmentType,
      reason
    });

    return NextResponse.json({
      success: true,
      inventoryItem: updatedInventoryItem,
      adjustment: {
        type: adjustmentType,
        quantity,
        reason,
        oldQuantity: inventoryItem.quantity,
        newQuantity,
      }
    });
  } catch (error) {
    console.error("Error adjusting inventory:", error);
    return NextResponse.json(
      { error: "Failed to adjust inventory" },
      { status: 500 }
    );
  }
}
