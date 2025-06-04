import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { randomUUID } from "crypto";

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const {
      saleId,
      amount,
      paymentMethod,
      referenceNumber,
      notes,
    } = data;

    // Validate required fields
    if (!saleId || !amount || !paymentMethod) {
      return NextResponse.json(
        { error: "Sale ID, amount, and payment method are required" },
        { status: 400 }
      );
    }

    // Check if sale exists
    const sale = await prisma.sale.findUnique({
      where: { id: saleId },
      include: {
        Payment: true,
      },
    });

    if (!sale) {
      return NextResponse.json(
        { error: "Sale not found" },
        { status: 404 }
      );
    }

    // Check if sale is already fully paid
    const totalPaid = sale.Payment.reduce((sum, payment) => sum + payment.amount, 0);

    if (totalPaid >= sale.totalAmount) {
      return NextResponse.json(
        { error: "Sale is already fully paid" },
        { status: 400 }
      );
    }

    // Check if payment amount is valid
    const remainingAmount = sale.totalAmount - totalPaid;

    if (amount > remainingAmount) {
      return NextResponse.json(
        { error: "Payment amount exceeds remaining balance" },
        { status: 400 }
      );
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create payment
      const payment = await tx.payment.create({
        data: {
          saleId,
          amount,
          paymentMethod,
          referenceNumber: referenceNumber || null,
          notes: notes || null,
          processedById: session.user.id,
          processedByName: session.user.name || null,
        },
      });

      // Calculate new total paid
      const newTotalPaid = totalPaid + amount;

      // Update sale payment status
      await tx.sale.update({
        where: { id: saleId },
        data: {
          paymentStatus: newTotalPaid >= sale.totalAmount ? "PAID" : "PARTIALLY_PAID",
        },
      });

      return payment;
    });

    // Create audit log
    await createAuditLog({
      entityType: 'Payment',
      entityId: result.id,
      action: 'SALE', // Changed from 'PAYMENT' to 'SALE' which is a valid AuditAction
      details: {
        saleId,
        amount,
        paymentMethod,
        referenceNumber: referenceNumber || null,
        userId: session.user.id,  // Include user ID in details if needed
      },
    });

    return NextResponse.json({
      message: "Payment processed successfully",
      payment: result,
    });
  } catch (error) {
    console.error("Error processing payment:", error);
    return NextResponse.json(
      { error: "Failed to process payment", details: (error as Error).message },
      { status: 500 }
    );
  }
}



