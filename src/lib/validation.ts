import { z } from "zod";

// Product validation schema
export const productSchema = z.object({
  name: z.string().min(1, "Product name is required"),
  sku: z.string().min(1, "SKU is required"),
  description: z.string().optional(),
  categoryId: z.string().optional(),
  costPrice: z.number().min(0, "Cost price must be a positive number"),
  retailPrice: z.number().min(0, "Retail price must be a positive number"),
  minStockLevel: z.number().min(0, "Minimum stock level must be a positive number"),
  reorderPoint: z.number().min(0, "Reorder point must be a positive number"),
  isActive: z.boolean().default(true),
});

// Store validation schema
export const storeSchema = z.object({
  name: z.string().min(1, "Store name is required"),
  code: z.string().min(1, "Store code is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  openingHours: z.string().optional(),
  isActive: z.boolean().default(true),
});

// Warehouse validation schema
export const warehouseSchema = z.object({
  name: z.string().min(1, "Warehouse name is required"),
  code: z.string().min(1, "Warehouse code is required"),
  address: z.string().optional(),
  phone: z.string().optional(),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  isActive: z.boolean().default(true),
});

// Transfer validation schema
export const transferSchema = z.object({
  fromWarehouseId: z.string().optional(),
  fromStoreId: z.string().optional(),
  toWarehouseId: z.string().optional(),
  toStoreId: z.string().optional(),
  transferType: z.enum(["RESTOCK", "RETURN", "TRANSFER", "ADJUSTMENT"]),
  priority: z.enum(["LOW", "NORMAL", "HIGH", "URGENT"]),
  requestedDate: z.date(),
  expectedDeliveryDate: z.date().optional(),
  notes: z.string().optional(),
}).refine(
  data => (data.fromWarehouseId || data.fromStoreId) && (data.toWarehouseId || data.toStoreId),
  {
    message: "Source and destination are required",
    path: ["fromWarehouseId"],
  }
).refine(
  data => {
    // Check that source and destination are different
    if (data.fromWarehouseId && data.toWarehouseId) {
      return data.fromWarehouseId !== data.toWarehouseId;
    }
    if (data.fromStoreId && data.toStoreId) {
      return data.fromStoreId !== data.toStoreId;
    }
    return true;
  },
  {
    message: "Source and destination cannot be the same",
    path: ["toWarehouseId"],
  }
);

// Transfer item validation schema
export const transferItemSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  sourceCostPrice: z.number().min(0, "Cost price must be a positive number"),
  sourceRetailPrice: z.number().min(0, "Retail price must be a positive number"),
  targetCostPrice: z.number().min(0, "Target cost price must be a positive number"),
  targetRetailPrice: z.number().min(0, "Target retail price must be a positive number"),
  adjustmentReason: z.string().optional(),
  notes: z.string().optional(),
});

// POS checkout validation schema
export const checkoutSchema = z.object({
  storeId: z.string().min(1, "Store is required"),
  customerId: z.string().optional(),
  items: z.array(z.object({
    productId: z.string().min(1, "Product is required"),
    inventoryItemId: z.string().min(1, "Inventory item is required"),
    quantity: z.number().min(1, "Quantity must be at least 1"),
    unitPrice: z.number().min(0, "Unit price must be a positive number"),
    discountAmount: z.number().min(0, "Discount must be a positive number").default(0),
  })).min(1, "At least one item is required"),
  subtotalAmount: z.number().min(0, "Subtotal must be a positive number"),
  taxAmount: z.number().min(0, "Tax must be a positive number").default(0),
  discountAmount: z.number().min(0, "Discount must be a positive number").default(0),
  totalAmount: z.number().min(0, "Total must be a positive number"),
  paymentMethod: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "MOBILE_PAYMENT", "OTHER"]),
  amountPaid: z.number().min(0, "Amount paid must be a positive number"),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
  applyLoyaltyPoints: z.boolean().default(false),
  loyaltyPointsUsed: z.number().min(0, "Loyalty points must be a positive number").default(0),
});

// Payment validation schema
export const paymentSchema = z.object({
  saleId: z.string().min(1, "Sale is required"),
  amount: z.number().min(0.01, "Amount must be greater than 0"),
  paymentMethod: z.enum(["CASH", "CREDIT_CARD", "DEBIT_CARD", "MOBILE_PAYMENT", "OTHER"]),
  referenceNumber: z.string().optional(),
  notes: z.string().optional(),
});

// Customer validation schema
export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address").optional().or(z.literal("")),
  phone: z.string().optional(),
  address: z.string().optional(),
  loyaltyPoints: z.number().min(0, "Loyalty points must be a positive number").default(0),
  isActive: z.boolean().default(true),
});

// User validation schema
export const userSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(8, "Password must be at least 8 characters").optional(),
  role: z.enum(["ADMIN", "MANAGER", "WAREHOUSE_MANAGER", "WAREHOUSE_STAFF", "STORE_MANAGER", "STORE_STAFF", "STAFF"]),
  isActive: z.boolean().default(true),
});

// Inventory adjustment validation schema
export const inventoryAdjustmentSchema = z.object({
  productId: z.string().min(1, "Product is required"),
  adjustmentType: z.enum(["add", "remove", "set"]),
  quantity: z.number().min(1, "Quantity must be at least 1"),
  reason: z.enum(["RESTOCK", "SALE", "RETURN", "DAMAGED", "EXPIRED", "THEFT", "CORRECTION", "OTHER"]),
  notes: z.string().optional(),
});

// Helper function to validate data against a schema
export function validateData<T>(schema: z.ZodType<T>, data: unknown): { success: true; data: T } | { success: false; error: z.ZodError } {
  try {
    const validatedData = schema.parse(data);
    return { success: true, data: validatedData };
  } catch (error) {
    if (error instanceof z.ZodError) {
      return { success: false, error };
    }
    throw error;
  }
}

// Helper function to get formatted error messages from a ZodError
export function getErrorMessages(error: z.ZodError): Record<string, string> {
  const errors: Record<string, string> = {};
  
  error.errors.forEach((err) => {
    const path = err.path.join(".");
    errors[path] = err.message;
  });
  
  return errors;
}
