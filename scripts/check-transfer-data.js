const { PrismaClient } = require('@prisma/client');

async function checkTransferData() {
  const prisma = new PrismaClient();

  try {
    console.log('🔍 Checking transfer data...');

    // Check transfers
    const transfers = await prisma.transfer.findMany({
      select: {
        id: true,
        transferNumber: true,
        fromWarehouseId: true,
        toStoreId: true,
        status: true,
        transferType: true,
        totalItems: true,
        createdAt: true,
        _count: {
          select: { items: true }
        }
      },
      take: 5
    });

    console.log(`📦 Found ${transfers.length} transfers:`);
    transfers.forEach(transfer => {
      console.log(`  - ${transfer.transferNumber}: ${transfer.fromWarehouseId} → ${transfer.toStoreId} (${transfer.status}) - Items: ${transfer._count.items}/${transfer.totalItems}`);
    });

    // Check warehouses
    const warehouses = await prisma.warehouse.findMany({
      select: { id: true, name: true, code: true },
      take: 5
    });

    console.log(`🏭 Found ${warehouses.length} warehouses:`);
    warehouses.forEach(warehouse => {
      console.log(`  - ${warehouse.id}: ${warehouse.name} (${warehouse.code})`);
    });

    // Check stores
    const stores = await prisma.store.findMany({
      select: { id: true, name: true, code: true },
      take: 5
    });

    console.log(`🏪 Found ${stores.length} stores:`);
    stores.forEach(store => {
      console.log(`  - ${store.id}: ${store.name} (${store.code})`);
    });

    // Check transfer items
    const transferItems = await prisma.transferItem.findMany({
      select: {
        id: true,
        transferId: true,
        productId: true,
        quantity: true,
      },
      take: 10
    });

    console.log(`📋 Found ${transferItems.length} transfer items:`);
    transferItems.forEach(item => {
      console.log(`  - Transfer ${item.transferId}: Product ${item.productId} x${item.quantity}`);
    });

    // Check if transfer has valid warehouse/store IDs
    if (transfers.length > 0) {
      const transfer = transfers[0];
      console.log(`\n🔗 Checking relations for transfer ${transfer.transferNumber}:`);

      if (transfer.fromWarehouseId) {
        const warehouse = warehouses.find(w => w.id === transfer.fromWarehouseId);
        console.log(`  - From Warehouse: ${warehouse ? warehouse.name : 'NOT FOUND'}`);
      }

      if (transfer.toStoreId) {
        const store = stores.find(s => s.id === transfer.toStoreId);
        console.log(`  - To Store: ${store ? store.name : 'NOT FOUND'}`);
      }
    }

    // Test the API endpoint
    console.log('\n🌐 Testing API endpoint...');
    try {
      const response = await fetch('http://localhost:3000/api/transfers/simple');
      if (response.ok) {
        const data = await response.json();
        console.log(`✅ API working! Found ${data.transfers?.length || 0} transfers in response`);

        if (data.transfers && data.transfers.length > 0) {
          const firstTransfer = data.transfers[0];
          console.log('📋 First transfer from API:');
          console.log(`  - ID: ${firstTransfer.id}`);
          console.log(`  - Number: ${firstTransfer.transferNumber}`);
          console.log(`  - From Warehouse: ${firstTransfer.Warehouse_Transfer_fromWarehouseIdToWarehouse?.name || 'No name'}`);
          console.log(`  - To Store: ${firstTransfer.Store_Transfer_toStoreIdToStore?.name || 'No name'}`);
          console.log(`  - Status: ${firstTransfer.status}`);
          console.log(`  - Type: ${firstTransfer.transferType}`);
        }
      } else {
        console.log(`❌ API error: ${response.status} ${response.statusText}`);
      }
    } catch (apiError) {
      console.log('⚠️  API test failed (server might not be running):', apiError.message);
    }

  } catch (error) {
    console.error('❌ Error checking data:', error);
  } finally {
    await prisma.$disconnect();
  }
}

checkTransferData();
