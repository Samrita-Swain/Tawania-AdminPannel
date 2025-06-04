import { GET, POST } from './route';
import { createMockRequest, parseJsonResponse, mockSession } from '@/lib/test-utils';
import { prisma } from '@/lib/prisma';
import { getServerSession } from 'next-auth';

describe('Warehouses API', () => {
  describe('GET /api/warehouses', () => {
    it('should return unauthorized if not authenticated', async () => {
      // Mock session to return null (not authenticated)
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const req = createMockRequest('GET', 'http://localhost:3000/api/warehouses');
      const res = await GET(req);
      
      expect(res.status).toBe(401);
      const data = await parseJsonResponse(res);
      expect(data.error).toBe('Unauthorized');
    });
    
    it('should return warehouses with pagination', async () => {
      // Mock warehouse data
      const mockWarehouses = [
        {
          id: 'warehouse-1',
          name: 'Warehouse 1',
          code: 'WH1',
          address: '123 Main St',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          inventoryItems: [{ id: 'item-1' }, { id: 'item-2' }],
          staff: [{ id: 'staff-1' }],
        },
        {
          id: 'warehouse-2',
          name: 'Warehouse 2',
          code: 'WH2',
          address: '456 Oak St',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          inventoryItems: [{ id: 'item-3' }],
          staff: [{ id: 'staff-2' }, { id: 'staff-3' }],
        },
      ];
      
      // Mock prisma response
      (prisma.warehouse.findMany as jest.Mock).mockResolvedValueOnce(mockWarehouses);
      (prisma.warehouse.count as jest.Mock).mockResolvedValueOnce(2);
      
      const req = createMockRequest('GET', 'http://localhost:3000/api/warehouses');
      const res = await GET(req);
      
      expect(res.status).toBe(200);
      const data = await parseJsonResponse(res);
      
      expect(data.warehouses).toHaveLength(2);
      expect(data.warehouses[0].inventoryCount).toBe(2);
      expect(data.warehouses[0].staffCount).toBe(1);
      expect(data.warehouses[1].inventoryCount).toBe(1);
      expect(data.warehouses[1].staffCount).toBe(2);
      expect(data.totalItems).toBe(2);
      expect(data.page).toBe(1);
      expect(data.pageSize).toBe(10);
      expect(data.totalPages).toBe(1);
    });
    
    it('should apply filters correctly', async () => {
      // Mock warehouse data
      const mockWarehouses = [
        {
          id: 'warehouse-1',
          name: 'Warehouse 1',
          code: 'WH1',
          address: '123 Main St',
          isActive: true,
          createdAt: new Date(),
          updatedAt: new Date(),
          inventoryItems: [],
          staff: [],
        },
      ];
      
      // Mock prisma response
      (prisma.warehouse.findMany as jest.Mock).mockResolvedValueOnce(mockWarehouses);
      (prisma.warehouse.count as jest.Mock).mockResolvedValueOnce(1);
      
      const req = createMockRequest(
        'GET',
        'http://localhost:3000/api/warehouses?status=active&search=Warehouse&page=1&pageSize=10'
      );
      
      const res = await GET(req);
      
      expect(res.status).toBe(200);
      const data = await parseJsonResponse(res);
      
      expect(data.warehouses).toHaveLength(1);
      expect(data.totalItems).toBe(1);
      
      // Verify that prisma was called with the correct filters
      expect(prisma.warehouse.findMany).toHaveBeenCalledWith(
        expect.objectContaining({
          where: expect.objectContaining({
            isActive: true,
            OR: expect.arrayContaining([
              { name: { contains: 'Warehouse', mode: 'insensitive' } },
              { code: { contains: 'Warehouse', mode: 'insensitive' } },
              { address: { contains: 'Warehouse', mode: 'insensitive' } },
            ]),
          }),
          skip: 0,
          take: 10,
        })
      );
    });
  });
  
  describe('POST /api/warehouses', () => {
    it('should return unauthorized if not authenticated', async () => {
      // Mock session to return null (not authenticated)
      (getServerSession as jest.Mock).mockResolvedValueOnce(null);
      
      const req = createMockRequest(
        'POST',
        'http://localhost:3000/api/warehouses',
        { name: 'New Warehouse', code: 'NEW' }
      );
      
      const res = await POST(req);
      
      expect(res.status).toBe(401);
      const data = await parseJsonResponse(res);
      expect(data.error).toBe('Unauthorized');
    });
    
    it('should validate required fields', async () => {
      const req = createMockRequest(
        'POST',
        'http://localhost:3000/api/warehouses',
        { name: 'New Warehouse' } // Missing code
      );
      
      const res = await POST(req);
      
      expect(res.status).toBe(400);
      const data = await parseJsonResponse(res);
      expect(data.error).toBe('Name and code are required');
    });
    
    it('should check for duplicate code', async () => {
      // Mock existing warehouse with the same code
      (prisma.warehouse.findUnique as jest.Mock).mockResolvedValueOnce({
        id: 'existing-warehouse',
        code: 'NEW',
      });
      
      const req = createMockRequest(
        'POST',
        'http://localhost:3000/api/warehouses',
        { name: 'New Warehouse', code: 'NEW' }
      );
      
      const res = await POST(req);
      
      expect(res.status).toBe(400);
      const data = await parseJsonResponse(res);
      expect(data.error).toBe('Warehouse code already exists');
    });
    
    it('should create a new warehouse', async () => {
      // Mock no existing warehouse with the same code
      (prisma.warehouse.findUnique as jest.Mock).mockResolvedValueOnce(null);
      
      // Mock created warehouse
      const mockCreatedWarehouse = {
        id: 'new-warehouse',
        name: 'New Warehouse',
        code: 'NEW',
        address: '789 Pine St',
        isActive: true,
        createdAt: new Date(),
        updatedAt: new Date(),
      };
      
      (prisma.warehouse.create as jest.Mock).mockResolvedValueOnce(mockCreatedWarehouse);
      
      const req = createMockRequest(
        'POST',
        'http://localhost:3000/api/warehouses',
        {
          name: 'New Warehouse',
          code: 'NEW',
          address: '789 Pine St',
          isActive: true,
        }
      );
      
      const res = await POST(req);
      
      expect(res.status).toBe(200);
      const data = await parseJsonResponse(res);
      expect(data.warehouse).toEqual(mockCreatedWarehouse);
      
      // Verify that prisma was called with the correct data
      expect(prisma.warehouse.create).toHaveBeenCalledWith({
        data: {
          name: 'New Warehouse',
          code: 'NEW',
          address: '789 Pine St',
          isActive: true,
        },
      });
    });
  });
});
