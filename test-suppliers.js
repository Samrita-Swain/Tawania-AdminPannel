// This script tests the connection to the supplier table
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('DIRECT_URL:', process.env.DIRECT_URL);

const prisma = new PrismaClient({
  log: ['query', 'info', 'warn', 'error'],
});

async function main() {
  try {
    console.log('Testing database connection to supplier table...');
    
    // Test connection by querying for suppliers
    const suppliers = await prisma.supplier.findMany({
      take: 5,
    });
    
    console.log(`Connection successful! Found ${suppliers.length} suppliers.`);
    if (suppliers.length > 0) {
      console.log('Suppliers:');
      suppliers.forEach(supplier => {
        console.log(`- ${supplier.name} (${supplier.id})`);
      });
    }
    
  } catch (error) {
    console.error('Error connecting to the database:', error);
  } finally {
    await prisma.$disconnect();
  }
}

main();
