import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function GET() {
  try {
    // Test database connection
    const result = await prisma.$queryRaw`SELECT 1 as result`;
    
    // Get some basic stats
    const userCount = await prisma.user.count();
    const warehouseCount = await prisma.warehouse.count();
    const productCount = await prisma.product.count();
    
    return NextResponse.json({
      status: "Connected",
      result,
      stats: {
        users: userCount,
        warehouses: warehouseCount,
        products: productCount
      }
    });
  } catch (error) {
    console.error("Database connection error:", error);
    return NextResponse.json(
      { 
        status: "Error", 
        error: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
