import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }
    
    const productId = params.id;
    
    // Get the product with its prices
    const product = await prisma.product.findUnique({
      where: { id: productId },
      select: {
        id: true,
        name: true,
        costPrice: true,
        retailPrice: true,
      },
    });
    
    if (!product) {
      return NextResponse.json(
        { message: "Product not found" },
        { status: 404 }
      );
    }
    
    return NextResponse.json({
      id: product.id,
      name: product.name,
      costPrice: product.costPrice,
      retailPrice: product.retailPrice,
    });
  } catch (error) {
    console.error("Error fetching product prices:", error);
    return NextResponse.json(
      { message: "Failed to fetch product prices", error: (error as Error).message },
      { status: 500 }
    );
  }
}
