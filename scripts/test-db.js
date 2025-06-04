// This script tests the database connection and creates a test store
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function main() {
  try {
    console.log('Testing database connection...');
    
    // Test connection by querying for stores
    const stores = await prisma.store.findMany({
      take: 5,
    });
    
    console.log(`Found ${stores.length} stores in the database:`);
    stores.forEach(store => {
      console.log(`- ${store.name} (${store.code}): ${store.id}`);
    });
    
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
    
    // Verify the store was created
    const verifyStore = await prisma.store.findUnique({
      where: { id: newStore.id },
    });
    
    if (verifyStore) {
      console.log('\nVerified store exists in database!');
    } else {
      console.log('\nWARNING: Store was not found in database after creation!');
    }
    
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
