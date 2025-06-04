import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { InventoryStatus } from "@prisma/client";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const storeId = params.id;

    // Parse query parameters
    const url = new URL(req.url);
    const categoryId = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const filter = url.searchParams.get("filter");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");

    // Build filters
    const filters: any = {
      storeId,
      product: {
        categoryId: categoryId ? categoryId : undefined,
        name: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
    };

    // Add stock level filters
    if (filter === "lowStock") {
      filters.quantity = {
        gt: 0,
        lt: {
          path: ["product", "reorderPoint"],
        },
      };
    } else if (filter === "outOfStock") {
      filters.quantity = {
        lte: 0,
      };
    } else {
      filters.quantity = {
        gt: 0,
      };
    }

    // Get inventory items with pagination using select instead of include to avoid schema mismatches
    const [inventoryItems, totalItems] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: filters,
        select: {
          id: true,
          quantity: true,
          costPrice: true,
          retailPrice: true,
          status: true,
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              reorderPoint: true,
              minStockLevel: true,
              category: {
                select: {
                  id: true,
                  name: true,
                }
              }
            }
          },
          store: {
            select: {
              id: true,
              name: true,
            }
          },
        },
        orderBy: [
          { product: { name: 'asc' } },
        ],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.inventoryItem.count({
        where: filters,
      }),
    ]);

    return NextResponse.json({
      inventoryItems,
      totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    });
  } catch (error) {
    console.error("Error fetching store inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch store inventory" },
      { status: 500 }
    );
  }
}

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const storeId = params.id;
    const data = await req.json();
    const { productId, quantity, costPrice, retailPrice } = data;

    // Validate required fields
    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { error: "Product ID and quantity are required" },
        { status: 400 }
      );
    }

    // Check if store exists
    const store = await prisma.store.findUnique({
      where: { id: storeId },
    });

    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // Check if product exists
    const product = await prisma.product.findUnique({
      where: { id: productId },
    });

    if (!product) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if inventory item already exists
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        productId,
        storeId,
      },
    });

    let inventoryItem;

    if (existingItem) {
      // Update existing inventory item with only the fields we know exist in the database
      inventoryItem = await prisma.inventoryItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          costPrice: costPrice !== undefined ? costPrice : existingItem.costPrice,
          retailPrice: retailPrice !== undefined ? retailPrice : existingItem.retailPrice,
          status: (existingItem.quantity + quantity) > 0 ? InventoryStatus.AVAILABLE : InventoryStatus.EXPIRED,
          // Explicitly omit wholesalePrice to avoid schema mismatch
        },
        select: {
          id: true,
          productId: true,
          storeId: true,
          quantity: true,
          costPrice: true,
          retailPrice: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        }
      });
    } else {
      // Create new inventory item with only the fields we know exist in the database
      inventoryItem = await prisma.inventoryItem.create({
        data: {
          productId,
          storeId,
          quantity,
          costPrice: costPrice !== undefined ? costPrice : product.costPrice,
          retailPrice: retailPrice !== undefined ? retailPrice : product.retailPrice,
          status: quantity > 0 ? InventoryStatus.AVAILABLE : InventoryStatus.EXPIRED,
          // Explicitly omit wholesalePrice to avoid schema mismatch
        },
        select: {
          id: true,
          productId: true,
          storeId: true,
          quantity: true,
          costPrice: true,
          retailPrice: true,
          status: true,
          createdAt: true,
          updatedAt: true,
        }
      });
    }

    return NextResponse.json({ inventoryItem });
  } catch (error) {
    console.error("Error adding inventory to store:", error);
    return NextResponse.json(
      { error: "Failed to add inventory to store" },
      { status: 500 }
    );
  }
}
