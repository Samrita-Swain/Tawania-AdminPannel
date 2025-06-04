import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const categoryId = resolvedParams.id;

    // Get category using raw query to avoid schema mismatches
    const categories = await prisma.$queryRaw`
      SELECT id, name, code, description, "createdAt", "updatedAt", "isActive"
      FROM "Category"
      WHERE id = ${categoryId}
    `;

    const category = categories.length > 0 ? categories[0] : null;

    if (!category) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ category });
  } catch (error) {
    console.error("Error fetching category:", error);
    return NextResponse.json(
      { error: "Failed to fetch category" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const categoryId = resolvedParams.id;
    const data = await req.json();
    let { name, code, description } = data;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Auto-generate code if not provided
    if (!code) {
      code = name
        .toUpperCase()
        .replace(/[^A-Z0-9]/g, "")
        .substring(0, 6);

      // Add random suffix if code is too short
      if (code.length < 3) {
        code += Math.floor(Math.random() * 100).toString().padStart(2, '0');
      }
    }

    // Check if category exists using raw query
    const existingCategories = await prisma.$queryRaw`
      SELECT id, name, code, description
      FROM "Category"
      WHERE id = ${categoryId}
    `;

    const existingCategory = existingCategories.length > 0 ? existingCategories[0] : null;

    if (!existingCategory) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if name or code is being changed and already exists
    if (name !== existingCategory.name || code !== existingCategory.code) {
      const duplicateCategories = await prisma.$queryRaw`
        SELECT id
        FROM "Category"
        WHERE (name = ${name} OR code = ${code}) AND id != ${categoryId}
        LIMIT 1
      `;

      if (duplicateCategories.length > 0) {
        return NextResponse.json(
          { error: "Category with same name or code already exists" },
          { status: 400 }
        );
      }
    }

    // Update category using raw query to avoid schema mismatches
    try {
      await prisma.$executeRaw`
        UPDATE "Category"
        SET name = ${name}, code = ${code}, description = ${description}
        WHERE id = ${categoryId}
      `;

      // Fetch the updated category
      const updatedCategories = await prisma.$queryRaw`
        SELECT id, name, code, description, "createdAt", "updatedAt", "isActive"
        FROM "Category"
        WHERE id = ${categoryId}
      `;

      const updatedCategory = updatedCategories.length > 0 ? updatedCategories[0] : null;
      return NextResponse.json({ category: updatedCategory });
    } catch (error) {
      console.error("Error in raw SQL update:", error);
      return NextResponse.json(
        { error: "Failed to update category" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating category:", error);
    return NextResponse.json(
      { error: "Failed to update category" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const categoryId = resolvedParams.id;

    // Check if category exists using raw query
    const existingCategories = await prisma.$queryRaw`
      SELECT id
      FROM "Category"
      WHERE id = ${categoryId}
    `;

    if (existingCategories.length === 0) {
      return NextResponse.json(
        { error: "Category not found" },
        { status: 404 }
      );
    }

    // Check if category is used by products using raw query
    const productsCountResult = await prisma.$queryRaw`
      SELECT COUNT(*) as count
      FROM "Product"
      WHERE "categoryId" = ${categoryId}
    `;

    const productsCount = parseInt(productsCountResult[0].count);

    if (productsCount > 0) {
      return NextResponse.json(
        { error: "Cannot delete category because it is used by products" },
        { status: 400 }
      );
    }

    // Delete category using raw query
    await prisma.$executeRaw`
      DELETE FROM "Category"
      WHERE id = ${categoryId}
    `;

    return NextResponse.json({
      message: "Category deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting category:", error);
    return NextResponse.json(
      { error: "Failed to delete category" },
      { status: 500 }
    );
  }
}
