import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

export async function POST(req: NextRequest) {
  try {
    console.log("POST /api/suppliers/create - Starting request");

    // Parse request data
    let data;
    try {
      data = await req.json();
      console.log("Request data received:", { name: data.name });
    } catch (parseError) {
      console.error("Error parsing request body:", parseError);
      return NextResponse.json(
        { error: "Invalid request format" },
        { status: 400 }
      );
    }

    const {
      name,
      contactPerson,
      email,
      phone,
      address,
      city,
      state,
      postalCode,
      country,
      taxId,
      paymentTerms,
      notes,
      isActive
    } = data;

    // Validate required fields
    if (!name) {
      console.log("Validation failed: Supplier name is required");
      return NextResponse.json(
        { error: "Supplier name is required" },
        { status: 400 }
      );
    }

    // Verify database connection before attempting to create
    try {
      console.log("Testing database connection...");
      await prisma.$queryRaw`SELECT 1 as connection_test`;
      console.log("Database connection test successful");
    } catch (dbError) {
      console.error("Database connection test failed:", dbError);
      return NextResponse.json(
        { error: "Database connection error. Please check your database connection and try again." },
        { status: 503 } // Service Unavailable
      );
    }

    // Find a default user for createdById and updatedById
    const defaultUser = await prisma.user.findFirst();

    // Create supplier data object
    const supplierData = {
      name,
      contactPerson: contactPerson || "",
      email: email || "",
      phone: phone || "",
      address: address || "",
      city: city || "",
      state: state || "",
      postalCode: postalCode || "",
      country: country || "",
      taxId: taxId || "",
      paymentTerms: paymentTerms || "",
      notes: notes || "",
      isActive: isActive !== undefined ? isActive : true,
    };

    // Add user IDs if a user was found
    if (defaultUser) {
      supplierData.createdById = defaultUser.id;
      supplierData.updatedById = defaultUser.id;
    }

    // Create supplier
    console.log("Creating supplier in database...");
    const supplier = await prisma.supplier.create({
      data: supplierData,
    });

    console.log("Supplier created successfully:", supplier.id);
    return NextResponse.json({
      success: true,
      supplier,
      message: "Supplier created successfully"
    });
  } catch (error: any) {
    console.error("Error creating supplier:", error);

    // Check if it's a database connection error
    if (error.message && (
      error.message.includes("Can't reach database server") ||
      error.message.includes("connect ECONNREFUSED") ||
      error.message.includes("Connection refused") ||
      error.message.includes("Connection terminated") ||
      error.message.includes("Connection reset") ||
      error.message.includes("database") && error.message.includes("connect") ||
      error.message.includes("timeout")
    )) {
      console.error("Database connection error details:", error);
      return NextResponse.json(
        { error: "Database connection error. Please check your database connection and try again." },
        { status: 503 } // Service Unavailable
      );
    }

    // Check for Prisma-specific errors
    if (error.code) {
      console.error(`Prisma error code: ${error.code}`);

      if (error.code === 'P2002') {
        return NextResponse.json(
          { error: "A supplier with this information already exists." },
          { status: 409 }
        );
      }
    }

    console.error("Supplier creation error details:", error);
    return NextResponse.json(
      { error: "Failed to create supplier: " + (error.message || "Unknown error") },
      { status: 500 }
    );
  }
}
