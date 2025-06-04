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

    // Get categories using raw query to avoid schema mismatches
    const categories = await prisma.$queryRaw`
      SELECT id, name, code, description, "createdAt", "updatedAt", "isActive"
      FROM "Category"
      ORDER BY name ASC
    `;

    return NextResponse.json({ categories });
  } catch (error) {
    console.error("Error fetching categories:", error);
    return NextResponse.json(
      { error: "Failed to fetch categories" },
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

    // Check if category with same name or code already exists using raw query
    const existingCategories = await prisma.$queryRaw`
      SELECT id
      FROM "Category"
      WHERE name = ${name} OR code = ${code}
      LIMIT 1
    `;

    if (existingCategories.length > 0) {
      return NextResponse.json(
        { error: "Category with same name or code already exists" },
        { status: 400 }
      );
    }

    // Create category using raw query to avoid schema mismatches
    try {
      // Generate a CUID for the new category
      const { randomUUID } = require('crypto');
      const newId = randomUUID();
      const now = new Date();

      await prisma.$executeRaw`
        INSERT INTO "Category" (id, name, code, description, "createdAt", "updatedAt", "isActive")
        VALUES (${newId}, ${name}, ${code}, ${description}, ${now}, ${now}, true)
      `;

      // Fetch the created category
      const categories = await prisma.$queryRaw`
        SELECT id, name, code, description, "createdAt", "updatedAt", "isActive"
        FROM "Category"
        WHERE id = ${newId}
      `;

      const category = categories.length > 0 ? categories[0] : null;
      return NextResponse.json({ category });
    } catch (error) {
      console.error("Error in raw SQL insert:", error);
      return NextResponse.json(
        { error: "Failed to create category" },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating category:", error);
    return NextResponse.json(
      { error: "Failed to create category" },
      { status: 500 }
    );
  }
}
