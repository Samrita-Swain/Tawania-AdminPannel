import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function checkPOSData() {
  console.log('=== CHECKING POS DATA ===\n');

  try {
    console.log('1. STORES:');
    const stores = await prisma.store.findMany({
      where: { isActive: true },
      select: { id: true, name: true }
    });
    console.log(stores);

    console.log('\n2. PRODUCTS:');
    const products = await prisma.product.findMany({
      where: { isActive: true },
      select: { id: true, name: true, sku: true, retailPrice: true }
    });
    console.log(products);

    console.log('\n3. INVENTORY ITEMS (Store):');
    const storeInventory = await prisma.inventoryItem.findMany({
      where: {
        storeId: { not: null },
        quantity: { gt: 0 },
        status: 'AVAILABLE'
      },
      select: {
        id: true,
        storeId: true,
        quantity: true,
        retailPrice: true,
        product: {
          select: { name: true, sku: true }
        }
      }
    });
    console.log(storeInventory);

    console.log('\n4. INVENTORY ITEMS (Warehouse):');
    const warehouseInventory = await prisma.inventoryItem.findMany({
      where: {
        warehouseId: { not: null },
        quantity: { gt: 0 },
        status: 'AVAILABLE'
      },
      select: {
        id: true,
        warehouseId: true,
        quantity: true,
        retailPrice: true,
        product: {
          select: { name: true, sku: true }
        }
      }
    });
    console.log(warehouseInventory);

    // Check if we need to move inventory from warehouse to store
    if (storeInventory.length === 0 && warehouseInventory.length > 0) {
      console.log('\n⚠️  NO STORE INVENTORY FOUND! Moving some items from warehouse to store...');
      
      const firstStore = stores[0];
      if (firstStore) {
        // Move some inventory from warehouse to store
        for (const item of warehouseInventory.slice(0, 3)) {
          await prisma.inventoryItem.create({
            data: {
              productId: item.product.sku === 'PROD-3037' ? (await prisma.product.findUnique({ where: { sku: 'PROD-3037' } }))?.id || '' :
                        item.product.sku === 'PROD-3038' ? (await prisma.product.findUnique({ where: { sku: 'PROD-3038' } }))?.id || '' :
                        item.product.sku === 'PROD-3039' ? (await prisma.product.findUnique({ where: { sku: 'PROD-3039' } }))?.id || '' :
                        (await prisma.product.findFirst({ where: { name: item.product.name } }))?.id || '',
              storeId: firstStore.id,
              quantity: 25,
              retailPrice: item.retailPrice,
              costPrice: item.retailPrice ? item.retailPrice * 0.6 : 0,
              status: 'AVAILABLE'
            }
          });
          console.log(`✅ Added ${item.product.name} to store ${firstStore.name}`);
        }
      }
    }

    console.log('\n=== FINAL CHECK ===');
    const finalStoreInventory = await prisma.inventoryItem.findMany({
      where: {
        storeId: { not: null },
        quantity: { gt: 0 },
        status: 'AVAILABLE'
      },
      select: {
        id: true,
        storeId: true,
        quantity: true,
        retailPrice: true,
        product: {
          select: { name: true, sku: true }
        }
      }
    });
    console.log('Store inventory count:', finalStoreInventory.length);
    console.log(finalStoreInventory);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkPOSData();
