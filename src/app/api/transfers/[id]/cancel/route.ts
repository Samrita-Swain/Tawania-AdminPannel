import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const transferId = params.id;
    const { cancellationReason } = await req.json();

    if (!cancellationReason || cancellationReason.trim() === "") {
      return NextResponse.json(
        { error: "Cancellation reason is required" },
        { status: 400 }
      );
    }

    // Get the transfer
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
    });

    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }

    // Check if transfer is in DRAFT or PENDING status
    if (transfer.status !== "DRAFT" && transfer.status !== "PENDING") {
      return NextResponse.json(
        { error: "Transfer can only be cancelled when in DRAFT or PENDING status" },
        { status: 400 }
      );
    }

    // Update transfer status
    const updatedTransfer = await prisma.transfer.update({
      where: { id: transferId },
      data: {
        status: "CANCELLED",
        notes: cancellationReason,
        completedDate: new Date(),
        completedById: session.user.id,
      },
    });

    // Create audit log
    await createAuditLog({
      entityType: "Transfer",
      entityId: transferId,
      action: "UPDATE",
      details: {
        transferNumber: transfer.transferNumber,
        fromWarehouseId: transfer.fromWarehouseId,
        toWarehouseId: transfer.toWarehouseId,
        toStoreId: transfer.toStoreId,
        cancellationReason,
        status: "CANCELLED"
      },
    });

    return NextResponse.json(updatedTransfer);
  } catch (error: any) {
    console.error("Error cancelling transfer:", error);
    return NextResponse.json(
      { error: error.message || "Failed to cancel transfer" },
      { status: 500 }
    );
  }
}




