import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    console.log("Testing database connection...");
    
    // Test database connection
    const result = await prisma.$queryRaw`SELECT 1 as connection_test`;
    console.log("Database connection test result:", result);
    
    // Get user count
    const userCount = await prisma.user.count();
    console.log("User count:", userCount);
    
    // Get supplier count
    const supplierCount = await prisma.supplier.count();
    console.log("Supplier count:", supplierCount);
    
    return NextResponse.json({
      status: "success",
      message: "Database connection successful",
      result,
      counts: {
        users: userCount,
        suppliers: supplierCount
      }
    });
  } catch (error: any) {
    console.error("Database connection test failed:", error);
    
    return NextResponse.json({
      status: "error",
      message: "Database connection failed",
      error: error.message
    }, { status: 500 });
  }
}
