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

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build filter for damaged inventory items
    const filter: any = {
      condition: "DAMAGED",
    };

    if (warehouseId) {
      filter.warehouseId = warehouseId;
    }

    // Get damaged inventory items with pagination
    const [inventoryItems, totalItems] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: filter,
        include: {
          product: true,
          warehouse: true,
          bin: true,
        },
        orderBy: {
          updatedAt: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.inventoryItem.count({
        where: filter,
      }),
    ]);

    // Get damaged products
    const damagedProducts = await prisma.product.findMany({
      where: {
        condition: "DAMAGED",
      },
      include: {
        inventoryItems: {
          include: {
            warehouse: true,
          },
        },
      },
    });

    // Get transfer items with damaged condition
    const transferItems = await prisma.transferItem.findMany({
      where: {
        condition: "DAMAGED",
      },
      include: {
        product: true,
        transfer: {
          include: {
            fromWarehouse: true,
            toStore: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to recent transfers
    });

    // Get quality control items with failed status
    const qualityControlItems = await prisma.qualityControlItem.findMany({
      where: {
        failedQuantity: {
          gt: 0,
        },
      },
      include: {
        product: true,
        qualityControl: {
          include: {
            warehouse: true,
            purchaseOrder: true,
            return: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50, // Limit to recent quality control items
    });

    return NextResponse.json({
      inventoryItems,
      damagedProducts,
      transferItems,
      qualityControlItems,
      totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
    });
  } catch (error) {
    console.error("Error fetching damaged inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch damaged inventory" },
      { status: 500 }
    );
  }
}
