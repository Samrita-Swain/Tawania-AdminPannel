import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: inventoryId } = await params;

    // Parse request body
    const body = await req.json();
    const { adjustmentType, quantity, reasonId, notes } = body;

    // Validate required fields
    if (!adjustmentType || quantity === undefined || !reasonId) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Get the inventory item
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryId },
      include: {
        product: true,
      },
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { message: "Inventory item not found" },
        { status: 404 }
      );
    }

    // Calculate new quantity
    let newQuantity: number;
    let transactionType: string;
    let transactionQuantity: number;

    switch (adjustmentType) {
      case "add":
        newQuantity = inventoryItem.quantity + quantity;
        transactionType = "ADJUSTMENT";
        transactionQuantity = quantity;
        break;
      case "subtract":
        if (quantity > inventoryItem.quantity) {
          return NextResponse.json(
            { message: "Cannot subtract more than the current quantity" },
            { status: 400 }
          );
        }
        newQuantity = inventoryItem.quantity - quantity;
        transactionType = reasonId === "DAMAGE" ? "DAMAGE" :
                         reasonId === "EXPIRY" ? "EXPIRY" : "ADJUSTMENT";
        transactionQuantity = quantity;
        break;
      case "set":
        newQuantity = quantity;
        transactionType = "ADJUSTMENT";
        transactionQuantity = Math.abs(quantity - inventoryItem.quantity);
        break;
      default:
        return NextResponse.json(
          { message: "Invalid adjustment type" },
          { status: 400 }
        );
    }

    // Update the inventory item directly (without transaction logging for now)
    const updatedItem = await prisma.inventoryItem.update({
      where: { id: inventoryId },
      data: {
        quantity: newQuantity,
      },
    });

    return NextResponse.json({
      message: "Inventory adjusted successfully",
      inventoryItem: updatedItem,
      transaction: null,
    });
  } catch (error) {
    console.error("Error adjusting inventory:", error);
    return NextResponse.json(
      { message: "Failed to adjust inventory", error: (error as Error).message },
      { status: 500 }
    );
  }
}




