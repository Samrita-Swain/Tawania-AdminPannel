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

    // Get code from query parameters
    const url = new URL(req.url);
    const code = url.searchParams.get("code");
    
    if (!code) {
      return NextResponse.json(
        { error: "Store code is required" },
        { status: 400 }
      );
    }
    
    // Check if code exists
    const existingStore = await prisma.store.findUnique({
      where: { code },
      select: { id: true }
    });
    
    return NextResponse.json({
      exists: !!existingStore
    });
  } catch (error) {
    console.error("Error checking store code:", error);
    return NextResponse.json(
      { error: "Failed to check store code" },
      { status: 500 }
    );
  }
}
