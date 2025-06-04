import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get warehouses, stores, and products
    const [warehouses, stores, products] = await Promise.all([
      prisma.warehouse.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
      prisma.store.findMany({
        where: { isActive: true },
        select: { id: true, name: true, code: true },
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { 
          id: true, 
          name: true, 
          sku: true, 
          costPrice: true, 
          wholesalePrice: true, 
          retailPrice: true 
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    // Get inventory items with available stock
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        quantity: { gt: 0 },
        status: 'AVAILABLE',
      },
      select: {
        id: true,
        productId: true,
        warehouseId: true,
        storeId: true,
        quantity: true,
        costPrice: true,
        retailPrice: true,
      },
    });

    return NextResponse.json({
      warehouses,
      stores,
      products,
      inventoryItems,
    });
  } catch (error) {
    console.error("Error fetching transfer data:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfer data" },
      { status: 500 }
    );
  }
}

