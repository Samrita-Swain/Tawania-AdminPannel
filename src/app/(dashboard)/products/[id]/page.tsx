import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { InventoryTable } from "../_components/inventory-table";

export default async function ProductDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await getServerSession(authOptions);
  const resolvedParams = await params;

  // Get the product ID from the params
  const productId = resolvedParams.id;

  // Log the product ID to help with debugging
  console.log("Detail page - Product ID:", productId);

  // Check if the product ID is valid
  if (!productId || productId === "unknown" || productId === "undefined") {
    console.error("Invalid product ID:", productId);
    // Redirect to the products list page
    redirect("/products");
  }

  // Get product details using raw SQL to avoid schema mismatches
  try {
    console.log("Fetching product with ID:", productId);

    const productResult = await prisma.$queryRaw`
      SELECT p.id, p.name, p.sku, p.description, p."categoryId", p."costPrice",
             p."wholesalePrice", p."retailPrice",
             COALESCE(p."minStockLevel", 10) as "minStockLevel",
             COALESCE(p."reorderPoint", 5) as "reorderPoint",
             p.barcode, COALESCE(p."isActive", true) as "isActive",
             p."createdAt", p."updatedAt",
             c.id as "category_id", c.name as "category_name"
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      WHERE p.id = ${productId}
    `;

    console.log("Product query result:", productResult);

    // Format the product data
    const product = productResult.length > 0 ? {
      ...productResult[0],
      category: productResult[0].category_id ? {
        id: productResult[0].category_id,
        name: productResult[0].category_name
      } : null
    } : null;

    if (!product) {
      console.error("Product not found with ID:", productId);
      notFound();
    }

    // Get inventory items for this product using raw SQL
    const inventoryItemsResult = await prisma.$queryRaw`
      SELECT i.id, i."productId", i."warehouseId", i."storeId", i.quantity,
             i."costPrice", i."retailPrice", i.status, i."createdAt", i."updatedAt",
             w.id as "warehouse_id", w.name as "warehouse_name",
             s.id as "store_id", s.name as "store_name"
      FROM "InventoryItem" i
      LEFT JOIN "Warehouse" w ON i."warehouseId" = w.id
      LEFT JOIN "Store" s ON i."storeId" = s.id
      WHERE i."productId" = ${productId}
      ORDER BY w.name ASC NULLS LAST, s.name ASC NULLS LAST
    `;

    // Format the inventory items data
    const inventoryItems = inventoryItemsResult.map((item: any) => ({
      id: item.id,
      productId: item.productId,
      warehouseId: item.warehouseId,
      storeId: item.storeId,
      quantity: item.quantity,
      costPrice: item.costPrice,
      retailPrice: item.retailPrice,
      status: item.status,
      createdAt: item.createdAt,
      updatedAt: item.updatedAt,
      warehouse: item.warehouse_id ? {
        id: item.warehouse_id,
        name: item.warehouse_name
      } : null,
      store: item.store_id ? {
        id: item.store_id,
        name: item.store_name
      } : null
    }));

    // Calculate total inventory
    const totalInventory = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
    const warehouseInventory = inventoryItems
      .filter(item => item.warehouseId)
      .reduce((sum, item) => sum + item.quantity, 0);
    const storeInventory = inventoryItems
      .filter(item => item.storeId)
      .reduce((sum, item) => sum + item.quantity, 0);

    // Calculate inventory value
    const inventoryValue = inventoryItems.reduce((sum, item) => {
      return sum + (item.quantity * (item.costPrice || 0));
    }, 0);

    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">{product.name}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/products/${product.id}/edit`}
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Edit Product
          </Link>
          <Link
            href="/products"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
          >
            Back to Products
          </Link>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          {/* Product Details */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Product Details</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-gray-500">SKU</p>
                <p className="font-medium">{product.sku}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Category</p>
                <p className="font-medium">{product.category?.name || "Uncategorized"}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Status</p>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${product.isActive ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
                  {product.isActive ? "Active" : "Inactive"}
                </span>
              </div>
              {/* Removed condition field since it doesn't exist on the product type */}
              <div>
                <p className="text-sm text-gray-500">Barcode</p>
                <p className="font-medium">{product.barcode || "Not set"}</p>
              </div>
              <div className="md:col-span-2">
                <p className="text-sm text-gray-500">Description</p>
                <p className="font-medium">{product.description || "No description"}</p>
              </div>
            </div>
          </div>

          {/* Pricing Information */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Pricing Information</h2>
            <div className="grid gap-4 md:grid-cols-3">
              <div>
                <p className="text-sm text-gray-500">Cost Price</p>
                <p className="text-xl font-bold text-gray-900">₹{product.costPrice.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Wholesale Price</p>
                <p className="text-xl font-bold text-gray-900">₹{product.wholesalePrice.toFixed(2)}</p>
                <p className="text-xs text-gray-500">
                  Margin: {calculateMargin(product.wholesalePrice, product.costPrice)}%
                </p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Retail Price</p>
                <p className="text-xl font-bold text-gray-900">₹{product.retailPrice.toFixed(2)}</p>
                <p className="text-xs text-gray-500">
                  Margin: {calculateMargin(product.retailPrice, product.costPrice)}%
                </p>
              </div>
            </div>
          </div>

          {/* Inventory Information */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Inventory Information</h2>
            <div className="grid gap-4 md:grid-cols-4">
              <div>
                <p className="text-sm text-gray-500">Total Inventory</p>
                <p className="text-xl font-bold text-gray-900">{totalInventory}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Warehouse Inventory</p>
                <p className="text-xl font-bold text-gray-900">{warehouseInventory}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Store Inventory</p>
                <p className="text-xl font-bold text-gray-900">{storeInventory}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Inventory Value</p>
                <p className="text-xl font-bold text-gray-900">₹{inventoryValue.toFixed(2)}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Min Stock Level</p>
                <p className="font-medium">{product.minStockLevel}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Reorder Point</p>
                <p className="font-medium">{product.reorderPoint}</p>
              </div>
              <div>
                <p className="text-sm text-gray-500">Stock Status</p>
                <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${getStockStatusClass(totalInventory, product.minStockLevel, product.reorderPoint)}`}>
                  {getStockStatus(totalInventory, product.minStockLevel, product.reorderPoint)}
                </span>
              </div>
            </div>
          </div>

          {/* Inventory Locations */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Inventory Locations</h2>
            {inventoryItems.length > 0 ? (
              <InventoryTable
                inventoryItems={inventoryItems.map(item => ({
                  ...item,
                  // Since these properties don't exist on either type, provide default values
                  wholesalePrice: product.wholesalePrice,
                  condition: 'NEW' // Default to NEW since condition doesn't exist on either type
                }))}
              />
            ) : (
              <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-gray-300">
                <p className="text-gray-500">No inventory found for this product</p>
              </div>
            )}
          </div>
        </div>

        {/* Actions */}
        <div className="space-y-6">
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Actions</h2>
            <div className="space-y-3">
              <Link
                href={`/products/${product.id}/barcode`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 3.75 9.375v-4.5ZM3.75 14.625c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5a1.125 1.125 0 0 1-1.125-1.125v-4.5ZM13.5 4.875c0-.621.504-1.125 1.125-1.125h4.5c.621 0 1.125.504 1.125 1.125v4.5c0 .621-.504 1.125-1.125 1.125h-4.5A1.125 1.125 0 0 1 13.5 9.375v-4.5Z" />
                </svg>
                Generate Barcode
              </Link>
              <Link
                href={`/inventory/warehouse/adjust?product=${product.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-green-100 px-4 py-2 text-sm font-medium text-green-700 hover:bg-green-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                </svg>
                Adjust Inventory
              </Link>
              <Link
                href={`/transfers/new?product=${product.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-purple-100 px-4 py-2 text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
                Transfer Product
              </Link>
              <Link
                href={`/pos?product=${product.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-md bg-orange-100 px-4 py-2 text-sm font-medium text-orange-700 hover:bg-orange-200 transition-colors"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
                Sell Product
              </Link>
            </div>
          </div>

          {/* Product History */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Product History</h2>
            <div className="space-y-3">
              <Link
                href={`/products/${product.id}/history/inventory`}
                className="flex w-full items-center justify-between rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <span>Inventory History</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
              <Link
                href={`/products/${product.id}/history/transfers`}
                className="flex w-full items-center justify-between rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <span>Transfer History</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
              <Link
                href={`/products/${product.id}/history/sales`}
                className="flex w-full items-center justify-between rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
              >
                <span>Sales History</span>
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" />
                </svg>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
    );
  } catch (error) {
    console.error("Error loading product details:", error);
    console.error("Product ID that caused the error:", productId);

    if (error instanceof Error) {
      console.error("Error message:", error.message);
      console.error("Error stack:", error.stack);
    }

    // Return a more user-friendly error page
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4">
        <div className="bg-white rounded-lg shadow-md p-8 max-w-md w-full text-center">
          <h1 className="text-2xl font-bold text-red-600 mb-4">Error Loading Product</h1>
          <p className="text-gray-700 mb-6">
            We encountered an error while trying to load this product. The product may not exist or there might be a temporary issue.
          </p>
          <div className="flex justify-center">
            <Link
              href="/products"
              className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
            >
              Return to Products
            </Link>
          </div>
        </div>
      </div>
    );
  }
}

function calculateMargin(sellingPrice: number, costPrice: number): string {
  if (costPrice <= 0) return "0";
  const margin = ((sellingPrice - costPrice) / sellingPrice) * 100;
  return margin.toFixed(2);
}

function getStockStatus(quantity: number, minStockLevel: number, reorderPoint: number): string {
  if (quantity <= 0) {
    return "Out of Stock";
  } else if (quantity < reorderPoint) {
    return "Low Stock";
  } else if (quantity < minStockLevel) {
    return "Below Min";
  } else {
    return "Normal";
  }
}

function getStockStatusClass(quantity: number, minStockLevel: number, reorderPoint: number): string {
  if (quantity <= 0) {
    return "bg-red-100 text-red-800";
  } else if (quantity < reorderPoint) {
    return "bg-yellow-100 text-yellow-800";
  } else if (quantity < minStockLevel) {
    return "bg-orange-100 text-orange-800";
  } else {
    return "bg-green-100 text-green-800";
  }
}

