import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Simple transfer creation API that works with clean schema
export async function POST(req: NextRequest) {
  console.log("=== SIMPLE TRANSFER API CALLED ===");

  try {
    // Check session
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      console.log("No session found");
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    console.log("Session valid for user:", session.user.id);

    // Parse request
    const data = await req.json();
    console.log("Request data received:", data);

    const {
      fromWarehouseId,
      toStoreId,
      transferType = "RESTOCK",
      priority = "NORMAL",
      notes = "",
      items = []
    } = data;

    // Validate required fields
    if (!fromWarehouseId || !toStoreId) {
      console.log("Missing required fields");
      return NextResponse.json(
        { error: "fromWarehouseId and toStoreId are required" },
        { status: 400 }
      );
    }

    // Generate transfer number
    const now = new Date();
    const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
    const timeStr = now.getTime().toString().slice(-4);
    const transferNumber = `TRF-${dateStr}-${timeStr}`;
    console.log("Generated transfer number:", transferNumber);

    // Calculate totals
    let totalItems = 0;
    let totalCost = 0;
    let totalRetail = 0;

    if (items && items.length > 0) {
      totalItems = items.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0);
      totalCost = items.reduce((sum: number, item: any) =>
        sum + ((item.sourceCostPrice || 0) * (item.quantity || 0)), 0);
      totalRetail = items.reduce((sum: number, item: any) =>
        sum + ((item.sourceRetailPrice || 0) * (item.quantity || 0)), 0);
    }

    console.log("Calculated totals:", { totalItems, totalCost, totalRetail });

    // Create transfer using Prisma with correct schema
    console.log("Creating transfer with Prisma...");

    const transfer = await prisma.transfer.create({
      data: {
        transferNumber,
        fromWarehouseId,
        toStoreId,
        status: "DRAFT",
        transferType: transferType as any,
        priority: priority as any,
        totalItems,
        totalCost,
        totalRetail,
        notes,
        requestedDate: new Date(),
        requestedById: session.user.id,
      },
    });

    console.log("Transfer created successfully");

    // Create transfer items if provided
    if (items && items.length > 0) {
      console.log("Creating transfer items:", items.length);

      const transferItems = items.map((item: any) => ({
        transferId: transfer.id,
        productId: item.productId,
        quantity: item.quantity || 0,
        sourceCostPrice: item.sourceCostPrice || 0,
        sourceRetailPrice: item.sourceRetailPrice || 0,
        targetCostPrice: item.targetCostPrice || item.sourceCostPrice || 0,
        targetRetailPrice: item.targetRetailPrice || item.sourceRetailPrice || 0,
        condition: "NEW" as any,
        adjustmentReason: item.adjustmentReason || "",
        notes: item.notes || "",
      }));

      await prisma.transferItem.createMany({
        data: transferItems,
      });

      console.log("Transfer items created successfully");
    }

    // Return the created transfer
    const response = {
      id: transfer.id,
      transferNumber: transfer.transferNumber,
      status: transfer.status,
      transferType: transfer.transferType,
      priority: transfer.priority,
      totalItems: transfer.totalItems,
      totalCost: transfer.totalCost,
      totalRetail: transfer.totalRetail,
      notes: transfer.notes,
      createdAt: transfer.createdAt.toISOString()
    };

    console.log("Returning response:", response);
    return NextResponse.json(response);

  } catch (error) {
    console.error("=== ERROR IN SIMPLE TRANSFER API ===");
    console.error("Error details:", error);

    let errorMessage = "Failed to create transfer";
    if (error instanceof Error) {
      errorMessage = error.message;
      console.error("Error message:", errorMessage);
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      {
        error: errorMessage,
        details: error instanceof Error ? error.stack : String(error),
        timestamp: new Date().toISOString()
      },
      { status: 500 }
    );
  }
}

// GET endpoint to fetch transfers
export async function GET(req: NextRequest) {
  try {
    console.log("=== FETCHING TRANSFERS ===");

    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Fetch transfers using Prisma with simplified query
    const transfers = await prisma.transfer.findMany({
      select: {
        id: true,
        transferNumber: true,
        fromWarehouseId: true,
        toStoreId: true,
        fromStoreId: true,
        toWarehouseId: true,
        status: true,
        transferType: true,
        priority: true,
        totalItems: true,
        totalCost: true,
        totalRetail: true,
        notes: true,
        requestedDate: true,
        createdAt: true,
        items: {
          select: { id: true, quantity: true }
        },
        _count: {
          select: { items: true }
        },
      },
      orderBy: {
        createdAt: "desc",
      },
      take: 50,
    });

    console.log("Found transfers:", Array.isArray(transfers) ? transfers.length : 0);

    // Enhance transfers with warehouse and store names
    const enhancedTransfers = await Promise.all(
      transfers.map(async (transfer) => {
        const enhanced = { ...transfer };

        // Get warehouse names
        if (transfer.fromWarehouseId) {
          try {
            const warehouse = await prisma.warehouse.findUnique({
              where: { id: transfer.fromWarehouseId },
              select: { id: true, name: true, code: true }
            });
            enhanced.Warehouse_Transfer_fromWarehouseIdToWarehouse = warehouse;
          } catch (e) {
            console.log("Could not fetch from warehouse:", e);
          }
        }

        if (transfer.toWarehouseId) {
          try {
            const warehouse = await prisma.warehouse.findUnique({
              where: { id: transfer.toWarehouseId },
              select: { id: true, name: true, code: true }
            });
            enhanced.Warehouse_Transfer_toWarehouseIdToWarehouse = warehouse;
          } catch (e) {
            console.log("Could not fetch to warehouse:", e);
          }
        }

        // Get store names
        if (transfer.fromStoreId) {
          try {
            const store = await prisma.store.findUnique({
              where: { id: transfer.fromStoreId },
              select: { id: true, name: true, code: true }
            });
            enhanced.Store_Transfer_fromStoreIdToStore = store;
          } catch (e) {
            console.log("Could not fetch from store:", e);
          }
        }

        if (transfer.toStoreId) {
          try {
            const store = await prisma.store.findUnique({
              where: { id: transfer.toStoreId },
              select: { id: true, name: true, code: true }
            });
            enhanced.Store_Transfer_toStoreIdToStore = store;
          } catch (e) {
            console.log("Could not fetch to store:", e);
          }
        }

        return enhanced;
      })
    );

    return NextResponse.json({
      transfers: enhancedTransfers || [],
      pagination: {
        total: Array.isArray(enhancedTransfers) ? enhancedTransfers.length : 0,
        page: 1,
        pageSize: 50,
        totalPages: 1
      }
    });

  } catch (error) {
    console.error("Error fetching transfers:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfers" },
      { status: 500 }
    );
  }
}
