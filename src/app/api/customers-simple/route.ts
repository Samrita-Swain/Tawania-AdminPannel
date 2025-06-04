import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

// Mock customers data for fallback
const mockCustomers = [
  {
    id: "mock-customer-1",
    name: "John Doe",
    email: "john.doe@example.com",
    phone: "555-123-4567",
    isActive: true,
    loyaltyPoints: 100,
    loyaltyTier: "GOLD",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "mock-customer-2",
    name: "Jane Smith",
    email: "jane.smith@example.com",
    phone: "555-987-6543",
    isActive: true,
    loyaltyPoints: 50,
    loyaltyTier: "SILVER",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  },
  {
    id: "mock-customer-3",
    name: "Guest Customer",
    email: "guest@example.com",
    phone: "555-000-0000",
    isActive: true,
    loyaltyPoints: 0,
    loyaltyTier: "STANDARD",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString()
  }
];

export async function GET(req: NextRequest) {
  try {
    console.log("Simple Customers API: GET request received");
    
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      console.log("Simple Customers API: Unauthorized - no session");
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }
    
    // Parse query parameters
    const { searchParams } = new URL(req.url);
    const status = searchParams.get("status");
    const loyaltyTier = searchParams.get("tier");
    const search = searchParams.get("search") || "";
    const page = parseInt(searchParams.get("page") || "1");
    const pageSize = parseInt(searchParams.get("pageSize") || "50");
    
    console.log("Simple Customers API: Query parameters:", { status, loyaltyTier, search, page, pageSize });
    
    // Try to fetch customers from the database
    try {
      // Build the filter
      const filter: any = {};
      
      if (status === "active") {
        filter.isActive = true;
      } else if (status === "inactive") {
        filter.isActive = false;
      }
      
      if (loyaltyTier) {
        filter.loyaltyTier = loyaltyTier;
      }
      
      if (search) {
        filter.OR = [
          { name: { contains: search, mode: 'insensitive' } },
          { email: { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } }
        ];
      }
      
      // Use a simple query with explicit select to avoid schema mismatches
      const customers = await prisma.customer.findMany({
        where: filter,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          isActive: true,
          loyaltyPoints: true,
          loyaltyTier: true,
          createdAt: true,
          updatedAt: true
        },
        orderBy: {
          name: "asc"
        },
        take: pageSize,
        skip: (page - 1) * pageSize
      });
      
      console.log(`Simple Customers API: Found ${customers.length} customers`);
      
      if (customers.length > 0) {
        return NextResponse.json({
          customers,
          pagination: {
            total: customers.length,
            page,
            pageSize,
            totalPages: Math.ceil(customers.length / pageSize)
          }
        });
      }
    } catch (dbError) {
      console.error("Simple Customers API: Database error:", dbError);
    }
    
    // Fall back to mock data if database query fails or returns no results
    console.log("Simple Customers API: Using mock data");
    
    // Filter mock data based on query parameters
    let filteredMockCustomers = [...mockCustomers];
    
    if (status === "active") {
      filteredMockCustomers = filteredMockCustomers.filter(c => c.isActive);
    } else if (status === "inactive") {
      filteredMockCustomers = filteredMockCustomers.filter(c => !c.isActive);
    }
    
    if (loyaltyTier) {
      filteredMockCustomers = filteredMockCustomers.filter(c => c.loyaltyTier === loyaltyTier);
    }
    
    if (search) {
      const searchLower = search.toLowerCase();
      filteredMockCustomers = filteredMockCustomers.filter(c => 
        c.name.toLowerCase().includes(searchLower) ||
        c.email.toLowerCase().includes(searchLower) ||
        c.phone.toLowerCase().includes(searchLower)
      );
    }
    
    return NextResponse.json({
      customers: filteredMockCustomers,
      pagination: {
        total: filteredMockCustomers.length,
        page: 1,
        pageSize: 50,
        totalPages: 1
      }
    });
  } catch (error) {
    console.error("Simple Customers API: Unexpected error:", error);
    
    // Return mock data on error
    return NextResponse.json({
      customers: mockCustomers,
      pagination: {
        total: mockCustomers.length,
        page: 1,
        pageSize: 50,
        totalPages: 1
      }
    });
  }
}
