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

    const transferId = params.id;
    
    // Check if transfer exists
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
    });
    
    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }
    
    // Get transfer items
    const items = await prisma.transferItem.findMany({
      where: { transferId },
      include: {
        product: {
          include: {
            category: true,
          },
        },
      },
      orderBy: {
        product: {
          name: 'asc',
        },
      },
    });
    
    return NextResponse.json({ items });
  } catch (error) {
    console.error("Error fetching transfer items:", error);
    return NextResponse.json(
      { error: "Failed to fetch transfer items" },
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

    const transferId = params.id;
    const data = await req.json();
    const { productId, quantity, sourceCostPrice, sourceRetailPrice, targetCostPrice, targetRetailPrice, adjustmentReason, notes } = data;
    
    // Validate required fields
    if (!productId || !quantity) {
      return NextResponse.json(
        { error: "Product ID and quantity are required" },
        { status: 400 }
      );
    }
    
    // Check if transfer exists
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
    });
    
    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }
    
    // Check if transfer is in a state that allows adding items
    if (transfer.status !== 'DRAFT' && transfer.status !== 'PENDING') {
      return NextResponse.json(
        { error: "Cannot add items to a transfer that is not in DRAFT or PENDING status" },
        { status: 400 }
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
    
    // Check if item already exists in transfer
    const existingItem = await prisma.transferItem.findFirst({
      where: {
        transferId,
        productId,
      },
    });
    
    if (existingItem) {
      return NextResponse.json(
        { error: "Product already exists in this transfer" },
        { status: 400 }
      );
    }
    
    // Create transfer item
    const item = await prisma.transferItem.create({
      data: {
        transferId,
        productId,
        quantity,
        sourceCostPrice: sourceCostPrice || product.costPrice,
        sourceRetailPrice: sourceRetailPrice || product.retailPrice,
        targetCostPrice: targetCostPrice || sourceCostPrice || product.costPrice,
        targetRetailPrice: targetRetailPrice || sourceRetailPrice || product.retailPrice,
        adjustmentReason,
        notes,
      },
      include: {
        product: true,
      },
    });
    
    // Update transfer totals
    await prisma.transfer.update({
      where: { id: transferId },
      data: {
        totalItems: {
          increment: 1,
        },
        totalCost: {
          increment: item.sourceCostPrice * item.quantity,
        },
        totalRetail: {
          increment: item.sourceRetailPrice * item.quantity,
        },
      },
    });
    
    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error adding transfer item:", error);
    return NextResponse.json(
      { error: "Failed to add transfer item" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const transferId = params.id;
    const data = await req.json();
    const { itemId, quantity, sourceCostPrice, sourceRetailPrice, targetCostPrice, targetRetailPrice, adjustmentReason, notes } = data;
    
    // Validate required fields
    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }
    
    // Check if transfer exists
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
    });
    
    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }
    
    // Check if transfer is in a state that allows updating items
    if (transfer.status !== 'DRAFT' && transfer.status !== 'PENDING') {
      return NextResponse.json(
        { error: "Cannot update items in a transfer that is not in DRAFT or PENDING status" },
        { status: 400 }
      );
    }
    
    // Check if item exists
    const existingItem = await prisma.transferItem.findFirst({
      where: {
        id: itemId,
        transferId,
      },
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: "Transfer item not found" },
        { status: 404 }
      );
    }
    
    // Calculate the difference in totals
    const oldCostTotal = existingItem.sourceCostPrice * existingItem.quantity;
    const oldRetailTotal = existingItem.sourceRetailPrice * existingItem.quantity;
    const newCostTotal = (sourceCostPrice || existingItem.sourceCostPrice) * (quantity || existingItem.quantity);
    const newRetailTotal = (sourceRetailPrice || existingItem.sourceRetailPrice) * (quantity || existingItem.quantity);
    const costDifference = newCostTotal - oldCostTotal;
    const retailDifference = newRetailTotal - oldRetailTotal;
    
    // Update transfer item
    const item = await prisma.transferItem.update({
      where: { id: itemId },
      data: {
        quantity: quantity !== undefined ? quantity : undefined,
        sourceCostPrice: sourceCostPrice !== undefined ? sourceCostPrice : undefined,
        sourceRetailPrice: sourceRetailPrice !== undefined ? sourceRetailPrice : undefined,
        targetCostPrice: targetCostPrice !== undefined ? targetCostPrice : undefined,
        targetRetailPrice: targetRetailPrice !== undefined ? targetRetailPrice : undefined,
        adjustmentReason: adjustmentReason !== undefined ? adjustmentReason : undefined,
        notes: notes !== undefined ? notes : undefined,
      },
      include: {
        product: true,
      },
    });
    
    // Update transfer totals
    await prisma.transfer.update({
      where: { id: transferId },
      data: {
        totalCost: {
          increment: costDifference,
        },
        totalRetail: {
          increment: retailDifference,
        },
      },
    });
    
    return NextResponse.json({ item });
  } catch (error) {
    console.error("Error updating transfer item:", error);
    return NextResponse.json(
      { error: "Failed to update transfer item" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const transferId = params.id;
    const url = new URL(req.url);
    const itemId = url.searchParams.get("itemId");
    
    if (!itemId) {
      return NextResponse.json(
        { error: "Item ID is required" },
        { status: 400 }
      );
    }
    
    // Check if transfer exists
    const transfer = await prisma.transfer.findUnique({
      where: { id: transferId },
    });
    
    if (!transfer) {
      return NextResponse.json(
        { error: "Transfer not found" },
        { status: 404 }
      );
    }
    
    // Check if transfer is in a state that allows removing items
    if (transfer.status !== 'DRAFT' && transfer.status !== 'PENDING') {
      return NextResponse.json(
        { error: "Cannot remove items from a transfer that is not in DRAFT or PENDING status" },
        { status: 400 }
      );
    }
    
    // Check if item exists
    const existingItem = await prisma.transferItem.findFirst({
      where: {
        id: itemId,
        transferId,
      },
    });
    
    if (!existingItem) {
      return NextResponse.json(
        { error: "Transfer item not found" },
        { status: 404 }
      );
    }
    
    // Calculate the totals to subtract
    const costTotal = existingItem.sourceCostPrice * existingItem.quantity;
    const retailTotal = existingItem.sourceRetailPrice * existingItem.quantity;
    
    // Delete transfer item
    await prisma.transferItem.delete({
      where: { id: itemId },
    });
    
    // Update transfer totals
    await prisma.transfer.update({
      where: { id: transferId },
      data: {
        totalItems: {
          decrement: 1,
        },
        totalCost: {
          decrement: costTotal,
        },
        totalRetail: {
          decrement: retailTotal,
        },
      },
    });
    
    return NextResponse.json({
      message: "Transfer item removed successfully",
    });
  } catch (error) {
    console.error("Error removing transfer item:", error);
    return NextResponse.json(
      { error: "Failed to remove transfer item" },
      { status: 500 }
    );
  }
}
