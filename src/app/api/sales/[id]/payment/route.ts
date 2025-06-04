import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    const saleId = params.id;

    // Parse request body
    const body = await req.json();
    const { amount, paymentMethod, referenceNumber, notes } = body;

    // Validate required fields
    if (!amount || amount <= 0 || !paymentMethod) {
      return NextResponse.json(
        { message: "Missing required fields or invalid amount" },
        { status: 400 }
      );
    }

    // Get the sale
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        Payment: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { message: "Sale not found" },
        { status: 404 }
      );
    }

    // Check if sale is already fully paid
    if (sale.paymentStatus === "PAID") {
      return NextResponse.json(
        { message: "Sale is already fully paid" },
        { status: 400 }
      );
    }

    // Calculate current balance
    const totalAmount = Number(sale.totalAmount);
    const totalPaid = sale.Payment.reduce((sum, payment) => sum + Number(payment.amount), 0);
    const balanceDue = totalAmount - totalPaid;

    // Check if payment amount exceeds balance due
    if (amount > balanceDue) {
      return NextResponse.json(
        { message: `Payment amount cannot exceed the balance due (${balanceDue.toFixed(2)})` },
        { status: 400 }
      );
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create the payment record
      const payment = await tx.payment.create({
        data: {
          saleId,
          amount,
          paymentMethod,
          referenceNumber,
          notes,
          processedById: session.user.id,
          processedByName: session.user.name || undefined,
        },
      });

      // Calculate new payment status
      const newTotalPaid = totalPaid + amount;
      const newPaymentStatus = newTotalPaid >= totalAmount ? "PAID" : "PARTIALLY_PAID";

      // Update the sale payment status
      const updatedSale = await tx.sale.update({
        where: { id: saleId },
        data: {
          paymentStatus: newPaymentStatus,
        },
      });

      return { payment, updatedSale };
    });

    return NextResponse.json({
      message: "Payment processed successfully",
      payment: result.payment,
      sale: result.updatedSale,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { message: "Failed to process payment", error: (error as Error).message },
      { status: 500 }
    );
  }
}
