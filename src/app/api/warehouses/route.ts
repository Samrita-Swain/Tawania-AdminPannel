import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log("=== WAREHOUSES API CALLED ===");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("No session found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    console.log("User authenticated:", session.user.id);

    // Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");

    console.log("Query params:", { status, search, page, pageSize });

    // Build filters
    const filters: any = {};

    if (status === "active") {
      filters.isActive = true;
    } else if (status === "inactive") {
      filters.isActive = false;
    }

    if (search) {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { code: { contains: search, mode: 'insensitive' } },
        { address: { contains: search, mode: 'insensitive' } },
        { contactPerson: { contains: search, mode: 'insensitive' } },
      ];
    }

    console.log("Filters applied:", filters);

    // Get warehouses with pagination - simplified include to avoid relation issues
    let warehouses, totalItems;

    try {
      console.log("Fetching warehouses...");

      [warehouses, totalItems] = await Promise.all([
        prisma.warehouse.findMany({
          where: filters,
          include: {
            zones: {
              select: {
                id: true,
              },
            },
            inventoryItems: {
              select: {
                id: true,
              },
            },
            staff: {
              select: {
                id: true,
              },
            },
          },
          orderBy: {
            name: "asc",
          },
          skip: (page - 1) * pageSize,
          take: pageSize,
        }),
        prisma.warehouse.count({
          where: filters,
        }),
      ]);

      console.log("Warehouses fetched successfully:", warehouses.length);
    } catch (dbError) {
      console.error("Database error:", dbError);

      // Try without staff relation if it's causing issues
      console.log("Retrying without staff relation...");

      try {
        [warehouses, totalItems] = await Promise.all([
          prisma.warehouse.findMany({
            where: filters,
            include: {
              zones: {
                select: {
                  id: true,
                },
              },
              inventoryItems: {
                select: {
                  id: true,
                },
              },
            },
            orderBy: {
              name: "asc",
            },
            skip: (page - 1) * pageSize,
            take: pageSize,
          }),
          prisma.warehouse.count({
            where: filters,
          }),
        ]);

        console.log("Warehouses fetched without staff relation:", warehouses.length);
      } catch (fallbackError) {
        console.error("Fallback query also failed:", fallbackError);
        throw fallbackError;
      }
    }

    console.log("Returning response with warehouses:", warehouses.length);

    return NextResponse.json({
      warehouses,
      totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    });
  } catch (error) {
    console.error("=== ERROR IN WAREHOUSES API ===");
    console.error("Error fetching warehouses:", error);

    let errorMessage = "Failed to fetch warehouses";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error message:", errorMessage);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const {
      name,
      code,
      address,
      contactPerson,
      phone,
      email,
      isActive
    } = data;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Check if code already exists
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: { code },
    });

    if (existingWarehouse) {
      return NextResponse.json(
        { error: "Warehouse code already exists" },
        { status: 400 }
      );
    }

    // Create warehouse
    const warehouse = await prisma.warehouse.create({
      data: {
        name,
        code,
        address,
        contactPerson,
        phone,
        email,
        isActive: isActive !== undefined ? isActive : true,
      },
    });

    return NextResponse.json({ warehouse });
  } catch (error) {
    console.error("Error creating warehouse:", error);
    return NextResponse.json(
      { error: "Failed to create warehouse" },
      { status: 500 }
    );
  }
}
