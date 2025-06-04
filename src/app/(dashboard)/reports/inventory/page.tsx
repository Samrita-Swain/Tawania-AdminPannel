import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { InventoryReportFilters } from "./_components/inventory-report-filters";
import { InventoryByCategoryChart } from "./_components/inventory-by-category-chart";
import { InventoryByLocationChart } from "./_components/inventory-by-location-chart";

export default async function InventoryReportPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);
  
  // Parse search parameters
  const warehouseId = searchParams.warehouse as string | undefined;
  const storeId = searchParams.store as string | undefined;
  const categoryId = searchParams.category as string | undefined;
  const stockStatus = searchParams.status as string | undefined;
  
  // Build query filters for inventory items
  const filters: any = {};
  
  if (warehouseId) {
    filters.warehouseId = warehouseId;
  }
  
  if (storeId) {
    filters.storeId = storeId;
  }
  
  if (categoryId) {
    filters.product = {
      categoryId,
    };
  }
  
  if (stockStatus === "low") {
    filters.quantity = {
      gt: 0,
      lt: {
        path: ["product", "reorderPoint"],
      },
    };
  } else if (stockStatus === "out") {
    filters.quantity = {
      lte: 0,
    };
  } else if (stockStatus === "overstock") {
    filters.quantity = {
      gt: {
        path: ["product", "maxStockLevel"],
      },
    };
  }
  
  // Get inventory data
  const [inventoryItems, warehouses, stores, categories] = await Promise.all([
    prisma.inventoryItem.findMany({
      where: filters,
      include: {
        product: {
          include: {
            category: true,
          },
        },
        warehouse: true,
        store: true,
      },
    }),
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.store.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.category.findMany({
      orderBy: { name: 'asc' },
    }),
  ]);
  
  // Calculate total inventory value
  const totalInventoryValue = inventoryItems.reduce((sum, item) => {
    return sum + (item.quantity * item.costPrice);
  }, 0);
  
  // Calculate total inventory items
  const totalInventoryItems = inventoryItems.reduce((sum, item) => sum + item.quantity, 0);
  
  // Calculate low stock items
  const lowStockItems = inventoryItems.filter(item => 
    item.quantity > 0 && 
    item.quantity < item.product.reorderPoint
  );
  
  // Calculate out of stock items
  const outOfStockItems = inventoryItems.filter(item => 
    item.quantity <= 0
  );
  
  // Group inventory by category
  const inventoryByCategory = groupInventoryByCategory(inventoryItems);
  
  // Group inventory by location
  const inventoryByLocation = groupInventoryByLocation(inventoryItems);
  
  // Get top inventory value products
  const topValueProducts = getTopValueProducts(inventoryItems);
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Inventory Report</h1>
        <div className="flex items-center gap-2">
          <Link
            href="/reports"
            className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-200 transition-colors"
          >
            Back to Reports
          </Link>
        </div>
      </div>
      
      <InventoryReportFilters 
        warehouses={warehouses} 
        stores={stores}
        categories={categories}
        currentWarehouseId={warehouseId}
        currentStoreId={storeId}
        currentCategoryId={categoryId}
        currentStockStatus={stockStatus}
      />
      
      {/* Summary Cards */}
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Total Inventory Value</p>
              <p className="text-2xl font-bold text-gray-900">${totalInventoryValue.toFixed(2)}</p>
            </div>
            <div className="rounded-full bg-blue-100 p-3 text-blue-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v12m-3-2.818.879.659c1.171.879 3.07.879 4.242 0 1.172-.879 1.172-2.303 0-3.182C13.536 12.219 12.768 12 12 12c-.725 0-1.45-.22-2.003-.659-1.106-.879-1.106-2.303 0-3.182s2.9-.879 4.006 0l.415.33M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            At cost price
          </p>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Total Items</p>
              <p className="text-2xl font-bold text-gray-900">{totalInventoryItems}</p>
            </div>
            <div className="rounded-full bg-green-100 p-3 text-green-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5m8.25 3v6.75m0 0-3-3m3 3 3-3M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            In stock
          </p>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Low Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{lowStockItems.length}</p>
            </div>
            <div className="rounded-full bg-yellow-100 p-3 text-yellow-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            Below reorder point
          </p>
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-800">Out of Stock Items</p>
              <p className="text-2xl font-bold text-gray-900">{outOfStockItems.length}</p>
            </div>
            <div className="rounded-full bg-red-100 p-3 text-red-600">
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18 18 6M6 6l12 12" />
              </svg>
            </div>
          </div>
          <p className="mt-2 text-sm text-gray-800">
            Need attention
          </p>
        </div>
      </div>
      
      {/* Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Inventory Value by Category</h2>
          <InventoryByCategoryChart data={inventoryByCategory} />
        </div>
        
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Inventory Value by Location</h2>
          <InventoryByLocationChart data={inventoryByLocation} />
        </div>
      </div>
      
      {/* Top Value Products Table */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="mb-4 text-lg font-semibold text-gray-800">Top Inventory Value Products</h2>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                <th className="px-6 py-3">Product</th>
                <th className="px-6 py-3">Category</th>
                <th className="px-6 py-3">Location</th>
                <th className="px-6 py-3">Quantity</th>
                <th className="px-6 py-3">Cost Price</th>
                <th className="px-6 py-3">Total Value</th>
                <th className="px-6 py-3">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {topValueProducts.map((product) => (
                <tr key={product.id} className="hover:bg-gray-50">
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                    <Link href={`/products/${product.productId}`}>
                      {product.productName}
                    </Link>
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {product.category}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {product.location}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    {product.quantity}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                    ${product.costPrice.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm font-medium">
                    ${product.value.toFixed(2)}
                  </td>
                  <td className="whitespace-nowrap px-6 py-4 text-sm">
                    <span className={`rounded-full px-2 py-1 text-xs font-medium ${getStockStatusClass(product.status)}`}>
                      {product.status}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
      
      {/* Low Stock Items Table */}
      {lowStockItems.length > 0 && (
        <div className="rounded-lg bg-white p-6 shadow-md">
          <h2 className="mb-4 text-lg font-semibold text-gray-800">Low Stock Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                  <th className="px-6 py-3">Product</th>
                  <th className="px-6 py-3">Category</th>
                  <th className="px-6 py-3">Location</th>
                  <th className="px-6 py-3">Current Stock</th>
                  <th className="px-6 py-3">Reorder Point</th>
                  <th className="px-6 py-3">Min Stock</th>
                  <th className="px-6 py-3">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {lowStockItems.slice(0, 10).map((item) => {
                  const location = item.warehouseId 
                    ? `Warehouse: ${item.warehouse?.name}`
                    : `Store: ${item.store?.name}`;
                  
                  return (
                    <tr key={item.id} className="hover:bg-gray-50">
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-blue-600">
                        <Link href={`/products/${item.productId}`}>
                          {item.product.name}
                        </Link>
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        {item.product.category?.name || "Uncategorized"}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        {location}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm font-medium text-yellow-600">
                        {item.quantity}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        {item.product.reorderPoint}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                        {item.product.minStockLevel}
                      </td>
                      <td className="whitespace-nowrap px-6 py-4 text-sm">
                        <div className="flex items-center gap-2">
                          <Link
                            href={item.warehouseId 
                              ? `/inventory/warehouse/adjust/${item.id}`
                              : `/inventory/store/adjust/${item.id}`
                            }
                            className="rounded bg-green-50 p-1 text-green-600 hover:bg-green-100"
                            title="Adjust Inventory"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                            </svg>
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
            
            {lowStockItems.length > 10 && (
              <div className="mt-4 text-center">
                <Link
                  href="/inventory/warehouse?filter=lowStock"
                  className="text-sm font-medium text-blue-600 hover:text-blue-800"
                >
                  View All Low Stock Items
                </Link>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Helper functions
function groupInventoryByCategory(inventoryItems: any[]): any[] {
  const categoryMap = new Map();
  
  inventoryItems.forEach(item => {
    const categoryId = item.product.categoryId;
    const categoryName = item.product.category.name;
    const value = item.quantity * item.costPrice;
    
    if (categoryMap.has(categoryId)) {
      categoryMap.set(categoryId, {
        ...categoryMap.get(categoryId),
        value: categoryMap.get(categoryId).value + value,
        quantity: categoryMap.get(categoryId).quantity + item.quantity,
      });
    } else {
      categoryMap.set(categoryId, {
        id: categoryId,
        name: categoryName,
        value,
        quantity: item.quantity,
      });
    }
  });
  
  return Array.from(categoryMap.values())
    .sort((a, b) => b.value - a.value);
}

function groupInventoryByLocation(inventoryItems: any[]): any[] {
  const warehouseMap = new Map();
  const storeMap = new Map();
  
  inventoryItems.forEach(item => {
    const value = item.quantity * item.costPrice;
    
    if (item.warehouseId) {
      const warehouseId = item.warehouseId;
      const warehouseName = item.warehouse.name;
      
      if (warehouseMap.has(warehouseId)) {
        warehouseMap.set(warehouseId, {
          ...warehouseMap.get(warehouseId),
          value: warehouseMap.get(warehouseId).value + value,
          quantity: warehouseMap.get(warehouseId).quantity + item.quantity,
        });
      } else {
        warehouseMap.set(warehouseId, {
          id: warehouseId,
          name: warehouseName,
          type: 'Warehouse',
          value,
          quantity: item.quantity,
        });
      }
    } else if (item.storeId) {
      const storeId = item.storeId;
      const storeName = item.store.name;
      
      if (storeMap.has(storeId)) {
        storeMap.set(storeId, {
          ...storeMap.get(storeId),
          value: storeMap.get(storeId).value + value,
          quantity: storeMap.get(storeId).quantity + item.quantity,
        });
      } else {
        storeMap.set(storeId, {
          id: storeId,
          name: storeName,
          type: 'Store',
          value,
          quantity: item.quantity,
        });
      }
    }
  });
  
  const warehouseData = Array.from(warehouseMap.values());
  const storeData = Array.from(storeMap.values());
  
  return [...warehouseData, ...storeData]
    .sort((a, b) => b.value - a.value);
}

function getTopValueProducts(inventoryItems: any[]): any[] {
  return inventoryItems
    .map(item => {
      const value = item.quantity * item.costPrice;
      let status = "Normal";
      
      if (item.quantity <= 0) {
        status = "Out of Stock";
      } else if (item.quantity < item.product.reorderPoint) {
        status = "Low Stock";
      } else if (item.quantity < item.product.minStockLevel) {
        status = "Below Min";
      }
      
      const location = item.warehouseId 
        ? `Warehouse: ${item.warehouse?.name}`
        : `Store: ${item.store?.name}`;
      
      return {
        id: item.id,
        productId: item.productId,
        productName: item.product.name,
        category: item.product.category?.name || "Uncategorized",
        location,
        quantity: item.quantity,
        costPrice: item.costPrice,
        value,
        status,
      };
    })
    .sort((a, b) => b.value - a.value)
    .slice(0, 10); // Top 10 products by value
}

function getStockStatusClass(status: string): string {
  switch (status) {
    case "Out of Stock":
      return "bg-red-100 text-red-800";
    case "Low Stock":
      return "bg-yellow-100 text-yellow-800";
    case "Below Min":
      return "bg-orange-100 text-orange-800";
    default:
      return "bg-green-100 text-green-800";
  }
}

