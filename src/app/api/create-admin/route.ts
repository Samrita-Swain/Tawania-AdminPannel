import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { hash } from "bcryptjs";

export async function GET(req: NextRequest) {
  try {
    console.log("Creating admin user...");
    
    // Delete existing admin user if exists
    await prisma.user.deleteMany({
      where: {
        email: "admin@tawania.com",
      },
    });

    // Create admin user with proper password hash
    const hashedPassword = await hash("admin123", 12);
    
    const adminUser = await prisma.user.create({
      data: {
        name: "Rajesh Kumar",
        email: "admin@tawania.com",
        password: hashedPassword,
        role: "ADMIN",
      },
    });

    console.log("Admin user created successfully:", adminUser.id);

    return NextResponse.json({
      success: true,
      message: "Admin user created successfully",
      user: {
        id: adminUser.id,
        name: adminUser.name,
        email: adminUser.email,
        role: adminUser.role,
      },
    });
  } catch (error: any) {
    console.error("Error creating admin user:", error);
    return NextResponse.json(
      { error: "Failed to create admin user: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
