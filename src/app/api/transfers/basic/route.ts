import { NextRequest, NextResponse } from "next/server";

// Very basic transfer API without any database dependencies
export async function GET(req: NextRequest) {
  console.log("=== BASIC TRANSFER API GET CALLED ===");
  
  return NextResponse.json({
    message: "Basic transfer API is working",
    timestamp: new Date().toISOString(),
    transfers: [
      {
        id: "test-transfer-1",
        transferNumber: "TRF-TEST-001",
        status: "DRAFT",
        transferType: "RESTOCK",
        priority: "NORMAL",
        totalItems: 0,
        totalCost: 0,
        totalRetail: 0,
        notes: "Test transfer",
        createdAt: new Date().toISOString()
      }
    ],
    pagination: {
      total: 1,
      page: 1,
      pageSize: 50,
      totalPages: 1
    }
  });
}

export async function POST(req: NextRequest) {
  console.log("=== BASIC TRANSFER API POST CALLED ===");
  
  try {
    const data = await req.json();
    console.log("Received transfer data:", data);
    
    // Generate a simple transfer ID
    const transferId = `transfer_${Date.now()}`;
    const transferNumber = `TRF-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Date.now().toString().slice(-4)}`;
    
    // Create a mock transfer response
    const transfer = {
      id: transferId,
      transferNumber,
      status: "DRAFT",
      transferType: data.transferType || "RESTOCK",
      priority: data.priority || "NORMAL",
      fromWarehouseId: data.fromWarehouseId,
      toStoreId: data.toStoreId,
      totalItems: data.items?.length || 0,
      totalCost: 0,
      totalRetail: 0,
      notes: data.notes || "",
      createdAt: new Date().toISOString(),
      items: data.items || []
    };
    
    console.log("Created mock transfer:", transfer);
    
    return NextResponse.json(transfer);
    
  } catch (error) {
    console.error("=== BASIC TRANSFER API ERROR ===");
    console.error("Error details:", error);
    
    const errorResponse = {
      error: "Failed to create transfer",
      details: error instanceof Error ? error.message : String(error),
      timestamp: new Date().toISOString()
    };
    
    console.log("Returning error response:", errorResponse);
    
    return NextResponse.json(errorResponse, { status: 500 });
  }
}
