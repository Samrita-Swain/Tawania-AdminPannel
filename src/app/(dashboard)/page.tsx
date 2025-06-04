import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import Link from "next/link";
import { TransferStatus } from "@prisma/client"; // Import the enum from Prisma

export default async function DashboardPage() {
  const session = await getServerSession(authOptions);

  // Get counts for dashboard
  const warehouseCount = await prisma.warehouse.count();
  const storeCount = await prisma.store.count();
  const productCount = await prisma.product.count();

  // Find low stock items by joining with products and comparing quantity to reorderPoint
  const lowStockItems = await prisma.$queryRaw`
    SELECT COUNT(*) as count
    FROM "InventoryItem" i
    JOIN "Product" p ON i."productId" = p.id
    WHERE i.quantity < p."reorderPoint"
  `.then((result: any) => Number(result[0].count));

  const pendingTransfers = await prisma.transfer.count({
    where: {
      status: TransferStatus.PENDING // Use the enum instead of string
    }
  });

  return (
    <div className="space-y-6">
      <div className="mb-8 flex items-center justify-between rounded-lg bg-white p-6 shadow-md">
        <h1 className="text-2xl font-bold text-gray-800">Dashboard</h1>
        <div className="rounded-full bg-gradient-to-r from-blue-500 to-purple-600 px-4 py-2 text-sm font-medium text-white">
          Welcome back, {session?.user?.name}
        </div>
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
        <DashboardCard
          title="Warehouses"
          value={warehouseCount}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M8.25 21v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21m0 0h4.5V3.545M12.75 21h7.5V10.75M2.25 21h1.5m18 0h-18M2.25 9l4.5-1.636M18.75 3l-1.5.545m0 6.205 3 1m1.5.5-1.5-.5M6.75 7.364V3h-3v18m3-13.636 10.5-3.819" />
            </svg>
          }
          href="/warehouses"
          color="purple"
        />
        <DashboardCard
          title="Stores"
          value={storeCount}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 21v-7.5a.75.75 0 0 1 .75-.75h3a.75.75 0 0 1 .75.75V21m-4.5 0H2.36m11.14 0H18m0 0h3.64m-1.39 0V9.349M3.75 21V9.349m0 0a3.001 3.001 0 0 0 3.75-.615A2.993 2.993 0 0 0 9.75 9.75c.896 0 1.7-.393 2.25-1.016a2.993 2.993 0 0 0 2.25 1.016c.896 0 1.7-.393 2.25-1.016a3.001 3.001 0 0 0 3.75.614m-16.5 0a3.004 3.004 0 0 1-.621-4.72l1.189-1.19A1.5 1.5 0 0 1 5.378 3h13.243a1.5 1.5 0 0 1 1.06.44l1.19 1.189a3 3 0 0 1-.621 4.72M6.75 18h3.75a.75.75 0 0 0 .75-.75V13.5a.75.75 0 0 0-.75-.75H6.75a.75.75 0 0 0-.75.75v3.75c0 .414.336.75.75.75Z" />
            </svg>
          }
          href="/stores"
          color="blue"
        />
        <DashboardCard
          title="Products"
          value={productCount}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="m21 7.5-9-5.25L3 7.5m18 0-9 5.25m9-5.25v9l-9 5.25M3 7.5l9 5.25M3 7.5v9l9 5.25m0-9v9" />
            </svg>
          }
          href="/products"
          color="green"
        />
        <DashboardCard
          title="Low Stock Items"
          value={lowStockItems}
          icon={
            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-6 w-6">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z" />
            </svg>
          }
          href="/inventory/warehouse?filter=lowStock"
          color="red"
          alert={lowStockItems > 0}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-pink-600">Pending Transfers</h2>
            <Link href="/transfers" className="rounded-full bg-pink-100 px-3 py-1 text-sm font-medium text-pink-600 hover:bg-pink-200 transition-colors">
              View all
            </Link>
          </div>
          {pendingTransfers > 0 ? (
            <div className="space-y-4">
              <div className="flex items-center justify-between rounded-lg border border-pink-100 bg-pink-50 p-4">
                <div>
                  <p className="font-medium text-gray-800">Transfer #TRF-2023-001</p>
                  <p className="text-sm text-gray-800">Warehouse to Store</p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-yellow-100 px-2 py-1 text-xs font-medium text-yellow-800">
                    Pending Approval
                  </span>
                  <Link
                    href="/transfers/TRF-2023-001"
                    className="rounded-md bg-blue-100 p-1 text-blue-600 hover:bg-blue-200 transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 6H5.25A2.25 2.25 0 0 0 3 8.25v10.5A2.25 2.25 0 0 0 5.25 21h10.5A2.25 2.25 0 0 0 18 18.75V10.5m-10.5 6L21 3m0 0h-5.25M21 3v5.25" />
                    </svg>
                  </Link>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex h-32 items-center justify-center rounded-lg border border-dashed border-pink-200">
              <p className="text-gray-800">No pending transfers</p>
            </div>
          )}
        </div>

        <div className="rounded-lg bg-white p-6 shadow-md">
          <div className="mb-4 flex items-center justify-between">
            <h2 className="text-lg font-semibold text-orange-600">Recent Activities</h2>
          </div>
          <div className="space-y-4">
            <div className="flex gap-4 rounded-lg border border-blue-100 bg-blue-50 p-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-blue-100 text-blue-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 21 3 16.5m0 0L7.5 12M3 16.5h13.5m0-13.5L21 7.5m0 0L16.5 12M21 7.5H7.5" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-800">Transfer #TRF-2023-002 completed</p>
                <p className="text-sm text-gray-800">2 hours ago</p>
              </div>
            </div>
            <div className="flex gap-4 rounded-lg border border-green-100 bg-green-50 p-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-green-100 text-green-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18.75a60.07 60.07 0 0 1 15.797 2.101c.727.198 1.453-.342 1.453-1.096V18.75M3.75 4.5v.75A.75.75 0 0 1 3 6h-.75m0 0v-.375c0-.621.504-1.125 1.125-1.125H20.25M2.25 6v9m18-10.5v.75c0 .414.336.75.75.75h.75m-1.5-1.5h.375c.621 0 1.125.504 1.125 1.125v9.75c0 .621-.504 1.125-1.125 1.125h-.375m1.5-1.5H21a.75.75 0 0 0-.75.75v.75m0 0H3.75m0 0h-.375a1.125 1.125 0 0 1-1.125-1.125V15m1.5 1.5v-.75A.75.75 0 0 0 3 15h-.75M15 10.5a3 3 0 1 1-6 0 3 3 0 0 1 6 0Zm3 0h.008v.008H18V10.5Zm-12 0h.008v.008H6V10.5Z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-800">New sale recorded at Main Store</p>
                <p className="text-sm text-gray-800">3 hours ago</p>
              </div>
            </div>
            <div className="flex gap-4 rounded-lg border border-purple-100 bg-purple-50 p-3">
              <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-full bg-purple-100 text-purple-600">
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m20.25 7.5-.625 10.632a2.25 2.25 0 0 1-2.247 2.118H6.622a2.25 2.25 0 0 1-2.247-2.118L3.75 7.5M10 11.25h4M3.375 7.5h17.25c.621 0 1.125-.504 1.125-1.125v-1.5c0-.621-.504-1.125-1.125-1.125H3.375c-.621 0-1.125.504-1.125 1.125v1.5c0 .621.504 1.125 1.125 1.125Z" />
                </svg>
              </div>
              <div>
                <p className="font-medium text-gray-800">Inventory updated for Smartphone X</p>
                <p className="text-sm text-gray-800">5 hours ago</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

