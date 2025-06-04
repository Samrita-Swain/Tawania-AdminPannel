-- Add new enums for warehouse movement tracking
CREATE TYPE "MovementType" AS ENUM ('INWARD', 'OUTWARD');
CREATE TYPE "MovementStatus" AS ENUM ('PENDING', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED');

-- Create WarehouseMovement table
CREATE TABLE "WarehouseMovement" (
    "id" TEXT NOT NULL,
    "referenceNumber" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "movementType" "MovementType" NOT NULL,
    "status" "MovementStatus" NOT NULL DEFAULT 'PENDING',
    "sourceType" TEXT,
    "sourceId" TEXT,
    "totalItems" INTEGER NOT NULL DEFAULT 0,
    "totalValue" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "notes" TEXT,
    "processedById" TEXT,
    "processedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseMovement_pkey" PRIMARY KEY ("id")
);

-- Create WarehouseMovementItem table
CREATE TABLE "WarehouseMovementItem" (
    "id" TEXT NOT NULL,
    "movementId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "inventoryItemId" TEXT,
    "quantity" INTEGER NOT NULL,
    "unitCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalCost" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "condition" "ProductCondition" NOT NULL DEFAULT 'NEW',
    "batchNumber" TEXT,
    "expiryDate" TIMESTAMP(3),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WarehouseMovementItem_pkey" PRIMARY KEY ("id")
);

-- Create StockStatus table
CREATE TABLE "StockStatus" (
    "id" TEXT NOT NULL,
    "warehouseId" TEXT NOT NULL,
    "productId" TEXT NOT NULL,
    "currentStock" INTEGER NOT NULL DEFAULT 0,
    "reservedStock" INTEGER NOT NULL DEFAULT 0,
    "availableStock" INTEGER NOT NULL DEFAULT 0,
    "outOfStock" BOOLEAN NOT NULL DEFAULT false,
    "lastMovementAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "StockStatus_pkey" PRIMARY KEY ("id")
);

-- Create unique indexes
CREATE UNIQUE INDEX "WarehouseMovement_referenceNumber_key" ON "WarehouseMovement"("referenceNumber");
CREATE UNIQUE INDEX "StockStatus_warehouseId_productId_key" ON "StockStatus"("warehouseId", "productId");

-- Add foreign key constraints
ALTER TABLE "WarehouseMovement" ADD CONSTRAINT "WarehouseMovement_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WarehouseMovementItem" ADD CONSTRAINT "WarehouseMovementItem_movementId_fkey" FOREIGN KEY ("movementId") REFERENCES "WarehouseMovement"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WarehouseMovementItem" ADD CONSTRAINT "WarehouseMovementItem_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "WarehouseMovementItem" ADD CONSTRAINT "WarehouseMovementItem_inventoryItemId_fkey" FOREIGN KEY ("inventoryItemId") REFERENCES "InventoryItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "StockStatus" ADD CONSTRAINT "StockStatus_warehouseId_fkey" FOREIGN KEY ("warehouseId") REFERENCES "Warehouse"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

ALTER TABLE "StockStatus" ADD CONSTRAINT "StockStatus_productId_fkey" FOREIGN KEY ("productId") REFERENCES "Product"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
