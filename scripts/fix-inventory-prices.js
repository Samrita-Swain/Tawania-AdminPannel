const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function fixInventoryPrices() {
  try {
    console.log('Fixing inventory prices...');

    // Update inventory items with zero retail price
    const inventoryItems = await prisma.inventoryItem.findMany({
      where: {
        storeId: { not: null },
        retailPrice: { lte: 0 }
      },
      include: {
        product: true
      }
    });

    console.log(`Found ${inventoryItems.length} items with zero/null retail price`);

    for (const item of inventoryItems) {
      let newPrice = item.product.retailPrice;

      // If product also has zero price, set a default based on product name
      if (!newPrice || newPrice === 0) {
        if (item.product.name.toLowerCase().includes('jean')) newPrice = 50;
        else if (item.product.name.toLowerCase().includes('shirt')) newPrice = 30;
        else if (item.product.name.toLowerCase().includes('sneaker')) newPrice = 80;
        else if (item.product.name.toLowerCase().includes('belt')) newPrice = 25;
        else newPrice = 20;
      }

      await prisma.inventoryItem.update({
        where: { id: item.id },
        data: {
          retailPrice: newPrice,
          costPrice: newPrice * 0.6 // 60% of retail price
        }
      });

      console.log(`✅ Updated ${item.product.name}: $${newPrice}`);
    }

    // Also update the product prices
    const products = await prisma.product.findMany({
      where: {
        retailPrice: { lte: 0 }
      }
    });

    for (const product of products) {
      let newPrice;
      if (product.name.toLowerCase().includes('jean')) newPrice = 50;
      else if (product.name.toLowerCase().includes('shirt')) newPrice = 30;
      else if (product.name.toLowerCase().includes('sneaker')) newPrice = 80;
      else if (product.name.toLowerCase().includes('belt')) newPrice = 25;
      else newPrice = 20;

      await prisma.product.update({
        where: { id: product.id },
        data: {
          retailPrice: newPrice,
          costPrice: newPrice * 0.6,
          wholesalePrice: newPrice * 0.8
        }
      });

      console.log(`✅ Updated product ${product.name}: $${newPrice}`);
    }

    console.log('\nFinal check - Store inventory:');
    const finalInventory = await prisma.inventoryItem.findMany({
      where: {
        storeId: { not: null },
        quantity: { gt: 0 },
        status: 'AVAILABLE'
      },
      include: {
        product: {
          select: { name: true, sku: true }
        }
      }
    });

    finalInventory.forEach(item => {
      console.log(`- ${item.product.name} (${item.product.sku}): ${item.quantity} units @ $${item.retailPrice}`);
    });

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

fixInventoryPrices();
