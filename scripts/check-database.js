// This script checks the database connection and configuration
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

// Create logs directory if it doesn't exist
const logDir = path.join(process.cwd(), 'logs');
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir, { recursive: true });
}

// Log file for database check
const logFile = path.join(logDir, `database-check-${Date.now()}.log`);
const log = (message) => {
  const timestamp = new Date().toISOString();
  const logMessage = `[${timestamp}] ${message}\n`;
  console.log(message);
  fs.appendFileSync(logFile, logMessage);
};

// Initialize Prisma client with logging
const prisma = new PrismaClient({
  log: [
    {
      emit: 'event',
      level: 'query',
    },
    {
      emit: 'event',
      level: 'error',
    },
    {
      emit: 'event',
      level: 'info',
    },
    {
      emit: 'event',
      level: 'warn',
    },
  ],
});

// Log queries
prisma.$on('query', (e) => {
  log(`Query: ${e.query}`);
  log(`Params: ${e.params}`);
  log(`Duration: ${e.duration}ms`);
});

// Log errors
prisma.$on('error', (e) => {
  log(`Error: ${e.message}`);
});

// Log info
prisma.$on('info', (e) => {
  log(`Info: ${e.message}`);
});

// Log warnings
prisma.$on('warn', (e) => {
  log(`Warning: ${e.message}`);
});

async function checkDatabase() {
  log('Starting database check...');
  log(`DATABASE_URL: ${process.env.DATABASE_URL}`);
  log(`DIRECT_URL: ${process.env.DIRECT_URL || 'Not set'}`);
  
  try {
    // Test connection
    log('Testing database connection...');
    await prisma.$connect();
    log('Database connection successful!');
    
    // Check if Store model exists
    log('Checking Store model...');
    const storeCount = await prisma.store.count();
    log(`Found ${storeCount} stores in the database.`);
    
    // List all stores
    if (storeCount > 0) {
      const stores = await prisma.store.findMany({
        orderBy: { createdAt: 'desc' },
      });
      
      log('Listing all stores:');
      stores.forEach((store, index) => {
        log(`${index + 1}. ${store.name} (${store.code})`);
        log(`   ID: ${store.id}`);
        log(`   Created: ${store.createdAt.toISOString()}`);
        log(`   Address: ${store.address || 'N/A'}`);
      });
    }
    
    // Create a test store
    const testCode = `TEST-${Math.floor(Math.random() * 10000)}`;
    log(`Creating test store with code: ${testCode}`);
    
    const store = await prisma.store.create({
      data: {
        name: 'Database Test Store',
        code: testCode,
        address: 'Test Address',
        phone: '555-123-4567',
        email: 'test@example.com',
        openingHours: 'Mon-Fri: 9am-5pm',
        isActive: true,
      },
    });
    
    log('Test store created successfully:');
    log(JSON.stringify(store, null, 2));
    
    // Verify the store was created
    log('Verifying store was created...');
    const createdStore = await prisma.store.findUnique({
      where: { id: store.id },
    });
    
    if (createdStore) {
      log('Store verification successful!');
    } else {
      log('WARNING: Store was not found after creation!');
    }
    
    // Delete the test store
    log('Deleting test store...');
    await prisma.store.delete({
      where: { id: store.id },
    });
    log('Test store deleted successfully.');
    
    log('Database check completed successfully!');
  } catch (error) {
    log(`ERROR: ${error.message}`);
    log(error.stack);
  } finally {
    await prisma.$disconnect();
    log('Database connection closed.');
  }
}

// Run the check
checkDatabase();
