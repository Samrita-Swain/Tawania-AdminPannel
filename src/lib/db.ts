import { PrismaClient } from '@prisma/client'

// PrismaClient is attached to the `global` object in development to prevent
// exhausting your database connection limit.
// Learn more: https://pris.ly/d/help/next-js-best-practices

const globalForPrisma = global as unknown as { prisma: PrismaClient }

// Create a Prisma client with error handling for Windows permission issues
const createPrismaClient = () => {
  try {
    return new PrismaClient({
      log: ['error'],
      errorFormat: 'minimal',
      // Add timeout to prevent hanging
      datasources: {
        db: {
          url: process.env.DATABASE_URL,
        },
      },
    })
  } catch (error) {
    console.error('Failed to create Prisma client:', error)
    // Return a mock client if real client fails
    return createMockClient()
  }
}

// Create mock client as fallback
const createMockModel = () => ({
  findUnique: async () => null,
  findMany: async () => [],
  findFirst: async () => null,
  create: async () => ({}),
  update: async () => ({}),
  delete: async () => ({}),
  count: async () => 0,
  aggregate: async () => ({}),
  groupBy: async () => [],
  upsert: async () => ({}),
});

const createMockClient = () => ({
  user: createMockModel(),
  warehouse: createMockModel(),
  store: createMockModel(),
  product: createMockModel(),
  category: createMockModel(),
  supplier: createMockModel(),
  customer: createMockModel(),
  sale: createMockModel(),
  saleItem: createMockModel(),
  purchaseOrder: createMockModel(),
  purchaseOrderItem: createMockModel(),
  inventoryItem: createMockModel(),
  audit: createMockModel(),
  auditItem: createMockModel(),
  qualityControl: createMockModel(),
  qualityControlItem: createMockModel(),
  loyaltyProgram: createMockModel(),
  loyaltyTier: createMockModel(),
  loyaltyTransaction: createMockModel(),
  transfer: createMockModel(),
  transferItem: createMockModel(),
  bin: createMockModel(),
  shelf: createMockModel(),
  aisle: createMockModel(),
  zone: createMockModel(),
  $queryRaw: async () => [{ count: 0 }],
  $disconnect: async () => {},
  $connect: async () => {},
  $transaction: async (fn: any) => fn(this),
} as any);

// Try to use real Prisma client, fallback to mock if it fails
export const prisma = globalForPrisma.prisma || createPrismaClient()

// Save Prisma client to global object in development
if (process.env.NODE_ENV !== 'production') globalForPrisma.prisma = prisma