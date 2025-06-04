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

    console.log("Fetching inventory item:", inventoryId);

    // Fetch inventory item with related data
    const inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id: inventoryId },
      include: {
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            minStockLevel: true,
            reorderPoint: true,
          }
        },
        warehouse: {
          select: {
            id: true,
            name: true,
            code: true,
          }
        },
        store: {
          select: {
            id: true,
            name: true,
            code: true,
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

    console.log("Found inventory item:", {
      id: inventoryItem.id,
      productName: inventoryItem.product.name,
      quantity: inventoryItem.quantity,
      warehouseName: inventoryItem.warehouse?.name,
      storeName: inventoryItem.store?.name
    });

    return NextResponse.json(inventoryItem);
  } catch (error) {
    console.error("Error fetching inventory item:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory item" },
      { status: 500 }
    );
  }
}
