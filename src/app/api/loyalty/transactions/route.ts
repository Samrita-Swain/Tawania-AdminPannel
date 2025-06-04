import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// GET all transactions
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

    // Get query parameters
    const { searchParams } = new URL(req.url);
    const customerId = searchParams.get("customerId");
    const type = searchParams.get("type");
    const startDate = searchParams.get("startDate");
    const endDate = searchParams.get("endDate");
    const limit = searchParams.get("limit") ? parseInt(searchParams.get("limit")!) : 50;

    // Build where clause
    const where: any = {};

    if (customerId) {
      where.customerId = customerId;
    }

    if (type) {
      where.type = type;
    }

    if (startDate && endDate) {
      where.createdAt = {
        gte: new Date(startDate),
        lte: new Date(endDate),
      };
    } else if (startDate) {
      where.createdAt = {
        gte: new Date(startDate),
      };
    } else if (endDate) {
      where.createdAt = {
        lte: new Date(endDate),
      };
    }

    // Get transactions
    const transactions = await prisma.loyaltyTransaction.findMany({
      where,
      include: {
        customer: {
          select: {
            id: true,
            name: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: limit,
    });

    return NextResponse.json(transactions);
  } catch (error) {
    console.error("Error fetching loyalty transactions:", error);
    return NextResponse.json(
      { message: "Failed to fetch loyalty transactions", error: (error as Error).message },
      { status: 500 }
    );
  }
}

// POST create a new transaction
export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated and is an admin
    if (!session || !session.user || session.user.role !== "ADMIN") {
      return NextResponse.json(
        { message: "Unauthorized. Only admins can create loyalty transactions." },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    const {
      customerId,
      programId,
      points,
      type,
      description,
      referenceId,
    } = body;

    // Validate required fields
    if (!customerId || !points || !type) {
      return NextResponse.json(
        { message: "Missing required fields: customerId, points, type" },
        { status: 400 }
      );
    }

    // Start a transaction to ensure data consistency
    const result = await prisma.$transaction(async (tx) => {
      // Create the transaction
      const transaction = await tx.loyaltyTransaction.create({
        data: {
          customerId,
          programId,
          points,
          type,
          description,
          referenceId,
          updatedAt: new Date(), // Add the updatedAt field
        },
      });

      // Update customer's loyalty points based on transaction type
      const customer = await tx.customer.findUnique({
        where: { id: customerId },
        select: { loyaltyPoints: true },
      });

      if (!customer) {
        throw new Error("Customer not found");
      }

      let newPoints = customer.loyaltyPoints;

      if (type === "EARN" || type === "BONUS" || type === "ADJUST") {
        newPoints += points;
      } else if (type === "REDEEM" || type === "EXPIRE") {
        newPoints -= points;

        // Ensure points don't go below zero
        if (newPoints < 0) {
          newPoints = 0;
        }
      }

      // Update customer's points
      await tx.customer.update({
        where: { id: customerId },
        data: { loyaltyPoints: newPoints },
      });

      return transaction;
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error("Error creating loyalty transaction:", error);
    return NextResponse.json(
      { message: "Failed to create loyalty transaction", error: (error as Error).message },
      { status: 500 }
    );
  }
}
