// Save this as check-note-model.js
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

async function checkNoteModel() {
  try {
    // Check what models are available
    const modelNames = Object.keys(prisma).filter(key => 
      !key.startsWith('$') && typeof prisma[key] === 'object'
    );
    
    console.log('Available models:');
    console.log(modelNames);
    
    // Check if Note model exists
    if (modelNames.includes('note')) {
      console.log('\nNote model exists');
      
      // Try to get a sample note
      const sampleNote = await prisma.note.findFirst({
        select: { id: true }
      });
      
      if (sampleNote) {
        console.log('\nSample note fields:');
        const fullNote = await prisma.note.findUnique({
          where: { id: sampleNote.id }
        });
        console.log(Object.keys(fullNote));
      } else {
        console.log('\nNo notes found in database');
      }
    } else {
      console.log('\nNote model does not exist');
      
      // Check if there's any model related to notes
      const noteRelatedModels = modelNames.filter(name => 
        name.toLowerCase().includes('note')
      );
      
      if (noteRelatedModels.length > 0) {
        console.log('\nModels related to notes:');
        console.log(noteRelatedModels);
        
        // Check the first note-related model
        const modelName = noteRelatedModels[0];
        const sampleNote = await prisma[modelName].findFirst({
          select: { id: true }
        });
        
        if (sampleNote) {
          console.log(`\nSample ${modelName} fields:`);
          const fullNote = await prisma[modelName].findUnique({
            where: { id: sampleNote.id }
          });
          console.log(Object.keys(fullNote));
        }
      }
    }
    
    // Check Customer model to see what relations it has to notes
    if (modelNames.includes('customer')) {
      console.log('\nChecking Customer model for note relations:');
      
      // Get a sample customer
      const sampleCustomer = await prisma.customer.findFirst({
        select: { id: true }
      });
      
      if (sampleCustomer) {
        try {
          // Try to include notes relation
          const customer = await prisma.customer.findUnique({
            where: { id: sampleCustomer.id },
            include: {
              notes: true
            }
          });
          
          console.log('Customer has notes relation:', !!customer.notes);
        } catch (error) {
          console.log('Error including notes relation:', error.message);
          
          // Try other possible relation names
          try {
            const customer = await prisma.customer.findUnique({
              where: { id: sampleCustomer.id },
              include: {
                customerNotes: true
              }
            });
            
            console.log('Customer has customerNotes relation:', !!customer.customerNotes);
          } catch (error) {
            console.log('Error including customerNotes relation:', error.message);
          }
        }
      }
    }
  } catch (error) {
    console.error('Error checking note model:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkNoteModel().catch(console.error);
