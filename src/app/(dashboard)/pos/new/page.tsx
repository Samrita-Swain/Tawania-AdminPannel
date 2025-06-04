import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { redirect } from "next/navigation";
import { POSInterface } from "../_components/pos-interface";

// Import prisma with a try-catch to handle cases where it might not be available
let prisma;
try {
  prisma = require("@/lib/prisma").prisma;
} catch (error) {
  console.error("Failed to import Prisma:", error);
  // We'll handle this case in the component
}

// Define TaxRate interface instead of importing it
interface TaxRate {
  id: string;
  name: string;
  rate: number;
  isDefault: boolean;
  isActive: boolean;
  createdAt: Date;
  updatedAt: Date;
}

export default async function NewPOSPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined };
}) {
  const session = await getServerSession(authOptions);

  if (!session?.user) {
    redirect("/auth/signin");
  }

  // Get store ID from query params or use the first active store
  let storeId = searchParams.store as string | undefined;

  // Get all active stores
  let stores = [];
  try {
    if (prisma && typeof prisma.store?.findMany === 'function') {
      stores = await prisma.store.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          // Only include fields we know exist in the schema
        },
        orderBy: { name: 'asc' },
      });
    } else {
      console.warn("Prisma client or store model not available");
      stores = [{ id: "default-store", name: "Main Store" }];
    }
  } catch (error) {
    console.error("Error fetching stores:", error);
    // Provide default store if query fails
    stores = [{ id: "default-store", name: "Main Store" }];
  }

  // If no store ID provided or invalid, use the first store
  if (!storeId || !stores.some(store => store.id === storeId)) {
    if (stores.length > 0) {
      storeId = stores[0].id;
    } else {
      // No stores available
      return (
        <div className="flex h-full flex-col items-center justify-center">
          <h1 className="text-2xl font-bold text-gray-800">No Stores Available</h1>
          <p className="mt-2 text-gray-800">Please create a store before using the POS system.</p>
        </div>
      );
    }
  }

  // Get store details
  let store;
  try {
    if (prisma && typeof prisma.store?.findUnique === 'function') {
      store = await prisma.store.findUnique({
        where: { id: storeId },
        select: {
          id: true,
          name: true,
          // Only include fields we know exist in the schema
        },
      });
    } else {
      console.warn("Prisma client or store model not available");
      // Use the first store from the list as fallback
      store = stores[0];
    }
  } catch (error) {
    console.error("Error fetching store details:", error);
    // Use the first store from the list as fallback
    store = stores[0];
  }

  if (!store) {
    // If we still don't have a store, create a default one
    store = { id: "default-store", name: "Main Store" };
  }

  // Get all active customers for dropdown
  let customers = [];
  try {
    if (prisma && typeof prisma.customer?.findMany === 'function') {
      // Use a more specific select to avoid schema mismatches
      customers = await prisma.customer.findMany({
        where: { isActive: true },
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          // Only include fields we know exist in the schema
        },
        orderBy: { name: 'asc' },
      });
    } else {
      console.warn("Prisma client or customer model not available");
      // Provide empty array if Prisma is not available
      customers = [];
    }
  } catch (error) {
    console.error("Error fetching customers:", error);
    // Provide empty array if query fails
    customers = [];
  }

  // Get all products with inventory in this store
  let productsWithInventory = [];
  try {
    if (prisma && typeof prisma.inventoryItem?.findMany === 'function') {
      productsWithInventory = await prisma.inventoryItem.findMany({
        where: {
          storeId: storeId,
          quantity: { gt: 0 },
          status: "AVAILABLE",
        },
        select: {
          id: true,
          storeId: true,
          productId: true,
          quantity: true,
          reservedQuantity: true,
          costPrice: true,
          retailPrice: true,
          status: true,
          product: {
            select: {
              id: true,
              name: true,
              sku: true,
              description: true,
              unit: true,
              barcode: true,
              // Removed category relation to avoid schema issues
            }
          }
        },
        orderBy: [
          { product: { name: 'asc' } },
        ],
      });
    } else {
      console.warn("Prisma client or inventoryItem model not available");
      // Provide empty array if Prisma is not available
      productsWithInventory = [];
    }
  } catch (error) {
    console.error("Error fetching inventory items:", error);
    // Provide empty array if query fails
    productsWithInventory = [];
  }

  // Get tax rates - using a different approach since taxRate model might not exist
  let taxRates: TaxRate[] = [];
  try {
    if (prisma && typeof prisma.taxRate?.findMany === 'function') {
      // @ts-ignore - Dynamically access the model if it exists
      taxRates = await prisma.taxRate.findMany({
        where: { isActive: true },
        orderBy: { name: 'asc' },
      });
    } else {
      console.warn("Prisma client or taxRate model not available");
      // Provide a default tax rate if Prisma is not available
      taxRates = [{
        id: 'default',
        name: 'Standard Rate',
        rate: 0.1, // 10% default
        isDefault: true,
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date()
      }];
    }
  } catch (error) {
    console.error("Error fetching tax rates:", error);
    // Provide a default tax rate if none exists
    taxRates = [{
      id: 'default',
      name: 'Standard Rate',
      rate: 0.1, // 10% default
      isDefault: true,
      isActive: true,
      createdAt: new Date(),
      updatedAt: new Date()
    }];
  }

  // Default tax rate
  const defaultTaxRate = taxRates.find((tax: TaxRate) => tax.isDefault) || taxRates[0] || {
    id: 'none',
    rate: 0,
    name: 'No Tax',
    isDefault: false,
    isActive: true,
    createdAt: new Date(),
    updatedAt: new Date()
  };

  // Filter out inventory items with null storeId to match the expected type
  const validInventoryItems = productsWithInventory.filter(
    (item): item is typeof item & { storeId: string } => item.storeId !== null
  );



  return (
    <div className="h-full">

      <POSInterface
        store={store}
        stores={stores}
        customers={customers}
        inventoryItems={validInventoryItems}
        taxRates={taxRates}
        defaultTaxRate={defaultTaxRate}
        userId={session.user.id}
      />
    </div>
  );
}
