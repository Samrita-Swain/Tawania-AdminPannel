# Warehouse Management System Setup

This document explains how to set up and use the new warehouse management system with four main features: Inwards, Outwards, Out of Stock, and Closing Stock.

## Features Overview

### 1. Inwards
- **Purpose**: Track products coming into the warehouse
- **Sources**: Purchase orders, returns, transfers, adjustments
- **Information**: Product details, quantities, supplier info, batch numbers, expiry dates
- **Status Tracking**: Pending, In Progress, Completed, Cancelled

### 2. Outwards  
- **Purpose**: Track products going out to inventory/stores
- **Destinations**: Stores, other warehouses, customers
- **Information**: Product details, quantities, destination, transfer details
- **Integration**: Links with transfer system and sales

### 3. Out of Stock
- **Purpose**: Monitor products that are finished or critically low
- **Alerts**: Automatic detection when stock reaches zero or below reorder point
- **Actions**: Quick reorder, purchase order creation, stock adjustment
- **Status**: Out of Stock, Critical, Reorder Pending

### 4. Closing Stock
- **Purpose**: Final stock status including delivered and out-of-stock items
- **Reports**: Current stock levels, stock value, location details
- **Analytics**: Category-wise summary, stock movement trends
- **Export**: Stock reports for accounting and auditing

## Database Schema

### New Tables Added:

1. **WarehouseMovement**
   - Tracks all warehouse movements (inward/outward)
   - Links to source documents (purchase orders, transfers)
   - Stores movement metadata and totals

2. **WarehouseMovementItem**
   - Individual items within each movement
   - Product details, quantities, costs, conditions
   - Batch numbers and expiry dates

3. **StockStatus**
   - Real-time stock status for each product in each warehouse
   - Current, reserved, and available stock
   - Out-of-stock flags and last movement timestamps

### New Enums:
- `MovementType`: INWARD, OUTWARD
- `MovementStatus`: PENDING, IN_PROGRESS, COMPLETED, CANCELLED

## Setup Instructions

### 1. Database Migration

Run the database migration to create new tables:

```bash
# Apply the migration
npx prisma db push

# Or run the SQL migration directly in your database
psql -d your_database -f prisma/migrations/add_warehouse_movement_tracking.sql
```

### 2. Generate Sample Data

Run the setup script to create sample data:

```bash
node scripts/setup-warehouse-management.js
```

This will create:
- Sample warehouse
- Sample products and categories
- Sample warehouse movements
- Sample stock status records
- Out-of-stock items for testing

### 3. API Endpoints

The following API endpoints are now available:

- `GET /api/warehouse/movements` - Get warehouse movements
- `POST /api/warehouse/movements` - Create new movement
- `GET /api/warehouse/stock-status` - Get stock status
- `POST /api/warehouse/stock-status` - Update stock status
- `GET /api/warehouse/dashboard` - Get warehouse dashboard data

### 4. Frontend Components

Navigate to `/warehouse/management` to access the new interface with four tabs:

1. **Inwards Tab**: View and manage incoming products
2. **Outwards Tab**: View and manage outgoing products  
3. **Out of Stock Tab**: Monitor and manage out-of-stock items
4. **Closing Stock Tab**: View final stock status and reports

## Usage Guide

### Recording Inward Movements

1. Go to Warehouse Management → Inwards
2. Click "New Inward" to record new incoming products
3. Select source type (Purchase Order, Return, etc.)
4. Add products with quantities and details
5. Save to create movement record

### Recording Outward Movements

1. Go to Warehouse Management → Outwards  
2. Click "New Transfer" to create outward movement
3. Select destination (store, warehouse, customer)
4. Add products to transfer
5. Process the transfer

### Monitoring Out of Stock

1. Go to Warehouse Management → Out of Stock
2. View items that are out of stock or critically low
3. Use "Reorder" button to create purchase orders
4. Filter by status, category, or supplier

### Viewing Closing Stock

1. Go to Warehouse Management → Closing Stock
2. View current stock levels for all products
3. Filter by category, location, or status
4. Export reports for accounting

## Data Flow

1. **Inward Movement** → Updates `WarehouseMovement` and `StockStatus`
2. **Outward Movement** → Updates `WarehouseMovement` and reduces `StockStatus`
3. **Stock Status** → Automatically calculates available stock and out-of-stock flags
4. **Closing Stock** → Real-time view of current `StockStatus` across all products

## Integration Points

- **Purchase Orders**: Automatically create inward movements when orders are received
- **Transfers**: Create outward movements when products are transferred
- **Sales**: Reduce stock when products are sold
- **Returns**: Create inward movements for returned products
- **Audits**: Compare actual vs system stock levels

## Troubleshooting

### Common Issues:

1. **API Endpoints Not Working**: Ensure database migration is complete
2. **No Data Showing**: Run the sample data setup script
3. **Stock Calculations Wrong**: Check `StockStatus` table for correct values
4. **Movement Not Recording**: Verify warehouse and product IDs exist

### Logs:

Check browser console for API call logs and error messages. The components will try multiple endpoints and show detailed error information.

## Future Enhancements

- Barcode scanning for movements
- Automated reorder point alerts
- Integration with supplier systems
- Advanced analytics and reporting
- Mobile app for warehouse staff
- Real-time stock updates via WebSocket
