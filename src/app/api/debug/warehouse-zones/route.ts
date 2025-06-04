import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DEBUG WAREHOUSE ZONES API ===");
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get all warehouses
    const warehouses = await prisma.warehouse.findMany({
      include: {
        zones: {
          include: {
            aisles: {
              include: {
                shelves: {
                  include: {
                    bins: true,
                  },
                },
              },
            },
          },
        },
      },
    });

    console.log("Found warehouses:", warehouses.length);

    const warehouseData = warehouses.map(warehouse => ({
      id: warehouse.id,
      name: warehouse.name,
      code: warehouse.code,
      zonesCount: warehouse.zones.length,
      zones: warehouse.zones.map(zone => ({
        id: zone.id,
        name: zone.name,
        code: zone.code,
        aislesCount: zone.aisles.length,
        aisles: zone.aisles.map(aisle => ({
          id: aisle.id,
          name: aisle.name,
          code: aisle.code,
          shelvesCount: aisle.shelves.length,
          shelves: aisle.shelves.map(shelf => ({
            id: shelf.id,
            name: shelf.name,
            code: shelf.code,
            binsCount: shelf.bins.length,
          })),
        })),
      })),
    }));

    return NextResponse.json({
      warehouses: warehouseData,
      summary: {
        totalWarehouses: warehouses.length,
        warehousesWithZones: warehouses.filter(w => w.zones.length > 0).length,
        totalZones: warehouses.reduce((sum, w) => sum + w.zones.length, 0),
      },
    });
  } catch (error) {
    console.error("Error in debug warehouse zones:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch warehouse data",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
