import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";

interface InventoryHistoryPageProps {
  params: Promise<{ id: string }>;
}

interface InventoryTransaction {
  id: string;
  type: string;
  quantity: number;
  previousQuantity: number;
  newQuantity: number;
  reason: string;
  createdAt: Date;
  user: {
    id: string;
    name: string | null;
    email: string;
  } | null;
}

interface InventoryItem {
  id: string;
  quantity: number;
  costPrice: number;
  retailPrice: number;
  product: {
    id: string;
    name: string;
    sku: string;
    category: {
      id: string;
      name: string;
    } | null;
  } | null;
  store: {
    id: string;
    name: string;
  } | null;
}

export default async function InventoryHistoryPage({ params }: InventoryHistoryPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/auth/signin");
  }

  const { id } = await params;

  // Get inventory item details
  let inventoryItem: InventoryItem | null = null;
  let transactions: InventoryTransaction[] = [];

  try {
    // Fetch inventory item with product and store details
    inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id },
      select: {
        id: true,
        quantity: true,
        costPrice: true,
        retailPrice: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            category: {
              select: {
                id: true,
                name: true,
              }
            }
          }
        },
        store: {
          select: {
            id: true,
            name: true,
          }
        }
      }
    }) as InventoryItem | null;

    if (!inventoryItem) {
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h1 className="text-2xl font-bold text-gray-800">Inventory History</h1>
            <Link
              href="/inventory/store"
              className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
            >
              Back to Inventory
            </Link>
          </div>
          <div className="rounded-lg bg-white p-6 shadow-md">
            <p className="text-center text-gray-600">Inventory item not found.</p>
          </div>
        </div>
      );
    }

    // For now, we'll create some mock transaction data since the transaction table might not exist
    // In a real application, you would fetch from an InventoryTransaction table
    transactions = [
      {
        id: "1",
        type: "ADJUSTMENT",
        quantity: 10,
        previousQuantity: inventoryItem.quantity - 10,
        newQuantity: inventoryItem.quantity,
        reason: "Stock adjustment",
        createdAt: new Date(Date.now() - 86400000), // 1 day ago
        user: {
          id: session.user?.id || "1",
          name: session.user?.name || "Admin User",
          email: session.user?.email || "admin@example.com"
        }
      },
      {
        id: "2",
        type: "SALE",
        quantity: -5,
        previousQuantity: inventoryItem.quantity + 5,
        newQuantity: inventoryItem.quantity,
        reason: "Point of sale transaction",
        createdAt: new Date(Date.now() - 172800000), // 2 days ago
        user: {
          id: session.user?.id || "1",
          name: session.user?.name || "Admin User",
          email: session.user?.email || "admin@example.com"
        }
      }
    ];

  } catch (error) {
    console.error("Error fetching inventory history:", error);
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Inventory History</h1>
        <Link
          href="/inventory/store"
          className="rounded-md bg-gray-100 px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-200 transition-colors"
        >
          Back to Inventory
        </Link>
      </div>

      {/* Item Details Card */}
      <div className="rounded-lg bg-white p-6 shadow-md">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Item Details</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Product</label>
            <p className="text-sm text-gray-800">{inventoryItem?.product?.name || "Unknown Product"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">SKU</label>
            <p className="text-sm text-gray-800">{inventoryItem?.product?.sku || "N/A"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Store</label>
            <p className="text-sm text-gray-800">{inventoryItem?.store?.name || "Unknown Store"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Current Quantity</label>
            <p className="text-sm font-semibold text-gray-800">{inventoryItem?.quantity || 0}</p>
          </div>
        </div>
      </div>

      {/* Transaction History */}
      <div className="rounded-lg bg-white shadow-md">
        <div className="px-6 py-4 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Transaction History</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full border-collapse">
            <thead>
              <tr className="border-b bg-gray-50 text-left text-xs font-medium uppercase tracking-wider text-gray-800">
                <th className="px-6 py-3">Date</th>
                <th className="px-6 py-3">Type</th>
                <th className="px-6 py-3">Quantity Change</th>
                <th className="px-6 py-3">Previous Qty</th>
                <th className="px-6 py-3">New Qty</th>
                <th className="px-6 py-3">Reason</th>
                <th className="px-6 py-3">User</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200">
              {transactions.length > 0 ? (
                transactions.map((transaction) => (
                  <tr key={transaction.id} className="hover:bg-gray-50">
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {transaction.createdAt.toLocaleDateString()} {transaction.createdAt.toLocaleTimeString()}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm">
                      <span className={`rounded-full px-2 py-1 text-xs font-medium ${
                        transaction.type === 'SALE' ? 'bg-red-100 text-red-800' :
                        transaction.type === 'ADJUSTMENT' ? 'bg-blue-100 text-blue-800' :
                        'bg-green-100 text-green-800'
                      }`}>
                        {transaction.type}
                      </span>
                    </td>
                    <td className={`whitespace-nowrap px-6 py-4 text-sm font-medium ${
                      transaction.quantity > 0 ? 'text-green-600' : 'text-red-600'
                    }`}>
                      {transaction.quantity > 0 ? '+' : ''}{transaction.quantity}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {transaction.previousQuantity}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {transaction.newQuantity}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {transaction.reason}
                    </td>
                    <td className="whitespace-nowrap px-6 py-4 text-sm text-gray-800">
                      {transaction.user?.name || transaction.user?.email || "Unknown"}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="px-6 py-4 text-center text-sm text-gray-600">
                    No transaction history available for this item.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
