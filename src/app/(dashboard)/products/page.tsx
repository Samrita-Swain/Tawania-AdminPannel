import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import Link from "next/link";
import { ProductFilters } from "./_components/product-filters";
import { ProductsTable } from "./_components/products-table";

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const session = await getServerSession(authOptions);

  // Parse search parameters - properly await searchParams for Next.js 15
  const params = await searchParams;
  const categoryId = params.category as string | undefined;
  const search = params.search as string | undefined;
  const status = params.status as string | undefined;
  const page = parseInt((params.page as string) || "1");
  const pageSize = 10;

  // Default values in case of database error
  let products: any[] = [];
  let totalItems = 0;
  let categories: any[] = [];

  try {
    // Build query filters
    const filters: any = {
      categoryId: categoryId ? categoryId : undefined,
      name: search ? { contains: search, mode: 'insensitive' } : undefined,
      isActive: status === "active" ? true : status === "inactive" ? false : undefined,
    };

    // Get products with pagination using raw SQL to avoid schema mismatches
    categories = await prisma.$queryRaw`SELECT id, name FROM "Category" ORDER BY name ASC`;

    // Build a WHERE clause for the raw SQL query
    let whereClause = '1=1'; // Default condition that's always true
    const queryParams: any[] = [];

    if (categoryId) {
      whereClause += ' AND "categoryId" = $' + (queryParams.length + 1);
      queryParams.push(categoryId);
    }

    if (search) {
      whereClause += ' AND (name ILIKE $' + (queryParams.length + 1) + ' OR sku ILIKE $' + (queryParams.length + 1) + ')';
      queryParams.push(`%${search}%`);
    }

    if (status === "active") {
      whereClause += ' AND "isActive" = $' + (queryParams.length + 1);
      queryParams.push(true);
    } else if (status === "inactive") {
      whereClause += ' AND "isActive" = $' + (queryParams.length + 1);
      queryParams.push(false);
    }

    // Count total items
    const countResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Product"
      WHERE ${Prisma.raw(whereClause)}
    `;
    totalItems = parseInt(countResult[0].count);

    // Get products
    const offset = (page - 1) * pageSize;
    console.log("Fetching products with WHERE clause:", whereClause);

    let productsResult = [];
    try {
      productsResult = await prisma.$queryRaw`
        SELECT p.id, p.name, p.sku, p.description, p."categoryId", p."costPrice",
               p."wholesalePrice", p."retailPrice", p."minStockLevel", p."reorderPoint",
               p.barcode, p."isActive", p.condition, p."createdAt", p."updatedAt",
               c.id as "category_id", c.name as "category_name"
        FROM "Product" p
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        WHERE ${Prisma.raw(whereClause)}
        ORDER BY p."createdAt" DESC
        LIMIT ${pageSize} OFFSET ${offset}
      `;

      console.log("Products found:", productsResult.length);
      if (productsResult.length > 0) {
        console.log("First product:", productsResult[0].id, productsResult[0].name);
      }
    } catch (queryError) {
      console.error("Error in products query:", queryError);
      productsResult = [];
    }

    // Format the results to match the expected structure
    products = productsResult.map((p: any) => ({
      id: p.id,
      name: p.name,
      sku: p.sku,
      description: p.description,
      categoryId: p.categoryId,
      costPrice: p.costPrice,
      wholesalePrice: p.wholesalePrice,
      retailPrice: p.retailPrice,
      minStockLevel: p.minStockLevel,
      reorderPoint: p.reorderPoint,
      barcode: p.barcode,
      isActive: p.isActive,
      condition: p.condition,
      createdAt: p.createdAt,
      updatedAt: p.updatedAt,
      category: p.category_id ? {
        id: p.category_id,
        name: p.category_name
      } : null
    }));
  } catch (error) {
    console.error("Database error:", error);
    // Continue with empty data
  }

  const totalPages = Math.ceil(totalItems / pageSize);

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <h1 className="text-xl sm:text-2xl font-bold text-gray-800">Products</h1>
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          <Link
            href="/products/new"
            className="rounded-md bg-blue-100 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-blue-700 hover:bg-blue-200 transition-colors text-center"
          >
            Add Product
          </Link>
          <Link
            href="/categories"
            className="rounded-md bg-purple-100 px-3 sm:px-4 py-2 text-xs sm:text-sm font-medium text-purple-700 hover:bg-purple-200 transition-colors text-center"
          >
            Manage Categories
          </Link>
        </div>
      </div>

      <ProductFilters
        categories={categories}
        currentCategoryId={categoryId}
        currentSearch={search}
        currentStatus={status}
      />

      <ProductsTable
        products={products}
        totalItems={totalItems}
        totalPages={totalPages}
        currentPage={page}
        pageSize={pageSize}
        params={params}
      />
    </div>
  );
}

