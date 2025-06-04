import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
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

    // Get purchase order
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: {
        id: purchaseOrderId,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Check if purchase order can be cancelled
    if (purchaseOrder.status === "RECEIVED" || purchaseOrder.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This purchase order cannot be cancelled" },
        { status: 400 }
      );
    }

    // Update purchase order status to CANCELLED
    const updatedOrder = await prisma.purchaseOrder.update({
      where: {
        id: purchaseOrderId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    // Redirect to purchase order details page
    return NextResponse.redirect(new URL(`/purchase-orders/${purchaseOrderId}`, req.url));
  } catch (error) {
    console.error("Error cancelling purchase order:", error);
    return NextResponse.json(
      { error: "Failed to cancel purchase order" },
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

    const resolvedParams = await params;
    const purchaseOrderId = resolvedParams.id;

    // Get purchase order
    const purchaseOrder = await prisma.purchaseOrder.findUnique({
      where: {
        id: purchaseOrderId,
      },
    });

    if (!purchaseOrder) {
      return NextResponse.json(
        { error: "Purchase order not found" },
        { status: 404 }
      );
    }

    // Check if purchase order can be cancelled
    if (purchaseOrder.status === "RECEIVED" || purchaseOrder.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This purchase order cannot be cancelled" },
        { status: 400 }
      );
    }

    // Update purchase order status to CANCELLED
    const updatedOrder = await prisma.purchaseOrder.update({
      where: {
        id: purchaseOrderId,
      },
      data: {
        status: "CANCELLED",
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
      message: "Purchase order cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling purchase order:", error);
    return NextResponse.json(
      { error: "Failed to cancel purchase order" },
      { status: 500 }
    );
  }
}
