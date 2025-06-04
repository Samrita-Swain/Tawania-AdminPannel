import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function PUT(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is an admin
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized. Only admins can update loyalty settings." },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      name,
      pointsPerDollar,
      pointsRedemptionRate,
      minimumPointsRedemption,
      welcomeBonus,
      birthdayBonus,
      referralBonus,
    } = body;

    // Validate required fields
    if (
      pointsPerDollar === undefined ||
      pointsRedemptionRate === undefined ||
      minimumPointsRedemption === undefined ||
      welcomeBonus === undefined ||
      birthdayBonus === undefined ||
      referralBonus === undefined
    ) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Find active loyalty program or create one if it doesn't exist
    const loyaltyProgram = await prisma.loyaltyProgram.findFirst({
      where: { isActive: true },
    });

    if (loyaltyProgram) {
      // Update existing loyalty program
      await prisma.loyaltyProgram.update({
        where: { id: loyaltyProgram.id },
        data: {
          // Update name if provided
          ...(name && { name }),
          // Store settings in the description as JSON
          description: JSON.stringify({
            pointsPerDollar,
            pointsRedemptionRate,
            minimumPointsRedemption,
            welcomeBonus,
            birthdayBonus,
            referralBonus,
          }),
          // Update pointsPerCurrency field directly
          pointsPerCurrency: pointsPerDollar,
        },
      });
    } else {
      // Create new loyalty program with settings
      await prisma.loyaltyProgram.create({
        data: {
          name: name || "Default Loyalty Program",
          description: JSON.stringify({
            pointsPerDollar,
            pointsRedemptionRate,
            minimumPointsRedemption,
            welcomeBonus,
            birthdayBonus,
            referralBonus,
          }),
          pointsPerCurrency: pointsPerDollar,
          isActive: true,
        },
      });
    }

    return NextResponse.json({
      message: "Loyalty settings updated successfully",
      settings: {
        pointsPerDollar,
        pointsRedemptionRate,
        minimumPointsRedemption,
        welcomeBonus,
        birthdayBonus,
        referralBonus,
      },
    });
  } catch (error) {
    console.error("Error updating loyalty settings:", error);
    return NextResponse.json(
      { message: "Failed to update loyalty settings", error: (error as Error).message },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Get loyalty program settings
    const loyaltyProgram = await prisma.loyaltyProgram.findFirst({
      where: { isActive: true },
    });

    if (!loyaltyProgram) {
      return NextResponse.json({
        settings: {
          pointsPerDollar: 1,
          pointsRedemptionRate: 0.01,
          minimumPointsRedemption: 100,
          welcomeBonus: 50,
          birthdayBonus: 100,
          referralBonus: 50,
        }
      });
    }

    // Parse settings from description
    let settings = {
      pointsPerDollar: 1,
      pointsRedemptionRate: 0.01,
      minimumPointsRedemption: 100,
      welcomeBonus: 50,
      birthdayBonus: 100,
      referralBonus: 50,
    };

    try {
      if (loyaltyProgram.description) {
        const parsedSettings = JSON.parse(loyaltyProgram.description);
        settings = {
          ...settings,
          ...parsedSettings
        };
      }
    } catch (e) {
      console.error("Error parsing loyalty program description:", e);
    }

    return NextResponse.json({ settings });
  } catch (error) {
    console.error("Error fetching loyalty settings:", error);
    return NextResponse.json(
      { message: "Failed to fetch loyalty settings", error: (error as Error).message },
      { status: 500 }
    );
  }
}



