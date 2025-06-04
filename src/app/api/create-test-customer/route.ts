import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    // Check if a customer with name "Test Customer" already exists
    const existingCustomer = await prisma.customer.findFirst({
      where: {
        name: "Test Customer",
      },
    });
    
    if (existingCustomer) {
      return NextResponse.json({ message: "Test customer already exists" });
    }
    
    // Create a new customer
    const newCustomer = await prisma.customer.create({
      data: {
        name: "Test Customer",
        email: "test@example.com",
        phone: "1234567890",
        loyaltyPoints: 100,
        loyaltyTier: "SILVER",
        isActive: true,
      },
    });
    
    // Create a loyalty program if it doesn't exist
    const existingProgram = await prisma.loyaltyProgram.findFirst();
    
    if (!existingProgram) {
      const newProgram = await prisma.loyaltyProgram.create({
        data: {
          name: "Default Loyalty Program",
          description: '{"pointsPerDollar":1,"pointsRedemptionRate":0.01,"minimumPointsRedemption":100,"welcomeBonus":50,"birthdayBonus":100,"referralBonus":50}',
          pointsPerCurrency: 1,
          isActive: true,
        },
      });
      
      // Create loyalty tiers
      await prisma.loyaltyProgramTier.createMany({
        data: [
          {
            programId: newProgram.id,
            name: "Standard",
            description: "Basic tier for all customers",
            requiredPoints: 0,
            pointsMultiplier: 1,
            benefits: JSON.stringify(["Free shipping on orders over $50"]),
          },
          {
            programId: newProgram.id,
            name: "Silver",
            description: "Silver tier for loyal customers",
            requiredPoints: 100,
            pointsMultiplier: 1.25,
            benefits: JSON.stringify(["Free shipping on all orders", "5% discount on all purchases"]),
          },
          {
            programId: newProgram.id,
            name: "Gold",
            description: "Gold tier for premium customers",
            requiredPoints: 500,
            pointsMultiplier: 1.5,
            benefits: JSON.stringify(["Free shipping on all orders", "10% discount on all purchases", "Priority customer service"]),
          },
          {
            programId: newProgram.id,
            name: "Platinum",
            description: "Platinum tier for VIP customers",
            requiredPoints: 1000,
            pointsMultiplier: 2,
            benefits: JSON.stringify(["Free shipping on all orders", "15% discount on all purchases", "Priority customer service", "Exclusive access to new products"]),
          },
        ],
      });
    }
    
    return NextResponse.json({
      message: "Test customer and loyalty program created successfully",
      customer: newCustomer,
    });
  } catch (error) {
    console.error("Error creating test customer:", error);
    return NextResponse.json(
      { error: "Failed to create test customer", details: (error as Error).message },
      { status: 500 }
    );
  }
}
