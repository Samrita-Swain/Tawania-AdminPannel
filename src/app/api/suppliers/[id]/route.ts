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

    const supplierId = params.id;

    // Get supplier
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

    return NextResponse.json({ supplier });
  } catch (error) {
    console.error("Error fetching supplier:", error);
    return NextResponse.json(
      { error: "Failed to fetch supplier" },
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

    const supplierId = params.id;
    const data = await req.json();
    const { 
      name, 
      contactPerson, 
      email, 
      phone, 
      address, 
      city, 
      state, 
      postalCode, 
      country, 
      taxId, 
      paymentTerms, 
      notes, 
      isActive 
    } = data;

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 }
      );
    }

    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
      },
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Update supplier
    const updatedSupplier = await prisma.supplier.update({
      where: {
        id: supplierId,
      },
      data: {
        name,
        contactPerson,
        email,
        phone,
        address,
        city,
        state,
        postalCode,
        country,
        taxId,
        paymentTerms,
        notes,
        isActive: isActive !== undefined ? isActive : existingSupplier.isActive,
        updatedById: session.user.id,
      },
    });

    return NextResponse.json({ supplier: updatedSupplier });
  } catch (error) {
    console.error("Error updating supplier:", error);
    return NextResponse.json(
      { error: "Failed to update supplier" },
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

    const supplierId = params.id;

    // Check if supplier exists
    const existingSupplier = await prisma.supplier.findUnique({
      where: {
        id: supplierId,
      },
    });

    if (!existingSupplier) {
      return NextResponse.json(
        { error: "Supplier not found" },
        { status: 404 }
      );
    }

    // Check if supplier has products
    const productsCount = await prisma.product.count({
      where: {
        supplierId,
      },
    });

    if (productsCount > 0) {
      // Instead of deleting, mark as inactive
      const updatedSupplier = await prisma.supplier.update({
        where: {
          id: supplierId,
        },
        data: {
          isActive: false,
          updatedById: session.user.id,
        },
      });

      return NextResponse.json({
        supplier: updatedSupplier,
        message: "Supplier marked as inactive because it has associated products",
      });
    }

    // Check if supplier has purchase orders
    const purchaseOrdersCount = await prisma.purchaseOrder.count({
      where: {
        supplierId,
      },
    });

    if (purchaseOrdersCount > 0) {
      // Instead of deleting, mark as inactive
      const updatedSupplier = await prisma.supplier.update({
        where: {
          id: supplierId,
        },
        data: {
          isActive: false,
          updatedById: session.user.id,
        },
      });

      return NextResponse.json({
        supplier: updatedSupplier,
        message: "Supplier marked as inactive because it has associated purchase orders",
      });
    }

    // Delete supplier
    await prisma.supplier.delete({
      where: {
        id: supplierId,
      },
    });

    return NextResponse.json({
      message: "Supplier deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting supplier:", error);
    return NextResponse.json(
      { error: "Failed to delete supplier" },
      { status: 500 }
    );
  }
}
