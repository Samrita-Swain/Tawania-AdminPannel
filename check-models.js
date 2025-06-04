// Save this as check-models.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// Get all model names from Prisma Client
const modelNames = Object.keys(prisma).filter(key => 
  !key.startsWith('$') && typeof prisma[key] === 'object'
);

console.log('Available models in Prisma Client:');
console.log(modelNames);

// Exit after logging
process.exit(0);
