import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { ProductCondition } from "@prisma/client";

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    console.log("=== UPDATE PRODUCT STATUS API CALLED ===");
    
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      console.log("No session found");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: productId } = await params;
    const { isActive, condition, notes } = await req.json();

    console.log("Updating product status:", { 
      productId, 
      isActive, 
      condition, 
      notes, 
      userId: session.user.id 
    });

    // Validate condition if provided
    if (condition && !["NEW", "DAMAGED"].includes(condition)) {
      return NextResponse.json(
        { error: "Invalid condition. Must be NEW or DAMAGED" },
        { status: 400 }
      );
    }

    // Check if product exists
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        category: true,
      },
    });

    if (!existingProduct) {
      console.log("Product not found:", productId);
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    console.log("Product found:", existingProduct.name);

    // Prepare update data
    const updateData: any = {
      updatedAt: new Date(),
      updatedById: session.user.id,
    };

    if (isActive !== undefined) {
      updateData.isActive = isActive;
    }

    if (condition !== undefined) {
      updateData.condition = condition as ProductCondition;
    }

    // Update product status
    const updatedProduct = await prisma.product.update({
      where: { id: productId },
      data: updateData,
      include: {
        category: true,
        supplier: true,
      },
    });

    console.log("Product status updated successfully:", { 
      productName: updatedProduct.name, 
      newIsActive: updatedProduct.isActive,
      newCondition: updatedProduct.condition
    });

    // If product is being deactivated, we might want to update related inventory
    if (isActive === false) {
      console.log("Product deactivated, checking inventory items...");
      
      // Optionally update inventory items status
      try {
        await prisma.inventoryItem.updateMany({
          where: { 
            productId: productId,
            status: "AVAILABLE"
          },
          data: {
            status: "QUARANTINE", // Move to quarantine when product is deactivated
          },
        });
        console.log("Related inventory items moved to quarantine");
      } catch (inventoryError) {
        console.error("Error updating inventory items:", inventoryError);
        // Continue with the process even if inventory update fails
      }
    }

    // Create audit log entry (if audit system is available)
    try {
      // Check if audit system exists
      const auditExists = await prisma.$queryRaw`
        SELECT EXISTS (
          SELECT FROM information_schema.tables 
          WHERE table_name = 'Audit'
        );
      `;
      
      if (auditExists) {
        await prisma.$executeRaw`
          INSERT INTO "Audit" (
            "id",
            "entityType",
            "entityId", 
            "action",
            "details",
            "createdAt",
            "updatedAt"
          ) VALUES (
            gen_random_uuid(),
            'Product',
            ${productId},
            'UPDATE',
            ${JSON.stringify({
              productName: updatedProduct.name,
              oldIsActive: existingProduct.isActive,
              newIsActive: updatedProduct.isActive,
              oldCondition: existingProduct.condition,
              newCondition: updatedProduct.condition,
              notes,
              userId: session.user.id,
            })},
            NOW(),
            NOW()
          )
        `;
        console.log("Audit log created");
      }
    } catch (auditError) {
      console.error("Error creating audit log:", auditError);
      // Continue with the process even if audit creation fails
    }

    // Transform the response to match the expected format
    const formattedProduct = {
      ...updatedProduct,
      costPrice: Number(updatedProduct.costPrice),
      wholesalePrice: Number(updatedProduct.wholesalePrice),
      retailPrice: Number(updatedProduct.retailPrice),
    };

    return NextResponse.json({
      product: formattedProduct,
      message: `Product status updated successfully`,
    });
  } catch (error) {
    console.error("=== ERROR IN UPDATE PRODUCT STATUS API ===");
    console.error("Error updating product status:", error);
    
    let errorMessage = "Failed to update product status";
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
