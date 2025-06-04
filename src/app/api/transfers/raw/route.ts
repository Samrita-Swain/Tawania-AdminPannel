import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { Prisma } from "@prisma/client";
import { createAuditLog } from "@/lib/audit";

// Import the sql tag for safe SQL queries
const { sql } = Prisma;

// Define the debug function to help troubleshoot
function debug(...args: any[]) {
  if (process.env.NODE_ENV !== 'production') {
    console.log('[Transfer API Debug]', ...args);
  }
}

export async function GET(req: NextRequest) {
  try {
    // Test database connection
    await prisma.$queryRaw`SELECT 1`;

    // Test session
    const session = await getServerSession(authOptions);

    return NextResponse.json({
      message: "Transfer raw API is working",
      timestamp: new Date().toISOString(),
      database: "connected",
      session: session?.user?.id ? "valid" : "invalid"
    });
  } catch (error) {
    return NextResponse.json({
      message: "Transfer raw API has issues",
      error: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  console.log("=== TRANSFER RAW API CALLED ===");

  // Global error handler to catch any unhandled errors
  try {
    return await handleTransferCreation(req);
  } catch (globalError) {
    console.error("=== GLOBAL ERROR HANDLER ===");
    console.error("Unhandled error:", globalError);

    return NextResponse.json(
      {
        error: "Internal server error",
        details: globalError instanceof Error ? globalError.message : String(globalError),
        type: "GlobalError",
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

async function handleTransferCreation(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    console.log("Session check:", session?.user?.id ? "Valid" : "Invalid");

    if (!session?.user?.id) {
      console.log("Unauthorized access attempt");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    let data;
    try {
      data = await req.json();
      console.log("Raw request data:", data);
    } catch (parseError) {
      console.error("Failed to parse request JSON:", parseError);
      return NextResponse.json(
        { error: "Invalid JSON in request body", details: parseError.message },
        { status: 400 }
      );
    }

    const {
      fromWarehouseId,
      toStoreId,
      transferType,
      priority,
      requestedDate,
      expectedDeliveryDate,
      items,
      notes
    } = data;

    console.log("Extracted data:", {
      fromWarehouseId,
      toStoreId,
      transferType,
      priority,
      items: items?.length || 0
    });

    debug("Received transfer request:", {
      fromWarehouseId,
      toStoreId,
      transferType,
      priority,
      items: items?.length || 0
    });

    // Validate required fields
    if (!fromWarehouseId || !toStoreId || !items || items.length === 0) {
      debug("Validation failed:", {
        fromWarehouseId: !!fromWarehouseId,
        toStoreId: !!toStoreId,
        items: items?.length || 0
      });
      return NextResponse.json(
        { error: "Missing required fields: fromWarehouseId, toStoreId, and items are required" },
        { status: 400 }
      );
    }

    // Test database connectivity first
    try {
      console.log("Testing database connectivity...");
      await prisma.$queryRaw`SELECT 1`;
      console.log("Database connection successful");
    } catch (dbConnError) {
      console.error("Database connection failed:", dbConnError);
      return NextResponse.json(
        { error: "Database connection failed", details: dbConnError.message },
        { status: 500 }
      );
    }

    // Validate that warehouse and store exist
    console.log("Checking warehouse and store existence...");
    const [warehouse, store] = await Promise.all([
      prisma.warehouse.findUnique({ where: { id: fromWarehouseId } }),
      prisma.store.findUnique({ where: { id: toStoreId } })
    ]);

    console.log("Warehouse found:", !!warehouse);
    console.log("Store found:", !!store);

    if (!warehouse) {
      debug("Warehouse not found:", fromWarehouseId);
      return NextResponse.json(
        { error: `Warehouse with ID ${fromWarehouseId} not found` },
        { status: 400 }
      );
    }

    if (!store) {
      debug("Store not found:", toStoreId);
      return NextResponse.json(
        { error: `Store with ID ${toStoreId} not found` },
        { status: 400 }
      );
    }

    // Validate that all products exist
    const productIds = items.map(item => item.productId);
    const products = await prisma.product.findMany({
      where: { id: { in: productIds } }
    });

    if (products.length !== productIds.length) {
      const foundProductIds = products.map(p => p.id);
      const missingProductIds = productIds.filter(id => !foundProductIds.includes(id));
      debug("Products not found:", missingProductIds);
      return NextResponse.json(
        { error: `Products not found: ${missingProductIds.join(', ')}` },
        { status: 400 }
      );
    }

    // Generate a transfer number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const transferCount = await prisma.transfer.count() + 1;
    const transferNumber = `TRF-${year}${month}${day}-${String(transferCount).padStart(4, "0")}`;

    // Calculate totals
    let totalItems = 0;
    let totalCost = 0;
    let totalRetail = 0;

    items.forEach((item: any) => {
      totalItems += item.quantity;
      totalCost += (item.sourceCostPrice * item.quantity);
      totalRetail += (item.sourceRetailPrice * item.quantity);
    });

    // Create transfer with items using a transaction
    const transfer = await prisma.$transaction(async (tx) => {
      debug("Creating transfer with data:", {
        transferNumber,
        fromWarehouseId,
        toStoreId,
        transferType: transferType || "RESTOCK",
        priority: priority || "NORMAL",
        totalItems,
        totalCost,
        totalRetail,
        requestedById: session.user.id
      });

      // 1. Create the transfer
      const newTransfer = await tx.transfer.create({
        data: {
          transferNumber,
          fromWarehouseId,
          toStoreId,
          transferType: transferType || "RESTOCK",
          priority: priority || "NORMAL",
          status: "DRAFT",
          requestedDate: requestedDate ? new Date(requestedDate) : new Date(),
          expectedDeliveryDate: expectedDeliveryDate ? new Date(expectedDeliveryDate) : null,
          notes,
          requestedById: session.user.id,
          totalItems,
          totalCost,
          totalRetail,
        },
      });

      // 2. Create transfer items separately
      for (const item of items) {
        await tx.transferItem.create({
          data: {
            transferId: newTransfer.id,
            productId: item.productId,
            quantity: item.quantity,
            sourceCostPrice: item.sourceCostPrice,
            sourceRetailPrice: item.sourceRetailPrice,
            targetCostPrice: item.targetCostPrice || item.sourceCostPrice,
            targetRetailPrice: item.targetRetailPrice || item.sourceRetailPrice,
            condition: item.condition || "NEW",
            adjustmentReason: item.adjustmentReason || null,
          },
        });
      }

      // 3. Get the complete transfer with items
      return await tx.transfer.findUnique({
        where: { id: newTransfer.id },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          fromWarehouse: true,
          toStore: true,
        },
      });
    });

    // Create audit log
    try {
      await createAuditLog({
        entityType: 'Transfer',
        entityId: transfer.id,
        action: 'CREATE',
        details: {
          transferNumber: transfer.transferNumber,
          fromWarehouseId,
          toStoreId,
          itemCount: items.length,
          totalItems,
          totalCost,
          totalRetail,
        },
      });
    } catch (auditError) {
      console.error("Failed to create audit log:", auditError);
      // Continue without failing the transfer creation
    }

    debug("Transfer created successfully:", transfer.id);
    return NextResponse.json(transfer);

  } catch (error) {
    console.error("=== ERROR IN TRANSFER API ===");
    console.error("Error creating transfer:", error);
    debug("Full error details:", error);

    let errorMessage = "Failed to create transfer";
    let errorDetails = "";

    if (error instanceof Error) {
      errorMessage = error.message;
      errorDetails = error.stack || "";
      console.error("Error message:", errorMessage);
      console.error("Error stack:", errorDetails);
    } else if (typeof error === 'object' && error !== null) {
      errorMessage = JSON.stringify(error);
      console.error("Error object:", errorMessage);
    } else {
      errorMessage = String(error);
      console.error("Error string:", errorMessage);
    }

    const errorResponse = {
      error: errorMessage,
      details: errorDetails,
      type: error?.constructor?.name || "Unknown",
      timestamp: new Date().toISOString()
    };

    console.error("Returning error response:", errorResponse);

    return NextResponse.json(errorResponse, { status: 500 });
  }
}
