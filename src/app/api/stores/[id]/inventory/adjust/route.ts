import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { InventoryStatus } from "@prisma/client";



export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  console.log("🚀 Inventory adjust API called!");
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const storeId = resolvedParams.id;
    const data = await req.json();
    const {
      productId,
      adjustmentType,
      quantity,
      reason,
      notes
    } = data;

    console.log("Inventory adjustment request:", {
      storeId,
      productId,
      adjustmentType,
      quantity,
      reason
    });

    // Always log available stores for debugging
    const allStores = await prisma.store.findMany({
      select: { id: true, name: true, code: true, isActive: true }
    });
    console.log("All available stores:", allStores);

    // Validate required fields
    if (!productId || !adjustmentType || quantity === undefined || !reason) {
      return NextResponse.json(
        { error: "Product ID, adjustment type, quantity, and reason are required" },
        { status: 400 }
      );
    }

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    console.log("Store lookup result:", { storeId, found: !!store, storeName: store?.name });

    if (!store) {
      // Get all stores for debugging
      const allStores = await prisma.store.findMany({
        select: { id: true, name: true, code: true }
      });
      console.log("Available stores:", allStores);

      return NextResponse.json(
        {
          error: "Store not found",
          storeId,
          availableStores: allStores.map(s => ({ id: s.id, name: s.name, code: s.code }))
        },
        { status: 404 }
      );
    }

    // Check if inventory item exists
    let inventoryItem = await prisma.inventoryItem.findFirst({
      where: {
        productId,
        storeId,
      },
    });

    let previousQuantity = 0;
    let newQuantity = 0;
    let updatedInventoryItem;

    if (!inventoryItem) {
      // Create new inventory item if it doesn't exist
      if (adjustmentType === "remove") {
        return NextResponse.json(
          { error: "Cannot remove inventory from a product that doesn't exist in this store" },
          { status: 400 }
        );
      }

      // For new inventory items, calculate quantity
      if (adjustmentType === "add" || adjustmentType === "set") {
        newQuantity = quantity;
      } else {
        return NextResponse.json(
          { error: "Invalid adjustment type for new inventory" },
          { status: 400 }
        );
      }

      // Create new inventory item
      updatedInventoryItem = await prisma.inventoryItem.create({
        data: {
          id: randomUUID(),
          productId,
          storeId,
          quantity: newQuantity,
          status: newQuantity > 0 ? InventoryStatus.AVAILABLE : InventoryStatus.EXPIRED,
          createdAt: new Date(),
          updatedAt: new Date(),
        },
      });

      // Set inventoryItem for transaction logging
      inventoryItem = updatedInventoryItem;
    } else {
      // Update existing inventory item
      previousQuantity = inventoryItem.quantity;

      // Calculate new quantity based on adjustment type
      if (adjustmentType === "add") {
        newQuantity = previousQuantity + quantity;
      } else if (adjustmentType === "remove") {
        newQuantity = Math.max(0, previousQuantity - quantity);
      } else if (adjustmentType === "set") {
        newQuantity = quantity;
      } else {
        return NextResponse.json(
          { error: "Invalid adjustment type" },
          { status: 400 }
        );
      }

      // Update inventory item with proper enum values
      updatedInventoryItem = await prisma.inventoryItem.update({
        where: {
          id: inventoryItem.id,
        },
        data: {
          quantity: newQuantity,
          status: newQuantity > 0 ? InventoryStatus.AVAILABLE : InventoryStatus.EXPIRED,
        },
      });
    }

    // Create inventory transaction record using raw SQL query
    try {
      const inventoryTransaction = await prisma.$queryRaw`
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
          ${adjustmentType.toUpperCase()},
          ${quantity},
          ${previousQuantity},
          ${newQuantity},
          ${reason.toUpperCase()},
          ${notes || null},
          ${session.user.id},
          ${new Date()},
          ${new Date()}
        ) RETURNING *
      `;

      return NextResponse.json({
        inventoryItem: updatedInventoryItem,
        transaction: inventoryTransaction,
      });
    } catch (error) {
      // If InventoryTransaction model doesn't exist or query fails, just return the updated item
      console.error("Error creating inventory transaction:", error);
      return NextResponse.json({
        inventoryItem: updatedInventoryItem,
      });
    }
  } catch (error) {
    console.error("Error adjusting store inventory:", error);
    return NextResponse.json(
      { error: "Failed to adjust store inventory" },
      { status: 500 }
    );
  }
}


