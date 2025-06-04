import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    // Get customer details
    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      include: {
        sales: {
          include: {
            store: true,
            items: {
              include: {
                product: true,
              },
            },
          },
          orderBy: {
            saleDate: "desc",
          },
        },
        Address: {
          orderBy: {
            isDefault: "desc",
          },
        },
        customerNotes: {
          include: {
            createdBy: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        loyaltyTransactions: {
          include: {
            program: true,
            sale: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
        groups: {
          include: {
            group: true,
          },
        },
        promotionRedemptions: {
          include: {
            promotion: true,
            sale: true,
          },
          orderBy: {
            createdAt: "desc",
          },
        },
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ customer });
  } catch (error) {
    console.error("Error fetching customer:", error);
    return NextResponse.json(
      { error: "Failed to fetch customer" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const customerId = resolvedParams.id;
    const data = await req.json();

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Extract data
    const {
      name,
      email,
      phone,
      address,
      loyaltyPoints,
      loyaltyTier,
      notes,
      isActive,
    } = data;

    // Check if email is unique if changed
    if (email && email !== existingCustomer.email) {
      const customerWithEmail = await prisma.customer.findUnique({
        where: { email },
      });

      if (customerWithEmail) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
    }

    // Update customer
    const updatedCustomer = await prisma.customer.update({
      where: {
        id: customerId,
      },
      data: {
        name: name !== undefined ? name : undefined,
        email: email !== undefined ? email : undefined,
        phone: phone !== undefined ? phone : undefined,
        address: address !== undefined ? address : undefined,
        loyaltyPoints: loyaltyPoints !== undefined ? loyaltyPoints : undefined,
        loyaltyTier: loyaltyTier !== undefined ? loyaltyTier : undefined,
        notes: notes !== undefined ? notes : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
      // Don't include any relations to avoid errors with non-existent fields
    });

    return NextResponse.json({ customer: updatedCustomer });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function PATCH(
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

    const customerId = params.id;
    const data = await req.json();

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Update specific fields
    const updatedCustomer = await prisma.customer.update({
      where: {
        id: customerId,
      },
      data,
    });

    return NextResponse.json({ customer: updatedCustomer });
  } catch (error) {
    console.error("Error updating customer:", error);
    return NextResponse.json(
      { error: "Failed to update customer" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const resolvedParams = await params;
    const customerId = resolvedParams.id;

    // Check if customer exists
    const existingCustomer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
      include: {
        sales: true,
      },
    });

    if (!existingCustomer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Check if customer has sales
    if (existingCustomer.sales.length > 0) {
      // Instead of deleting, mark as inactive
      await prisma.customer.update({
        where: {
          id: customerId,
        },
        data: {
          isActive: false,
        },
      });

      return NextResponse.json({
        message: "Customer has sales and cannot be deleted. Marked as inactive instead.",
        deactivated: true,
      });
    }

    // Delete customer and related records
    await prisma.$transaction([
      prisma.customerAddress.deleteMany({
        where: {
          customerId,
        },
      }),
      prisma.customerNote.deleteMany({
        where: {
          customerId,
        },
      }),
      prisma.loyaltyTransaction.deleteMany({
        where: {
          customerId,
        },
      }),
      prisma.customerToGroup.deleteMany({
        where: {
          customerId,
        },
      }),
      prisma.customer.delete({
        where: {
          id: customerId,
        },
      }),
    ]);

    return NextResponse.json({
      message: "Customer deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting customer:", error);
    return NextResponse.json(
      { error: "Failed to delete customer" },
      { status: 500 }
    );
  }
}
