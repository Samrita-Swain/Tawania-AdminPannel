const { PrismaClient } = require('@prisma/client');
const fs = require('fs');
const path = require('path');

async function setupTransferTables() {
  const prisma = new PrismaClient();
  
  try {
    console.log('🚀 Setting up transfer tables in Neon database...');
    
    // Read the SQL migration file
    const sqlPath = path.join(__dirname, '../prisma/migrations/create_transfer_tables.sql');
    const sql = fs.readFileSync(sqlPath, 'utf8');
    
    console.log('📄 Executing SQL migration...');
    
    // Split SQL into individual statements and execute them
    const statements = sql
      .split(';')
      .map(stmt => stmt.trim())
      .filter(stmt => stmt.length > 0);
    
    for (const statement of statements) {
      if (statement.trim()) {
        try {
          console.log(`Executing: ${statement.substring(0, 50)}...`);
          await prisma.$executeRawUnsafe(statement);
        } catch (error) {
          if (error.message.includes('already exists')) {
            console.log('⚠️  Table already exists, skipping...');
          } else {
            console.error('❌ Error executing statement:', error.message);
          }
        }
      }
    }
    
    console.log('✅ Transfer tables setup completed!');
    
    // Test the setup by querying the tables
    console.log('🧪 Testing table setup...');
    
    const transferCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Transfer"`;
    const warehouseCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Warehouse"`;
    const storeCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Store"`;
    const productCount = await prisma.$queryRaw`SELECT COUNT(*) as count FROM "Product"`;
    
    console.log('📊 Table counts:');
    console.log(`  - Transfers: ${transferCount[0]?.count || 0}`);
    console.log(`  - Warehouses: ${warehouseCount[0]?.count || 0}`);
    console.log(`  - Stores: ${storeCount[0]?.count || 0}`);
    console.log(`  - Products: ${productCount[0]?.count || 0}`);
    
    // Test API endpoint
    console.log('🌐 Testing API endpoint...');
    const response = await fetch('http://localhost:3000/api/transfers/simple');
    if (response.ok) {
      const data = await response.json();
      console.log('✅ API endpoint working!');
      console.log(`📦 Found ${data.transfers?.length || 0} transfers`);
    } else {
      console.log('⚠️  API endpoint not accessible (server might not be running)');
    }
    
  } catch (error) {
    console.error('❌ Setup failed:', error);
  } finally {
    await prisma.$disconnect();
  }
}

// Run the setup
setupTransferTables();
