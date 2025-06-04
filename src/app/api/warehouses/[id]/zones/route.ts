import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== WAREHOUSE ZONES API CALLED ===");

    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("No session found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await params to fix Next.js error
    const { id: warehouseId } = await params;
    console.log("Fetching zones for warehouse:", warehouseId);

    // First check if warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: {
        id: warehouseId,
      },
    });

    if (!warehouse) {
      console.log("Warehouse not found:", warehouseId);
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    console.log("Warehouse found:", warehouse.name);

    // Get warehouse zones
    const zones = await prisma.warehouseZone.findMany({
      where: {
        warehouseId,
      },
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
      orderBy: {
        name: "asc",
      },
    });

    console.log("Found zones:", zones.length);

    return NextResponse.json({ zones });
  } catch (error) {
    console.error("=== ERROR IN WAREHOUSE ZONES API ===");
    console.error("Error fetching warehouse zones:", error);

    let errorMessage = "Failed to fetch warehouse zones";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error message:", errorMessage);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Await params to fix Next.js error
    const { id: warehouseId } = await params;
    const data = await req.json();
    const { name, code, description } = data;

    // Validate required fields
    if (!name || !code) {
      return NextResponse.json(
        { error: "Name and code are required" },
        { status: 400 }
      );
    }

    // Check if warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: {
        id: warehouseId,
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Check if zone code is unique for this warehouse
    const existingZone = await prisma.warehouseZone.findFirst({
      where: {
        warehouseId,
        code,
      },
    });

    if (existingZone) {
      return NextResponse.json(
        { error: "Zone code already exists in this warehouse" },
        { status: 400 }
      );
    }

    // Create zone
    const zone = await prisma.warehouseZone.create({
      data: {
        name,
        code,
        description,
        warehouseId,
      },
    });

    return NextResponse.json({ zone });
  } catch (error) {
    console.error("Error creating warehouse zone:", error);
    return NextResponse.json(
      { error: "Failed to create warehouse zone" },
      { status: 500 }
    );
  }
}
