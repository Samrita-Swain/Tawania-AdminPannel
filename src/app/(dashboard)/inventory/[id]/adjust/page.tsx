import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { notFound } from "next/navigation";
import { use } from "react";
import { InventoryAdjustmentForm } from "../../_components/inventory-adjustment-form";

export default async function InventoryAdjustmentPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = use(params);
  const session = await getServerSession(authOptions);
  const inventoryId = id;

  // Get inventory item with related data
  const inventoryItem = await prisma.inventoryItem.findUnique({
    where: { id: inventoryId },
    include: {
      product: {
        include: {
          category: true,
        },
      },
      warehouse: true,
      store: true,
    },
  });

  if (!inventoryItem) {
    notFound();
  }

  // Get adjustment reasons
  const adjustmentReasons = [
    { id: "STOCK_COUNT", name: "Stock Count" },
    { id: "DAMAGE", name: "Damage" },
    { id: "EXPIRY", name: "Expiry" },
    { id: "THEFT", name: "Theft/Loss" },
    { id: "RETURN", name: "Return" },
    { id: "CORRECTION", name: "Data Correction" },
    { id: "OTHER", name: "Other" },
  ];

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold text-gray-800">Adjust Inventory</h1>

      <div className="rounded-lg bg-white p-6 shadow-md">
        <div className="mb-6 grid gap-4 md:grid-cols-3">
          <div>
            <h3 className="text-sm font-medium text-gray-500">Product</h3>
            <p className="mt-1 text-base font-medium text-gray-900">{inventoryItem.product.name}</p>
            <p className="text-sm text-gray-500">{inventoryItem.product.sku}</p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Location</h3>
            <p className="mt-1 text-base font-medium text-gray-900">
              {inventoryItem.warehouse?.name || inventoryItem.store?.name}
            </p>
            <p className="text-sm text-gray-500">
              {inventoryItem.warehouse ? "Warehouse" : "Store"}
            </p>
          </div>
          <div>
            <h3 className="text-sm font-medium text-gray-500">Current Quantity</h3>
            <p className="mt-1 text-base font-medium text-gray-900">
              {inventoryItem.quantity} {inventoryItem.product.unit}
            </p>
            <p className="text-sm text-gray-500">
              Reserved: {inventoryItem.reservedQuantity} {inventoryItem.product.unit}
            </p>
          </div>
        </div>

        <InventoryAdjustmentForm
          inventoryItem={inventoryItem}
          adjustmentReasons={adjustmentReasons}
        />
      </div>
    </div>
  );
}
