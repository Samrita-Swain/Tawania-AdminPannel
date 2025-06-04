import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log("Outwards API: GET request received");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("Outwards API: Unauthorized - no session");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    const storeId = searchParams.get("storeId");
    const status = searchParams.get("status");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    const skip = (page - 1) * pageSize;

    console.log("Outwards API: Query parameters:", { warehouseId, storeId, status, search, page, pageSize });

    // Build the filter
    const filter: any = {};

    // Only get warehouse to store transfers (outwards)
    filter.transferType = "RESTOCK";

    if (warehouseId) {
      filter.fromWarehouseId = warehouseId;
    }

    if (storeId) {
      filter.toStoreId = storeId;
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
        createdAt: "desc"
      },
      take: pageSize,
      skip
    });

    console.log(`Outwards API: Found ${transfers.length} outward transfers`);

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
      }
    });
  } catch (error) {
    console.error("Outwards API: Error:", error);
    return NextResponse.json(
      { error: "Failed to fetch outward transfers" },
      { status: 500 }
    );
  }
}
