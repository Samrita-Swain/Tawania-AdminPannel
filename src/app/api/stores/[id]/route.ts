import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    // Get the session but don't require it for verification
    // This allows the store creation flow to verify the store exists
    const session = await getServerSession(authOptions);
    const isVerification = req.headers.get('x-verification') === 'true';

    // Only require authentication for non-verification requests
    if (!isVerification && !session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    const storeId = params.id;

    // Log the verification attempt
    if (isVerification) {
      console.log(`Verification request for store ID: ${storeId}`);
    }

    // For verification requests, just check if the store exists without loading relations
    // This makes the verification faster and more reliable
    let store;
    if (isVerification) {
      store = await prisma.store.findUnique({
        where: {
          id: storeId,
        },
        select: {
          id: true,
          name: true,
          code: true,
          isActive: true,
          createdAt: true,
        }
      });
    } else {
      // For normal requests, load all the relations
      store = await prisma.store.findUnique({
        where: {
          id: storeId,
        },
        include: {
          staff: {
            include: {
              user: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
            },
          },
          inventoryItems: {
            include: {
              product: true,
            },
            take: 10,
          },
          sales: {
            include: {
              customer: true,
              createdBy: true,
            },
            orderBy: {
              createdAt: "desc",
            },
            take: 10,
          },
        },
      });
    }

    if (!store) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // For verification requests, just return the store without stats
    if (isVerification) {
      return NextResponse.json({
        store,
        verified: true
      });
    }

    // For normal requests, get additional statistics
    const [totalInventoryItems, totalSales, totalRevenue] = await Promise.all([
      prisma.inventoryItem.count({
        where: {
          storeId: store.id,
        },
      }),
      prisma.sale.count({
        where: {
          storeId: store.id,
        },
      }),
      prisma.sale.aggregate({
        where: {
          storeId: store.id,
        },
        _sum: {
          totalAmount: true,
        },
      }),
    ]);

    return NextResponse.json({
      store,
      stats: {
        totalInventoryItems,
        totalSales,
        totalRevenue: totalRevenue._sum.totalAmount || 0,
      }
    });
  } catch (error) {
    console.error("Error fetching store:", error);

    // Add more detailed error information for verification requests
    if (req.headers.get('x-verification') === 'true') {
      console.error(`Verification failed for store ID: ${params.id}`);
      console.error(`Error details: ${error.message}`);

      return NextResponse.json(
        {
          error: "Failed to verify store",
          details: error.message,
          storeId: params.id
        },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { error: "Failed to fetch store" },
      { status: 500 }
    );
  }
}

export async function PUT(
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

    const storeId = params.id;
    const data = await req.json();

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: {
        id: storeId,
      },
    });

    if (!existingStore) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // Extract data
    const {
      name,
      code,
      address,
      phone,
      email,
      openingHours,
      isActive
    } = data;

    // Check if code is unique if changed
    if (code && code !== existingStore.code) {
      const storeWithCode = await prisma.store.findUnique({
        where: { code },
      });

      if (storeWithCode) {
        return NextResponse.json(
          { error: "Store code already in use" },
          { status: 400 }
        );
      }
    }

    // Update store
    const updatedStore = await prisma.store.update({
      where: {
        id: storeId,
      },
      data: {
        name: name !== undefined ? name : undefined,
        code: code !== undefined ? code : undefined,
        address: address !== undefined ? address : undefined,
        phone: phone !== undefined ? phone : undefined,
        email: email !== undefined ? email : undefined,
        openingHours: openingHours !== undefined ? openingHours : undefined,
        isActive: isActive !== undefined ? isActive : undefined,
      },
    });

    return NextResponse.json({ store: updatedStore });
  } catch (error) {
    console.error("Error updating store:", error);
    return NextResponse.json(
      { error: "Failed to update store" },
      { status: 500 }
    );
  }
}

export async function DELETE(
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

    const storeId = params.id;

    // Check if store exists
    const existingStore = await prisma.store.findUnique({
      where: {
        id: storeId,
      },
      include: {
        inventoryItems: {
          select: {
            id: true,
          },
        },
        staff: {
          select: {
            id: true,
          },
        },
        sales: {
          select: {
            id: true,
          },
        },
        returns: {
          select: {
            id: true,
          },
        },
        transfersFrom: {
          select: {
            id: true,
          },
        },
        transfersTo: {
          select: {
            id: true,
          },
        },
      },
    });

    if (!existingStore) {
      return NextResponse.json(
        { error: "Store not found" },
        { status: 404 }
      );
    }

    // Check if store has related records
    const hasRelatedRecords =
      existingStore.inventoryItems.length > 0 ||
      existingStore.staff.length > 0 ||
      existingStore.sales.length > 0 ||
      existingStore.returns.length > 0 ||
      existingStore.transfersFrom.length > 0 ||
      existingStore.transfersTo.length > 0;

    if (hasRelatedRecords) {
      // Instead of deleting, mark as inactive
      await prisma.store.update({
        where: {
          id: storeId,
        },
        data: {
          isActive: false,
        },
      });

      return NextResponse.json({
        message: "Store has related records and cannot be deleted. Marked as inactive instead.",
        deactivated: true,
      });
    }

    // Delete store
    await prisma.store.delete({
      where: {
        id: storeId,
      },
    });

    return NextResponse.json({
      message: "Store deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting store:", error);
    return NextResponse.json(
      { error: "Failed to delete store" },
      { status: 500 }
    );
  }
}
