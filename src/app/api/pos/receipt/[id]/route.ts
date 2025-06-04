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

    const saleId = params.id;

    // Get sale with all related data
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        store: true,
        customer: true,
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        items: {
          include: {
            product: true,
          },
        },
        Payment: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }

    // Format receipt data
    const receiptData = {
      receiptNumber: sale.receiptNumber,
      date: sale.saleDate,
      store: {
        name: sale.store.name,
        address: sale.store.address,
        phone: sale.store.phone,
        email: sale.store.email,
      },
      customer: sale.customer ? {
        name: sale.customer.name,
        email: sale.customer.email,
        phone: sale.customer.phone,
        loyaltyPoints: sale.customer.loyaltyPoints,
      } : null,
      cashier: {
        name: sale.createdBy.name,
      },
      items: sale.items.map(item => ({
        product: item.product.name,
        sku: item.product.sku,
        quantity: item.quantity,
        unitPrice: item.unitPrice,
        discount: item.discountAmount,
        tax: item.taxAmount,
        total: item.totalPrice,
      })),
      summary: {
        subtotal: sale.subtotal,
        tax: sale.taxAmount,
        discount: sale.discountAmount,
        total: sale.totalAmount,
      },
      payments: sale.Payment.map(payment => ({
        method: payment.paymentMethod,
        amount: payment.amount,
        date: payment.createdAt,
        reference: payment.referenceNumber,
      })),
      totalPaid: sale.Payment.reduce((sum, payment) => sum + payment.amount, 0),
      balance: sale.totalAmount - sale.Payment.reduce((sum, payment) => sum + payment.amount, 0),
      paymentStatus: sale.paymentStatus,
      notes: sale.notes,
    };

    return NextResponse.json({ receipt: receiptData });
  } catch (error) {
    console.error("Error generating receipt:", error);
    return NextResponse.json(
      { error: "Failed to generate receipt" },
      { status: 500 }
    );
  }
}
