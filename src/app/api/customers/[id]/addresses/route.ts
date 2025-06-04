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

    const customerId = params.id;

    // Get customer addresses
    const addresses = await prisma.address.findMany({
      where: {
        customerId,
      },
      orderBy: [
        {
          isDefault: "desc",
        },
        {
          createdAt: "desc",
        },
      ],
    });

    return NextResponse.json({ addresses });
  } catch (error) {
    console.error("Error fetching addresses:", error);
    return NextResponse.json(
      { error: "Failed to fetch addresses" },
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

    const customerId = params.id;
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

    // Check if customer exists
    const customer = await prisma.customer.findUnique({
      where: {
        id: customerId,
      },
    });

    if (!customer) {
      return NextResponse.json(
        { error: "Customer not found" },
        { status: 404 }
      );
    }

    // Start a transaction
    const result = await prisma.$transaction(async (tx) => {
      // If this address is set as default, unset any existing default addresses of the same type
      if (isDefault) {
        await tx.address.updateMany({
          where: {
            customerId,
            type: addressType,
            isDefault: true,
          },
          data: {
            isDefault: false,
          },
        });
      }

      // Create address
      const address = await tx.address.create({
        data: {
          customerId,
          type: addressType || "SHIPPING",
          isDefault: isDefault || false,
          street: addressLine1,
          city,
          state,
          postalCode,
          country,
        },
      });

      return address;
    });

    return NextResponse.json({ address: result });
  } catch (error) {
    console.error("Error creating address:", error);
    return NextResponse.json(
      { error: "Failed to create address" },
      { status: 500 }
    );
  }
}


