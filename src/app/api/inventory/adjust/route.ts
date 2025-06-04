import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { randomUUID } from "crypto";
import { Prisma } from "@prisma/client";

export async function POST(req: NextRequest) {
  try {
    console.log("Inventory adjustment request received");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("Unauthorized request - no valid session");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const {
      warehouseId,
      productId,
      adjustmentType,
      quantity,
      reason,
      notes
    } = data;

    console.log("Received adjustment data:", {
      warehouseId,
      productId,
      adjustmentType,
      quantity,
      reason
    });

    // Validate required fields
    if (!warehouseId || !productId || !adjustmentType || quantity <= 0 || !reason) {
      const missingFields = [];
      if (!warehouseId) missingFields.push('warehouseId');
      if (!productId) missingFields.push('productId');
      if (!adjustmentType) missingFields.push('adjustmentType');
      if (quantity <= 0) missingFields.push('quantity (must be > 0)');
      if (!reason) missingFields.push('reason');

      console.log("Missing required fields:", missingFields);

      return NextResponse.json(
        { error: `Missing required fields: ${missingFields.join(', ')}` },
        { status: 400 }
      );
    }

    // Use raw SQL to avoid schema mismatches
    console.log("Checking for existing inventory item...");

    // Get current inventory item using raw SQL
    const existingItems = await prisma.$queryRaw`
      SELECT
        id,
        "productId",
        "warehouseId",
        quantity,
        "reservedQuantity",
        "costPrice",
        "retailPrice",
        status,
        "createdAt",
        "updatedAt"
      FROM "InventoryItem"
      WHERE "warehouseId" = ${warehouseId} AND "productId" = ${productId}
      LIMIT 1
    `;

    let inventoryItem: any = null;
    if (Array.isArray(existingItems) && existingItems.length > 0) {
      inventoryItem = existingItems[0];
      console.log("Found existing inventory item:", inventoryItem.id);
    } else {
      console.log("No existing inventory item found");
    }

    let newQuantity = 0;
    let previousQuantity = 0;
    let updatedInventoryItem: any = null;

    // If inventory item exists, update it
    if (inventoryItem) {
      previousQuantity = Number(inventoryItem.quantity);
      newQuantity = previousQuantity;

      // Calculate new quantity based on adjustment type
      if (adjustmentType === "add") {
        newQuantity += quantity;
      } else if (adjustmentType === "remove") {
        newQuantity = Math.max(0, newQuantity - quantity);
      } else if (adjustmentType === "set") {
        newQuantity = quantity;
      } else {
        return NextResponse.json(
          { error: "Invalid adjustment type" },
          { status: 400 }
        );
      }

      console.log("Updating inventory item:", {
        id: inventoryItem.id,
        previousQuantity,
        newQuantity
      });

      // Update existing inventory item using raw SQL
      // Cast the status string to the InventoryStatus enum type
      const status = newQuantity > 0 ? "AVAILABLE" : "EXPIRED";
      console.log("Setting status to:", status);

      const updatedItems = await prisma.$queryRaw`
        UPDATE "InventoryItem"
        SET
          quantity = ${newQuantity},
          status = ${status}::"InventoryStatus",
          "updatedAt" = ${new Date()}
        WHERE id = ${inventoryItem.id}
        RETURNING
          id,
          "productId",
          "warehouseId",
          quantity,
          "reservedQuantity",
          "costPrice",
          "retailPrice",
          status,
          "createdAt",
          "updatedAt"
      `;

      if (Array.isArray(updatedItems) && updatedItems.length > 0) {
        updatedInventoryItem = updatedItems[0];
        console.log("Inventory item updated successfully");
      } else {
        throw new Error("Failed to update inventory item");
      }
    }
    // If inventory item doesn't exist, create it (only for "add" or "set" operations)
    else {
      if (adjustmentType === "remove") {
        return NextResponse.json(
          { error: "Cannot remove stock from non-existent inventory item" },
          { status: 400 }
        );
      }

      // For "add" or "set", create a new inventory item
      newQuantity = adjustmentType === "add" ? quantity : quantity;

      console.log("Creating new inventory item with quantity:", newQuantity);

      // Create new inventory item using raw SQL
      const newItemId = randomUUID();

      // Cast the status string to the InventoryStatus enum type
      const status = newQuantity > 0 ? "AVAILABLE" : "EXPIRED";
      console.log("Setting status to:", status);

      const createdItems = await prisma.$queryRaw`
        INSERT INTO "InventoryItem" (
          id,
          "productId",
          "warehouseId",
          quantity,
          "reservedQuantity",
          "costPrice",
          "retailPrice",
          status,
          "createdAt",
          "updatedAt"
        ) VALUES (
          ${newItemId},
          ${productId},
          ${warehouseId},
          ${newQuantity},
          ${0},
          ${0},
          ${0},
          ${status}::"InventoryStatus",
          ${new Date()},
          ${new Date()}
        )
        RETURNING
          id,
          "productId",
          "warehouseId",
          quantity,
          "reservedQuantity",
          "costPrice",
          "retailPrice",
          status,
          "createdAt",
          "updatedAt"
      `;

      if (Array.isArray(createdItems) && createdItems.length > 0) {
        updatedInventoryItem = createdItems[0];
        inventoryItem = updatedInventoryItem;
        console.log("New inventory item created successfully:", updatedInventoryItem.id);
      } else {
        throw new Error("Failed to create inventory item");
      }
    }

    // Create inventory transaction record using raw SQL
    let inventoryTransaction;
    try {
      // Determine the transaction type
      let transactionType;
      if (inventoryItem === updatedInventoryItem) {
        transactionType = "INITIAL";
      } else if (adjustmentType === "add") {
        transactionType = "ADD";
      } else if (adjustmentType === "remove") {
        transactionType = "REMOVE";
      } else if (adjustmentType === "set") {
        transactionType = "SET";
      } else {
        transactionType = adjustmentType.toUpperCase();
      }

      console.log("Creating transaction with type:", transactionType);

      // Create transaction ID
      const transactionId = randomUUID();

      // Create the transaction using raw SQL
      // Cast the transaction type and reason to their respective enum types
      console.log("Transaction type:", transactionType);
      console.log("Reason:", reason.toUpperCase());

      const transactions = await prisma.$queryRaw`
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
          ${transactionId},
          ${inventoryItem.id},
          ${transactionType}::"TransactionType",
          ${quantity},
          ${previousQuantity},
          ${newQuantity},
          ${reason.toUpperCase()}::"TransactionReason",
          ${notes || null},
          ${session.user.id},
          ${new Date()},
          ${new Date()}
        )
        RETURNING *
      `;

      if (Array.isArray(transactions) && transactions.length > 0) {
        inventoryTransaction = transactions[0];
        console.log("Created inventory transaction:", {
          id: inventoryTransaction.id,
          inventoryItemId: inventoryItem.id,
          transactionType,
          quantity,
          previousQuantity,
          newQuantity
        });
      } else {
        console.error("No transaction returned after creation");
      }
    } catch (error) {
      console.error("Error creating inventory transaction:", error);
      console.error("Transaction details:", {
        inventoryItemId: inventoryItem?.id,
        adjustmentType,
        quantity,
        previousQuantity,
        newQuantity,
        reason: reason?.toUpperCase(),
        userId: session.user.id
      });
      // Continue with the process even if transaction creation fails
    }

    console.log("Inventory adjustment successful");

    return NextResponse.json({
      success: true,
      inventoryItem: updatedInventoryItem,
      transaction: inventoryTransaction,
    });
  } catch (error) {
    console.error("Error adjusting inventory:", error);

    // Provide more detailed error message
    let errorMessage = "Failed to adjust inventory";
    let errorStatus = 500;

    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error stack:", error.stack);

      // Check for specific PostgreSQL error codes
      const pgErrorMatch = error.message.match(/Code: `(\d+)`/);
      if (pgErrorMatch) {
        const pgErrorCode = pgErrorMatch[1];
        console.error("PostgreSQL error code:", pgErrorCode);

        // Handle specific error codes
        if (pgErrorCode === '42804') {
          errorMessage = "Database type mismatch error. Please check the values being inserted.";
        } else if (pgErrorCode === '23505') {
          errorMessage = "Duplicate key violation. This record already exists.";
        } else if (pgErrorCode === '23503') {
          errorMessage = "Foreign key constraint violation. Referenced record does not exist.";
        }
      }
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error),
        code: error instanceof Error && error.message.match(/Code: `(\d+)`/) ? error.message.match(/Code: `(\d+)`/)[1] : null
      },
      { status: errorStatus }
    );
  }
}



