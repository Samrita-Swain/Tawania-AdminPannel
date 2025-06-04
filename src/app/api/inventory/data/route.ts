import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";

// Import the sql tag for safe SQL queries
const { sql } = Prisma;

// Define the debug function to help troubleshoot
function debug(...args: any[]) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Inventory API Debug]', ...args);
  }
}

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    debug("Fetching inventory data");

    // Use separate try-catch blocks for each query to identify which one fails
    let warehouses = [];
    let stores = [];
    let products = [];
    let inventoryItems = [];

    try {
      // Get warehouses
      warehouses = await prisma.warehouse.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          code: true
        },
        orderBy: { name: 'asc' },
      });
      debug(`Found ${warehouses.length} warehouses`);
    } catch (error) {
      console.error("Error fetching warehouses:", error);
      throw new Error(`Failed to fetch warehouses: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Get stores
      stores = await prisma.store.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          code: true
        },
        orderBy: { name: 'asc' },
      });
      debug(`Found ${stores.length} stores`);
    } catch (error) {
      console.error("Error fetching stores:", error);
      throw new Error(`Failed to fetch stores: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Get products using raw SQL to avoid schema mismatches
      const rawProducts = await prisma.$queryRaw`
        SELECT
          p.id, p.name, p.sku, p."categoryId", p."isActive",
          p."minStockLevel", p."reorderPoint"
        FROM "Product" p
        WHERE p."isActive" = true
        ORDER BY p.name ASC
      `;

      // Transform raw SQL results into structured objects
      products = (rawProducts as any[]).map((product: any) => ({
        id: product.id,
        name: product.name,
        sku: product.sku,
        categoryId: product.categoryId,
        minStockLevel: product.minStockLevel,
        reorderPoint: product.reorderPoint,
        isActive: product.isActive
      }));

      debug(`Found ${products.length} products`);
    } catch (error) {
      console.error("Error fetching products:", error);
      throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : String(error)}`);
    }

    try {
      // Get inventory items
      inventoryItems = await prisma.inventoryItem.findMany({
        select: {
          id: true,
          productId: true,
          warehouseId: true,
          storeId: true,
          quantity: true,
          status: true,
        },
      });
      debug(`Found ${inventoryItems.length} inventory items`);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      throw new Error(`Failed to fetch inventory items: ${error instanceof Error ? error.message : String(error)}`);
    }

    return NextResponse.json({
      warehouses,
      stores,
      products,
      inventoryItems,
    });
  } catch (error) {
    console.error("Error fetching inventory data:", error);
    return NextResponse.json(
      { error: "Failed to fetch inventory data" },
      { status: 500 }
    );
  }
}
