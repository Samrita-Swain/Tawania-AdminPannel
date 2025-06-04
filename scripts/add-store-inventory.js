const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function addStoreInventory() {
  try {
    console.log('Adding inventory to store...');

    // Get the first active store
    const store = await prisma.store.findFirst({
      where: { isActive: true }
    });

    if (!store) {
      console.log('No active store found!');
      return;
    }

    console.log('Found store:', store.name);

    // Get some products
    const products = await prisma.product.findMany({
      where: { isActive: true },
      take: 5
    });

    console.log('Found products:', products.length);

    // Add inventory for each product
    for (const product of products) {
      // Check if inventory already exists for this product in this store
      const existingInventory = await prisma.inventoryItem.findFirst({
        where: {
          productId: product.id,
          storeId: store.id
        }
      });

      if (!existingInventory) {
        await prisma.inventoryItem.create({
          data: {
            productId: product.id,
            storeId: store.id,
            quantity: 50,
            retailPrice: product.retailPrice || 100,
            costPrice: product.costPrice || 60,
            status: 'AVAILABLE'
          }
        });
        console.log(`✅ Added inventory for ${product.name}`);
      } else {
        console.log(`⚠️  Inventory already exists for ${product.name}`);
      }
    }

    // Check final inventory
    const finalInventory = await prisma.inventoryItem.findMany({
      where: {
        storeId: store.id,
        quantity: { gt: 0 },
        status: 'AVAILABLE'
      },
      include: {
        product: {
          select: { name: true, sku: true }
        }
      }
    });

    console.log('\nFinal store inventory:');
    finalInventory.forEach(item => {
      console.log(`- ${item.product.name} (${item.product.sku}): ${item.quantity} units @ $${item.retailPrice}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

addStoreInventory();
