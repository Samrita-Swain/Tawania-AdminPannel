import { Metadata } from "next";
import { AutoReorderDashboard } from "./_components/auto-reorder-dashboard";
import { prisma } from "@/lib/prisma";

export const metadata: Metadata = {
  title: "Auto-Reorder Dashboard",
  description: "Manage inventory auto-reordering",
};

export default async function AutoReorderPage() {
  // Fetch warehouses, stores, and suppliers directly
  const [warehouses, stores, suppliers] = await Promise.all([
    prisma.warehouse.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.store.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
    prisma.supplier.findMany({
      where: { isActive: true },
      orderBy: { name: 'asc' },
    }),
  ]);

  return (
    <div className="container mx-auto py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight">Auto-Reorder Dashboard</h1>
        <p className="text-gray-800">
          Monitor inventory levels and automatically generate purchase orders for items below reorder points
        </p>
      </div>

      <div className="bg-white rounded-lg shadow">
        <AutoReorderDashboard
          warehouses={warehouses}
          stores={stores}
          suppliers={suppliers}
        />
      </div>
    </div>
  );
}
