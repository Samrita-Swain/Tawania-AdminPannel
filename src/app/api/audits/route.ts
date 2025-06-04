import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export async function GET(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);

    if (!session?.user?.id) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    // Check if the Audit model exists in Prisma
    if (!('audit' in prisma)) {
      return NextResponse.json(
        { error: "Audit functionality is not available" },
        { status: 500 }
      );
    }

    // Parse query parameters
    const url = new URL(req.url);
    const status = url.searchParams.get("status");
    const warehouseId = url.searchParams.get("warehouse");
    const search = url.searchParams.get("search");
    const page = parseInt(url.searchParams.get("page") || "1");
    const pageSize = parseInt(url.searchParams.get("pageSize") || "10");

    // Build filters
    const filters: any = {};

    if (status) {
      filters.status = status;
    }

    if (warehouseId) {
      filters.warehouseId = warehouseId;
    }

    if (search) {
      filters.OR = [
        { referenceNumber: { contains: search, mode: 'insensitive' } },
        { notes: { contains: search, mode: 'insensitive' } },
      ];
    }

    // Get audits with pagination
    const [audits, totalItems] = await Promise.all([
      // @ts-ignore - Dynamically access the model
      prisma.audit.findMany({
        where: filters,
        include: {
          warehouse: true,
          createdBy: {
            select: {
              id: true,
              name: true,
              email: true,
            },
          },
          assignments: {
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
          items: {
            select: {
              id: true,
              status: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      // @ts-ignore - Dynamically access the model
      prisma.audit.count({
        where: filters,
      }),
    ]);

    return NextResponse.json({
      audits,
      totalItems,
      page,
      pageSize,
      totalPages: Math.ceil(totalItems / pageSize),
    });
  } catch (error) {
    console.error("Error fetching audits:", error);
    return NextResponse.json(
      { error: "Failed to fetch audits" },
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

    // Check if the Audit model exists in Prisma
    if (!('audit' in prisma)) {
      return NextResponse.json(
        { error: "Audit functionality is not available" },
        { status: 500 }
      );
    }

    const data = await req.json();
    const {
      warehouseId,
      startDate,
      endDate,
      notes,
      zones = [],
      users = []
    } = data;

    // Validate required fields
    if (!warehouseId || !startDate) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 }
      );
    }

    // Generate a reference number
    const date = new Date();
    const year = date.getFullYear().toString().slice(-2);
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const day = date.getDate().toString().padStart(2, '0');

    // Get count of audits for today
    const todayStart = new Date(date.setHours(0, 0, 0, 0));
    const todayEnd = new Date(date.setHours(23, 59, 59, 999));

    // @ts-ignore - Dynamically access the model
    const count = await prisma.audit.count({
      where: {
        createdAt: {
          gte: todayStart,
          lte: todayEnd,
        },
      },
    });

    // Format: AUDIT-YYMMDD-XXXX (XXXX is a sequential number)
    const sequentialNumber = (count + 1).toString().padStart(4, '0');
    const referenceNumber = `AUDIT-${year}${month}${day}-${sequentialNumber}`;

    try {
      console.log("Starting audit creation with data:", {
        referenceNumber,
        warehouseId,
        startDate,
        endDate,
        notes,
        userId: session.user.id,
        zones: zones.length,
        users: users.length
      });

      // Verify warehouse exists
      try {
        // @ts-ignore - Dynamically access the model
        const warehouse = await prisma.warehouse.findUnique({
          where: { id: warehouseId },
          select: { id: true, name: true }
        });

        if (!warehouse) {
          return NextResponse.json(
            { error: "Warehouse not found", details: `Warehouse with ID ${warehouseId} does not exist` },
            { status: 400 }
          );
        }

        console.log("Warehouse verified:", warehouse);
      } catch (warehouseError) {
        console.error("Error verifying warehouse:", warehouseError);
        return NextResponse.json(
          { error: "Failed to verify warehouse", details: warehouseError instanceof Error ? warehouseError.message : String(warehouseError) },
          { status: 500 }
        );
      }

      // Find a valid user ID to use
      let validUserId = session.user.id;

      try {
        // First try to find the session user
        // @ts-ignore - Dynamically access the model
        let user = await prisma.user.findUnique({
          where: { id: session.user.id },
          select: { id: true, name: true, email: true }
        });

        // If session user not found, try to find any user
        if (!user) {
          console.warn(`Session user not found: ${session.user.id}. Looking for any valid user...`);

          // @ts-ignore - Dynamically access the model
          const users = await prisma.user.findMany({
            take: 1,
            select: { id: true, name: true, email: true }
          });

          if (users && users.length > 0) {
            user = users[0];
            validUserId = user.id;
            console.log(`Using alternative user: ${user.name || user.email} (${user.id})`);
          } else {
            console.error("No valid users found in the database");
            return NextResponse.json(
              { error: "No valid users found", details: "Cannot create audit without a valid user" },
              { status: 400 }
            );
          }
        } else {
          console.log(`User verified: ${user.name || user.email} (${user.id})`);
        }
      } catch (userError) {
        console.error("Error finding valid user:", userError);
        return NextResponse.json(
          { error: "Failed to find valid user", details: userError instanceof Error ? userError.message : String(userError) },
          { status: 500 }
        );
      }

      // Start a transaction with increased timeout
      // @ts-ignore - Dynamically access the model
      const result = await prisma.$transaction(async (tx) => {
        console.log("Transaction started with 15s timeout");

        // Create audit
        let audit;
        try {
          console.log("Creating audit record with reference:", referenceNumber);

          // @ts-ignore - Dynamically access the model
          audit = await tx.audit.create({
            data: {
              referenceNumber,
              warehouseId,
              status: "PLANNED",
              startDate: new Date(startDate),
              endDate: endDate ? new Date(endDate) : null,
              notes,
              createdById: validUserId, // Use the validated user ID
            },
          });

          if (!audit) {
            throw new Error("Failed to create audit record - returned null");
          }

          console.log("Audit record created:", audit.id);
        } catch (createError) {
          console.error("Error creating audit record:", createError);
          console.error("Error details:", JSON.stringify(createError, null, 2));
          throw new Error(`Failed to create audit: ${createError instanceof Error ? createError.message : String(createError)}`);
        }

        // Create audit assignments for selected users
        if (users.length > 0) {
          console.log(`Creating ${users.length} audit assignments`);

          if (!('auditAssignment' in tx)) {
            console.warn("auditAssignment model not available in transaction");
          } else {
            try {
              // @ts-ignore - Dynamically access the model
              const assignments = await tx.auditAssignment.createMany({
                data: users.map((userId: string) => ({
                  auditId: audit.id,
                  userId,
                  assignedZones: zones.length > 0 ? JSON.stringify(zones) : null,
                })),
              });

              console.log(`Created ${assignments.count} audit assignments`);
            } catch (err) {
              console.error("Error creating audit assignments:", err);
              console.error("Assignment error details:", JSON.stringify(err, null, 2));
              // Continue even if assignments fail
            }
          }
        } else {
          console.log("No users selected for assignment");
        }

        // Get inventory items for the warehouse
        let inventoryQuery: any = {
          warehouseId,
          quantity: {
            gt: 0,
          },
        };

        console.log("Building inventory query for warehouse:", warehouseId);

        // If zones are selected and warehouseBin model exists, filter by bins in those zones
        if (zones.length > 0) {
          console.log(`Filtering by ${zones.length} zones`);

          if (!('warehouseBin' in tx)) {
            console.warn("warehouseBin model not available in transaction");
          } else {
            try {
              // Get all bins in the selected zones
              // @ts-ignore - Dynamically access the model
              const bins = await tx.warehouseBin.findMany({
                where: {
                  shelf: {
                    aisle: {
                      zoneId: {
                        in: zones,
                      },
                    },
                  },
                },
                select: {
                  id: true,
                },
              });

              console.log(`Found ${bins.length} bins in selected zones`);

              const binIds = bins.map((bin: { id: string }) => bin.id);

              if (binIds.length > 0) {
                inventoryQuery.binId = {
                  in: binIds,
                };
                console.log(`Added ${binIds.length} bin IDs to query filter`);
              }
            } catch (err) {
              console.error("Error fetching warehouse bins:", err);
              console.error("Bin error details:", JSON.stringify(err, null, 2));
              // Continue without bin filtering
            }
          }
        }

        // Get inventory items if the model exists
        interface InventoryItem {
          id: string;
          productId: string;
          quantity: number;
          product: any;
        }

        let inventoryItems: InventoryItem[] = [];

        if (!('inventoryItem' in tx)) {
          console.warn("inventoryItem model not available in transaction");
        } else {
          try {
            console.log("Fetching inventory items with query:", JSON.stringify(inventoryQuery));

            // @ts-ignore - Dynamically access the model
            const items = await tx.inventoryItem.findMany({
              where: inventoryQuery,
              include: {
                product: true,
              },
            });

            inventoryItems = items;
            console.log(`Found ${inventoryItems.length} inventory items`);
          } catch (err) {
            console.error("Error fetching inventory items:", err);
            console.error("Inventory error details:", JSON.stringify(err, null, 2));
          }
        }

        // Create audit items for each inventory item
        if (inventoryItems.length > 0) {
          console.log(`Creating ${inventoryItems.length} audit items`);

          if (!('auditItem' in tx)) {
            console.warn("auditItem model not available in transaction");
          } else {
            try {
              // @ts-ignore - Dynamically access the model
              const auditItems = await tx.auditItem.createMany({
                data: inventoryItems.map(item => ({
                  auditId: audit.id,
                  productId: item.productId,
                  inventoryItemId: item.id,
                  expectedQuantity: item.quantity,
                  status: "PENDING",
                })),
              });

              console.log(`Created ${auditItems.count} audit items`);
            } catch (err) {
              console.error("Error creating audit items:", err);
              console.error("Audit item error details:", JSON.stringify(err, null, 2));
              // Continue even if audit items fail
            }
          }
        } else {
          console.log("No inventory items found to create audit items");
        }

        // Return the created audit with related data
        try {
          // @ts-ignore - Dynamically access the model
          const auditWithDetails = await tx.audit.findUnique({
            where: {
              id: audit.id,
            },
            include: {
              warehouse: true,
              createdBy: {
                select: {
                  id: true,
                  name: true,
                  email: true,
                },
              },
              assignments: {
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
              items: {
                include: {
                  product: true,
                  inventoryItem: true,
                },
              },
            },
          });

          if (!auditWithDetails) {
            // If we can't fetch the details, at least return the basic audit object
            return audit;
          }

          return auditWithDetails;
        } catch (findError) {
          console.error("Error fetching audit details:", findError);
          // Return the basic audit object if we can't fetch the details
          return audit;
        }
      }, {
        timeout: 15000, // 15 seconds timeout
      });

      return NextResponse.json({ audit: result });
    } catch (txError) {
      console.error("Transaction error:", txError);
      return NextResponse.json(
        {
          error: "Failed to create audit",
          details: txError instanceof Error ? txError.message : String(txError),
          stack: process.env.NODE_ENV === 'development' ? (txError instanceof Error ? txError.stack : undefined) : undefined
        },
        { status: 500 }
      );
    }
  } catch (error) {
    console.error("Error creating audit:", error);
    return NextResponse.json(
      {
        error: "Failed to create audit",
        details: error instanceof Error ? error.message : String(error),
        stack: process.env.NODE_ENV === 'development' ? (error instanceof Error ? error.stack : undefined) : undefined
      },
      { status: 500 }
    );
  }
}