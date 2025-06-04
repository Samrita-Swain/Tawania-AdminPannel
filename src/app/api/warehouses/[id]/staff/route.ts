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
    
    // Get warehouse staff
    const staff = await prisma.warehouseStaff.findMany({
      where: { warehouseId },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
      orderBy: [
        { isManager: 'desc' },
        { user: { name: 'asc' } },
      ],
    });
    
    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Error fetching warehouse staff:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouse staff" },
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
    
    // Check if user is admin or manager
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER' && session.user.role !== 'WAREHOUSE_MANAGER') {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const warehouseId = params.id;
    const data = await req.json();
    const { userId, position, isManager } = data;
    
    // Validate required fields
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
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
    
    // Check if user exists
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    
    if (!user) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }
    
    // Check if user is already assigned to this warehouse
    const existingStaff = await prisma.warehouseStaff.findFirst({
      where: {
        userId,
        warehouseId,
      },
    });
    
    if (existingStaff) {
      return NextResponse.json(
        { error: "User is already assigned to this warehouse" },
        { status: 400 }
      );
    }
    
    // Check if user is already assigned to another warehouse
    const otherWarehouseStaff = await prisma.warehouseStaff.findFirst({
      where: {
        userId,
      },
    });
    
    if (otherWarehouseStaff) {
      return NextResponse.json(
        { error: "User is already assigned to another warehouse" },
        { status: 400 }
      );
    }
    
    // Check if user is already assigned to a store
    const storeStaff = await prisma.storeStaff.findFirst({
      where: {
        userId,
      },
    });
    
    if (storeStaff) {
      return NextResponse.json(
        { error: "User is already assigned to a store" },
        { status: 400 }
      );
    }
    
    // Create warehouse staff
    const staff = await prisma.warehouseStaff.create({
      data: {
        userId,
        warehouseId,
        position: position || null,
        isManager: isManager || false,
      },
      include: {
        user: {
          select: {
            id: true,
            name: true,
            email: true,
            image: true,
            role: true,
          },
        },
      },
    });
    
    // Update user role if they are a manager
    if (isManager) {
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: 'WAREHOUSE_MANAGER',
        },
      });
    } else {
      await prisma.user.update({
        where: { id: userId },
        data: {
          role: 'WAREHOUSE_STAFF',
        },
      });
    }
    
    return NextResponse.json({ staff });
  } catch (error) {
    console.error("Error adding warehouse staff:", error);
    return NextResponse.json(
      { error: "Failed to add warehouse staff" },
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
    
    // Check if user is admin or manager
    if (session.user.role !== 'ADMIN' && session.user.role !== 'MANAGER' && session.user.role !== 'WAREHOUSE_MANAGER') {
      return NextResponse.json(
        { error: "Insufficient permissions" },
        { status: 403 }
      );
    }

    const warehouseId = params.id;
    const url = new URL(req.url);
    const userId = url.searchParams.get("userId");
    
    if (!userId) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }
    
    // Check if warehouse staff exists
    const staff = await prisma.warehouseStaff.findFirst({
      where: {
        userId,
        warehouseId,
      },
    });
    
    if (!staff) {
      return NextResponse.json(
        { error: "Warehouse staff not found" },
        { status: 404 }
      );
    }
    
    // Delete warehouse staff
    await prisma.warehouseStaff.delete({
      where: {
        id: staff.id,
      },
    });
    
    // Reset user role to STAFF
    await prisma.user.update({
      where: { id: userId },
      data: {
        role: 'STAFF',
      },
    });
    
    return NextResponse.json({
      message: "Warehouse staff removed successfully",
    });
  } catch (error) {
    console.error("Error removing warehouse staff:", error);
    return NextResponse.json(
      { error: "Failed to remove warehouse staff" },
      { status: 500 }
    );
  }
}
