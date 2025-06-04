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

    const { searchParams } = new URL(req.url);
    const categoryId = searchParams.get("categoryId");

    // Build filter
    const filter: any = {};

    if (categoryId) {
      filter.categoryId = categoryId;
    }

    // Get price rules
    const priceRules = await prisma.categoryPriceRule.findMany({
      where: filter,
      include: {
        category: true,
      },
      orderBy: {
        category: {
          name: "asc",
        },
      },
    });

    return NextResponse.json({
      priceRules,
    });
  } catch (error) {
    console.error("Error fetching price rules:", error);
    return NextResponse.json(
      { error: "Failed to fetch price rules" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const data = await req.json();
    const { 
      categoryId, 
      adjustmentType, 
      adjustmentValue,
      isDefault,
    } = data;

    // Validate required fields
    if (!categoryId || !adjustmentType || adjustmentValue === undefined) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if category exists
    const category = await prisma.category.findUnique({
      where: {
        id: categoryId,
      },
    });

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if rule already exists for this category
    const existingRule = await prisma.categoryPriceRule.findFirst({
      where: {
        categoryId,
      },
    });

    if (existingRule) {
      // Update existing rule
      const updatedRule = await prisma.categoryPriceRule.update({
        where: {
          id: existingRule.id,
        },
        data: {
          adjustmentType,
          adjustmentValue,
          isDefault: isDefault || false,
        },
        include: {
          category: true,
        },
      });

      return NextResponse.json(updatedRule);
    } else {
      // Create new rule
      const newRule = await prisma.categoryPriceRule.create({
        data: {
          categoryId,
          adjustmentType,
          adjustmentValue,
          isDefault: isDefault || false,
        },
        include: {
          category: true,
        },
      });

      return NextResponse.json(newRule);
    }
  } catch (error) {
    console.error("Error creating price rule:", error);
    return NextResponse.json(
      { error: "Failed to create price rule" },
      { status: 500 }
    );
  }
}
