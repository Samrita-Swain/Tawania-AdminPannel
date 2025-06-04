import { prisma } from "@/lib/prisma";
import { cache } from "react";

/**
 * Get all warehouses
 */
export const getWarehouses = cache(async () => {
  try {
    const warehouses = await prisma.warehouse.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return warehouses;
  } catch (error) {
    console.error("Error fetching warehouses:", error);
    return [];
  }
});

/**
 * Get a single warehouse by ID
 */
export const getWarehouse = cache(async (id: string) => {
  try {
    const warehouse = await prisma.warehouse.findUnique({
      where: {
        id,
      },
      include: {
        zones: true,
      },
    });

    return warehouse;
  } catch (error) {
    console.error(`Error fetching warehouse with ID ${id}:`, error);
    return null;
  }
});

/**
 * Get warehouse inventory
 */
export const getWarehouseInventory = cache(async (warehouseId: string) => {
  try {
    const inventory = await prisma.inventoryItem.findMany({
      where: {
        warehouseId,
      },
      include: {
        product: {
          include: {
            category: true,
            supplier: true,
          },
        },
        warehouse: true,
        bin: {
          include: {
            shelf: {
              include: {
                aisle: {
                  include: {
                    zone: true,
                  },
                },
              },
            },
          },
        },
      },
      orderBy: {
        product: {
          name: "asc",
        },
      },
    });

    return inventory;
  } catch (error) {
    console.error(`Error fetching inventory for warehouse ${warehouseId}:`, error);
    return [];
  }
});

/**
 * Get low stock items in warehouse
 */
export const getLowStockItems = cache(async (warehouseId: string) => {
  try {
    // Use raw query to compare quantity with reorderPoint from related product
    const lowStockItems = await prisma.$queryRaw`
      SELECT i.*, p.name as productName, p.reorderPoint
      FROM "InventoryItem" i
      JOIN "Product" p ON i."productId" = p.id
      WHERE i."warehouseId" = ${warehouseId}
        AND p."reorderPoint" > 0
        AND i.quantity <= p."reorderPoint"
      ORDER BY i.quantity ASC
    ` as any[];

    return lowStockItems;
  } catch (error) {
    console.error(`Error fetching low stock items for warehouse ${warehouseId}:`, error);
    return [];
  }
});

/**
 * Get warehouse zones
 */
export const getWarehouseZones = cache(async (warehouseId: string) => {
  try {
    const zones = await prisma.warehouseZone.findMany({
      where: {
        warehouseId,
      },
      include: {
        aisles: {
          include: {
            shelves: {
              include: {
                bins: true,
              },
            },
          },
        },
      },
      orderBy: {
        name: "asc",
      },
    });

    return zones;
  } catch (error) {
    console.error(`Error fetching zones for warehouse ${warehouseId}:`, error);
    return [];
  }
});
