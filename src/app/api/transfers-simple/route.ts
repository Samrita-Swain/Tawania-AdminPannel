import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log("Simple Transfers API: Fetching transfers");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const type = searchParams.get("type");
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");

    console.log("Simple Transfers API: Query parameters:", { type, status, search, page, pageSize });

    // Build the filter
    const filter: any = {};

    if (type) {
      if (type === "warehouse-to-store") {
        filter.transferType = "RESTOCK";
      } else if (type === "store-to-warehouse") {
        filter.transferType = "RETURN";
      } else if (type === "warehouse-to-warehouse") {
        filter.transferType = "RELOCATION";
      } else if (type === "store-to-store") {
        filter.transferType = "RELOCATION";
      } else {
        filter.transferType = type;
      }
    }

    if (status) {
      filter.status = status;
    }

    if (search) {
      filter.OR = [
        { transferNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } }
      ];
    }

    // Get transfers from database with related data
    const transfers = await prisma.transfer.findMany({
      where: filter,
      include: {
        Store_Transfer_fromStoreIdToStore: {
          select: { id: true, name: true }
        },
        Warehouse_Transfer_fromWarehouseIdToWarehouse: {
          select: { id: true, name: true }
        },
        Store_Transfer_toStoreIdToStore: {
          select: { id: true, name: true }
        },
        Warehouse_Transfer_toWarehouseIdToWarehouse: {
          select: { id: true, name: true }
        },
        items: {
          include: {
            product: {
              select: { id: true, name: true, sku: true }
            }
          }
        }
      },
      orderBy: {
        createdAt: "desc",
      },
      take: pageSize,
      skip: (page - 1) * pageSize
    });

    console.log(`Simple Transfers API: Found ${transfers.length} transfers`);

    // Get total count for pagination
    const totalCount = await prisma.transfer.count({
      where: filter
    });

    return NextResponse.json({
      transfers,
      pagination: {
        total: totalCount,
        page,
        pageSize,
        totalPages: Math.ceil(totalCount / pageSize)
      },
    });
  } catch (error) {
    console.error("Simple Transfers API: Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("Simple Transfers API: POST request received");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse the request body
    const data = await req.json();
    console.log("Simple Transfers API: Request data:", data);

    // Generate a transfer number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const randomNum = Math.floor(Math.random() * 10000).toString().padStart(4, "0");
    const transferNumber = `TRF-${year}${month}${day}-${randomNum}`;

    // Create transfer in the database
    const transfer = await prisma.transfer.create({
      data: {
        transferNumber,
        status: "DRAFT",
      },
    });

    console.log("Simple Transfers API: Created transfer:", transfer);

    return NextResponse.json({
      success: true,
      message: "Transfer created successfully",
      transfer
    });
  } catch (error) {
    console.error("Simple Transfers API: Error:", error);
    return NextResponse.json(
      { error: "Failed to create transfer" },
      { status: 500 }
    );
  }
}
