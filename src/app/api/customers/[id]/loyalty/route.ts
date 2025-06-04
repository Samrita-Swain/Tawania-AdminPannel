import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { LoyaltyTransactionType } from '@prisma/client';
import type { LoyaltyTier } from '@prisma/client';

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

    const customerId = params.id;

    // Get customer loyalty transactions
    const transactions = await prisma.loyaltyTransaction.findMany({
      where: {
        customerId,
      },
      include: {
        program: true,
        // If Sale relation doesn't exist, remove this line
        // Sale: true,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    // Get customer loyalty information
    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      select: {
        id: true,
        name: true,
        loyaltyPoints: true,
        loyaltyTier: true,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Get loyalty program information
    const loyaltyProgram = await prisma.loyaltyProgram.findFirst({
      where: {
        isActive: true,
      },
      include: {
        tiers: {
          orderBy: {
            requiredPoints: "asc",
          },
        },
      },
    });

    return NextResponse.json({
      customer,
      transactions,
      loyaltyProgram,
    });
  } catch (error) {
    console.error("Error fetching loyalty information:", error);
    return NextResponse.json(
      { error: "Failed to fetch loyalty information" },
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

    const customerId = params.id;
    const data = await req.json();
    const { 
      points, 
      type, 
      description, 
      saleId = null,
      expiryDate = null,
    } = data;

    // Validate required fields
    if (points === undefined || !type) {
      return NextResponse.json(
        { error: "Points and type are required" },
        { status: 400 }
      );
    }

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Get active loyalty program
    const loyaltyProgram = await prisma.loyaltyProgram.findFirst({
      where: {
        isActive: true,
      },
      include: {
        tiers: {
          orderBy: {
            requiredPoints: "asc",
          },
        },
      },
    });

    if (!loyaltyProgram) {
      return NextResponse.json(
        { error: "No active loyalty program found" },
        { status: 400 }
      );
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create loyalty transaction
      const transaction = await tx.loyaltyTransaction.create({
        data: {
          customerId,
          programId: loyaltyProgram.id,
          points,
          type: type as LoyaltyTransactionType,
          description,
        },
      });

      // Update customer loyalty points
      let newPoints = customer.loyaltyPoints;
      
      if (type === "EARN" || type === "BONUS" || type === "ADJUST") {
        newPoints += points;
      } else if (type === "REDEEM" || type === "EXPIRE") {
        newPoints -= points;
        
        // Ensure points don't go negative
        if (newPoints < 0) {
          newPoints = 0;
        }
      }

      // Determine loyalty tier based on points
      let newTier = customer.loyaltyTier;
      
      if (loyaltyProgram.tiers.length > 0) {
        // Sort tiers by required points in descending order
        const sortedTiers = [...loyaltyProgram.tiers].sort((a, b) => b.requiredPoints - a.requiredPoints);
        
        // Find the highest tier the customer qualifies for
        for (const tier of sortedTiers) {
          if (newPoints >= tier.requiredPoints) {
            newTier = tier.name as any; // Use 'as any' temporarily to bypass type checking
            break;
          }
        }
      }

      // Update customer
      const updatedCustomer = await tx.customer.update({
        where: {
          id: customerId,
        },
        data: {
          loyaltyPoints: newPoints,
          loyaltyTier: newTier,
        },
      });

      // Create notification if tier changed
      if (newTier !== customer.loyaltyTier) {
        try {
          // Since notification model doesn't exist, just log the change
          console.log(`Customer ${customer.name} has been upgraded to ${newTier} tier.`);
          
          // If you want to store this information somewhere else, you could:
          // 1. Create a customer activity log if that model exists
          // 2. Send an email notification
          // 3. Store it in a different table
          
          // Example if you have an activity log model:
          // await tx.activityLog.create({
          //   data: {
          //     userId: session.user.id,
          //     action: "LOYALTY_TIER_CHANGED",
          //     details: `Customer ${customer.name} upgraded to ${newTier} tier`,
          //   },
          // });
        } catch (error) {
          console.error("Error handling tier change:", error);
          // Continue execution even if notification fails
        }
      }

      return {
        transaction,
        customer: updatedCustomer,
      };
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error adding loyalty transaction:", error);
    return NextResponse.json(
      { error: "Failed to add loyalty transaction" },
      { status: 500 }
    );
  }
}







