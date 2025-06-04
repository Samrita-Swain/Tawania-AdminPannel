import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { createAuditLog } from "@/lib/audit";
import { randomUUID } from "crypto";

interface CheckoutItem {
  productId: string;
  inventoryItemId: string;
  quantity: number;
  unitPrice: number;
  discountAmount: number;
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
      storeId,
      customerId,
      items,
      subtotalAmount,
      taxAmount,
      discountAmount,
      totalAmount,
      paymentMethod,
      amountPaid,
      referenceNumber,
      notes,
      applyLoyaltyPoints,
      loyaltyPointsUsed,
    } = data;
    
    // Validate required fields
    if (!storeId || !items || !Array.isArray(items) || items.length === 0) {
      return NextResponse.json(
        { error: "Store ID and items are required" },
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
    
    // Check if customer exists if provided
    let customer = null;
    if (customerId) {
      customer = await prisma.customer.findUnique({
        where: { id: customerId },
      });
      
      if (!customer) {
        return NextResponse.json(
          { error: "Customer not found" },
          { status: 404 }
        );
      }
    }
    
    // Generate receipt number
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    const saleCount = await prisma.sale.count() + 1;
    const receiptNumber = `SALE-${year}${month}${day}-${String(saleCount).padStart(4, "0")}`;
    
    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Create sale
      const sale = await tx.sale.create({
        data: {
          receiptNumber,
          storeId,
          customerId: customerId || null,
          createdById: session.user.id,
          saleDate: new Date(),
          subtotal: subtotalAmount,
          taxAmount: taxAmount || 0,
          discountAmount: discountAmount || 0,
          totalAmount,
          paymentMethod,
          paymentStatus: amountPaid >= totalAmount ? "PAID" : amountPaid > 0 ? "PARTIALLY_PAID" : "PENDING",
          notes,
        },
      });
      
      // Process each item
      for (const item of items as CheckoutItem[]) {
        const { productId, inventoryItemId, quantity, unitPrice, discountAmount } = item;
        
        // Check if inventory item exists
        const inventoryItem = await tx.inventoryItem.findUnique({
          where: { id: inventoryItemId },
        });
        
        if (!inventoryItem) {
          throw new Error(`Inventory item not found: ${inventoryItemId}`);
        }
        
        // Check if there's enough quantity
        if (inventoryItem.quantity < quantity) {
          throw new Error(`Insufficient quantity for product ID ${productId}`);
        }
        
        // Calculate tax amount (assuming tax is included in the unit price)
        const taxRate = taxAmount / subtotalAmount;
        const itemTaxAmount = (unitPrice * quantity) * taxRate;
        
        // Create sale item
        await tx.saleItem.create({
          data: {
            saleId: sale.id,
            productId,
            inventoryItemId,
            quantity,
            unitPrice,
            discountAmount: discountAmount || 0,
            taxAmount: itemTaxAmount,
            totalPrice: (unitPrice * quantity) - (discountAmount || 0),
          },
        });
        
        // Update inventory
        await tx.inventoryItem.update({
          where: { id: inventoryItemId },
          data: {
            quantity: {
              decrement: quantity,
            },
            status: inventoryItem.quantity - quantity > 0 ? "AVAILABLE" : "EXPIRED",
          },
        });
        
        // Create inventory transaction
        await tx.$queryRaw`
          INSERT INTO "InventoryTransaction" (
            "id", 
            "inventoryItemId", 
            "transactionType", 
            "quantity", 
            "previousQuantity", 
            "newQuantity", 
            "reason", 
            "notes", 
            "createdById", 
            "createdAt", 
            "updatedAt"
          ) VALUES (
            ${randomUUID()}, 
            ${inventoryItemId}, 
            'REMOVE', 
            ${quantity}, 
            ${inventoryItem.quantity}, 
            ${inventoryItem.quantity - quantity}, 
            'SALE', 
            ${`Sale #${receiptNumber}`}, 
            ${session.user.id}, 
            ${new Date()}, 
            ${new Date()}
          ) RETURNING *
        `;
      }
      
      // Create payment record if amount paid > 0
      if (amountPaid > 0) {
        await tx.payment.create({
          data: {
            saleId: sale.id,
            amount: amountPaid,
            paymentMethod,
            referenceNumber: referenceNumber || null,
            processedById: session.user.id,
            processedByName: session.user.name || null,
          },
        });
      }
      
      // Process loyalty points
      if (customer && applyLoyaltyPoints) {
        // Get loyalty program
        const loyaltyProgram = await tx.loyaltyProgram.findFirst({
          where: { isActive: true },
        });
        
        if (loyaltyProgram) {
          // Deduct used points if any
          if (loyaltyPointsUsed && loyaltyPointsUsed > 0) {
            if (loyaltyPointsUsed > customer.loyaltyPoints) {
              throw new Error("Not enough loyalty points");
            }
            
            // Update customer points
            await tx.customer.update({
              where: { id: customer.id },
              data: {
                loyaltyPoints: {
                  decrement: loyaltyPointsUsed,
                },
              },
            });
            
            // Create loyalty transaction for points used
            await tx.loyaltyTransaction.create({
              data: {
                customerId: customer.id,
                programId: loyaltyProgram.id,
                points: -loyaltyPointsUsed,
                type: "REDEEM",
                description: `Points redeemed for sale #${receiptNumber}`,
                referenceId: sale.id,
              },
            });
          }
          
          // Calculate earned points
          const earnedPoints = Math.floor(totalAmount * loyaltyProgram.pointsPerDollar);
          
          if (earnedPoints > 0) {
            // Update customer points
            await tx.customer.update({
              where: { id: customer.id },
              data: {
                loyaltyPoints: {
                  increment: earnedPoints,
                },
              },
            });
            
            // Create loyalty transaction for points earned
            await tx.loyaltyTransaction.create({
              data: {
                customerId: customer.id,
                programId: loyaltyProgram.id,
                points: earnedPoints,
                type: "EARN",
                description: `Points earned from sale #${receiptNumber}`,
                referenceId: sale.id,
              },
            });
          }
        }
      }
      
      return sale;
    });
    
    // Create audit log
    await createAuditLog({
      entityType: 'Sale',
      entityId: result.id,
      action: 'SALE',
      details: {
        receiptNumber: result.receiptNumber,
        storeId,
        customerId: customerId || null,
        totalAmount,
        paymentMethod,
        itemCount: items.length,
      },
    });
    
    return NextResponse.json({
      message: "Checkout completed successfully",
      sale: result,
    });
  } catch (error) {
    console.error("Error processing checkout:", error);
    return NextResponse.json(
      { error: "Failed to process checkout", details: (error as Error).message },
      { status: 500 }
    );
  }
}

