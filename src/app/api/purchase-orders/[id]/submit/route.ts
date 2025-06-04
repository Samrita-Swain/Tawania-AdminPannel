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

    // Check if purchase order can be submitted
    if (purchaseOrder.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft purchase orders can be submitted" },
        { status: 400 }
      );
    }

    // Update purchase order status to ORDERED
    const updatedOrder = await prisma.purchaseOrder.update({
      where: {
        id: purchaseOrderId,
      },
      data: {
        status: "SENT",
      },
    });

    // Redirect to purchase order details page
    return NextResponse.redirect(new URL(`/purchase-orders/${purchaseOrderId}`, req.url));
  } catch (error) {
    console.error("Error submitting purchase order:", error);
    return NextResponse.json(
      { error: "Failed to submit purchase order" },
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

    // Check if purchase order can be submitted
    if (purchaseOrder.status !== "DRAFT") {
      return NextResponse.json(
        { error: "Only draft purchase orders can be submitted" },
        { status: 400 }
      );
    }

    // Update purchase order status to ORDERED
    const updatedOrder = await prisma.purchaseOrder.update({
      where: {
        id: purchaseOrderId,
      },
      data: {
        status: "SENT",
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
      message: "Purchase order submitted successfully"
    });
  } catch (error) {
    console.error("Error submitting purchase order:", error);
    return NextResponse.json(
      { error: "Failed to submit purchase order" },
      { status: 500 }
    );
  }
}
