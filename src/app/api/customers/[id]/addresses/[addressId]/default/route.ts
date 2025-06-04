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
    await prisma.$transaction([
      // Unset any existing default addresses of the same type
      prisma.address.updateMany({
        where: {
          customerId,
          type: existingAddress.type,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      }),
      
      // Set this address as default
      prisma.address.update({
        where: {
          id: addressId,
        },
        data: {
          isDefault: true,
        },
      }),
    ]);

    // Redirect to customer page
    return NextResponse.redirect(new URL(`/customers/${customerId}`, req.url));
  } catch (error) {
    console.error("Error setting default address:", error);
    return NextResponse.json(
      { error: "Failed to set default address" },
      { status: 500 }
    );
  }
}

export async function POST(
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

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // Unset any existing default addresses of the same type
      await tx.address.updateMany({
        where: {
          customerId,
          type: existingAddress.type,
          isDefault: true,
        },
        data: {
          isDefault: false,
        },
      });
      
      // Set this address as default
      const updatedAddress = await tx.address.update({
        where: {
          id: addressId,
        },
        data: {
          isDefault: true,
        },
      });
      
      return updatedAddress;
    });

    return NextResponse.json({
      address: result,
      message: "Address set as default successfully",
    });
  } catch (error) {
    console.error("Error setting default address:", error);
    return NextResponse.json(
      { error: "Failed to set default address" },
      { status: 500 }
    );
  }
}



