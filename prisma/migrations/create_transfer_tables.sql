-- Create Transfer Tables for Neon DB
-- This creates a clean, working transfer system

-- Create transfers table
CREATE TABLE IF NOT EXISTS "Transfer" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferNumber" TEXT NOT NULL UNIQUE,
    "fromWarehouseId" TEXT,
    "fromStoreId" TEXT,
    "toWarehouseId" TEXT,
    "toStoreId" TEXT,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "transferType" TEXT NOT NULL DEFAULT 'RESTOCK',
    "priority" TEXT NOT NULL DEFAULT 'NORMAL',
    "requestedById" TEXT,
    "approvedById" TEXT,
    "rejectedById" TEXT,
    "completedById" TEXT,
    "requestedDate" TIMESTAMP,
    "approvedDate" TIMESTAMP,
    "rejectedDate" TIMESTAMP,
    "completedDate" TIMESTAMP,
    "expectedDeliveryDate" TIMESTAMP,
    "actualDeliveryDate" TIMESTAMP,
    "shippingMethod" TEXT,
    "trackingNumber" TEXT,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalCost" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "totalRetail" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "rejectionReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create transfer items table
CREATE TABLE IF NOT EXISTS "TransferItem" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "transferId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL,
    "sourceCostPrice" DECIMAL(10,2) NOT NULL,
    "sourceRetailPrice" DECIMAL(10,2) NOT NULL,
    "targetCostPrice" DECIMAL(10,2) NOT NULL,
    "targetRetailPrice" DECIMAL(10,2) NOT NULL,
    "condition" TEXT NOT NULL DEFAULT 'NEW',
    "adjustmentReason" TEXT,
    "notes" TEXT,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY ("transferId") REFERENCES "Transfer"("id") ON DELETE CASCADE
);

-- Create indexes for better performance
CREATE INDEX IF NOT EXISTS "Transfer_transferNumber_idx" ON "Transfer"("transferNumber");
CREATE INDEX IF NOT EXISTS "Transfer_status_idx" ON "Transfer"("status");
CREATE INDEX IF NOT EXISTS "Transfer_transferType_idx" ON "Transfer"("transferType");
CREATE INDEX IF NOT EXISTS "Transfer_fromWarehouseId_idx" ON "Transfer"("fromWarehouseId");
CREATE INDEX IF NOT EXISTS "Transfer_toStoreId_idx" ON "Transfer"("toStoreId");
CREATE INDEX IF NOT EXISTS "Transfer_createdAt_idx" ON "Transfer"("createdAt");

CREATE INDEX IF NOT EXISTS "TransferItem_transferId_idx" ON "TransferItem"("transferId");
CREATE INDEX IF NOT EXISTS "TransferItem_productId_idx" ON "TransferItem"("productId");

-- Insert sample data for testing
INSERT INTO "Transfer" (
    "id",
    "transferNumber", 
    "fromWarehouseId", 
    "toStoreId", 
    "status", 
    "transferType", 
    "priority",
    "totalItems",
    "totalCost",
    "totalRetail",
    "notes",
    "requestedDate"
) VALUES 
(
    'sample-transfer-1',
    'TRF-20241201-0001',
    'warehouse-1',
    'store-1',
    'DRAFT',
    'RESTOCK',
    'NORMAL',
    0,
    0.00,
    0.00,
    'Sample transfer for testing',
    CURRENT_TIMESTAMP
) ON CONFLICT ("id") DO NOTHING;

-- Create a simple warehouse if it doesn't exist
CREATE TABLE IF NOT EXISTS "Warehouse" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create a simple store if it doesn't exist
CREATE TABLE IF NOT EXISTS "Store" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "code" TEXT,
    "address" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Create a simple product if it doesn't exist
CREATE TABLE IF NOT EXISTS "Product" (
    "id" TEXT NOT NULL PRIMARY KEY,
    "name" TEXT NOT NULL,
    "sku" TEXT NOT NULL UNIQUE,
    "description" TEXT,
    "costPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "wholesalePrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "retailPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
    "unit" TEXT NOT NULL DEFAULT 'pcs',
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Insert sample warehouse
INSERT INTO "Warehouse" ("id", "name", "code", "address") VALUES 
('warehouse-1', 'Main Warehouse', 'WH001', '123 Warehouse St') ON CONFLICT ("id") DO NOTHING;

-- Insert sample store
INSERT INTO "Store" ("id", "name", "code", "address") VALUES 
('store-1', 'Downtown Store', 'ST001', '456 Store Ave') ON CONFLICT ("id") DO NOTHING;

-- Insert sample product
INSERT INTO "Product" ("id", "name", "sku", "description", "costPrice", "wholesalePrice", "retailPrice", "unit") VALUES 
('product-1', 'Sample Product', 'SKU001', 'A sample product for testing', 10.00, 15.00, 20.00, 'pcs') ON CONFLICT ("id") DO NOTHING;
