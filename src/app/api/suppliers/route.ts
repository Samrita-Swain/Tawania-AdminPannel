import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const search = url.searchParams.get("search");
    const status = url.searchParams.get("status");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");

    // Build filters
    const filters: any = {};

    if (search) {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (status === "active") {
      filters.isActive = true;
    } else if (status === "inactive") {
      filters.isActive = false;
    }

    // Get suppliers with pagination
    const [suppliers, totalItems] = await Promise.all([
      prisma.supplier.findMany({
        where: filters,
        orderBy: {
          name: "asc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.supplier.count({
        where: filters,
      }),
    ]);

    // Get product count for each supplier
    const suppliersWithProductCount = await Promise.all(
      suppliers.map(async (supplier) => {
        const productCount = await prisma.product.count({
          where: {
            supplierId: supplier.id,
          },
        });

        return {
          ...supplier,
          productCount,
        };
      })
    );

    return NextResponse.json({
      suppliers: suppliersWithProductCount,
      totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    });
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return NextResponse.json(
      { error: "Failed to fetch suppliers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/suppliers - Starting request");

    // Check authentication
    const session = await getServerSession(authOptions);
    console.log("Session:", session ? "Valid" : "Invalid");

    if (!session?.user?.id) {
      console.log("Unauthorized - No valid session");
      return NextResponse.json(
        { error: "Unauthorized - Please log in to continue" },
        { status: 401 }
      );
    }

    // Parse request data
    let data;
    try {
      data = await req.json();
      console.log("Request data received:", { name: data.name });
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      city,
      state,
      postalCode,
      country,
      taxId,
      paymentTerms,
      notes,
      isActive
    } = data;

    // Validate required fields
    if (!name) {
      console.log("Validation failed: Supplier name is required");
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 }
      );
    }

    // Verify database connection before attempting to create
    try {
      console.log("Testing database connection...");
      await prisma.$queryRaw`SELECT 1 as connection_test`;
      console.log("Database connection test successful");
    } catch (dbError) {
      console.error("Database connection test failed:", dbError);
      return NextResponse.json(
        { error: "Database connection error. Please check your database connection and try again." },
        { status: 503 } // Service Unavailable
      );
    }

    // Create supplier
    console.log("Creating supplier in database...");
    const supplier = await prisma.supplier.create({
      data: {
        name,
        contactPerson: contactPerson || "",
        email: email || "",
        phone: phone || "",
        address: address || "",
        city: city || "",
        state: state || "",
        postalCode: postalCode || "",
        country: country || "",
        taxId: taxId || "",
        paymentTerms: paymentTerms || "",
        notes: notes || "",
        isActive: isActive !== undefined ? isActive : true,
        createdById: session.user.id,
        updatedById: session.user.id,
      },
    });

    console.log("Supplier created successfully:", supplier.id);
    return NextResponse.json({
      success: true,
      supplier,
      message: "Supplier created successfully"
    });
  } catch (error: any) {
    console.error("Error creating supplier:", error);

    // Check if it's a database connection error
    if (error.message && (
      error.message.includes("Can't reach database server") ||
      error.message.includes("connect ECONNREFUSED") ||
      error.message.includes("Connection refused") ||
      error.message.includes("Connection terminated") ||
      error.message.includes("Connection timed out") ||
      error.message.includes("Connection reset") ||
      error.message.includes("database") && error.message.includes("connect") ||
      error.message.includes("timeout")
    )) {
      console.error("Database connection error details:", error);
      return NextResponse.json(
        { error: "Database connection error. Please check your database connection and try again." },
        { status: 503 } // Service Unavailable
      );
    }

    // Check for Prisma-specific errors
    if (error.code) {
      console.error(`Prisma error code: ${error.code}`);

      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: "A supplier with this information already exists." },
          { status: 409 }
        );
      }
    }

    console.error("Supplier creation error details:", error);
    return NextResponse.json(
      { error: "Failed to create supplier: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
