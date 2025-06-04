import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(
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

    const resolvedParams = await params;
    const purchaseOrderId = resolvedParams.id;
    const { status } = await req.json();

    // Validate status
    const validStatuses = [
      "DRAFT",
      "SUBMITTED", 
      "APPROVED",
      "ORDERED",
      "PARTIALLY_RECEIVED",
      "RECEIVED",
      "CANCELLED"
    ];

    if (!validStatuses.includes(status)) {
      return NextResponse.json(
        { error: "Invalid status value" },
        { status: 400 }
      );
    }

    // Check if purchase order exists
    const existingOrder = await prisma.purchaseOrder.findUnique({
      where: {
        id: purchaseOrderId,
      },
    });

    if (!existingOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Update purchase order status
    const updatedOrder = await prisma.purchaseOrder.update({
      where: {
        id: purchaseOrderId,
      },
      data: {
        status: status,
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({
      purchaseOrder: updatedOrder,
      message: "Purchase order status updated successfully"
    });
  } catch (error) {
    console.error("Error updating purchase order status:", error);
    return NextResponse.json(
      { error: "Failed to update purchase order status" },
      { status: 500 }
    );
  }
}
