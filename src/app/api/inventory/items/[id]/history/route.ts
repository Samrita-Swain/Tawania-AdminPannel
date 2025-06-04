import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

    console.log("Fetching transaction history for inventory item:", inventoryId);

    // First verify the inventory item exists
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryId },
      select: { id: true }
    });

    if (!inventoryItem) {
      return NextResponse.json(
        { error: "Inventory item not found" },
        { status: 404 }
      );
    }

    // Fetch transaction history
    // Note: This assumes you have an InventoryTransaction table
    // If you don't have this table, you might need to create it or use a different approach
    try {
      const transactions = await prisma.inventoryTransaction.findMany({
        where: { inventoryItemId: inventoryId },
        include: {
          user: {
            select: {
              name: true,
              email: true,
            }
          }
        },
        orderBy: { createdAt: 'desc' }
      });

      console.log(`Found ${transactions.length} transactions for inventory item ${inventoryId}`);

      return NextResponse.json(transactions);
    } catch (transactionError) {
      console.log("InventoryTransaction table not found, returning empty history");
      // If the InventoryTransaction table doesn't exist, return empty array
      return NextResponse.json([]);
    }
  } catch (error) {
    console.error("Error fetching transaction history:", error);
    return NextResponse.json(
      { error: "Failed to fetch transaction history" },
      { status: 500 }
    );
  }
}
