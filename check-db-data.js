const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkData() {
  try {
    // Check users
    const users = await prisma.user.findMany();
    console.log('Users:', users.length);
    console.log('First user:', users[0].email);

    // Check warehouses
    const warehouses = await prisma.warehouse.findMany();
    console.log('Warehouses:', warehouses.length);
    console.log('First warehouse:', warehouses[0].name);

    // Check stores
    const stores = await prisma.store.findMany();
    console.log('Stores:', stores.length);
    console.log('First store:', stores[0].name);

    // Check products
    const products = await prisma.product.findMany();
    console.log('Products:', products.length);
    console.log('First product:', products[0].name);

    // Check inventory items
    const inventoryItems = await prisma.inventoryItem.findMany();
    console.log('Inventory items:', inventoryItems.length);

    // Check transfers
    const transfers = await prisma.transfer.findMany();
    console.log('Transfers:', transfers.length);
    console.log('First transfer:', transfers[0].transferNumber);

  } catch (error) {
    console.error('Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkData();
