import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface SaleItem {
  inventoryItemId: string;
  productId: string;
  quantity: number;
  unitPrice: number;
  discount: number;
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    // Check if user is authenticated
    if (!session || !session.user) {
      return NextResponse.json(
        { message: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse request body
    const body = await req.json();
    console.log("🚀 POS Sale API - Received sale data:", body);
    console.log("🔍 Session user ID:", session.user.id);

    const {
      storeId,
      customerId,
      items,
      taxRateId,
      taxRate,
      subtotalAmount,
      taxAmount,
      totalAmount,
      paymentMethod,
      paymentStatus,
      amountPaid,
      referenceNumber,
      notes,
    } = body;

    console.log("Extracted values:", {
      subtotalAmount,
      taxAmount,
      totalAmount,
      paymentMethod,
      paymentStatus
    });

    // Validate that we have the required amounts
    if (subtotalAmount === undefined || taxAmount === undefined || totalAmount === undefined) {
      console.error("Missing required amount fields:", { subtotalAmount, taxAmount, totalAmount });
      return NextResponse.json(
        { message: "Missing required amount fields", details: { subtotalAmount, taxAmount, totalAmount } },
        { status: 400 }
      );
    }

    // Validate that amounts are not zero (unless it's a free item)
    if (subtotalAmount === 0 && totalAmount === 0) {
      console.error("Sale amounts cannot be zero:", { subtotalAmount, taxAmount, totalAmount });
      return NextResponse.json(
        { message: "Sale amounts cannot be zero. Please check item prices." },
        { status: 400 }
      );
    }

    // Validate required fields
    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { message: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate receipt number
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, "0");
    const day = date.getDate().toString().padStart(2, "0");
    const prefix = `S${year}${month}${day}`;

    // Get the count of sales for today
    const salesCount = await prisma.sale.count({
      where: {
        receiptNumber: {
          startsWith: prefix,
        },
      },
    });

    // Generate the receipt number with a sequential number
    const sequentialNumber = (salesCount + 1).toString().padStart(4, "0");
    const receiptNumber = `${prefix}-${sequentialNumber}`;

    // Verify user exists before creating sale
    let user = await prisma.user.findUnique({
      where: { id: session.user.id },
    });

    if (!user) {
      console.error("User not found:", session.user.id);
      console.log("Looking for any existing user to use as fallback...");

      // Try to find any existing user as fallback
      const existingUser = await prisma.user.findFirst({
        where: { isActive: true },
      });

      if (existingUser) {
        console.log("Using existing user as fallback:", { id: existingUser.id, name: existingUser.name, email: existingUser.email });
        user = existingUser;
      } else {
        // Create a default user if none exists
        console.log("Creating default user...");
        user = await prisma.user.create({
          data: {
            name: "System User",
            email: "system@tawania.com",
            role: "ADMIN",
            isActive: true,
          },
        });
        console.log("Created default user:", { id: user.id, name: user.name, email: user.email });
      }
    } else {
      console.log("User found:", { id: user.id, name: user.name, email: user.email });
    }

    // Start a transaction with timeout
    const result = await prisma.$transaction(async (tx) => {
      // Create the sale record
      const sale = await tx.sale.create({
        data: {
          receiptNumber,
          storeId,
          customerId,
          createdById: user.id,
          subtotal: subtotalAmount,
          taxAmount,
          discountAmount: 0, // Add default discount amount
          totalAmount,
          paymentMethod,
          paymentStatus: paymentStatus || "PAID",
          notes,
        },
      });

      // Process each item in the sale
      for (const item of items) {
        // Get the inventory item
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: item.inventoryItemId },
          include: {
            product: true,
          },
        });

        if (!inventoryItem) {
          throw new Error(`Inventory item not found: ${item.inventoryItemId}`);
        }

        // Check if there's enough quantity
        const availableQuantity = inventoryItem.quantity - (inventoryItem.reservedQuantity || 0);
        if (availableQuantity < item.quantity) {
          throw new Error(`Not enough quantity available for ${inventoryItem.product.name}. Available: ${availableQuantity}, Requested: ${item.quantity}`);
        }

        // Calculate total price
        const totalPrice = item.quantity * item.unitPrice * (1 - (item.discount || 0) / 100);

        // Create sale item record
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            inventoryItemId: item.inventoryItemId,
            productId: item.productId,
            quantity: item.quantity,
            unitPrice: item.unitPrice,
            discountAmount: (item.unitPrice * item.quantity * (item.discount || 0)) / 100,
            taxAmount: 0,
            totalPrice,
          },
        });

        // Update inventory quantity
        await tx.inventoryItem.update({
          where: { id: item.inventoryItemId },
          data: {
            quantity: {
              decrement: item.quantity,
            },
          },
        });

        // We've removed the inventory transaction model in our simplified schema
      }

      // Create payment record if amount paid > 0
      if (amountPaid && amountPaid > 0) {
        await tx.payment.create({
          data: {
            id: `pay_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`, // Generate unique ID
            saleId: sale.id,
            amount: amountPaid,
            paymentMethod,
            referenceNumber: referenceNumber || undefined,
            notes: undefined,
            processedById: user.id,
            processedByName: user.name || undefined,
          },
        });
      }

      return { sale };
    }, {
      timeout: 10000, // 10 seconds timeout
    });

    return NextResponse.json({
      message: "Sale completed successfully",
      sale: result.sale,
    });
  } catch (error) {
    console.error("Error processing sale:", error);
    return NextResponse.json(
      { message: "Failed to process sale", error: (error as Error).message },
      { status: 500 }
    );
  }
}

