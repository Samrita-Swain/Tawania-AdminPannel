import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function seedLoyaltyProgram() {
  console.log('Seeding loyalty program data...');

  // Create a loyalty program
  const loyaltyProgram = await prisma.loyaltyProgram.create({
    data: {
      name: 'Tawania Rewards',
      description: 'Earn points on every purchase and redeem for discounts',
      pointsPerDollar: 1, // 1 point per $1
      isActive: true,
    },
  });

  console.log(`Created loyalty program: ${loyaltyProgram.name}`);

  // Create loyalty program tiers
  const tiers = await Promise.all([
    prisma.loyaltyTier.create({
      data: {
        programId: loyaltyProgram.id,
        name: 'Standard',
        description: 'Standard tier for all customers',
        requiredPoints: 0,
        pointsMultiplier: 1,
        benefits: 'Basic rewards',
      },
    }),
    prisma.loyaltyTier.create({
      data: {
        programId: loyaltyProgram.id,
        name: 'Silver',
        description: 'Silver tier for regular customers',
        requiredPoints: 1000,
        pointsMultiplier: 1.25,
        benefits: '10% bonus points, Birthday gift',
      },
    }),
    prisma.loyaltyTier.create({
      data: {
        programId: loyaltyProgram.id,
        name: 'Gold',
        description: 'Gold tier for loyal customers',
        requiredPoints: 5000,
        pointsMultiplier: 1.5,
        benefits: '25% bonus points, Birthday gift, Exclusive promotions',
      },
    }),
    prisma.loyaltyTier.create({
      data: {
        programId: loyaltyProgram.id,
        name: 'Platinum',
        description: 'Platinum tier for VIP customers',
        requiredPoints: 10000,
        pointsMultiplier: 2,
        benefits: '50% bonus points, Birthday gift, Exclusive promotions, Free shipping',
      },
    }),
  ]);

  console.log(`Created ${tiers.length} loyalty tiers`);

  // Note: Loyalty program rules, promotions, and customer groups
  // are not included in the current schema but can be added later

  console.log('Loyalty program data seeding completed');
}

export { seedLoyaltyProgram };
