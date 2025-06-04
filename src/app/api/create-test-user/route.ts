import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    // Check if a user with email admin@example.com already exists
    const existingUser = await prisma.user.findUnique({
      where: {
        email: "admin@example.com",
      },
    });
    
    if (existingUser) {
      return NextResponse.json({ message: "Test user already exists" });
    }
    
    // Create a new user
    const hashedPassword = await hash("password123", 10);
    
    const newUser = await prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@example.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    });
    
    return NextResponse.json({
      message: "Test user created successfully",
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
      },
    });
  } catch (error) {
    console.error("Error creating test user:", error);
    return NextResponse.json(
      { error: "Failed to create test user" },
      { status: 500 }
    );
  }
}
