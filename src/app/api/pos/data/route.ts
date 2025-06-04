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

    // Get stores, products, inventory items, and customers
    const [stores, products, inventoryItems, customers] = await Promise.all([
      prisma.store.findMany({
        where: { isActive: true },
        select: { 
          id: true, 
          name: true, 
          code: true 
        },
        orderBy: { name: 'asc' },
      }),
      prisma.product.findMany({
        where: { isActive: true },
        select: { 
          id: true, 
          name: true, 
          sku: true, 
          retailPrice: true,
          wholesalePrice: true,
          costPrice: true,
          categoryId: true,
        },
        orderBy: { name: 'asc' },
      }),
      prisma.inventoryItem.findMany({
        where: {
          storeId: { not: null },
          quantity: { gt: 0 },
          status: "AVAILABLE",
        },
        select: {
          id: true,
          productId: true,
          storeId: true,
          quantity: true,
          retailPrice: true,
          costPrice: true,
        },
      }),
      prisma.customer.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
        },
        orderBy: { name: 'asc' },
      }),
    ]);

    return NextResponse.json({
      stores,
      products,
      inventoryItems,
      customers,
    });
  } catch (error) {
    console.error("Error fetching POS data:", error);
    return NextResponse.json(
      { error: "Failed to fetch POS data" },
      { status: 500 }
    );
  }
}


