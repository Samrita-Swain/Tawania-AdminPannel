import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import bcrypt from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    console.log("Starting database seeding...");
    
    // Check if admin user already exists
    const existingAdmin = await prisma.user.findFirst({
      where: {
        email: "admin@tawania.com",
      },
    });

    if (existingAdmin) {
      console.log("Admin user already exists, skipping creation");
      return NextResponse.json({
        success: true,
        message: "Admin user already exists",
        userId: existingAdmin.id,
      });
    }

    // Create admin user
    const hashedPassword = await bcrypt.hash("Admin@123", 10);
    
    const adminUser = await prisma.user.create({
      data: {
        name: "Admin User",
        email: "admin@tawania.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log("Admin user created successfully:", adminUser.id);

    return NextResponse.json({
      success: true,
      message: "Database seeded successfully",
      userId: adminUser.id,
    });
  } catch (error: any) {
    console.error("Error seeding database:", error);
    return NextResponse.json(
      { error: "Failed to seed database: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
