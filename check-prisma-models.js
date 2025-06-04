// Save this as check-prisma-models.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkModels() {
  // Get all model names from Prisma Client
  const modelNames = Object.keys(prisma).filter(key => 
    !key.startsWith('$') && typeof prisma[key] === 'object'
  );
  
  console.log('Available models in Prisma Client:');
  console.log(modelNames);
  
  // Check if there's any model related to notes
  const noteRelatedModels = modelNames.filter(name => 
    name.toLowerCase().includes('note')
  );
  
  console.log('\nModels related to notes:');
  console.log(noteRelatedModels);
  
  // Check customer model to see what relations it has
  if (modelNames.includes('customer')) {
    try {
      // Get a sample customer to see its structure
      const sampleCustomer = await prisma.customer.findFirst({
        select: {
          id: true
        }
      });
      
      if (sampleCustomer) {
        const customerWithRelations = await prisma.customer.findUnique({
          where: { id: sampleCustomer.id },
          include: {
            // Try to include all possible relations
            // This will error out for relations that don't exist
            // But will show us which ones do exist
            _count: true
          }
        });
        
        console.log('\nCustomer relations:');
        console.log(Object.keys(customerWithRelations));
      }
    } catch (error) {
      console.log('Error getting customer relations:', error.message);
    }
  }
  
  await prisma.$disconnect();
}

checkModels().catch(e => {
  console.error(e);
  process.exit(1);
});
