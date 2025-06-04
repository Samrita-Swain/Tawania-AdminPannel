// This script verifies the database connection and lists all stores
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('Verifying database connection...');
    console.log('DATABASE_URL:', process.env.DATABASE_URL);
    console.log('DIRECT_URL:', process.env.DIRECT_URL);
    
    // Test connection by querying for stores
    console.log('\nListing all stores:');
    const stores = await prisma.store.findMany();
    
    if (stores.length === 0) {
      console.log('No stores found in the database.');
    } else {
      console.log(`Found ${stores.length} stores:`);
      stores.forEach(store => {
        console.log(`- ${store.name} (${store.code}): ${store.id}`);
      });
    }
    
    // Create a test store
    const testCode = `TEST-${Math.floor(Math.random() * 10000)}`;
    console.log(`\nCreating test store with code: ${testCode}`);
    
    const newStore = await prisma.store.create({
      data: {
        name: 'Test Store',
        code: testCode,
        address: 'Test Address',
        phone: '123-456-7890',
        email: 'test@example.com',
        openingHours: 'Mon-Fri: 9am-5pm',
        isActive: true,
      },
    });
    
    console.log('Test store created successfully:');
    console.log(newStore);
    
    // List all stores again to verify the new store was added
    console.log('\nListing all stores after creation:');
    const updatedStores = await prisma.store.findMany();
    console.log(`Found ${updatedStores.length} stores:`);
    updatedStores.forEach(store => {
      console.log(`- ${store.name} (${store.code}): ${store.id}`);
    });
    
    // Clean up by deleting the test store
    await prisma.store.delete({
      where: { id: newStore.id },
    });
    
    console.log('\nTest store deleted successfully.');
    
  } catch (error) {
    console.error('Error:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
