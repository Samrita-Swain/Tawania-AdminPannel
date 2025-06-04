// This script provides a command-line interface for managing stores
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const readline = require('readline');

const prisma = new PrismaClient();

const rl = readline.createInterface({
  input: process.stdin,
  output: process.stdout
});

// Helper function to prompt for input
function prompt(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer);
    });
  });
}

// List all stores
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

// Create a new store
async function createStore() {
  try {
    console.log('\nCreate a new store:');
    
    const name = await prompt('Store Name: ');
    if (!name) {
      console.log('Store name is required. Operation cancelled.');
      return;
    }
    
    const code = await prompt('Store Code: ');
    if (!code) {
      console.log('Store code is required. Operation cancelled.');
      return;
    }
    
    // Check if code already exists
    const existingStore = await prisma.store.findUnique({
      where: { code },
    });
    
    if (existingStore) {
      console.log(`A store with code "${code}" already exists. Operation cancelled.`);
      return;
    }
    
    const address = await prompt('Address (optional): ');
    const phone = await prompt('Phone (optional): ');
    const email = await prompt('Email (optional): ');
    const openingHours = await prompt('Opening Hours (optional): ');
    const isActiveInput = await prompt('Is Active? (y/n, default: y): ');
    const isActive = isActiveInput.toLowerCase() !== 'n';
    
    console.log('\nCreating store with the following details:');
    console.log(`Name: ${name}`);
    console.log(`Code: ${code}`);
    console.log(`Address: ${address || 'N/A'}`);
    console.log(`Phone: ${phone || 'N/A'}`);
    console.log(`Email: ${email || 'N/A'}`);
    console.log(`Opening Hours: ${openingHours || 'N/A'}`);
    console.log(`Active: ${isActive ? 'Yes' : 'No'}`);
    
    const confirm = await prompt('\nConfirm creation? (y/n): ');
    if (confirm.toLowerCase() !== 'y') {
      console.log('Operation cancelled.');
      return;
    }
    
    const store = await prisma.store.create({
      data: {
        name,
        code,
        address: address || "",
        phone: phone || "",
        email: email || "",
        openingHours: openingHours || "",
        isActive,
      },
    });
    
    console.log('\nStore created successfully:');
    console.log(store);
    
    // Verify the store was created
    const createdStore = await prisma.store.findUnique({
      where: { id: store.id },
    });
    
    if (createdStore) {
      console.log('\nStore verification successful!');
    } else {
      console.log('\nWARNING: Store was not found after creation!');
    }
  } catch (error) {
    console.error('Error creating store:', error);
  }
}

// Delete a store
async function deleteStore() {
  try {
    const stores = await prisma.store.findMany({
      orderBy: { createdAt: 'desc' },
    });
    
    if (stores.length === 0) {
      console.log('No stores to delete.');
      return;
    }
    
    console.log('\nSelect a store to delete:');
    stores.forEach((store, index) => {
      console.log(`${index + 1}. ${store.name} (${store.code}) - ID: ${store.id}`);
    });
    
    const answer = await prompt('\nEnter the number of the store to delete (or 0 to cancel): ');
    const index = parseInt(answer) - 1;
    
    if (isNaN(index) || index < 0 || index >= stores.length) {
      console.log('Operation cancelled or invalid selection.');
      return;
    }
    
    const storeToDelete = stores[index];
    
    console.log(`\nYou are about to delete the store: ${storeToDelete.name} (${storeToDelete.code})`);
    const confirm = await prompt('Are you sure? This action cannot be undone. (y/n): ');
    
    if (confirm.toLowerCase() !== 'y') {
      console.log('Operation cancelled.');
      return;
    }
    
    await prisma.store.delete({
      where: { id: storeToDelete.id },
    });
    
    console.log(`\nStore "${storeToDelete.name}" deleted successfully.`);
  } catch (error) {
    console.error('Error deleting store:', error);
  }
}

// Show menu and handle user input
async function showMenu() {
  console.log('\n--- Store Management ---');
  console.log('1. List all stores');
  console.log('2. Create a new store');
  console.log('3. Delete a store');
  console.log('4. Exit');
  
  const answer = await prompt('\nSelect an option: ');
  
  switch (answer) {
    case '1':
      await listStores();
      return showMenu();
    case '2':
      await createStore();
      return showMenu();
    case '3':
      await deleteStore();
      return showMenu();
    case '4':
      console.log('Exiting...');
      rl.close();
      await prisma.$disconnect();
      break;
    default:
      console.log('Invalid option. Please try again.');
      return showMenu();
  }
}

// Start the program
console.log('Database Store Management Tool');
console.log('-----------------------------');
showMenu();
