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

    // Await params to fix Next.js error
    const { id: auditId } = await params;

    // Get audit
    const audit = await prisma.audit.findUnique({
      where: {
        id: auditId,
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit not found" },
        { status: 404 }
      );
    }

    // Check if audit can be cancelled
    if (audit.status === "COMPLETED" || audit.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This audit cannot be cancelled" },
        { status: 400 }
      );
    }

    // Update audit status to CANCELLED
    await prisma.audit.update({
      where: {
        id: auditId,
      },
      data: {
        status: "CANCELLED",
      },
    });

    // Redirect to audit details page
    return NextResponse.redirect(new URL(`/audits/${auditId}`, req.url));
  } catch (error) {
    console.error("Error cancelling audit:", error);
    return NextResponse.json(
      { error: "Failed to cancel audit" },
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

    // Await params to fix Next.js error
    const { id: auditId } = await params;

    // Get audit
    const audit = await prisma.audit.findUnique({
      where: {
        id: auditId,
      },
    });

    if (!audit) {
      return NextResponse.json(
        { error: "Audit not found" },
        { status: 404 }
      );
    }

    // Check if audit can be cancelled
    if (audit.status === "COMPLETED" || audit.status === "CANCELLED") {
      return NextResponse.json(
        { error: "This audit cannot be cancelled" },
        { status: 400 }
      );
    }

    // Update audit status to CANCELLED
    const updatedAudit = await prisma.audit.update({
      where: {
        id: auditId,
      },
      data: {
        status: "CANCELLED",
      },
      include: {
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    return NextResponse.json({
      audit: updatedAudit,
      message: "Audit cancelled successfully"
    });
  } catch (error) {
    console.error("Error cancelling audit:", error);
    return NextResponse.json(
      { error: "Failed to cancel audit" },
      { status: 500 }
    );
  }
}
