import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createStore } from "@/lib/store-service";
import fs from 'fs';
import path from 'path';

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
    const status = url.searchParams.get("status");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");

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
        { phone: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get stores with pagination
    const [stores, totalItems] = await Promise.all([
      prisma.store.findMany({
        where: filters,
        include: {
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
      prisma.store.count({
        where: filters,
      }),
    ]);

    // Add inventory count to each store
    const storesWithStats = stores.map(store => {
      return {
        ...store,
        inventoryCount: store.inventoryItems.length,
        staffCount: store.staff.length,
      };
    });

    return NextResponse.json({
      stores: storesWithStats,
      totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    });
  } catch (error) {
    console.error("Error fetching stores:", error);
    return NextResponse.json(
      { error: "Failed to fetch stores" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/stores - Start");
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("POST /api/stores - Unauthorized");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();
    console.log("POST /api/stores - Request data:", data);

    // Save request data to a log file for debugging
    const logDir = path.join(process.cwd(), 'logs');
    if (!fs.existsSync(logDir)) {
      fs.mkdirSync(logDir, { recursive: true });
    }

    const logFile = path.join(logDir, `store-creation-${Date.now()}.json`);
    fs.writeFileSync(logFile, JSON.stringify(data, null, 2));
    console.log(`POST /api/stores - Request data saved to ${logFile}`);

    const {
      name,
      code,
      address,
      phone,
      email,
      openingHours,
      isActive
    } = data;

    // Validate required fields
    if (!name || !code) {
      console.log("POST /api/stores - Missing required fields");
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // First, try to create the store directly with Prisma
    console.log("POST /api/stores - Attempting direct database creation");
    try {
      // Check if code already exists
      const existingStore = await prisma.store.findUnique({
        where: { code },
      });

      if (existingStore) {
        console.log("POST /api/stores - Store code already exists");
        return NextResponse.json(
          { error: "Store code already exists" },
          { status: 400 }
        );
      }

      // Create store directly
      const store = await prisma.store.create({
        data: {
          name,
          code,
          address: address || "",
          phone: phone || "",
          email: email || "",
          openingHours: openingHours || "",
          isActive: isActive !== undefined ? isActive : true,
        },
      });

      console.log("POST /api/stores - Store created successfully with direct method, ID:", store.id);

      // Save successful creation to log
      const successLog = path.join(logDir, `store-success-${Date.now()}.json`);
      fs.writeFileSync(successLog, JSON.stringify(store, null, 2));

      return NextResponse.json(
        {
          success: true,
          message: "Store created successfully",
          store
        },
        { status: 201 }
      );
    } catch (directError) {
      console.error("POST /api/stores - Direct creation failed, trying service method:", directError);

      // If direct creation fails, fall back to the service method
      const result = await createStore({
        name,
        code,
        address,
        phone,
        email,
        openingHours,
        isActive,
      });

      // Handle the result
      if (result.error) {
        if (result.error === "Store code already exists" && result.store) {
          console.log("POST /api/stores - Store code already exists");
          return NextResponse.json(
            { error: "Store code already exists" },
            { status: 400 }
          );
        }

        console.error("POST /api/stores - Error creating store:", result.error, result.details);
        return NextResponse.json(
          {
            error: result.error,
            details: result.details
          },
          { status: 500 }
        );
      }

      // Success case for service method
      console.log("POST /api/stores - Store created successfully with service method, ID:", result.store.id);
      return NextResponse.json(
        {
          success: true,
          message: "Store created successfully",
          store: result.store
        },
        { status: 201 }
      );
    }
  } catch (error) {
    console.error("Error creating store:", error);
    return NextResponse.json(
      { error: "Failed to create store", details: String(error) },
      { status: 500 }
    );
  }
}
