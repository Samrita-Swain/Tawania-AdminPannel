import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log("=== DEBUG WAREHOUSES API ===");
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Test basic warehouse query first
    console.log("Testing basic warehouse query...");
    
    const basicWarehouses = await prisma.warehouse.findMany({
      select: {
        id: true,
        name: true,
        code: true,
        isActive: true,
      },
    });

    console.log("Basic warehouses found:", basicWarehouses.length);

    // Test with zones
    console.log("Testing warehouses with zones...");
    
    const warehousesWithZones = await prisma.warehouse.findMany({
      include: {
        zones: {
          select: {
            id: true,
            name: true,
          },
        },
      },
    });

    console.log("Warehouses with zones found:", warehousesWithZones.length);

    // Test with inventory items
    console.log("Testing warehouses with inventory items...");
    
    const warehousesWithInventory = await prisma.warehouse.findMany({
      include: {
        inventoryItems: {
          select: {
            id: true,
          },
        },
      },
    });

    console.log("Warehouses with inventory found:", warehousesWithInventory.length);

    // Test with staff (this might be the problematic one)
    let warehousesWithStaff = [];
    try {
      console.log("Testing warehouses with staff...");
      
      warehousesWithStaff = await prisma.warehouse.findMany({
        include: {
          staff: {
            select: {
              id: true,
            },
          },
        },
      });

      console.log("Warehouses with staff found:", warehousesWithStaff.length);
    } catch (staffError) {
      console.error("Error with staff relation:", staffError);
    }

    return NextResponse.json({
      basicWarehouses: basicWarehouses.length,
      warehousesWithZones: warehousesWithZones.length,
      warehousesWithInventory: warehousesWithInventory.length,
      warehousesWithStaff: warehousesWithStaff.length,
      warehouses: basicWarehouses,
      details: {
        zones: warehousesWithZones.map(w => ({
          id: w.id,
          name: w.name,
          zonesCount: w.zones.length,
        })),
        inventory: warehousesWithInventory.map(w => ({
          id: w.id,
          name: w.name,
          inventoryCount: w.inventoryItems.length,
        })),
        staff: warehousesWithStaff.map(w => ({
          id: w.id,
          name: w.name,
          staffCount: w.staff?.length || 0,
        })),
      },
    });
  } catch (error) {
    console.error("Error in debug warehouses:", error);
    return NextResponse.json(
      { 
        error: "Failed to fetch warehouse debug data",
        details: error instanceof Error ? error.message : String(error),
        stack: error instanceof Error ? error.stack : undefined,
      },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("=== CREATE SAMPLE WAREHOUSE ===");
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Create a sample warehouse if none exist
    const existingWarehouses = await prisma.warehouse.count();
    
    if (existingWarehouses > 0) {
      return NextResponse.json({
        message: "Warehouses already exist",
        count: existingWarehouses,
      });
    }

    const sampleWarehouse = await prisma.warehouse.create({
      data: {
        name: "Main Warehouse",
        code: "WH001",
        address: "123 Storage Street",
        contactPerson: "John Doe",
        phone: "+1234567890",
        email: "warehouse@example.com",
        isActive: true,
      },
    });

    console.log("Sample warehouse created:", sampleWarehouse.id);

    return NextResponse.json({
      message: "Sample warehouse created successfully",
      warehouse: sampleWarehouse,
    });
  } catch (error) {
    console.error("Error creating sample warehouse:", error);
    return NextResponse.json(
      { 
        error: "Failed to create sample warehouse",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
