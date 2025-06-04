import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    console.log("=== CREATE SAMPLE WAREHOUSE ZONES ===");
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { warehouseId } = await req.json();

    if (!warehouseId) {
      return NextResponse.json(
        { error: "Warehouse ID is required" },
        { status: 400 }
      );
    }

    // Check if warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
      include: { zones: true },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // If warehouse already has zones, don't create more
    if (warehouse.zones.length > 0) {
      return NextResponse.json({
        message: "Warehouse already has zones",
        existingZones: warehouse.zones.length,
      });
    }

    // Create sample zones
    const sampleZones = [
      { name: "Zone A", code: "A", description: "Main storage area" },
      { name: "Zone B", code: "B", description: "Secondary storage area" },
      { name: "Zone C", code: "C", description: "Overflow storage area" },
    ];

    const createdZones = [];

    for (const zoneData of sampleZones) {
      // Create zone
      const zone = await prisma.warehouseZone.create({
        data: {
          name: zoneData.name,
          code: zoneData.code,
          description: zoneData.description,
          warehouseId: warehouse.id,
        },
      });

      // Create sample aisle for each zone
      const aisle = await prisma.warehouseAisle.create({
        data: {
          name: `Aisle ${zoneData.code}1`,
          code: `${zoneData.code}1`,
          zoneId: zone.id,
        },
      });

      // Create sample shelf for each aisle
      const shelf = await prisma.warehouseShelf.create({
        data: {
          name: `Shelf ${zoneData.code}1-1`,
          code: `${zoneData.code}1-1`,
          aisleId: aisle.id,
        },
      });

      // Create sample bins for each shelf
      const bins = [];
      for (let i = 1; i <= 3; i++) {
        const bin = await prisma.warehouseBin.create({
          data: {
            name: `Bin ${zoneData.code}1-1-${i}`,
            code: `${zoneData.code}1-1-${i}`,
            shelfId: shelf.id,
            capacity: 100,
          },
        });
        bins.push(bin);
      }

      createdZones.push({
        zone,
        aisle,
        shelf,
        bins,
      });
    }

    console.log(`Created ${createdZones.length} zones for warehouse ${warehouse.name}`);

    return NextResponse.json({
      message: "Sample zones created successfully",
      warehouse: {
        id: warehouse.id,
        name: warehouse.name,
      },
      createdZones: createdZones.length,
      zones: createdZones.map(z => ({
        id: z.zone.id,
        name: z.zone.name,
        code: z.zone.code,
        aisles: 1,
        shelves: 1,
        bins: z.bins.length,
      })),
    });
  } catch (error) {
    console.error("Error creating sample zones:", error);
    return NextResponse.json(
      { 
        error: "Failed to create sample zones",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
