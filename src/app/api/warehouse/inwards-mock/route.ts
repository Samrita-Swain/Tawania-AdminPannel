import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    
    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // This is a mock endpoint that always returns sample inward data
    const { searchParams } = new URL(req.url);
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "10");

    const mockInwards = [
      {
        id: "mock-inw-1",
        referenceNumber: "INW-MOCK-001",
        date: new Date().toISOString(),
        supplier: "Mock Supplier Alpha",
        status: "COMPLETED",
        totalItems: 20,
        totalValue: 1000.00,
        hasDamagedItems: false,
        warehouse: {
          id: "mock-warehouse-1",
          name: "Main Warehouse",
          code: "WH-001",
        },
        items: [
          {
            id: "mock-item-1",
            productId: "mock-product-1",
            productName: "Mock Product A",
            productSku: "MOCK-SKU-001",
            quantity: 10,
            unitCost: 50.00,
            totalCost: 500.00,
            condition: "NEW",
          },
          {
            id: "mock-item-2",
            productId: "mock-product-2",
            productName: "Mock Product B",
            productSku: "MOCK-SKU-002",
            quantity: 10,
            unitCost: 50.00,
            totalCost: 500.00,
            condition: "NEW",
          },
        ],
      },
      {
        id: "mock-inw-2",
        referenceNumber: "INW-MOCK-002",
        date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
        supplier: "Mock Supplier Beta",
        status: "PENDING",
        totalItems: 15,
        totalValue: 750.00,
        hasDamagedItems: true,
        warehouse: {
          id: "mock-warehouse-1",
          name: "Main Warehouse",
          code: "WH-001",
        },
        items: [
          {
            id: "mock-item-3",
            productId: "mock-product-3",
            productName: "Mock Product C",
            productSku: "MOCK-SKU-003",
            quantity: 10,
            unitCost: 50.00,
            totalCost: 500.00,
            condition: "NEW",
          },
          {
            id: "mock-item-4",
            productId: "mock-product-4",
            productName: "Mock Product D",
            productSku: "MOCK-SKU-004",
            quantity: 5,
            unitCost: 50.00,
            totalCost: 250.00,
            condition: "DAMAGED",
          },
        ],
      },
      {
        id: "mock-inw-3",
        referenceNumber: "INW-MOCK-003",
        date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
        supplier: "Mock Supplier Gamma",
        status: "COMPLETED",
        totalItems: 30,
        totalValue: 1500.00,
        hasDamagedItems: false,
        warehouse: {
          id: "mock-warehouse-1",
          name: "Main Warehouse",
          code: "WH-001",
        },
        items: [
          {
            id: "mock-item-5",
            productId: "mock-product-5",
            productName: "Mock Product E",
            productSku: "MOCK-SKU-005",
            quantity: 30,
            unitCost: 50.00,
            totalCost: 1500.00,
            condition: "NEW",
          },
        ],
      },
      {
        id: "mock-inw-4",
        referenceNumber: "INW-MOCK-004",
        date: new Date(Date.now() - 259200000).toISOString(), // 3 days ago
        supplier: "Mock Supplier Delta",
        status: "IN_PROGRESS",
        totalItems: 12,
        totalValue: 600.00,
        hasDamagedItems: false,
        warehouse: {
          id: "mock-warehouse-1",
          name: "Main Warehouse",
          code: "WH-001",
        },
        items: [
          {
            id: "mock-item-6",
            productId: "mock-product-6",
            productName: "Mock Product F",
            productSku: "MOCK-SKU-006",
            quantity: 12,
            unitCost: 50.00,
            totalCost: 600.00,
            condition: "NEW",
          },
        ],
      },
      {
        id: "mock-inw-5",
        referenceNumber: "INW-MOCK-005",
        date: new Date(Date.now() - 345600000).toISOString(), // 4 days ago
        supplier: "Mock Supplier Epsilon",
        status: "CANCELLED",
        totalItems: 0,
        totalValue: 0.00,
        hasDamagedItems: false,
        warehouse: {
          id: "mock-warehouse-1",
          name: "Main Warehouse",
          code: "WH-001",
        },
        items: [],
      },
    ];

    // Apply pagination
    const startIndex = (page - 1) * limit;
    const endIndex = startIndex + limit;
    const paginatedInwards = mockInwards.slice(startIndex, endIndex);

    return NextResponse.json({
      inwards: paginatedInwards,
      pagination: {
        page,
        limit,
        totalCount: mockInwards.length,
        totalPages: Math.ceil(mockInwards.length / limit),
      },
      message: "Mock inward data for testing purposes",
    });
  } catch (error) {
    console.error("Error in mock inwards endpoint:", error);
    return NextResponse.json(
      { error: "Failed to fetch mock inwards data" },
      { status: 500 }
    );
  }
}
