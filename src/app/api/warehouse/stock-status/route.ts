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
    const stockType = searchParams.get("stockType"); // "outOfStock", "lowStock", "available"
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const where: any = {};
    
    if (warehouseId) {
      where.warehouseId = warehouseId;
    }
    
    if (stockType === "outOfStock") {
      where.outOfStock = true;
    } else if (stockType === "lowStock") {
      where.AND = [
        { outOfStock: false },
        { availableStock: { gt: 0, lte: 10 } }, // Consider low stock as <= 10
      ];
    } else if (stockType === "available") {
      where.AND = [
        { outOfStock: false },
        { availableStock: { gt: 0 } },
      ];
    }

    const [stockStatuses, totalCount] = await Promise.all([
      prisma.stockStatus.findMany({
        where,
        include: {
          warehouse: {
            select: {
              id: true,
              name: true,
              code: true,
            },
          },
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              category: {
                select: {
                  id: true,
                  name: true,
                },
              },
            },
          },
        },
        orderBy: {
          updatedAt: "desc",
        },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.stockStatus.count({ where }),
    ]);

    return NextResponse.json({
      stockStatuses,
      pagination: {
        page,
        limit,
        totalCount,
        totalPages: Math.ceil(totalCount / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching stock status:", error);
    return NextResponse.json(
      { error: "Failed to fetch stock status" },
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

    const body = await req.json();
    const { warehouseId, productId, currentStock, reservedStock } = body;

    // Validate required fields
    if (!warehouseId || !productId) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    const availableStock = (currentStock || 0) - (reservedStock || 0);
    const outOfStock = availableStock <= 0;

    // Upsert stock status
    const stockStatus = await prisma.stockStatus.upsert({
      where: {
        warehouseId_productId: {
          warehouseId,
          productId,
        },
      },
      update: {
        currentStock: currentStock || 0,
        reservedStock: reservedStock || 0,
        availableStock,
        outOfStock,
        lastMovementAt: new Date(),
      },
      create: {
        warehouseId,
        productId,
        currentStock: currentStock || 0,
        reservedStock: reservedStock || 0,
        availableStock,
        outOfStock,
        lastMovementAt: new Date(),
      },
      include: {
        warehouse: true,
        product: true,
      },
    });

    return NextResponse.json({ stockStatus }, { status: 201 });
  } catch (error) {
    console.error("Error updating stock status:", error);
    return NextResponse.json(
      { error: "Failed to update stock status" },
      { status: 500 }
    );
  }
}
