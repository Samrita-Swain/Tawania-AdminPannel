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

    if (!warehouseId) {
      return NextResponse.json(
        { error: "Warehouse ID is required" },
        { status: 400 }
      );
    }

    // Get current date for filtering
    const today = new Date();
    const startOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate());
    const endOfDay = new Date(today.getFullYear(), today.getMonth(), today.getDate() + 1);

    // Fetch all data in parallel
    const [
      // Inwards data
      inwardsToday,
      inwardsTotal,
      recentInwards,
      
      // Outwards data  
      outwardsToday,
      outwardsTotal,
      recentOutwards,
      
      // Stock status data
      outOfStockItems,
      lowStockItems,
      totalProducts,
      
      // Closing stock data
      closingStockData,
    ] = await Promise.all([
      // Inwards queries
      prisma.warehouseMovement.count({
        where: {
          warehouseId,
          movementType: "INWARD",
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      
      prisma.warehouseMovement.count({
        where: {
          warehouseId,
          movementType: "INWARD",
        },
      }),
      
      prisma.warehouseMovement.findMany({
        where: {
          warehouseId,
          movementType: "INWARD",
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
      
      // Outwards queries
      prisma.warehouseMovement.count({
        where: {
          warehouseId,
          movementType: "OUTWARD",
          createdAt: {
            gte: startOfDay,
            lt: endOfDay,
          },
        },
      }),
      
      prisma.warehouseMovement.count({
        where: {
          warehouseId,
          movementType: "OUTWARD",
        },
      }),
      
      prisma.warehouseMovement.findMany({
        where: {
          warehouseId,
          movementType: "OUTWARD",
        },
        include: {
          items: {
            include: {
              product: {
                select: {
                  id: true,
                  name: true,
                  sku: true,
                },
              },
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        take: 5,
      }),
      
      // Stock status queries
      prisma.stockStatus.count({
        where: {
          warehouseId,
          outOfStock: true,
        },
      }),
      
      prisma.stockStatus.count({
        where: {
          warehouseId,
          outOfStock: false,
          availableStock: {
            gt: 0,
            lte: 10,
          },
        },
      }),
      
      prisma.stockStatus.count({
        where: {
          warehouseId,
        },
      }),
      
      // Closing stock data
      prisma.stockStatus.findMany({
        where: {
          warehouseId,
        },
        include: {
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
        take: 10,
      }),
    ]);

    // Calculate summary statistics
    const totalInwardsValue = recentInwards.reduce((sum, movement) => sum + movement.totalValue, 0);
    const totalOutwardsValue = recentOutwards.reduce((sum, movement) => sum + movement.totalValue, 0);
    const totalStockValue = closingStockData.reduce((sum, stock) => sum + (stock.currentStock * 10), 0); // Assuming avg cost of 10

    const dashboard = {
      summary: {
        inwards: {
          today: inwardsToday,
          total: inwardsTotal,
          totalValue: totalInwardsValue,
        },
        outwards: {
          today: outwardsToday,
          total: outwardsTotal,
          totalValue: totalOutwardsValue,
        },
        stock: {
          outOfStock: outOfStockItems,
          lowStock: lowStockItems,
          totalProducts,
          totalValue: totalStockValue,
        },
      },
      recentActivity: {
        inwards: recentInwards,
        outwards: recentOutwards,
      },
      stockStatus: {
        outOfStock: closingStockData.filter(item => item.outOfStock),
        lowStock: closingStockData.filter(item => !item.outOfStock && item.availableStock <= 10 && item.availableStock > 0),
        available: closingStockData.filter(item => !item.outOfStock && item.availableStock > 10),
      },
      closingStock: closingStockData,
    };

    return NextResponse.json({ dashboard });
  } catch (error) {
    console.error("Error fetching warehouse dashboard:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouse dashboard" },
      { status: 500 }
    );
  }
}
