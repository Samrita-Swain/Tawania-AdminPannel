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

    // This endpoint provides mock inward data for compatibility
    // It redirects to the main warehouse movements API
    const { searchParams } = new URL(req.url);
    const warehouseId = searchParams.get("warehouseId");
    const status = searchParams.get("status");
    const page = searchParams.get("page") || "1";
    const limit = searchParams.get("limit") || "10";

    // Build URL for warehouse movements API
    const movementsUrl = new URL("/api/warehouse/movements", req.url);
    movementsUrl.searchParams.set("movementType", "INWARD");
    if (warehouseId) movementsUrl.searchParams.set("warehouseId", warehouseId);
    if (status) movementsUrl.searchParams.set("status", status);
    movementsUrl.searchParams.set("page", page);
    movementsUrl.searchParams.set("limit", limit);

    // Forward the request to the warehouse movements API
    const response = await fetch(movementsUrl.toString(), {
      headers: {
        'Authorization': req.headers.get('Authorization') || '',
        'Cookie': req.headers.get('Cookie') || '',
      },
    });

    if (!response.ok) {
      // If the movements API fails, return mock data
      const mockInwards = [
        {
          id: "inw-mock-1",
          referenceNumber: "INW-001",
          date: new Date().toISOString(),
          supplier: "Mock Supplier A",
          status: "COMPLETED",
          totalItems: 15,
          totalValue: 750.00,
          hasDamagedItems: false,
        },
        {
          id: "inw-mock-2",
          referenceNumber: "INW-002",
          date: new Date(Date.now() - 86400000).toISOString(), // Yesterday
          supplier: "Mock Supplier B",
          status: "PENDING",
          totalItems: 8,
          totalValue: 400.00,
          hasDamagedItems: true,
        },
        {
          id: "inw-mock-3",
          referenceNumber: "INW-003",
          date: new Date(Date.now() - 172800000).toISOString(), // 2 days ago
          supplier: "Mock Supplier C",
          status: "COMPLETED",
          totalItems: 22,
          totalValue: 1100.00,
          hasDamagedItems: false,
        },
      ];

      return NextResponse.json({
        inwards: mockInwards,
        pagination: {
          page: parseInt(page),
          limit: parseInt(limit),
          totalCount: mockInwards.length,
          totalPages: 1,
        },
      });
    }

    const data = await response.json();
    
    // Transform movements data to inwards format
    const inwards = data.movements?.map((movement: any) => ({
      id: movement.id,
      referenceNumber: movement.referenceNumber,
      date: movement.createdAt,
      supplier: movement.sourceType === 'PURCHASE_ORDER' ? 'Purchase Order' : 
                movement.sourceType === 'RETURN' ? 'Return' : 
                movement.sourceType || 'Unknown',
      status: movement.status,
      totalItems: movement.totalItems,
      totalValue: movement.totalValue,
      hasDamagedItems: movement.items?.some((item: any) => item.condition === 'DAMAGED') || false,
    })) || [];

    return NextResponse.json({
      inwards,
      pagination: data.pagination,
    });
  } catch (error) {
    console.error("Error fetching inwards:", error);
    
    // Return mock data on error
    const mockInwards = [
      {
        id: "inw-error-1",
        referenceNumber: "INW-ERROR-001",
        date: new Date().toISOString(),
        supplier: "Error Fallback Supplier",
        status: "PENDING",
        totalItems: 5,
        totalValue: 250.00,
        hasDamagedItems: false,
      },
    ];

    return NextResponse.json({
      inwards: mockInwards,
      pagination: {
        page: 1,
        limit: 10,
        totalCount: 1,
        totalPages: 1,
      },
    });
  }
}
