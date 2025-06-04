// This script checks the connection to the Neon database
require('dotenv').config();
const { Client } = require('pg');

console.log('DATABASE_URL:', process.env.DATABASE_URL);
console.log('DIRECT_URL:', process.env.DIRECT_URL);

// Create a client using the pooler URL
const poolerClient = new Client({
  connectionString: process.env.DATABASE_URL
});

// Create a client using the direct URL
const directClient = new Client({
  connectionString: process.env.DIRECT_URL
});

async function testPoolerConnection() {
  try {
    console.log('\nTesting connection using DATABASE_URL (pooler)...');
    await poolerClient.connect();
    console.log('Connected to the database via pooler successfully!');
    const result = await poolerClient.query('SELECT NOW()');
    console.log('Current time from database (pooler):', result.rows[0].now);
    await poolerClient.end();
    return true;
  } catch (error) {
    console.error('Error connecting to the database via pooler:', error);
    return false;
  }
}

async function testDirectConnection() {
  try {
    console.log('\nTesting connection using DIRECT_URL...');
    await directClient.connect();
    console.log('Connected to the database via direct URL successfully!');
    const result = await directClient.query('SELECT NOW()');
    console.log('Current time from database (direct):', result.rows[0].now);
    await directClient.end();
    return true;
  } catch (error) {
    console.error('Error connecting to the database via direct URL:', error);
    return false;
  }
}

async function main() {
  const poolerSuccess = await testPoolerConnection();
  const directSuccess = await testDirectConnection();
  
  console.log('\nConnection Test Results:');
  console.log('- Pooler Connection:', poolerSuccess ? 'SUCCESS' : 'FAILED');
  console.log('- Direct Connection:', directSuccess ? 'SUCCESS' : 'FAILED');
}

main();
