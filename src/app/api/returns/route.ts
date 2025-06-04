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
    const storeId = searchParams.get("storeId");
    const customerId = searchParams.get("customerId");
    const status = searchParams.get("status");
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");
    const skip = (page - 1) * limit;

    // Build filter
    const filter: any = {};

    if (storeId) {
      filter.storeId = storeId;
    }

    if (customerId) {
      filter.customerId = customerId;
    }

    if (status) {
      filter.status = status;
    }

    // Get returns with pagination
    const [returns, totalItems] = await Promise.all([
      prisma.return.findMany({
        where: filter,
        include: {
          Store: true,
          Customer: true,
          processedBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          Sale: {
            select: {
              id: true,
              receiptNumber: true,
              saleDate: true,
            },
          },
          ReturnItem: {
            include: {
              product: true,
              saleItem: true,
            },
          },
        },
        orderBy: {
          returnDate: "desc",
        },
        skip,
        take: limit,
      }),
      prisma.return.count({
        where: filter,
      }),
    ]);

    // Transform the data to match the expected format in the client
    const formattedReturns = returns.map((returnItem: any) => ({
      ...returnItem,
      store: returnItem.Store,
      customer: returnItem.Customer,
      sale: returnItem.Sale,
      items: returnItem.ReturnItem || [],
    }));

    return NextResponse.json({
      returns: formattedReturns,
      totalItems,
      page,
      limit,
      totalPages: Math.ceil(totalItems / limit),
    });
  } catch (error) {
    console.error("Error fetching returns:", error);
    return NextResponse.json(
      { error: "Failed to fetch returns" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    console.log("🔄 Starting return creation process...");
    const session = await getServerSession(authOptions);
    console.log("🔐 Session:", session ? "Found" : "Not found");

    // In development, allow bypass with a default user ID if no session
    let userId = session?.user?.id;

    // Validate that the user exists in the database
    if (userId) {
      console.log("🔍 Validating user ID from session:", userId);
      const userExists = await prisma.user.findUnique({
        where: { id: userId },
        select: { id: true, email: true, role: true }
      });

      if (!userExists) {
        console.log("⚠️ Session user ID not found in database, looking for alternative...");
        userId = null; // Reset to trigger fallback logic
      } else {
        console.log("✅ Session user validated:", userExists.email);
      }
    }

    if (!userId) {
      console.log("⚠️ No valid user ID, checking development mode...");
      if (process.env.NODE_ENV === "development") {
        console.log("🛠️ Development mode: Looking for admin user...");
        // Try to get any admin user for testing
        const testUser = await prisma.user.findFirst({
          where: { role: "ADMIN" }
        });
        if (testUser) {
          userId = testUser.id;
          console.log("✅ Found admin user for development:", testUser.email);
        } else {
          console.log("❌ No admin user found in database");
          return NextResponse.json(
            { error: "Unauthorized - No admin user found" },
            { status: 401 }
          );
        }
      } else {
        console.log("❌ Production mode: Authentication required");
        return NextResponse.json(
          { error: "Unauthorized" },
          { status: 401 }
        );
      }
    }

    const data = await req.json();
    console.log("📦 Received data:", JSON.stringify(data, null, 2));

    const {
      storeId,
      customerId,
      saleId,
      items,
      reason,
      notes,
      refundMethod,
    } = data;

    console.log("🏪 Store ID:", storeId);
    console.log("📋 Items:", items?.length || 0, "items");
    console.log("💡 Reason:", reason);

    // Validate required fields
    if (!storeId || !items || items.length === 0) {
      console.log("❌ Validation failed: Missing required fields");
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Calculate totals
    let subtotal = 0;
    let taxAmount = 0;
    let totalAmount = 0;

    items.forEach((item: any) => {
      subtotal += item.unitPrice * item.quantity;
      taxAmount += (item.taxAmount || 0) * item.quantity;
      totalAmount += item.totalPrice;
    });

    // Generate return number
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");

    const count = await prisma.return.count({
      where: {
        returnDate: {
          gte: new Date(date.getFullYear(), date.getMonth(), date.getDate()),
          lt: new Date(date.getFullYear(), date.getMonth(), date.getDate() + 1),
        },
      },
    });

    const sequence = (count + 1).toString().padStart(3, "0");
    const returnNumber = `RET-${year}${month}${day}-${sequence}`;

    // Create return with items
    console.log("💾 Creating return in database...");
    console.log("📊 Calculated totals - Subtotal:", subtotal, "Tax:", taxAmount, "Total:", totalAmount);
    console.log("🔢 Return number:", returnNumber);
    console.log("👤 User ID:", userId);

    // Generate a unique ID for the return
    const returnId = `ret_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    console.log("🆔 Generated return ID:", returnId);
    console.log("✅ Adding updatedAt field to fix Prisma validation");
    console.log("🔧 Converting reason enum values for Prisma compatibility");

    const returnData = await prisma.return.create({
      data: {
        id: returnId,
        returnNumber,
        storeId,
        customerId: customerId || null,
        saleId: saleId || null,
        returnDate: new Date(),
        status: "PENDING",
        subtotal,
        taxAmount,
        totalAmount,
        refundMethod: refundMethod || null,
        refundStatus: "PENDING",
        reason,
        notes,
        processedById: userId,
        updatedAt: new Date(),
        ReturnItem: {
          create: items.map((item: any) => {
            // Convert reason to proper enum value
            let reasonEnum = "OTHER"; // default
            if (item.reason) {
              const reasonUpper = item.reason.toUpperCase();
              if (["DEFECTIVE", "DAMAGED", "WRONG_ITEM", "NOT_AS_DESCRIBED", "CHANGED_MIND", "OTHER"].includes(reasonUpper)) {
                reasonEnum = reasonUpper;
              }
            }

            return {
              id: `ret_item_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              productId: item.productId,
              saleItemId: item.saleItemId || null,
              quantity: item.quantity,
              unitPrice: item.unitPrice,
              totalPrice: item.totalPrice,
              reason: reasonEnum,
              condition: item.condition || "GOOD",
              notes: item.notes,
              updatedAt: new Date(),
            };
          }),
        },
      },
      include: {
        Store: true,
        Customer: true,
        User: true,
        Sale: true,
        ReturnItem: {
          include: {
            Product: true,
          },
        },
      },
    });

    // Create audit log
    await createAuditLog({
      entityType: "Return",
      entityId: returnData.id,
      action: "CREATE",
      details: {
        returnNumber,
        storeId,
        customerId: customerId || null,
        saleId: saleId || null,
        itemCount: items.length,
        totalAmount,
      },
    });

    // Transform the data to match the expected format in the client
    const formattedReturnData = {
      ...returnData,
      store: returnData.Store,
      customer: returnData.Customer,
      processedBy: returnData.User,
      sale: returnData.Sale,
      items: returnData.ReturnItem || [],
    };

    return NextResponse.json(formattedReturnData);
  } catch (error) {
    console.error("❌ Error creating return:", error);
    console.error("❌ Error details:", {
      message: error instanceof Error ? error.message : String(error),
      stack: error instanceof Error ? error.stack : undefined,
      name: error instanceof Error ? error.name : undefined
    });
    return NextResponse.json(
      {
        error: "Failed to create return",
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
