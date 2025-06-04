import { PrismaClient } from '.prisma/client'
import { hash } from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database with minimal data for login functionality...');

  // Create admin user
  const adminPassword = await hash('admin123', 10);
  const admin = await prisma.user.upsert({
    where: { email: 'admin@tawania.com' },
    update: {},
    create: {
      email: 'admin@tawania.com',
      name: 'Rajesh Kumar',
      password: adminPassword,
      role: "ADMIN",
    },
  });
  console.log('Created admin user:', admin.email);

  // Create warehouse manager
  const warehouseManagerPassword = await hash('manager123', 10);
  const warehouseManager = await prisma.user.upsert({
    where: { email: 'warehouse@tawania.com' },
    update: {},
    create: {
      email: 'warehouse@tawania.com',
      name: 'Vikram Singh',
      password: warehouseManagerPassword,
      role: "WAREHOUSE_MANAGER",
    },
  });
  console.log('Created warehouse manager:', warehouseManager.email);

  // Create store manager
  const storeManagerPassword = await hash('manager123', 10);
  const storeManager = await prisma.user.upsert({
    where: { email: 'store@tawania.com' },
    update: {},
    create: {
      email: 'store@tawania.com',
      name: 'Priya Sharma',
      password: storeManagerPassword,
      role: "STORE_MANAGER",
    },
  });
  console.log('Created store manager:', storeManager.email);

  // Create main warehouse
  const mainWarehouse = await prisma.warehouse.upsert({
    where: { code: 'WH-MAIN' },
    update: {},
    create: {
      name: 'Tawania Central Warehouse',
      code: 'WH-MAIN',
      address: '42 Industrial Area, Phase II, Chandigarh, 160002',
      contactPerson: 'Vikram Singh',
      phone: '+91 98765 43210',
      email: 'warehouse@tawania.com',
    },
  });
  console.log('Created warehouse:', mainWarehouse.name);

  // Create warehouse staff for main warehouse
  const warehouseStaff = await prisma.warehouseStaff.upsert({
    where: { userId: warehouseManager.id },
    update: {},
    create: {
      userId: warehouseManager.id,
      warehouseId: mainWarehouse.id,
      position: 'Warehouse Manager',
      isManager: true,
    },
  });
  console.log('Created warehouse staff:', warehouseStaff.id);

  // Create main store
  const mainStore = await prisma.store.upsert({
    where: { code: 'MAIN' },
    update: {},
    create: {
      name: 'Tawania Flagship Store',
      code: 'MAIN',
      address: '23 Sector 17, Chandigarh, 160017',
      phone: '+91 87654 32109',
      email: 'flagship@tawania.com',
      openingHours: JSON.stringify({
        mon: { open: '10:00', close: '20:00' },
        tue: { open: '10:00', close: '20:00' },
        wed: { open: '10:00', close: '20:00' },
        thu: { open: '10:00', close: '20:00' },
        fri: { open: '10:00', close: '20:00' },
        sat: { open: '10:00', close: '21:00' },
        sun: { open: '11:00', close: '19:00' },
      }),
      isActive: true,
    },
  });
  console.log('Created store:', mainStore.name);

  // Create store staff for main store
  const storeStaff = await prisma.storeStaff.upsert({
    where: { userId: storeManager.id },
    update: {},
    create: {
      userId: storeManager.id,
      storeId: mainStore.id,
      position: 'Store Manager',
      isManager: true,
    },
  });
  console.log('Created store staff:', storeStaff.id);

  console.log('Database seeding completed with minimal data for login functionality!');
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (e) => {
    console.error(e);
    await prisma.$disconnect();
    process.exit(1);
  });

