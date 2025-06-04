"use client";

import Link from "next/link";

interface InventoryItem {
  id: string;
  productId: string;
  warehouseId: string | null;
  storeId: string | null;
  quantity: number;
  costPrice: number;
  wholesalePrice: number;
  retailPrice: number;
  status: string;
  condition: string;
  warehouse?: {
    id: string;
    name: string;
    code: string;
  } | null;
  store?: {
    id: string;
    name: string;
    code: string;
  } | null;
  bin?: {
    id: string;
    code: string;
  } | null;
}

interface InventoryTableProps {
  inventoryItems: InventoryItem[];
}

export function InventoryTable({ inventoryItems }: InventoryTableProps) {
  // Separate warehouse and store inventory
  const warehouseItems = inventoryItems.filter(item => item.warehouseId);
  const storeItems = inventoryItems.filter(item => item.storeId);

  return (
    <div className="space-y-6">
      {warehouseItems.length > 0 && (
        <div>
          <h3 className="mb-2 text-md font-medium text-gray-800">Warehouse Inventory</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                  <th className="px-4 py-2">Warehouse</th>
                  <th className="px-4 py-2">Location</th>
                  <th className="px-4 py-2">Quantity</th>
                  <th className="px-4 py-2">Condition</th>
                  <th className="px-4 py-2">Cost Price</th>
                  <th className="px-4 py-2">Wholesale Price</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {warehouseItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-600">
                      <Link href={`/warehouses/${item.warehouseId}`}>
                        {item.warehouse?.name} ({item.warehouse?.code})
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                      {item.bin ? item.bin.code : "Not Assigned"}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${item.condition === "NEW" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}`}>
                        {item.condition === "NEW" ? "New" : "Damaged"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                      ${item.costPrice.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                      ${item.wholesalePrice.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/inventory/warehouse/adjust/${item.id}`}
                          className="rounded bg-green-50 p-1 text-green-600 hover:bg-green-100"
                          title="Adjust Inventory"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/inventory/warehouse/move/${item.id}`}
                          className="rounded bg-purple-50 p-1 text-purple-600 hover:bg-purple-100"
                          title="Move Inventory"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {storeItems.length > 0 && (
        <div>
          <h3 className="mb-2 text-md font-medium text-gray-800">Store Inventory</h3>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse">
              <thead>
                <tr className="border-b text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                  <th className="px-4 py-2">Store</th>
                  <th className="px-4 py-2">Quantity</th>
                  <th className="px-4 py-2">Condition</th>
                  <th className="px-4 py-2">Cost Price</th>
                  <th className="px-4 py-2">Retail Price</th>
                  <th className="px-4 py-2">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200">
                {storeItems.map((item) => (
                  <tr key={item.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium text-blue-600">
                      <Link href={`/stores/${item.storeId}`}>
                        {item.store?.name} ({item.store?.code})
                      </Link>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm font-medium">
                      {item.quantity}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm">
                      <span className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${item.condition === "NEW" ? "bg-blue-100 text-blue-800" : "bg-orange-100 text-orange-800"}`}>
                        {item.condition === "NEW" ? "New" : "Damaged"}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                      ${item.costPrice.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm text-gray-800">
                      ${item.retailPrice.toFixed(2)}
                    </td>
                    <td className="whitespace-nowrap px-4 py-2 text-sm">
                      <div className="flex items-center gap-2">
                        <Link
                          href={`/inventory/store/adjust/${item.id}`}
                          className="rounded bg-green-50 p-1 text-green-600 hover:bg-green-100"
                          title="Adjust Inventory"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v6m3-3H9m12 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                          </svg>
                        </Link>
                        <Link
                          href={`/pos?product=${item.productId}&store=${item.storeId}`}
                          className="rounded bg-orange-50 p-1 text-orange-600 hover:bg-orange-100"
                          title="Sell"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                          </svg>
                        </Link>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