interface DashboardCardProps {
  title: string;
  value: number;
  icon: React.ReactNode;
  href: string;
  color: "purple" | "blue" | "green" | "red" | "orange" | "pink";
  alert?: boolean;
}

function DashboardCard({ title, value, icon, href, color, alert }: DashboardCardProps) {
  // Define different color schemes for cards
  const colorSchemes = {
    purple: {
      bg: "bg-purple-100",
      text: "text-purple-800",
      icon: "bg-purple-200 text-purple-600",
      hover: "hover:bg-purple-200 hover:shadow-md hover:shadow-purple-100",
      border: "border-purple-200"
    },
    blue: {
      bg: "bg-blue-100",
      text: "text-blue-800",
      icon: "bg-blue-200 text-blue-600",
      hover: "hover:bg-blue-200 hover:shadow-md hover:shadow-blue-100",
      border: "border-blue-200"
    },
    green: {
      bg: "bg-green-100",
      text: "text-green-800",
      icon: "bg-green-200 text-green-600",
      hover: "hover:bg-green-200 hover:shadow-md hover:shadow-green-100",
      border: "border-green-200"
    },
    red: {
      bg: "bg-red-100",
      text: "text-red-800",
      icon: "bg-red-200 text-red-600",
      hover: "hover:bg-red-200 hover:shadow-md hover:shadow-red-100",
      border: "border-red-200"
    },
    orange: {
      bg: "bg-orange-100",
      text: "text-orange-800",
      icon: "bg-orange-200 text-orange-600",
      hover: "hover:bg-orange-200 hover:shadow-md hover:shadow-orange-100",
      border: "border-orange-200"
    },
    pink: {
      bg: "bg-pink-100",
      text: "text-pink-800",
      icon: "bg-pink-200 text-pink-600",
      hover: "hover:bg-pink-200 hover:shadow-md hover:shadow-pink-100",
      border: "border-pink-200"
    }
  };

  const scheme = colorSchemes[color];

  return (
    <Link
      href={href}
      className={`flex items-center justify-between rounded-lg border ${scheme.border} ${scheme.bg} p-6 transition-all ${scheme.hover}`}
    >
      <div>
        <p className="text-sm font-medium text-gray-800">{title}</p>
        <p className={`text-3xl font-bold ${scheme.text}`}>{value}</p>
      </div>
      <div className={`rounded-full p-3 ${scheme.icon}`}>
        {icon}
      </div>
    </Link>
  );
}
