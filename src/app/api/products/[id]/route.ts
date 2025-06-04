import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the product ID from the params
    const productId = params.id;

    // Log the product ID to help with debugging
    console.log("API GET - Product ID:", productId);

    // Check if the product ID is valid
    if (!productId || productId === "unknown" || productId === "undefined") {
      console.error("Invalid product ID in API route:", productId);
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    // Use raw SQL to fetch the product to avoid schema mismatches
    const productResult = await prisma.$queryRaw`
      SELECT p.id, p.name, p.sku, p.description, p."categoryId", p."costPrice",
             p."wholesalePrice", p."retailPrice",
             COALESCE(p."minStockLevel", 10) as "minStockLevel",
             COALESCE(p."reorderPoint", 5) as "reorderPoint",
             p.barcode, COALESCE(p."isActive", true) as "isActive",
             p."createdAt", p."updatedAt",
             c.id as "category_id", c.name as "category_name"
      FROM "Product" p
      LEFT JOIN "Category" c ON p."categoryId" = c.id
      WHERE p.id = ${productId}
    `;

    // Format the product data
    const product = productResult.length > 0 ? {
      ...productResult[0],
      category: productResult[0].category_id ? {
        id: productResult[0].category_id,
        name: productResult[0].category_name
      } : null
    } : null;

    // Log the result
    console.log("API: Product query result:", product ? "Found" : "Not found");

    // If no product is found, return a 404
    if (!product) {
      return NextResponse.json(
        { error: `Product not found with ID: ${productId}` },
        { status: 404 }
      );
    }

    // Return the product
    return NextResponse.json({ product });
  } catch (error) {
    console.error("Error fetching product:", error);

    // Provide more detailed error message
    let errorMessage = "Failed to fetch product";
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      { error: errorMessage },
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

    // Get the product ID from the params
    const productId = params.id;

    // Log the product ID to help with debugging
    console.log("API PUT - Product ID:", productId);

    // Check if the product ID is valid
    if (!productId || productId === "unknown" || productId === "undefined") {
      console.error("Invalid product ID in API PUT route:", productId);
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }
    const data = await req.json();

    // Check if product exists using Prisma
    const existingProduct = await prisma.product.findUnique({
      where: { id: productId },
      select: { id: true, sku: true }
    });

    if (!existingProduct) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if SKU is being changed and already exists
    if (data.sku && data.sku !== existingProduct.sku) {
      const existingSkuProduct = await prisma.product.findFirst({
        where: {
          sku: data.sku,
          id: { not: productId }
        }
      });

      if (existingSkuProduct) {
        return NextResponse.json(
          { error: "SKU already exists" },
          { status: 400 }
        );
      }
    }

    // Update product using Prisma instead of raw SQL
    const now = new Date();

    // Prepare update data
    const updateData = {
      name: data.name,
      sku: data.sku,
      description: data.description || null,
      // Use connect for the category relationship
      category: data.categoryId ? {
        connect: { id: data.categoryId }
      } : undefined,
      costPrice: data.costPrice !== undefined ? data.costPrice : null,
      wholesalePrice: data.wholesalePrice !== undefined ? data.wholesalePrice : null,
      retailPrice: data.retailPrice !== undefined ? data.retailPrice : null,
      minStockLevel: data.minStockLevel !== undefined ? data.minStockLevel : null,
      reorderPoint: data.reorderPoint !== undefined ? data.reorderPoint : null,
      barcode: data.barcode || null,
      isActive: data.isActive !== undefined ? data.isActive : true,
      // Use connect for the updatedBy relationship
      User_Product_updatedByIdToUser: {
        connect: { id: session.user.id }
      }
    };

    // Update product using raw SQL to avoid schema mismatches
    try {
      console.log('Updating product with data:', JSON.stringify(updateData, null, 2));

      // Use raw SQL for the update to avoid schema mismatches
      await prisma.$executeRaw`
        UPDATE "Product"
        SET
          name = ${updateData.name},
          sku = ${updateData.sku},
          description = ${updateData.description},
          "categoryId" = ${data.categoryId},
          "costPrice" = ${updateData.costPrice},
          "wholesalePrice" = ${updateData.wholesalePrice},
          "retailPrice" = ${updateData.retailPrice},
          "minStockLevel" = ${updateData.minStockLevel},
          "reorderPoint" = ${updateData.reorderPoint},
          barcode = ${updateData.barcode},
          "isActive" = ${updateData.isActive},
          "updatedById" = ${session.user.id},
          "updatedAt" = NOW()
        WHERE id = ${productId}
      `;

      console.log('Product updated successfully');
    } catch (updateError) {
      console.error('Error in SQL update:', updateError);
      throw updateError;
    }

    // Get the updated product using raw SQL
    console.log("API: Fetching updated product with ID:", productId);

    try {
      const updatedProductResult = await prisma.$queryRaw`
        SELECT p.id, p.name, p.sku, p.description, p."categoryId", p."costPrice",
               p."wholesalePrice", p."retailPrice",
               COALESCE(p."minStockLevel", 10) as "minStockLevel",
               COALESCE(p."reorderPoint", 5) as "reorderPoint",
               p.barcode, COALESCE(p."isActive", true) as "isActive",
               p."createdAt", p."updatedAt",
               c.id as "category_id", c.name as "category_name"
        FROM "Product" p
        LEFT JOIN "Category" c ON p."categoryId" = c.id
        WHERE p.id = ${productId}
      `;

      console.log("API: Updated product query result:", updatedProductResult);

      // Check if we got any results
      if (!updatedProductResult || updatedProductResult.length === 0) {
        console.error("API: No updated product found with ID:", productId);
        return NextResponse.json(
          { error: `Product not found after update with ID: ${productId}` },
          { status: 404 }
        );
      }

      // Format the product data
      const updatedProduct = {
        ...updatedProductResult[0],
        category: updatedProductResult[0].category_id ? {
          id: updatedProductResult[0].category_id,
          name: updatedProductResult[0].category_name
        } : null
      };

      return NextResponse.json({ product: updatedProduct });
    } catch (queryError) {
      console.error("API: Error fetching updated product:", queryError);
      return NextResponse.json(
        { error: `Error fetching updated product: ${queryError.message}` },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error updating product:", error);

    // Provide more detailed error message
    let errorMessage = "Failed to update product";
    if (error instanceof Error) {
      errorMessage += `: ${error.message}`;
      console.error("Error stack:", error.stack);
    }

    return NextResponse.json(
      { error: errorMessage },
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

    // Get the product ID from the params
    const productId = params.id;

    // Log the product ID to help with debugging
    console.log("API DELETE - Product ID:", productId);

    // Check if the product ID is valid
    if (!productId || productId === "unknown" || productId === "undefined") {
      console.error("Invalid product ID in API DELETE route:", productId);
      return NextResponse.json(
        { error: "Invalid product ID" },
        { status: 400 }
      );
    }

    // Check if product exists using raw SQL
    const existingProductResult = await prisma.$queryRaw`
      SELECT id FROM "Product" WHERE id = ${productId}
    `;

    if (!existingProductResult || existingProductResult.length === 0) {
      return NextResponse.json(
        { error: "Product not found" },
        { status: 404 }
      );
    }

    // Check if product is used in inventory
    const inventoryItemResult = await prisma.$queryRaw`
      SELECT id FROM "InventoryItem" WHERE "productId" = ${productId} LIMIT 1
    `;

    if (inventoryItemResult && inventoryItemResult.length > 0) {
      // Instead of deleting, mark as inactive
      await prisma.$executeRaw`
        UPDATE "Product"
        SET
          "isActive" = false,
          "updatedById" = ${session.user.id},
          "updatedAt" = NOW()
        WHERE id = ${productId}
      `;

      // Get the updated product
      const updatedProductResult = await prisma.$queryRaw`
        SELECT * FROM "Product" WHERE id = ${productId}
      `;

      const updatedProduct = updatedProductResult.length > 0 ? updatedProductResult[0] : null;

      return NextResponse.json({
        product: updatedProduct,
        message: "Product marked as inactive because it is used in inventory",
      });
    }

    // Delete product using raw SQL
    await prisma.$executeRaw`
      DELETE FROM "Product" WHERE id = ${productId}
    `;

    return NextResponse.json({
      message: "Product deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting product:", error);
    return NextResponse.json(
      { error: "Failed to delete product" },
      { status: 500 }
    );
  }
}
