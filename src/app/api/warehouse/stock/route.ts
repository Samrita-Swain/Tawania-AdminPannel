import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Get query parameters
    const searchParams = req.nextUrl.searchParams;
    const filter = searchParams.get("filter");
    const categoryId = searchParams.get("categoryId");
    const warehouseId = searchParams.get("warehouseId");
    const search = searchParams.get("search");

    // Build the query
    const query: any = {
      where: {
        warehouseId: { not: null } // Only warehouse inventory (not store inventory)
      },
      include: {
        product: {
          include: {
            category: true
          }
        },
        warehouse: true,
        bin: true
      }
    };

    // Add filters if provided
    if (filter === "lowStock") {
      // Get products with quantity below reorder level
      query.where = {
        ...query.where,
        quantity: {
          lte: 10 // Default low stock threshold
        }
      };
    }

    if (categoryId) {
      query.where = {
        ...query.where,
        product: {
          categoryId
        }
      };
    }

    if (warehouseId) {
      query.where = { ...query.where, warehouseId };
    }

    if (search) {
      query.where = {
        ...query.where,
        OR: [
          {
            product: {
              name: { contains: search, mode: 'insensitive' }
            }
          },
          {
            product: {
              sku: { contains: search, mode: 'insensitive' }
            }
          }
        ]
      };
    }

    // Get inventory items from the database
    const inventoryItems = await prisma.inventoryItem.findMany(query);

    return NextResponse.json({ inventoryItems });
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    return NextResponse.json({ error: "Failed to fetch inventory items" }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const data = await req.json();

    // Validate required fields
    if (!data.productId || !data.warehouseId || data.quantity === undefined) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 });
    }

    // Check if inventory item exists
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        productId: data.productId,
        warehouseId: data.warehouseId,
        binId: data.binId || null
      }
    });

    let inventoryItem;

    if (existingItem) {
      // Update existing inventory item
      inventoryItem = await prisma.inventoryItem.update({
        where: {
          id: existingItem.id
        },
        data: {
          quantity: data.quantity,
          costPrice: data.costPrice || existingItem.costPrice,
          binId: data.binId || existingItem.binId
        },
        include: {
          product: true,
          warehouse: true,
          bin: true
        }
      });
    } else {
      // Create new inventory item
      inventoryItem = await prisma.inventoryItem.create({
        data: {
          productId: data.productId,
          warehouseId: data.warehouseId,
          quantity: data.quantity,
          costPrice: data.costPrice || 0,
          binId: data.binId
        },
        include: {
          product: true,
          warehouse: true,
          bin: true
        }
      });
    }

    // Create an audit log for this inventory change
    await prisma.auditLog.create({
      data: {
        entityType: "Inventory",
        entityId: inventoryItem.id,
        action: existingItem ? "UPDATE" : "CREATE",
        userId: session.user.id,
        userName: session.user.name || session.user.email || "Unknown",
        details: JSON.stringify({
          productId: data.productId,
          warehouseId: data.warehouseId,
          previousQuantity: existingItem?.quantity || 0,
          newQuantity: data.quantity,
          binId: data.binId
        })
      }
    });

    return NextResponse.json({ inventoryItem });
  } catch (error) {
    console.error("Error updating inventory item:", error);
    return NextResponse.json({ error: "Failed to update inventory item" }, { status: 500 });
  }
}
