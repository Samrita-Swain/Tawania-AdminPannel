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
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const warehouseId = params.id;
    
    // Parse query parameters
    const url = new URL(req.url);
    const categoryId = url.searchParams.get("category");
    const search = url.searchParams.get("search");
    const filter = url.searchParams.get("filter");
    const binId = url.searchParams.get("bin");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");
    
    // Build filters
    const filters: any = {
      warehouseId,
      product: {
        categoryId: categoryId ? categoryId : undefined,
        name: search ? { contains: search, mode: 'insensitive' } : undefined,
      },
    };
    
    // Add bin filter if specified
    if (binId) {
      filters.binId = binId;
    }
    
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
    } else if (filter === "available") {
      filters.quantity = {
        gt: 0,
      };
      filters.status = "AVAILABLE";
    }
    
    // Get inventory items with pagination
    const [inventoryItems, totalItems] = await Promise.all([
      prisma.inventoryItem.findMany({
        where: filters,
        include: {
          product: {
            include: {
              category: true,
            },
          },
          warehouse: true,
          bin: {
            include: {
              shelf: {
                include: {
                  aisle: {
                    include: {
                      zone: true,
                    },
                  },
                },
              },
            },
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
    console.error("Error fetching warehouse inventory:", error);
    return NextResponse.json(
      { error: "Failed to fetch warehouse inventory" },
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

    const warehouseId = params.id;
    const data = await req.json();
    const { productId, binId, quantity, costPrice, retailPrice, batchNumber, expiryDate } = data;
    
    // Validate required fields
    if (!productId || quantity === undefined) {
      return NextResponse.json(
        { error: "Product ID and quantity are required" },
        { status: 400 }
      );
    }
    
    // Check if warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: { id: warehouseId },
    });
    
    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
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
    
    // Check if bin exists if specified
    if (binId) {
      const bin = await prisma.warehouseBin.findUnique({
        where: { id: binId },
      });
      
      if (!bin) {
        return NextResponse.json(
          { error: "Bin not found" },
          { status: 404 }
        );
      }
      
      // Check if bin belongs to the warehouse
      const shelf = await prisma.warehouseShelf.findUnique({
        where: { id: bin.shelfId },
        include: {
          aisle: {
            include: {
              zone: true,
            },
          },
        },
      });
      
      if (shelf?.aisle?.zone?.warehouseId !== warehouseId) {
        return NextResponse.json(
          { error: "Bin does not belong to the specified warehouse" },
          { status: 400 }
        );
      }
    }
    
    // Check if inventory item already exists
    const existingItem = await prisma.inventoryItem.findFirst({
      where: {
        productId,
        warehouseId,
        binId: binId || null,
      },
    });
    
    let inventoryItem;
    
    if (existingItem) {
      // Update existing inventory item
      inventoryItem = await prisma.inventoryItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + quantity,
          costPrice: costPrice !== undefined ? costPrice : existingItem.costPrice,
          retailPrice: retailPrice !== undefined ? retailPrice : existingItem.retailPrice,
          batchNumber: batchNumber || existingItem.batchNumber,
          expiryDate: expiryDate ? new Date(expiryDate) : existingItem.expiryDate,
          status: (existingItem.quantity + quantity) > 0 ? "AVAILABLE" : "EXPIRED", // Use EXPIRED instead of OUT_OF_STOCK
        },
        include: {
          product: true,
          bin: true,
        },
      });
      
      // Create inventory transaction record
      await prisma.auditLog.create({
        data: {
          entityType: "InventoryItem",
          entityId: inventoryItem.id,
          action: "ADJUSTMENT",
          userId: session.user.id,
          details: JSON.stringify({
            type: "MANUAL_ADJUSTMENT",
            quantity,
            previousQuantity: existingItem.quantity,
            newQuantity: inventoryItem.quantity,
          }),
        },
      });
    } else {
      // Create new inventory item
      inventoryItem = await prisma.inventoryItem.create({
        data: {
          productId,
          warehouseId,
          binId: binId || null,
          quantity,
          costPrice: costPrice !== undefined ? costPrice : product.costPrice,
          retailPrice: retailPrice !== undefined ? retailPrice : product.retailPrice,
          batchNumber,
          expiryDate: expiryDate ? new Date(expiryDate) : null,
          status: quantity > 0 ? "AVAILABLE" : "EXPIRED", // Use EXPIRED instead of OUT_OF_STOCK
          inventoryMethod: "FIFO", // Default to FIFO
        },
        include: {
          product: true,
          bin: true,
        },
      });
      
      // Create inventory transaction record
      await prisma.auditLog.create({
        data: {
          entityType: "InventoryItem",
          entityId: inventoryItem.id,
          action: "ADJUSTMENT",
          userId: session.user.id,
          details: JSON.stringify({
            type: "MANUAL_ADJUSTMENT",
            quantity,
            previousQuantity: 0,
            newQuantity: quantity,
          }),
        },
      });
    }
    
    return NextResponse.json({ inventoryItem });
  } catch (error) {
    console.error("Error adding inventory to warehouse:", error);
    return NextResponse.json(
      { error: "Failed to add inventory to warehouse" },
      { status: 500 }
    );
  }
}


