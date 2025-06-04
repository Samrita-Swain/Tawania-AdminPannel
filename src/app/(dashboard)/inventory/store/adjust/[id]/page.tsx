import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import InventoryAdjustmentForm from "@/components/inventory/InventoryAdjustmentForm";

interface InventoryAdjustPageProps {
  params: Promise<{ id: string }>;
}

interface InventoryItem {
  id: string;
  quantity: number;
  costPrice: number;
  retailPrice: number;
  status: string;
  product: {
    id: string;
    name: string;
    sku: string;
    reorderPoint: number | null;
    minStockLevel: number | null;
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

export default async function InventoryAdjustPage({ params }: InventoryAdjustPageProps) {
  const session = await getServerSession(authOptions);
  
  if (!session) {
    redirect("/auth/signin");
  }

  const { id } = await params;

  // Get inventory item details
  let inventoryItem: InventoryItem | null = null;

  try {
    inventoryItem = await prisma.inventoryItem.findUnique({
      where: { id },
      select: {
        id: true,
        quantity: true,
        costPrice: true,
        retailPrice: true,
        status: true,
        product: {
          select: {
            id: true,
            name: true,
            sku: true,
            reorderPoint: true,
            minStockLevel: true,
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

  } catch (error) {
    console.error("Error fetching inventory item:", error);
  }

  if (!inventoryItem) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-bold text-gray-800">Adjust Inventory</h1>
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

  // Calculate stock status
  let stockStatus = "Normal";
  let statusColor = "bg-green-100 text-green-800";

  if (inventoryItem.quantity <= 0) {
    stockStatus = "Out of Stock";
    statusColor = "bg-red-100 text-red-800";
  } else if (inventoryItem.product?.reorderPoint && inventoryItem.quantity < inventoryItem.product.reorderPoint) {
    stockStatus = "Low Stock";
    statusColor = "bg-yellow-100 text-yellow-800";
  } else if (inventoryItem.product?.minStockLevel && inventoryItem.quantity < inventoryItem.product.minStockLevel) {
    stockStatus = "Below Min";
    statusColor = "bg-orange-100 text-orange-800";
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Adjust Inventory</h1>
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
            <p className="text-sm text-gray-800 font-medium">{inventoryItem.product?.name || "Unknown Product"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">SKU</label>
            <p className="text-sm text-gray-800">{inventoryItem.product?.sku || "N/A"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Store</label>
            <p className="text-sm text-gray-800">{inventoryItem.store?.name || "Unknown Store"}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Category</label>
            <p className="text-sm text-gray-800">{inventoryItem.product?.category?.name || "Uncategorized"}</p>
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mt-4">
          <div>
            <label className="block text-sm font-medium text-gray-600">Current Quantity</label>
            <p className="text-lg font-bold text-gray-800">{inventoryItem.quantity}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Cost Price</label>
            <p className="text-sm text-gray-800">${inventoryItem.costPrice.toFixed(2)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Retail Price</label>
            <p className="text-sm text-gray-800">${inventoryItem.retailPrice.toFixed(2)}</p>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-600">Status</label>
            <span className={`inline-block rounded-full px-2 py-1 text-xs font-medium ${statusColor}`}>
              {stockStatus}
            </span>
          </div>
        </div>
      </div>

      {/* Adjustment Form */}
      <InventoryAdjustmentForm inventoryItem={inventoryItem} />
    </div>
  );
}
