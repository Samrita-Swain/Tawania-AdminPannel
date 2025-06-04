import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get a sample transfer to see the structure
    const sampleTransfer = await prisma.transfer.findFirst({
      include: {
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Get the database schema for the Transfer model
    const transferModelInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'Transfer'
    `;

    // Get the database schema for the TransferItem model
    const transferItemModelInfo = await prisma.$queryRaw`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'TransferItem'
    `;

    return NextResponse.json({
      sampleTransfer,
      transferModelInfo,
      transferItemModelInfo,
    });
  } catch (error) {
    console.error("Error fetching schema:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch schema",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
