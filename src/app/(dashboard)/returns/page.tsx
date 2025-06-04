import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ReturnsList } from "./_components/returns-list";

export default async function ReturnsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    return {
      redirect: {
        destination: "/auth/login",
        permanent: false,
      },
    };
  }

  const resolvedSearchParams = await searchParams;

  // Parse search parameters
  const storeId = resolvedSearchParams.store as string | undefined;
  const status = resolvedSearchParams.status as string | undefined;
  const search = resolvedSearchParams.search as string | undefined;
  const page = parseInt(resolvedSearchParams.page as string || "1");
  const pageSize = 10;

  // Get stores for filter
  const stores = await prisma.store.findMany({
    where: { isActive: true },
    orderBy: { name: 'asc' },
  });

  // Get returns with pagination
  const filters: any = {};

  if (storeId) {
    filters.storeId = storeId;
  }

  if (status) {
    filters.status = status;
  }

  if (search) {
    filters.OR = [
      { returnNumber: { contains: search, mode: 'insensitive' } },
      { customer: { name: { contains: search, mode: 'insensitive' } } },
      { customer: { email: { contains: search, mode: 'insensitive' } } },
      { customer: { phone: { contains: search, mode: 'insensitive' } } },
    ];
  }

  let returns: any[] = [];
  let totalCount = 0;

  try {
    const [returnsResult, countResult] = await Promise.all([
      prisma.return.findMany({
        where: filters,
        include: {
          Store: true,
          Customer: true,
          ReturnItem: {
            include: {
              Product: true,
            },
          },
          User: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.return.count({
        where: filters,
      }),
    ]);

    returns = returnsResult;
    totalCount = countResult;
  } catch (error) {
    console.error("Error fetching returns:", error);
    // Set default values in case of error
    returns = [];
    totalCount = 0;
  }

  const totalPages = Math.ceil(totalCount / pageSize);

  // Transform the data to match the expected format in the client component
  const formattedReturns = returns.map(returnItem => ({
    ...returnItem,
    store: returnItem.Store,
    customer: returnItem.Customer,
    items: returnItem.ReturnItem || [],
  }));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold text-gray-800">Returns</h1>
        <a
          href="/returns/new"
          className="rounded-md bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 transition-colors"
        >
          New Return
        </a>
      </div>

      <ReturnsList
        returns={formattedReturns}
        stores={stores}
        currentStoreId={storeId}
        currentStatus={status}
        currentSearch={search}
        currentPage={page}
        totalPages={totalPages}
        totalItems={totalCount}
      />
    </div>
  );
}

