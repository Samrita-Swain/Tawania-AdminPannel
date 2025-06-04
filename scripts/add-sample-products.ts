import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function addSampleProducts() {
  console.log('Adding sample products with prices...');

  try {
    // Get the first store and warehouse for inventory
    const store = await prisma.store.findFirst({
      where: { isActive: true }
    });

    const warehouse = await prisma.warehouse.findFirst();

    if (!store) {
      console.error('No active store found. Please run the seed script first.');
      return;
    }

    // Sample products with Indian prices
    const sampleProducts = [
      {
        name: 'Jeans',
        sku: 'PROD-3037',
        description: 'Premium quality denim jeans',
        costPrice: 800,
        retailPrice: 1500,
        unit: 'each',
        minStockLevel: 10,
        reorderPoint: 5,
      },
      {
        name: 'Cotton T-Shirt',
        sku: 'PROD-3038',
        description: 'Comfortable cotton t-shirt',
        costPrice: 200,
        retailPrice: 450,
        unit: 'each',
        minStockLevel: 20,
        reorderPoint: 10,
      },
      {
        name: 'Formal Shirt',
        sku: 'PROD-3039',
        description: 'Professional formal shirt',
        costPrice: 600,
        retailPrice: 1200,
        unit: 'each',
        minStockLevel: 15,
        reorderPoint: 8,
      },
      {
        name: 'Sneakers',
        sku: 'PROD-3040',
        description: 'Comfortable sports sneakers',
        costPrice: 1200,
        retailPrice: 2500,
        unit: 'pair',
        minStockLevel: 8,
        reorderPoint: 4,
      },
      {
        name: 'Leather Belt',
        sku: 'PROD-3041',
        description: 'Genuine leather belt',
        costPrice: 300,
        retailPrice: 750,
        unit: 'each',
        minStockLevel: 12,
        reorderPoint: 6,
      }
    ];

    for (const productData of sampleProducts) {
      // Check if product already exists
      const existingProduct = await prisma.product.findUnique({
        where: { sku: productData.sku }
      });

      if (existingProduct) {
        console.log(`Product ${productData.sku} already exists, skipping...`);
        continue;
      }

      // Create the product
      const product = await prisma.product.create({
        data: {
          ...productData,
          isActive: true,
        }
      });

      console.log(`Created product: ${product.name} (${product.sku})`);

      // Create inventory for the store
      if (store) {
        await prisma.inventoryItem.create({
          data: {
            productId: product.id,
            storeId: store.id,
            quantity: 50, // Initial stock
            costPrice: productData.costPrice,
            retailPrice: productData.retailPrice,
            status: 'AVAILABLE',
          }
        });

        console.log(`Added inventory for ${product.name} in store ${store.name}`);
      }

      // Create inventory for the warehouse if it exists
      if (warehouse) {
        await prisma.inventoryItem.create({
          data: {
            productId: product.id,
            warehouseId: warehouse.id,
            quantity: 100, // Initial warehouse stock
            costPrice: productData.costPrice,
            retailPrice: productData.retailPrice,
            status: 'AVAILABLE',
          }
        });

        console.log(`Added inventory for ${product.name} in warehouse ${warehouse.name}`);
      }
    }

    console.log('Sample products added successfully!');
  } catch (error) {
    console.error('Error adding sample products:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addSampleProducts();
