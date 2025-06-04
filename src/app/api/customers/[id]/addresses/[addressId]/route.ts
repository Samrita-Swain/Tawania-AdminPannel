import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string; addressId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: customerId, addressId } = params;

    // Get address
    const address = await prisma.address.findUnique({
      where: {
        id: addressId,
      },
    });

    if (!address) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    // Verify address belongs to customer
    if (address.customerId !== customerId) {
      return NextResponse.json(
        { error: "Address does not belong to this customer" },
        { status: 403 }
      );
    }

    return NextResponse.json({ address });
  } catch (error) {
    console.error("Error fetching address:", error);
    return NextResponse.json(
      { error: "Failed to fetch address" },
      { status: 500 }
    );
  }
}

export async function PUT(
  req: NextRequest,
  { params }: { params: { id: string; addressId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: customerId, addressId } = params;
    const data = await req.json();
    const { 
      addressType, 
      isDefault, 
      addressLine1, 
      addressLine2, 
      city, 
      state, 
      postalCode, 
      country, 
      phone,
    } = data;

    // Validate required fields
    if (!addressLine1 || !city || !postalCode || !country) {
      return NextResponse.json(
        { error: "Address line 1, city, postal code, and country are required" },
        { status: 400 }
      );
    }

    // Check if address exists
    const existingAddress = await prisma.address.findUnique({
      where: {
        id: addressId,
      },
    });

    if (!existingAddress) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    // Verify address belongs to customer
    if (existingAddress.customerId !== customerId) {
      return NextResponse.json(
        { error: "Address does not belong to this customer" },
        { status: 403 }
      );
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // If this address is set as default, unset any existing default addresses of the same type
      if (isDefault && !existingAddress.isDefault) {
        await tx.address.updateMany({
          where: {
            customerId,
            type: addressType || existingAddress.type,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Update address
      const updatedAddress = await tx.address.update({
        where: {
          id: addressId,
        },
        data: {
          type: addressType || undefined,
          isDefault: isDefault !== undefined ? isDefault : undefined,
          street: addressLine1,
          city,
          state,
          postalCode,
          country,
        },
      });

      return updatedAddress;
    });

    return NextResponse.json({ address: result });
  } catch (error) {
    console.error("Error updating address:", error);
    return NextResponse.json(
      { error: "Failed to update address" },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: { id: string; addressId: string } }
) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const { id: customerId, addressId } = params;

    // Check if address exists
    const existingAddress = await prisma.address.findUnique({
      where: {
        id: addressId,
      },
    });

    if (!existingAddress) {
      return NextResponse.json(
        { error: "Address not found" },
        { status: 404 }
      );
    }

    // Verify address belongs to customer
    if (existingAddress.customerId !== customerId) {
      return NextResponse.json(
        { error: "Address does not belong to this customer" },
        { status: 403 }
      );
    }

    // Delete address
    await prisma.address.delete({
      where: {
        id: addressId,
      },
    });

    return NextResponse.json({
      message: "Address deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting address:", error);
    return NextResponse.json(
      { error: "Failed to delete address" },
      { status: 500 }
    );
  }
}


