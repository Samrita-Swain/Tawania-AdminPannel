import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    const storeId = searchParams.get("storeId");
    const threshold = parseInt(searchParams.get("threshold") || "100");

    // Build filter
    const filter: any = {};

    if (warehouseId) {
      filter.warehouseId = warehouseId;
    }

    if (storeId) {
      filter.storeId = storeId;
    }

    // Get inventory items that need reordering
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        ...filter,
        product: {
          reorderPoint: {
            gt: 0,
          },
        },
      },
      include: {
        product: {
          include: {
            supplier: true,
            category: true,
          },
        },
        warehouse: true,
        store: true,
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    });

    // Group by location (warehouse or store)
    const groupedItems: any = {};

    // Calculate threshold based on the provided percentage
    inventoryItems.forEach(item => {
      // Skip items without a reorder point
      if (!item.product.reorderPoint) return;

      // Calculate threshold quantity based on the provided threshold percentage
      const thresholdQuantity = (item.product.reorderPoint * threshold) / 100;

      // Skip items that are above the threshold
      if (item.quantity > thresholdQuantity) return;

      const locationId = item.warehouseId || item.storeId;
      const locationType = item.warehouseId ? "warehouse" : "store";
      const locationName = item.warehouseId
        ? item.warehouse?.name
        : item.store?.name;

      if (!locationId) return;

      if (!groupedItems[locationId]) {
        groupedItems[locationId] = {
          id: locationId,
          type: locationType,
          name: locationName,
          items: [],
        };
      }

      // Calculate reorder quantity
      // Default formula: (Max Stock Level - Current Quantity)
      // If max stock level is not set, use (Reorder Point * 2)
      const maxLevel = item.product.reorderPoint || (item.product.reorderPoint * 2);
      const reorderQuantity = Math.max(1, Math.ceil(maxLevel - item.quantity));

      groupedItems[locationId].items.push({
        inventoryItem: item,
        product: item.product,
        currentQuantity: item.quantity,
        reorderPoint: item.product.reorderPoint,
        minStockLevel: item.product.minStockLevel || 0,
        reorderQuantity,
        supplier: item.product.supplier,
      });
    });

    return NextResponse.json({
      locations: Object.values(groupedItems),
      totalItems: inventoryItems.length,
    });
  } catch (error: any) {
    console.error("Error fetching auto-reorder items:", error);
    return NextResponse.json(
      {
        error: "Failed to fetch auto-reorder items",
        message: error.message || "An unexpected error occurred",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
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
    const {
      warehouseId,
      supplierId,
      items,
      notes,
    } = data;

    // Validate required fields
    if (!warehouseId || !supplierId || !items || items.length === 0) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Check if warehouse exists
    const warehouse = await prisma.warehouse.findUnique({
      where: {
        id: warehouseId,
      },
    });

    if (!warehouse) {
      return NextResponse.json(
        { error: "Warehouse not found" },
        { status: 404 }
      );
    }

    // Check if supplier exists
    const supplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
      },
    });

    if (!supplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    // Validate items and calculate totals
    for (const item of items) {
      const product = await prisma.product.findUnique({
        where: {
          id: item.productId,
        },
      });

      if (!product) {
        return NextResponse.json(
          { error: `Product with ID ${item.productId} not found` },
          { status: 404 }
        );
      }

      const itemTotal = product.costPrice * item.quantity;
      subtotal += itemTotal;
    }

    // Apply tax (assuming 10% tax rate)
    taxAmount = subtotal * 0.1;
    totalAmount = subtotal + taxAmount;

    // Generate order number
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    const count = await prisma.purchaseOrder.count({
      where: {
        orderDate: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
    });

    const sequence = (count + 1).toString().padStart(3, "0");
    const orderNumber = `PO-${year}${month}${day}-${sequence}`;

    // Create purchase order
    const purchaseOrder = await prisma.purchaseOrder.create({
      data: {
        orderNumber,
        supplierId,
        warehouseId,
        orderDate: new Date(),
        expectedDeliveryDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // 7 days from now
        status: "DRAFT",
        subtotal,
        taxAmount,
        totalAmount,
        notes: notes || "Auto-generated purchase order for restock",
        createdById: session.user.id,
        items: {
          create: items.map((item: any) => {
            const totalPrice = item.unitPrice * item.quantity;
            return {
              productId: item.productId,
              orderedQuantity: item.quantity,
              unitPrice: item.unitPrice.toString(),
              discount: "0",
              tax: "0",
              subtotal: (item.unitPrice * item.quantity).toString(),
              total: totalPrice.toString(),
              notes: "",
            };
          }),
        },
      },
      include: {
        supplier: true,
        warehouse: true,
        items: {
          include: {
            product: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      entityType: "PurchaseOrder",
      entityId: purchaseOrder.id,
      action: "CREATE",
      details: {
        orderNumber,
        supplierId,
        warehouseId,
        itemCount: items.length,
        totalAmount,
        autoGenerated: true,
      },
    });

    return NextResponse.json(purchaseOrder);
  } catch (error: any) {
    console.error("Error creating auto-reorder purchase order:", error);
    return NextResponse.json(
      {
        error: "Failed to create purchase order",
        message: error.message || "An unexpected error occurred",
        details: process.env.NODE_ENV === 'development' ? error.stack : undefined
      },
      { status: 500 }
    );
  }
}
