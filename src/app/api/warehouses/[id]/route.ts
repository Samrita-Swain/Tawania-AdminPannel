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

    // Get warehouse details
    const warehouse = await prisma.warehouse.findUnique({
      where: {
        id: warehouseId,
      },
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
        staff: {
          include: {
            user: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
          },
        },
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ warehouse });
  } catch (error) {
    console.error("Error fetching warehouse:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouse" },
      { status: 500 }
    );
  }
}

export async function PUT(
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
    
    // Check if warehouse exists
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: {
        id: warehouseId,
      },
    });

    if (!existingWarehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Extract data
    const { 
      name, 
      code, 
      address, 
      contactPerson, 
      phone, 
      email, 
      isActive 
    } = data;

    // Check if code is unique if changed
    if (code && code !== existingWarehouse.code) {
      const warehouseWithCode = await prisma.warehouse.findUnique({
        where: { code },
      });
      
      if (warehouseWithCode) {
        return NextResponse.json(
          { error: "Warehouse code already in use" },
          { status: 400 }
        );
      }
    }

    // Update warehouse
    const updatedWarehouse = await prisma.warehouse.update({
      where: {
        id: warehouseId,
      },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        address: address !== undefined ? address : undefined,
        contactPerson: contactPerson !== undefined ? contactPerson : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json({ warehouse: updatedWarehouse });
  } catch (error) {
    console.error("Error updating warehouse:", error);
    return NextResponse.json(
      { error: "Failed to update warehouse" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    // Check if warehouse exists
    const existingWarehouse = await prisma.warehouse.findUnique({
      where: {
        id: warehouseId,
      },
      include: {
        inventoryItems: {
          select: {
            id: true,
          },
        },
        zones: {
          select: {
            id: true,
          },
        },
        staff: {
          select: {
            id: true,
          },
        },
        purchaseOrders: {
          select: {
            id: true,
          },
        },
        // Use the correct relation names from your schema
        transfersTo: {
          select: {
            id: true,
          },
        },
        transfersFrom: {
          select: {
            id: true,
          },
        },
        qualityControls: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingWarehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Use type assertion to access the included relations
    const warehouse = existingWarehouse as any;

    // Check if warehouse has related records
    const hasRelatedRecords = 
      warehouse.inventoryItems.length > 0 ||
      warehouse.zones.length > 0 ||
      warehouse.staff.length > 0 ||
      warehouse.purchaseOrders.length > 0 ||
      warehouse.transfersTo.length > 0 ||
      warehouse.transfersFrom.length > 0 ||
      warehouse.qualityControls.length > 0;

    if (hasRelatedRecords) {
      // Instead of deleting, mark as inactive
      await prisma.warehouse.update({
        where: {
          id: warehouseId,
        },
        data: {
          isActive: false,
        },
      });

      return NextResponse.json({
        message: "Warehouse has related records and cannot be deleted. Marked as inactive instead.",
        deactivated: true,
      });
    }

    // Delete warehouse
    await prisma.warehouse.delete({
      where: {
        id: warehouseId,
      },
    });

    return NextResponse.json({
      message: "Warehouse deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting warehouse:", error);
    return NextResponse.json(
      { error: "Failed to delete warehouse" },
      { status: 500 }
    );
  }
}


