import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  try {
    console.log("Test inwards API called");
    
    // Test the warehouse movements API
    const baseUrl = req.url.replace('/api/test-inwards', '');
    const movementsUrl = `${baseUrl}/api/warehouse/movements?movementType=INWARD`;
    
    console.log("Calling movements API:", movementsUrl);
    
    const response = await fetch(movementsUrl);
    const data = await response.json();
    
    console.log("Movements API response:", data);
    
    return NextResponse.json({
      success: true,
      apiResponse: data,
      message: "Test successful"
    });
  } catch (error) {
    console.error("Test inwards API error:", error);
    return NextResponse.json({
      success: false,
      error: error.message
    }, { status: 500 });
  }
}
