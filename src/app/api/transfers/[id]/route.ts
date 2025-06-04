import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET /api/transfers/[id] - Get a specific transfer
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    const transfer = await prisma.transfer.findUnique({
      where: { id },
      include: {
        Warehouse_Transfer_fromWarehouseIdToWarehouse: {
          select: { id: true, name: true, code: true }
        },
        Warehouse_Transfer_toWarehouseIdToWarehouse: {
          select: { id: true, name: true, code: true }
        },
        Store_Transfer_toStoreIdToStore: {
          select: { id: true, name: true, code: true }
        },
        Store_Transfer_fromStoreIdToStore: {
          select: { id: true, name: true, code: true }
        },
        items: {
          include: {
            product: {
              select: {
                id: true,
                name: true,
                sku: true,
                costPrice: true,
                retailPrice: true,
                category: {
                  select: { id: true, name: true }
                }
              }
            },
          },
        },
      },
    });

    if (!transfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    return NextResponse.json({ transfer });
  } catch (error) {
    console.error("Error fetching transfer:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfer" },
      { status: 500 }
    );
  }
}

// PUT /api/transfers/[id] - Update a transfer
export async function PUT(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    const {
      fromWarehouseId,
      toStoreId,
      toWarehouseId,
      transferType,
      priority,
      requestedDate,
      expectedDeliveryDate,
      notes,
      items,
      totalItems,
      totalCost,
      totalRetail,
    } = body;

    // Validate the transfer exists and can be edited
    const existingTransfer = await prisma.transfer.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!existingTransfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    if (existingTransfer.status !== "DRAFT" && existingTransfer.status !== "PENDING") {
      return NextResponse.json(
        { error: "Transfer cannot be edited in its current status" },
        { status: 400 }
      );
    }

    // Update the transfer in a transaction
    const updatedTransfer = await prisma.$transaction(async (tx) => {
      // Delete existing items
      await tx.transferItem.deleteMany({
        where: { transferId: id }
      });

      // Update the transfer
      const transfer = await tx.transfer.update({
        where: { id },
        data: {
          fromWarehouseId,
          toStoreId,
          toWarehouseId,
          transferType,
          priority,
          requestedDate: requestedDate ? new Date(requestedDate) : null,
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          notes,
          totalItems,
          totalCost,
          totalRetail,
          updatedAt: new Date(),
        },
      });

      // Create new items
      if (items && items.length > 0) {
        await tx.transferItem.createMany({
          data: items.map((item: any) => ({
            transferId: id,
            productId: item.productId,
            quantity: item.quantity,
            sourceCostPrice: item.sourceCostPrice,
            sourceRetailPrice: item.sourceRetailPrice,
            targetCostPrice: item.targetCostPrice,
            targetRetailPrice: item.targetRetailPrice,
            adjustmentReason: item.adjustmentReason,
          })),
        });
      }

      return transfer;
    });

    return NextResponse.json({
      message: "Transfer updated successfully",
      transfer: updatedTransfer
    });

  } catch (error) {
    console.error("Error updating transfer:", error);
    return NextResponse.json(
      { error: "Failed to update transfer" },
      { status: 500 }
    );
  }
}

// PATCH /api/transfers/[id] - Update transfer status
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();
    const { status } = body;

    // Validate status
    const validStatuses = ["DRAFT", "PENDING", "APPROVED", "REJECTED", "IN_TRANSIT", "COMPLETED", "CANCELLED"];
    if (!validStatuses.includes(status)) {
      return NextResponse.json({ error: "Invalid status" }, { status: 400 });
    }

    // Check if transfer exists
    const existingTransfer = await prisma.transfer.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!existingTransfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    // Update the transfer status
    const updatedTransfer = await prisma.transfer.update({
      where: { id },
      data: {
        status,
        updatedAt: new Date(),
        // Set approval/completion dates based on status
        ...(status === "APPROVED" && { approvedDate: new Date() }),
        ...(status === "COMPLETED" && { completedDate: new Date() }),
        ...(status === "IN_TRANSIT" && { actualDeliveryDate: new Date() }),
      },
    });

    return NextResponse.json({
      message: "Transfer status updated successfully",
      transfer: updatedTransfer
    });

  } catch (error) {
    console.error("Error updating transfer status:", error);
    return NextResponse.json(
      { error: "Failed to update transfer status" },
      { status: 500 }
    );
  }
}

// DELETE /api/transfers/[id] - Delete a transfer
export async function DELETE(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;

    // Check if transfer exists and can be deleted
    const existingTransfer = await prisma.transfer.findUnique({
      where: { id },
      select: { status: true }
    });

    if (!existingTransfer) {
      return NextResponse.json({ error: "Transfer not found" }, { status: 404 });
    }

    if (existingTransfer.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft transfers can be deleted" },
        { status: 400 }
      );
    }

    // Delete the transfer and its items
    await prisma.$transaction(async (tx) => {
      await tx.transferItem.deleteMany({
        where: { transferId: id }
      });

      await tx.transfer.delete({
        where: { id }
      });
    });

    return NextResponse.json({
      message: "Transfer deleted successfully"
    });

  } catch (error) {
    console.error("Error deleting transfer:", error);
    return NextResponse.json(
      { error: "Failed to delete transfer" },
      { status: 500 }
    );
  }
}
