const { Client } = require('pg');
require('dotenv').config();

const client = new Client({
  connectionString: process.env.DATABASE_URL
});

async function testConnection() {
  try {
    await client.connect();
    console.log('Connected to the database successfully!');
    const result = await client.query('SELECT NOW()');
    console.log('Current time from database:', result.rows[0].now);
    await client.end();
  } catch (error) {
    console.error('Error connecting to the database:', error);
  }
}

testConnection();
