import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const warehouseId = params.id;
    
    // Parse query parameters
    const url = new URL(req.url);
    const zoneId = url.searchParams.get("zone");
    const aisleId = url.searchParams.get("aisle");
    const shelfId = url.searchParams.get("shelf");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "50");
    
    // Check if warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    
    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }
    
    // Build the query for zones
    const zoneQuery: any = {
      where: { warehouseId },
    };
    
    if (zoneId) {
      zoneQuery.where.id = zoneId;
    }
    
    // Get all zones for the warehouse
    const zones = await prisma.warehouseZone.findMany({
      ...zoneQuery,
      include: {
        aisles: {
          include: {
            shelves: {
              include: {
                bins: {
                  include: {
                    inventoryItems: {
                      select: {
                        id: true,
                      },
                    },
                  },
                  where: search
                    ? {
                        OR: [
                          { name: { contains: search, mode: 'insensitive' } },
                          { code: { contains: search, mode: 'insensitive' } },
                        ],
                      }
                    : undefined,
                },
              },
            },
          },
        },
      },
    });
    
    // Flatten the structure to get all bins
    let allBins: Array<any> = [];
    
    zones.forEach((zone: any) => {
      zone.aisles.forEach((aisle: any) => {
        aisle.shelves.forEach((shelf: any) => {
          shelf.bins.forEach((bin: any) => {
            allBins.push({
              ...bin,
              shelf: {
                id: shelf.id,
                name: shelf.name,
                code: shelf.code,
              },
              aisle: {
                id: aisle.id,
                name: aisle.name,
                code: aisle.code,
              },
              zone: {
                id: zone.id,
                name: zone.name,
                code: zone.code,
              },
              itemCount: bin.inventoryItems.length,
            });
          });
        });
      });
    });
    
    // Apply pagination
    const totalItems = allBins.length;
    const paginatedBins = allBins.slice((page - 1) * pageSize, page * pageSize);
    
    return NextResponse.json({
      bins: paginatedBins,
      totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    });
  } catch (error) {
    console.error("Error fetching warehouse bins:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouse bins" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const warehouseId = params.id;
    const data = await req.json();
    const { zoneId, aisleId, shelfId, name, code, capacity } = data;
    
    // Validate required fields
    if (!shelfId || !name || !code) {
      return NextResponse.json(
        { error: "Shelf ID, name, and code are required" },
        { status: 400 }
      );
    }
    
    // Check if warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    
    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }
    
    // Check if shelf exists and belongs to the warehouse
    const shelf = await prisma.warehouseShelf.findUnique({
      where: { id: shelfId },
      include: {
        aisle: {
          include: {
            zone: true,
          },
        },
      },
    });
    
    if (!shelf) {
      return NextResponse.json(
        { error: "Shelf not found" },
        { status: 404 }
      );
    }
    
    if (shelf.aisle.zone.warehouseId !== warehouseId) {
      return NextResponse.json(
        { error: "Shelf does not belong to the specified warehouse" },
        { status: 400 }
      );
    }
    
    // Check if bin code is unique within the shelf
    const existingBin = await prisma.warehouseBin.findFirst({
      where: {
        shelfId,
        code,
      },
    });
    
    if (existingBin) {
      return NextResponse.json(
        { error: "Bin code already exists in this shelf" },
        { status: 400 }
      );
    }
    
    // Create bin
    const bin = await prisma.warehouseBin.create({
      data: {
        name,
        code,
        shelfId,
        capacity: capacity || null,
      },
      include: {
        shelf: {
          include: {
            aisle: {
              include: {
                zone: true,
              },
            },
          },
        },
      },
    });
    
    return NextResponse.json({ bin });
  } catch (error) {
    console.error("Error creating warehouse bin:", error);
    return NextResponse.json(
      { error: "Failed to create warehouse bin" },
      { status: 500 }
    );
  }
}

