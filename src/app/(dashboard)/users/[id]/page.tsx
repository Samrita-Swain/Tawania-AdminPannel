import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { notFound } from "next/navigation";
import { UserRoleBadge } from "../_components/user-role-badge";
import { UserStatusBadge } from "../_components/user-status-badge";
import { UserActivityList } from "../_components/user-activity-list";

interface Activity {
  type: string;
  related_id: string;
  reference: string | null;
  date: string;
  description: string;
  location: string;
}

export default async function UserDetailPage({
  params,
}: {
  params: { id: string };
}) {
  const session = await getServerSession(authOptions);

  // Check if user has admin role
  if (!session?.user?.role || session.user.role !== "ADMIN") {
    return (
      <div className="flex h-full flex-col items-center justify-center">
        <h1 className="text-2xl font-bold text-gray-800">Access Denied</h1>
        <p className="mt-2 text-gray-600">You do not have permission to view this page.</p>
      </div>
    );
  }

  const userId = params.id;

  // Get user details
  const user = await prisma.user.findUnique({
    where: { id: userId },
  });

  if (!user) {
    notFound();
  }

  // Add missing properties to the user object
  const enhancedUser = {
    ...user,
    isActive: true, // Default value if not in database
    lastLogin: null, // Default value if not in database
  };

  // Get user activity (recent actions)
  let recentActivity: Activity[] = [];

  try {
    // Check if the tables exist before running the query
    const tableCheck = await prisma.$queryRaw`
      SELECT EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'Sale'
      ) as sale_exists,
      EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'Transfer'
      ) as transfer_exists,
      EXISTS (
        SELECT FROM information_schema.tables
        WHERE table_name = 'InventoryTransaction'
      ) as inventory_exists
    `;

    // Only run the activity query if the tables exist
    const tablesExist = (tableCheck as any)[0];

    if (tablesExist.sale_exists || tablesExist.transfer_exists || tablesExist.inventory_exists) {
      // Build the query dynamically based on which tables exist
      let queryParts = [];

      if (tablesExist.sale_exists) {
        queryParts.push(`
          (SELECT
            'SALE' as type,
            s.id as related_id,
            s."receiptNumber" as reference,
            s."createdAt" as date,
            CONCAT('Created sale #', s."receiptNumber") as description,
            st.name as location
          FROM "Sale" s
          JOIN "Store" st ON s."storeId" = st.id
          WHERE s."userId" = '${userId}'
          ORDER BY s."createdAt" DESC
          LIMIT 5)
        `);
      }

      if (tablesExist.transfer_exists) {
        if (queryParts.length > 0) queryParts.push('UNION ALL');
        queryParts.push(`
          (SELECT
            'TRANSFER' as type,
            t.id as related_id,
            t."referenceNumber" as reference,
            t."createdAt" as date,
            CONCAT('Created transfer #', t."referenceNumber") as description,
            w.name as location
          FROM "Transfer" t
          JOIN "Warehouse" w ON t."sourceWarehouseId" = w.id
          WHERE t."userId" = '${userId}'
          ORDER BY t."createdAt" DESC
          LIMIT 5)
        `);
      }

      if (tablesExist.inventory_exists) {
        if (queryParts.length > 0) queryParts.push('UNION ALL');
        queryParts.push(`
          (SELECT
            'INVENTORY' as type,
            it.id as related_id,
            NULL as reference,
            it."createdAt" as date,
            CONCAT(it."transactionType", ': ', p.name) as description,
            COALESCE(w.name, s.name) as location
          FROM "InventoryTransaction" it
          JOIN "Product" p ON it."productId" = p.id
          JOIN "InventoryItem" ii ON it."inventoryItemId" = ii.id
          LEFT JOIN "Warehouse" w ON ii."warehouseId" = w.id
          LEFT JOIN "Store" s ON ii."storeId" = s.id
          WHERE it."userId" = '${userId}'
          ORDER BY it."createdAt" DESC
          LIMIT 5)
        `);
      }

      if (queryParts.length > 0) {
        const fullQuery = queryParts.join('\n') + '\nORDER BY date DESC\nLIMIT 10';
        const recentActivityResult = await prisma.$queryRaw(Prisma.raw(fullQuery));
        recentActivity = recentActivityResult as unknown as Activity[];
      }
    }
  } catch (error) {
    console.error("Error fetching user activity:", error);
    // Provide empty activity array if there's an error
    recentActivity = [];
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">User Details</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/users/${enhancedUser.id}/edit`}
            className="rounded-md bg-blue-100 px-4 py-2 text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors"
          >
            Edit User
          </Link>
          {enhancedUser.id !== session.user.id && (
            <Link
              href={`/users/${enhancedUser.id}/delete`}
              className="rounded-md bg-red-100 px-4 py-2 text-sm font-medium text-red-700 hover:bg-red-200 transition-colors"
            >
              Delete User
            </Link>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <div className="md:col-span-2 space-y-6">
          {/* User Details */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">User Information</h2>
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <h3 className="text-sm font-medium text-gray-500">Name</h3>
                <p className="mt-1 text-base text-gray-900">{enhancedUser.name}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Email</h3>
                <p className="mt-1 text-base text-gray-900">{enhancedUser.email}</p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Role</h3>
                <div className="mt-1">
                  <UserRoleBadge role={enhancedUser.role} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Status</h3>
                <div className="mt-1">
                  <UserStatusBadge isActive={enhancedUser.isActive} />
                </div>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Created At</h3>
                <p className="mt-1 text-base text-gray-900">
                  {new Date(enhancedUser.createdAt).toLocaleDateString()}
                </p>
              </div>
              <div>
                <h3 className="text-sm font-medium text-gray-500">Last Login</h3>
                <p className="mt-1 text-base text-gray-900">
                  {enhancedUser.lastLogin ? new Date(enhancedUser.lastLogin).toLocaleString() : "Never"}
                </p>
              </div>
            </div>
          </div>

          {/* User Activity */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Recent Activity</h2>
            <UserActivityList activities={recentActivity} />
          </div>
        </div>

        <div className="space-y-6">
          {/* User Summary */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">User Summary</h2>
            <div className="space-y-4">
              <div className="flex justify-between">
                <span className="text-gray-500">Status</span>
                <UserStatusBadge isActive={enhancedUser.isActive} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Role</span>
                <UserRoleBadge role={enhancedUser.role} />
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Account Age</span>
                <span className="font-medium text-gray-900">
                  {calculateAccountAge(enhancedUser.createdAt)}
                </span>
              </div>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Quick Actions</h2>
            <div className="space-y-3">
              <Link
                href={`/users/${enhancedUser.id}/edit`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
                </svg>
                <span>Edit User</span>
              </Link>
              <Link
                href={`/users/${enhancedUser.id}/reset-password`}
                className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-blue-50 hover:text-blue-700"
              >
                <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 5.25a3 3 0 0 1 3 3m3 0a6 6 0 0 1-7.029 5.912c-.563-.097-1.159.026-1.563.43L10.5 17.25H8.25v2.25H6v2.25H2.25v-2.818c0-.597.237-1.17.659-1.591l6.499-6.499c.404-.404.527-1 .43-1.563A6 6 0 1 1 21.75 8.25Z" />
                </svg>
                <span>Reset Password</span>
              </Link>
              {enhancedUser.isActive ? (
                <Link
                  href={`/users/${enhancedUser.id}/deactivate`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-red-50 hover:text-red-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M18.364 18.364A9 9 0 0 0 5.636 5.636m12.728 12.728A9 9 0 0 1 5.636 5.636m12.728 12.728L5.636 5.636" />
                  </svg>
                  <span>Deactivate User</span>
                </Link>
              ) : (
                <Link
                  href={`/users/${enhancedUser.id}/activate`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-gray-700 transition-all hover:bg-green-50 hover:text-green-700"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
                  </svg>
                  <span>Activate User</span>
                </Link>
              )}
              {enhancedUser.id !== session.user.id && (
                <Link
                  href={`/users/${enhancedUser.id}/delete`}
                  className="flex items-center gap-3 rounded-lg px-3 py-2 text-red-700 transition-all hover:bg-red-50"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className="h-5 w-5">
                    <path strokeLinecap="round" strokeLinejoin="round" d="m14.74 9-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 0 1-2.244 2.077H8.084a2.25 2.25 0 0 1-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 0 0-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 0 1 3.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 0 0-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 0 0-7.5 0" />
                  </svg>
                  <span>Delete User</span>
                </Link>
              )}
            </div>
          </div>

          {/* Metadata */}
          <div className="rounded-lg bg-white p-6 shadow-md">
            <h2 className="mb-4 text-lg font-semibold text-gray-800">Metadata</h2>
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-500">User ID:</span>
                <span className="font-mono text-gray-700">{enhancedUser.id}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Created At:</span>
                <span className="text-gray-700">{new Date(enhancedUser.createdAt).toLocaleString()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-500">Last Updated:</span>
                <span className="text-gray-700">{new Date(enhancedUser.updatedAt).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

// Helper function to calculate account age
function calculateAccountAge(createdAt: Date): string {
  const now = new Date();
  const created = new Date(createdAt);
  const diffMs = now.getTime() - created.getTime();
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 30) {
    return `${diffDays} days`;
  } else if (diffDays < 365) {
    const months = Math.floor(diffDays / 30);
    return `${months} month${months !== 1 ? 's' : ''}`;
  } else {
    const years = Math.floor(diffDays / 365);
    const remainingMonths = Math.floor((diffDays % 365) / 30);
    return `${years} year${years !== 1 ? 's' : ''}${remainingMonths > 0 ? `, ${remainingMonths} month${remainingMonths !== 1 ? 's' : ''}` : ''}`;
  }
}



