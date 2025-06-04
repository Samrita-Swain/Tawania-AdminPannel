import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import crypto from "crypto";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const loyaltyTier = url.searchParams.get("tier");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");

    // Build filters
    const filters: any = {};

    if (status === "active") {
      filters.isActive = true;
    } else if (status === "inactive") {
      filters.isActive = false;
    }

    if (loyaltyTier) {
      filters.loyaltyTier = loyaltyTier;
    }

    if (search) {
      filters.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { email: { contains: search, mode: 'insensitive' } },
        { phone: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get customers with pagination
    const [customers, totalItems] = await Promise.all([
      prisma.customer.findMany({
        where: filters,
        include: {
          sales: {
            select: {
              id: true,
              totalAmount: true,
            },
          },
          loyaltyTransactions: {
            select: {
              id: true,
              points: true,
              type: true,
            },
          },
          Address: true,
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      prisma.customer.count({
        where: filters,
      }),
    ]);

    return NextResponse.json({
      customers,
      totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    });
  } catch (error) {
    console.error("Error fetching customers:", error);
    return NextResponse.json(
      { error: "Failed to fetch customers" },
      { status: 500 }
    );
  }
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
    // Extract only the fields we need, ignoring any extra fields like birthDate or gender
    const {
      name,
      email,
      phone,
      address,
      loyaltyPoints,
      loyaltyTier,
      isActive,
      addresses = [],
    } = data;

    // Remove any unexpected fields that might be coming from the client
    const customerData = {
      name,
      email,
      phone,
      address,
      loyaltyPoints: loyaltyPoints || 0,
      loyaltyTier: loyaltyTier || "STANDARD",
      isActive: isActive !== undefined ? isActive : true,
      id: crypto.randomUUID(),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    // Validate required fields
    if (!name) {
      return NextResponse.json(
        { error: "Name is required" },
        { status: 400 }
      );
    }

    // Check if email is unique if provided
    if (email) {
      const existingCustomer = await prisma.customer.findUnique({
        where: { email },
      });

      if (existingCustomer) {
        return NextResponse.json(
          { error: "Email already in use" },
          { status: 400 }
        );
      }
    }

    // Create customer with proper field mapping and type assertion to bypass TypeScript errors
    const customer = await prisma.customer.create({
      data: customerData,
    });

    // Create addresses if provided
    if (addresses.length > 0) {
      // Create addresses using the Address model
      await Promise.all(
        addresses.map((addr: any) =>
          prisma.address.create({
            data: {
              id: crypto.randomUUID(),
              customerId: customer.id,
              type: addr.type || "SHIPPING",
              street: addr.street,
              city: addr.city,
              state: addr.state || null,
              postalCode: addr.postalCode,
              country: addr.country,
              isDefault: addr.isDefault || false,
              createdAt: new Date(),
              updatedAt: new Date(),
            },
          })
        )
      );
    }

    // Get the created customer with related data
    const createdCustomer = await prisma.customer.findUnique({
      where: {
        id: customer.id,
      },
      include: {
        Address: true,
      },
    });

    return NextResponse.json({ customer: createdCustomer });
  } catch (error) {
    console.error("Error creating customer:", error);
    return NextResponse.json(
      { error: "Failed to create customer" },
      { status: 500 }
    );
  }
}




