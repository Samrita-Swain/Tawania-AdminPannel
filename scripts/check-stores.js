// This script checks for stores in the database and allows creating a new store
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient({
  log: ['error'],
});

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

async function listStores() {
  try {
    console.log('\nListing all stores:');
    const stores = await prisma.store.findMany({
      orderBy: { createdAt: 'desc' }
    });
    
    if (stores.length === 0) {
      console.log('No stores found in the database.');
    } else {
      console.log(`Found ${stores.length} stores:`);
      stores.forEach((store, index) => {
        console.log(`${index + 1}. ${store.name} (${store.code})`);
        console.log(`   ID: ${store.id}`);
        console.log(`   Created: ${store.createdAt.toLocaleString()}`);
        console.log(`   Address: ${store.address || 'N/A'}`);
        console.log(`   Active: ${store.isActive ? 'Yes' : 'No'}`);
        console.log('---');
      });
    }
  } catch (error) {
    console.error('Error listing stores:', error);
  }
}

async function createStore() {
  try {
    const code = `STORE-${Math.floor(Math.random() * 10000)}`;
    const name = `Test Store ${new Date().toLocaleString()}`;
    
    console.log(`\nCreating new store with code: ${code} and name: ${name}`);
    
    const store = await prisma.store.create({
      data: {
        name,
        code,
        address: '123 Test Street',
        phone: '555-123-4567',
        email: 'test@example.com',
        openingHours: 'Mon-Fri: 9am-5pm',
        isActive: true,
      },
    });
    
    console.log('Store created successfully:');
    console.log(store);
  } catch (error) {
    console.error('Error creating store:', error);
  }
}

async function deleteStore() {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { createdAt: 'desc' },
      take: 10,
    });
    
    if (stores.length === 0) {
      console.log('No stores to delete.');
      return;
    }
    
    console.log('\nSelect a store to delete:');
    stores.forEach((store, index) => {
      console.log(`${index + 1}. ${store.name} (${store.code}) - ID: ${store.id}`);
    });
    
    rl.question('\nEnter the number of the store to delete (or 0 to cancel): ', async (answer) => {
      const index = parseInt(answer) - 1;
      
      if (isNaN(index) || index < 0 || index >= stores.length) {
        console.log('Operation cancelled or invalid selection.');
        showMenu();
        return;
      }
      
      const storeToDelete = stores[index];
      
      try {
        await prisma.store.delete({
          where: { id: storeToDelete.id },
        });
        
        console.log(`Store "${storeToDelete.name}" deleted successfully.`);
      } catch (error) {
        console.error('Error deleting store:', error);
      }
      
      showMenu();
    });
  } catch (error) {
    console.error('Error listing stores for deletion:', error);
    showMenu();
  }
}

function showMenu() {
  console.log('\n--- Store Management ---');
  console.log('1. List all stores');
  console.log('2. Create a test store');
  console.log('3. Delete a store');
  console.log('4. Exit');
  
  rl.question('\nSelect an option: ', async (answer) => {
    switch (answer) {
      case '1':
        await listStores();
        showMenu();
        break;
      case '2':
        await createStore();
        showMenu();
        break;
      case '3':
        await deleteStore();
        break;
      case '4':
        console.log('Exiting...');
        rl.close();
        await prisma.$disconnect();
        break;
      default:
        console.log('Invalid option. Please try again.');
        showMenu();
        break;
    }
  });
}

// Start the program
console.log('Database Store Management Tool');
console.log('-----------------------------');
showMenu();
