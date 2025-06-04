import { prisma } from "@/lib/prisma";
import { cache } from "react";

/**
 * Get all suppliers
 */
export const getSuppliers = cache(async () => {
  try {
    const suppliers = await prisma.supplier.findMany({
      where: {
        isActive: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return suppliers;
  } catch (error) {
    console.error("Error fetching suppliers:", error);
    return [];
  }
});

/**
 * Get a single supplier by ID
 */
export const getSupplier = cache(async (id: string) => {
  try {
    const supplier = await prisma.supplier.findUnique({
      where: {
        id,
      },
      include: {
        products: true,
      },
    });

    return supplier;
  } catch (error) {
    console.error(`Error fetching supplier with ID ${id}:`, error);
    return null;
  }
});

/**
 * Get supplier products
 */
export const getSupplierProducts = cache(async (supplierId: string) => {
  try {
    const products = await prisma.product.findMany({
      where: {
        supplierId,
        isActive: true,
      },
      include: {
        category: true,
      },
      orderBy: {
        name: "asc",
      },
    });

    return products;
  } catch (error) {
    console.error(`Error fetching products for supplier ${supplierId}:`, error);
    return [];
  }
});

/**
 * Get supplier purchase orders (if the model exists)
 */
export const getSupplierPurchaseOrders = cache(async (supplierId: string) => {
  try {
    // Check if the model exists in the Prisma client
    if ('purchaseOrder' in prisma) {
      // @ts-ignore - Dynamically access the model
      const purchaseOrders = await prisma.purchaseOrder.findMany({
        where: {
          supplierId,
        },
        include: {
          items: {
            include: {
              product: true,
            },
          },
          warehouse: true,
        },
        orderBy: {
          orderDate: "desc",
        },
      });

      return purchaseOrders;
    }

    return [];
  } catch (error) {
    console.error(`Error fetching purchase orders for supplier ${supplierId}:`, error);
    return [];
  }
});
