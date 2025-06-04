const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function setupWarehouseManagement() {
  try {
    console.log('Setting up warehouse management system...');

    // Check if we have any warehouses
    const warehouses = await prisma.warehouse.findMany();
    if (warehouses.length === 0) {
      console.log('Creating sample warehouse...');
      await prisma.warehouse.create({
        data: {
          name: 'Main Warehouse',
          code: 'WH-001',
          address: '123 Warehouse Street, Industrial Area',
          contactPerson: 'John Doe',
          phone: '+1-234-567-8900',
          email: 'warehouse@company.com',
          isActive: true,
        },
      });
    }

    // Check if we have any products
    const products = await prisma.product.findMany();
    if (products.length === 0) {
      console.log('Creating sample products...');
      
      // Create categories first
      const category = await prisma.category.create({
        data: {
          name: 'Electronics',
          description: 'Electronic products',
        },
      });

      // Create sample products
      const sampleProducts = [
        {
          name: 'Laptop Computer',
          sku: 'LAP-001',
          barcode: '1234567890123',
          description: 'High-performance laptop',
          costPrice: 800,
          wholesalePrice: 900,
          retailPrice: 1200,
          unit: 'piece',
          reorderPoint: 5,
          minStockLevel: 2,
          categoryId: category.id,
        },
        {
          name: 'Wireless Mouse',
          sku: 'MOU-001',
          barcode: '1234567890124',
          description: 'Wireless optical mouse',
          costPrice: 20,
          wholesalePrice: 25,
          retailPrice: 35,
          unit: 'piece',
          reorderPoint: 20,
          minStockLevel: 10,
          categoryId: category.id,
        },
        {
          name: 'USB Cable',
          sku: 'CAB-001',
          barcode: '1234567890125',
          description: 'USB Type-C cable',
          costPrice: 5,
          wholesalePrice: 8,
          retailPrice: 15,
          unit: 'piece',
          reorderPoint: 50,
          minStockLevel: 25,
          categoryId: category.id,
        },
      ];

      for (const productData of sampleProducts) {
        await prisma.product.create({ data: productData });
      }
    }

    // Get warehouse and products for sample data
    const warehouse = await prisma.warehouse.findFirst();
    const productList = await prisma.product.findMany();

    if (warehouse && productList.length > 0) {
      console.log('Creating sample warehouse movements...');

      // Create sample inward movements
      const inwardMovement = await prisma.warehouseMovement.create({
        data: {
          referenceNumber: `INW-${Date.now()}`,
          warehouseId: warehouse.id,
          movementType: 'INWARD',
          status: 'COMPLETED',
          sourceType: 'PURCHASE_ORDER',
          totalItems: 100,
          totalValue: 5000,
          notes: 'Initial stock receipt',
          processedAt: new Date(),
          items: {
            create: productList.map((product, index) => ({
              productId: product.id,
              quantity: 20 + (index * 10),
              unitCost: product.costPrice,
              totalCost: (20 + (index * 10)) * product.costPrice,
              condition: 'NEW',
            })),
          },
        },
      });

      // Create sample outward movement
      const outwardMovement = await prisma.warehouseMovement.create({
        data: {
          referenceNumber: `OUT-${Date.now()}`,
          warehouseId: warehouse.id,
          movementType: 'OUTWARD',
          status: 'COMPLETED',
          sourceType: 'TRANSFER',
          totalItems: 30,
          totalValue: 1500,
          notes: 'Transfer to store',
          processedAt: new Date(),
          items: {
            create: productList.slice(0, 2).map((product, index) => ({
              productId: product.id,
              quantity: 10 + (index * 5),
              unitCost: product.costPrice,
              totalCost: (10 + (index * 5)) * product.costPrice,
              condition: 'NEW',
            })),
          },
        },
      });

      console.log('Creating sample stock status records...');

      // Create stock status for each product
      for (const product of productList) {
        const currentStock = Math.floor(Math.random() * 50) + 10; // Random stock between 10-60
        const reservedStock = Math.floor(Math.random() * 5); // Random reserved 0-5
        const availableStock = currentStock - reservedStock;
        const outOfStock = availableStock <= 0;

        await prisma.stockStatus.create({
          data: {
            warehouseId: warehouse.id,
            productId: product.id,
            currentStock,
            reservedStock,
            availableStock,
            outOfStock,
            lastMovementAt: new Date(),
          },
        });
      }

      // Create some out-of-stock items
      const outOfStockProduct = await prisma.product.create({
        data: {
          name: 'Out of Stock Item',
          sku: 'OOS-001',
          barcode: '1234567890126',
          description: 'This item is out of stock',
          costPrice: 100,
          wholesalePrice: 120,
          retailPrice: 150,
          unit: 'piece',
          reorderPoint: 10,
          minStockLevel: 5,
          categoryId: productList[0].categoryId,
        },
      });

      await prisma.stockStatus.create({
        data: {
          warehouseId: warehouse.id,
          productId: outOfStockProduct.id,
          currentStock: 0,
          reservedStock: 0,
          availableStock: 0,
          outOfStock: true,
          lastMovementAt: new Date(Date.now() - 86400000), // Yesterday
        },
      });

      console.log('Sample data created successfully!');
      console.log(`Created warehouse: ${warehouse.name}`);
      console.log(`Created ${productList.length + 1} products`);
      console.log(`Created 2 warehouse movements`);
      console.log(`Created ${productList.length + 1} stock status records`);
    }

    console.log('Warehouse management setup completed!');
  } catch (error) {
    console.error('Error setting up warehouse management:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupWarehouseManagement();
