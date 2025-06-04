import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { EnhancedTransferForm } from "../_components/enhanced-transfer-form";

// Import the sql tag for safe SQL queries
const { sql } = Prisma;

// Define the debug function to help troubleshoot
function debug(...args: any[]) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Transfer Debug]', ...args);
  }
}

export default async function NewTransferPage() {
  const session = await getServerSession(authOptions);

  if (!session) {
    redirect("/auth/signin");
  }

  // Get the main warehouse
  const warehouse = await prisma.warehouse.findFirst({
    where: { isActive: true },
  });

  if (!warehouse) {
    redirect("/warehouse/setup");
  }

  // Get all active stores
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: { name: "asc" },
  });

  debug(`Found ${stores.length} active stores`);

  // Redirect if no stores are available
  if (stores.length === 0) {
    return (
      <div className="container mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create New Transfer</h1>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-bold text-amber-600 mb-2">No Stores Available</h2>
          <p className="text-gray-700 mb-4">
            You need to create at least one active store before you can create a transfer.
          </p>
          <a href="/stores/new" className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
            Create Store
          </a>
        </div>
      </div>
    );
  }

  // Get warehouse inventory with products using raw SQL to avoid schema mismatches
  try {
    debug("Fetching warehouse inventory for warehouse ID:", warehouse.id);

    // Use separate try-catch blocks for each query to identify which one fails
    let products = [];
    try {
      // First, get all products with their categories using raw SQL to avoid schema mismatches
      products = await prisma.$queryRaw`
        SELECT
          p.id, p.name, p.sku, p.unit, p.description, p."categoryId", p."isActive",
          p."minStockLevel", p."reorderPoint",
          c.id as "category_id", c.name as "category_name"
        FROM "Product" p
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        WHERE p."isActive" = true
        ORDER BY p.name ASC
      `;
      debug(`Found ${(products as any[]).length} products`);
    } catch (error) {
      console.error("Error fetching products:", error);
      throw new Error(`Failed to fetch products: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Then get inventory items for the warehouse
    let rawInventoryItems = [];
    try {
      rawInventoryItems = await prisma.$queryRaw`
        SELECT
          i.id, i."productId", i."warehouseId", i.quantity, i."costPrice", i."retailPrice", i.status
        FROM "InventoryItem" i
        WHERE i."warehouseId" = ${warehouse.id} AND i.quantity > 0
      `;
      debug(`Found ${(rawInventoryItems as any[]).length} inventory items`);
    } catch (error) {
      console.error("Error fetching inventory items:", error);
      throw new Error(`Failed to fetch inventory items: ${error instanceof Error ? error.message : String(error)}`);
    }

    // Create a map of products by ID for quick lookup
    const productsMap = new Map();
    (products as any[]).forEach(product => {
      // Transform raw SQL product into structured object
      productsMap.set(product.id, {
        id: product.id,
        name: product.name,
        sku: product.sku,
        unit: product.unit || 'each',
        description: product.description,
        categoryId: product.categoryId,
        minStockLevel: product.minStockLevel,
        reorderPoint: product.reorderPoint,
        isActive: product.isActive,
        category: product.category_id ? {
          id: product.category_id,
          name: product.category_name
        } : null
      });
    });

    // Transform raw SQL results into structured objects
    const warehouseInventory = (rawInventoryItems as any[])
      .filter(item => productsMap.has(item.productId)) // Only include items with valid products
      .map((item: any) => {
        const product = productsMap.get(item.productId);
        return {
          id: item.id,
          productId: item.productId,
          warehouseId: item.warehouseId,
          quantity: Number(item.quantity),
          costPrice: Number(item.costPrice),
          retailPrice: Number(item.retailPrice),
          status: item.status,
          product: {
            id: product.id,
            name: product.name,
            sku: product.sku,
            unit: product.unit || 'each',
            description: product.description,
            categoryId: product.categoryId,
            category: product.category ? {
              id: product.category.id,
              name: product.category.name
            } : null
          }
        };
      });

    debug(`Processed ${warehouseInventory.length} inventory items with products`);

    // Log a sample item for debugging
    if (warehouseInventory.length > 0) {
      debug("Sample inventory item:", JSON.stringify(warehouseInventory[0], null, 2));
    }

    // Check if there are any inventory items
    if (warehouseInventory.length === 0) {
      return (
        <div className="container mx-auto py-10">
          <div className="mb-8">
            <h1 className="text-3xl font-bold">Create New Transfer</h1>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="text-xl font-bold text-amber-600 mb-2">No Inventory Available</h2>
            <p className="text-gray-700 mb-4">
              There are no products available in the warehouse to transfer. Please add inventory to the warehouse first.
            </p>
            <a href="/inventory/warehouse/adjust" className="inline-block rounded-md bg-blue-600 px-4 py-2 text-white hover:bg-blue-700">
              Add Inventory
            </a>
          </div>
        </div>
      );
    }

    return (
      <div className="container mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create New Transfer</h1>
          <p className="mt-2 text-gray-800">
            Transfer products from the warehouse to stores with optional price adjustments.
          </p>
        </div>

        <EnhancedTransferForm
          warehouseId={warehouse.id}
          warehouseName={warehouse.name}
          stores={stores}
          warehouseInventory={warehouseInventory}
        />
      </div>
    );
  } catch (error) {
    console.error("Error fetching warehouse inventory:", error);
    return (
      <div className="container mx-auto py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Create New Transfer</h1>
        </div>
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="text-xl font-bold text-red-600 mb-2">Error Loading Inventory</h2>
          <p className="text-gray-700 mb-4">There was an error loading the warehouse inventory. Please try again later.</p>
          <pre className="bg-gray-100 p-4 rounded-md overflow-auto text-sm">
            {error instanceof Error ? error.message : String(error)}
          </pre>
        </div>
      </div>
    );
  }
}
