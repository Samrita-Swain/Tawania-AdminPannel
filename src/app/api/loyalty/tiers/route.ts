import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all tiers
export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Get program ID from query params
    const { searchParams } = new URL(req.url);
    const programId = searchParams.get("programId");
    
    if (!programId) {
      return NextResponse.json(
        { message: "Program ID is required" },
        { status: 400 }
      );
    }
    
    // Get tiers for the specified program
    const tiers = await prisma.loyaltyProgramTier.findMany({
      where: {
        programId: programId,
      },
      orderBy: {
        requiredPoints: "asc",
      },
    });
    
    return NextResponse.json(tiers);
  } catch (error) {
    console.error("Error fetching loyalty tiers:", error);
    return NextResponse.json(
      { message: "Failed to fetch loyalty tiers", error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST create a new tier
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized. Only admins can create loyalty tiers." },
        { status: 401 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const {
      programId,
      name,
      description,
      requiredPoints,
      pointsMultiplier,
      benefits,
    } = body;
    
    // Validate required fields
    if (!programId || !name || requiredPoints === undefined) {
      return NextResponse.json(
        { message: "Missing required fields: programId, name, requiredPoints" },
        { status: 400 }
      );
    }
    
    // Create new tier
    const tier = await prisma.loyaltyProgramTier.create({
      data: {
        programId,
        name,
        description,
        requiredPoints,
        pointsMultiplier: pointsMultiplier || 1,
        benefits,
      },
    });
    
    return NextResponse.json(tier);
  } catch (error) {
    console.error("Error creating loyalty tier:", error);
    return NextResponse.json(
      { message: "Failed to create loyalty tier", error: (error as Error).message },
      { status: 500 }
    );
  }
}
