import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET a specific tier
export async function GET(
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
    
    const tierId = params.id;
    
    // Get tier by ID
    const tier = await prisma.loyaltyProgramTier.findUnique({
      where: {
        id: tierId,
      },
    });
    
    if (!tier) {
      return NextResponse.json(
        { message: "Tier not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json(tier);
  } catch (error) {
    console.error("Error fetching loyalty tier:", error);
    return NextResponse.json(
      { message: "Failed to fetch loyalty tier", error: (error as Error).message },
      { status: 500 }
    );
  }
}

// PUT update a tier
export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized. Only admins can update loyalty tiers." },
        { status: 401 }
      );
    }
    
    const tierId = params.id;
    
    // Check if tier exists
    const existingTier = await prisma.loyaltyProgramTier.findUnique({
      where: {
        id: tierId,
      },
    });
    
    if (!existingTier) {
      return NextResponse.json(
        { message: "Tier not found" },
        { status: 404 }
      );
    }
    
    // Parse request body
    const body = await req.json();
    const {
      name,
      description,
      requiredPoints,
      pointsMultiplier,
      benefits,
    } = body;
    
    // Update tier
    const updatedTier = await prisma.loyaltyProgramTier.update({
      where: {
        id: tierId,
      },
      data: {
        name,
        description,
        requiredPoints,
        pointsMultiplier,
        benefits,
      },
    });
    
    return NextResponse.json(updatedTier);
  } catch (error) {
    console.error("Error updating loyalty tier:", error);
    return NextResponse.json(
      { message: "Failed to update loyalty tier", error: (error as Error).message },
      { status: 500 }
    );
  }
}

// DELETE a tier
export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated and is an admin
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized. Only admins can delete loyalty tiers." },
        { status: 401 }
      );
    }
    
    const tierId = params.id;
    
    // Check if tier exists
    const existingTier = await prisma.loyaltyProgramTier.findUnique({
      where: {
        id: tierId,
      },
    });
    
    if (!existingTier) {
      return NextResponse.json(
        { message: "Tier not found" },
        { status: 404 }
      );
    }
    
    // Delete tier
    await prisma.loyaltyProgramTier.delete({
      where: {
        id: tierId,
      },
    });
    
    return NextResponse.json({ message: "Tier deleted successfully" });
  } catch (error) {
    console.error("Error deleting loyalty tier:", error);
    return NextResponse.json(
      { message: "Failed to delete loyalty tier", error: (error as Error).message },
      { status: 500 }
    );
  }
}
