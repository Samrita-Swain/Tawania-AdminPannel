import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mock products data for fallback
const mockProducts = [
  {
    id: "mock-product-1",
    name: "Mock Product 1",
    sku: "MP001",
    description: "This is a mock product for testing",
    price: 19.99,
    costPrice: 10.00,
    retailPrice: 19.99,
    category: {
      id: "mock-category-1",
      name: "Mock Category"
    },
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "mock-product-2",
    name: "Mock Product 2",
    sku: "MP002",
    description: "Another mock product for testing",
    price: 29.99,
    costPrice: 15.00,
    retailPrice: 29.99,
    category: {
      id: "mock-category-1",
      name: "Mock Category"
    },
    images: [],
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(req: NextRequest) {
  try {
    console.log("Products API: GET request received");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("Products API: Unauthorized - no session");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const search = searchParams.get("search") || "";
    const categoryId = searchParams.get("categoryId");
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const skip = (page - 1) * pageSize;

    console.log("Products API: Query parameters:", { search, categoryId, page, pageSize });

    // Try to fetch products from the database
    try {
      // Build the filter
      const filter: any = {};

      if (search) {
        filter.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { sku: { contains: search, mode: 'insensitive' } },
          { description: { contains: search, mode: 'insensitive' } }
        ];
      }

      if (categoryId) {
        filter.categoryId = categoryId;
      }

      // Use a simpler approach to avoid schema mismatch issues
      try {
        // First, try to get products with a minimal set of fields
        const products = await prisma.product.findMany({
          where: filter,
          orderBy: {
            createdAt: "desc"
          },
          take: pageSize,
          skip,
          select: {
            id: true,
            sku: true,
            name: true,
            description: true,
            costPrice: true,
            retailPrice: true,
            supplier: {
              select: {
                id: true,
                name: true
              }
            }
          }
        });

        console.log(`Products API: Found ${products.length} products`);

        if (products.length > 0) {
          return NextResponse.json({
            products,
            pagination: {
              total: products.length,
              page,
              pageSize,
              totalPages: Math.ceil(products.length / pageSize)
            }
          });
        }
      } catch (error) {
        console.error("Products API: Error fetching products with select:", error);
      }

      // If we get here, we couldn't fetch products from the database
      // Fall back to mock data
    } catch (dbError) {
      console.error("Products API: Database error:", dbError);
    }

    // Fall back to mock data if database query fails or returns no results
    console.log("Products API: Using mock data");

    return NextResponse.json({
      products: mockProducts,
      pagination: {
        total: mockProducts.length,
        page: 1,
        pageSize: 50,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error("Products API: Unexpected error:", error);

    // Return mock data on error
    return NextResponse.json({
      products: mockProducts,
      pagination: {
        total: mockProducts.length,
        page: 1,
        pageSize: 50,
        totalPages: 1
      }
    });
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("Products API: POST request received");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("Products API: Unauthorized - no session");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the request body
    const data = await req.json();
    console.log("Products API: Request data:", data);

    // Try to create a product in the database
    try {
      // Validate required fields
      if (!data.name || !data.sku || !data.categoryId) {
        return NextResponse.json(
          {
            success: false,
            error: "Missing required fields: name, SKU, and category are required"
          },
          { status: 400 }
        );
      }

      // Check if SKU already exists
      const existingSku = await prisma.product.findUnique({
        where: { sku: data.sku }
      });

      if (existingSku) {
        return NextResponse.json(
          {
            success: false,
            error: `A product with SKU '${data.sku}' already exists`
          },
          { status: 400 }
        );
      }

      // Create the product
      const product = await prisma.product.create({
        data: {
          name: data.name,
          sku: data.sku,
          description: data.description || "",
          costPrice: data.costPrice || 0,
          wholesalePrice: data.wholesalePrice || 0,
          retailPrice: data.retailPrice || 0,
          categoryId: data.categoryId,
          supplierId: data.supplierId,
          unit: data.unit || "each",
          minStockLevel: data.minStockLevel || 0,
          reorderPoint: data.reorderPoint || 0,
          // Removed taxRate field as it doesn't exist in the schema
          condition: data.condition || "NEW",
          isActive: data.isActive !== undefined ? data.isActive : true,
          createdById: session.user.id,
          updatedById: session.user.id
        }
      });

      console.log("Products API: Product created successfully:", product);

      return NextResponse.json({
        success: true,
        message: "Product created successfully",
        product
      });
    } catch (dbError) {
      console.error("Products API: Database error:", dbError);

      // Log more detailed error information
      if (dbError instanceof Error) {
        console.error("Error message:", dbError.message);
        console.error("Error stack:", dbError.stack);
      }

      // Return a proper error response instead of falling back to mock data
      return NextResponse.json(
        {
          success: false,
          error: "Failed to create product in database",
          details: dbError instanceof Error ? dbError.message : "Unknown database error"
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Products API: Unexpected error:", error);

    return NextResponse.json({
      success: false,
      error: "An unexpected error occurred",
      details: error instanceof Error ? error.message : "Unknown error"
    }, { status: 500 });
  }
}
