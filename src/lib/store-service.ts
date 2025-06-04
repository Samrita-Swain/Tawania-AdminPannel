import { prisma } from "@/lib/prisma";

/**
 * Creates a new store with retry mechanism
 * @param storeData Store data to create
 * @param maxRetries Maximum number of retries (default: 3)
 * @returns Created store or null if failed
 */
export async function createStore(
  storeData: {
    name: string;
    code: string;
    address?: string;
    phone?: string;
    email?: string;
    openingHours?: string;
    isActive?: boolean;
  },
  maxRetries = 3
) {
  let retries = 0;
  let lastError: any = null;

  while (retries < maxRetries) {
    try {
      console.log(`Attempt ${retries + 1} to create store:`, storeData);
      
      // Check if store with this code already exists
      const existingStore = await prisma.store.findUnique({
        where: { code: storeData.code },
      });
      
      if (existingStore) {
        console.log("Store with this code already exists:", existingStore.id);
        return { 
          error: "Store code already exists",
          store: existingStore 
        };
      }
      
      // Create the store
      const store = await prisma.store.create({
        data: {
          name: storeData.name,
          code: storeData.code,
          address: storeData.address || "",
          phone: storeData.phone || "",
          email: storeData.email || "",
          openingHours: storeData.openingHours || "",
          isActive: storeData.isActive !== undefined ? storeData.isActive : true,
        },
      });
      
      console.log("Store created successfully:", store.id);
      return { store };
    } catch (error) {
      lastError = error;
      console.error(`Attempt ${retries + 1} failed:`, error);
      retries++;
      
      // Wait before retrying (exponential backoff)
      if (retries < maxRetries) {
        const delay = Math.pow(2, retries) * 1000; // 2s, 4s, 8s, etc.
        console.log(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }
  
  console.error(`Failed to create store after ${maxRetries} attempts`);
  return { 
    error: "Failed to create store after multiple attempts", 
    details: lastError?.message || String(lastError)
  };
}

/**
 * Gets a store by ID
 * @param id Store ID
 * @returns Store with related data or null if not found
 */
export async function getStoreById(id: string) {
  try {
    const store = await prisma.store.findUnique({
      where: { id },
      include: {
        inventoryItems: {
          take: 10,
          include: {
            product: true,
          },
          orderBy: {
            updatedAt: 'desc',
          },
        },
        sales: {
          take: 10,
          include: {
            customer: true,
            createdBy: true,
          },
          orderBy: {
            saleDate: 'desc',
          },
        },
        staff: {
          include: {
            user: true,
          },
        },
      },
    });

    if (!store) {
      return null;
    }

    // Get stats
    const totalInventoryItems = await prisma.inventoryItem.count({
      where: { storeId: id },
    });

    const totalSales = await prisma.sale.count({
      where: { storeId: id },
    });

    const salesData = await prisma.sale.aggregate({
      where: { storeId: id },
      _sum: {
        totalAmount: true,
      },
    });

    const totalRevenue = salesData._sum.totalAmount || 0;

    return {
      store,
      stats: {
        totalInventoryItems,
        totalSales,
        totalRevenue,
      },
    };
  } catch (error) {
    console.error("Error getting store by ID:", error);
    return null;
  }
}
