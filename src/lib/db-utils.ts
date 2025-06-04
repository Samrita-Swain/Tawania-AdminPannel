import { prisma } from '@/lib/prisma';

// Define pagination parameters
export interface PaginationParams {
  page?: number;
  pageSize?: number;
}

// Define sort parameters
export interface SortParams {
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}

// Define filter parameters
export interface FilterParams {
  [key: string]: any;
}

// Helper function to build pagination options
export function buildPaginationOptions(params: PaginationParams) {
  const page = params.page && params.page > 0 ? params.page : 1;
  const pageSize = params.pageSize && params.pageSize > 0 ? params.pageSize : 10;
  
  return {
    skip: (page - 1) * pageSize,
    take: pageSize,
  };
}

// Helper function to build sort options
export function buildSortOptions(params: SortParams) {
  if (!params.sortBy) {
    return undefined;
  }
  
  return {
    [params.sortBy]: params.sortOrder || 'asc',
  };
}

// Helper function to build filter options
export function buildFilterOptions(params: FilterParams) {
  const filters: any = {};
  
  // Process each filter parameter
  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === '') {
      return;
    }
    
    // Handle special filter cases
    if (key === 'search' && typeof value === 'string') {
      // Search is handled separately
      return;
    }
    
    if (key === 'isActive' && typeof value === 'string') {
      filters.isActive = value === 'true';
      return;
    }
    
    if (key === 'minPrice' && typeof value === 'string') {
      filters.price = {
        ...filters.price,
        gte: parseFloat(value),
      };
      return;
    }
    
    if (key === 'maxPrice' && typeof value === 'string') {
      filters.price = {
        ...filters.price,
        lte: parseFloat(value),
      };
      return;
    }
    
    if (key === 'minDate' && typeof value === 'string') {
      filters.createdAt = {
        ...filters.createdAt,
        gte: new Date(value),
      };
      return;
    }
    
    if (key === 'maxDate' && typeof value === 'string') {
      filters.createdAt = {
        ...filters.createdAt,
        lte: new Date(value),
      };
      return;
    }
    
    // Default case: exact match
    filters[key] = value;
  });
  
  return filters;
}

// Helper function to build search options
export function buildSearchOptions(searchFields: string[], searchTerm?: string) {
  if (!searchTerm) {
    return undefined;
  }
  
  return {
    OR: searchFields.map(field => ({
      [field]: {
        contains: searchTerm,
        mode: 'insensitive',
      },
    })),
  };
}

// Helper function to combine filter and search options
export function buildWhereClause(filters: any, searchOptions: any) {
  if (!searchOptions) {
    return filters;
  }
  
  return {
    AND: [
      filters,
      searchOptions,
    ],
  };
}

// Helper function to optimize a query with pagination, sorting, and filtering
export async function optimizedQuery<T>(
  model: any,
  params: PaginationParams & SortParams & FilterParams,
  searchFields: string[] = [],
  include?: any
) {
  const paginationOptions = buildPaginationOptions(params);
  const sortOptions = buildSortOptions(params);
  const filterOptions = buildFilterOptions(params);
  const searchOptions = buildSearchOptions(searchFields, params.search as string);
  const whereClause = buildWhereClause(filterOptions, searchOptions);
  
  // Execute query with count in parallel
  const [items, totalItems] = await Promise.all([
    model.findMany({
      where: whereClause,
      orderBy: sortOptions,
      skip: paginationOptions.skip,
      take: paginationOptions.take,
      include,
    }),
    model.count({
      where: whereClause,
    }),
  ]);
  
  // Calculate total pages
  const totalPages = Math.ceil(totalItems / paginationOptions.take);
  
  return {
    items,
    totalItems,
    page: paginationOptions.skip / paginationOptions.take + 1,
    pageSize: paginationOptions.take,
    totalPages,
  };
}

// Helper function to execute a query in a transaction
export async function transactionQuery<T>(callback: (tx: any) => Promise<T>) {
  return prisma.$transaction(callback);
}

// Helper function to get entity by ID with error handling
export async function getEntityById(
  model: any,
  id: string,
  include?: any,
  errorMessage: string = 'Entity not found'
) {
  const entity = await model.findUnique({
    where: { id },
    include,
  });
  
  if (!entity) {
    throw new Error(errorMessage);
  }
  
  return entity;
}

// Helper function to create entity with validation
export async function createEntity(
  model: any,
  data: any,
  uniqueFields: { field: string; message: string }[] = []
) {
  // Check for unique constraints
  for (const { field, message } of uniqueFields) {
    if (data[field]) {
      const existing = await model.findFirst({
        where: { [field]: data[field] },
      });
      
      if (existing) {
        throw new Error(message);
      }
    }
  }
  
  return model.create({
    data,
  });
}

// Helper function to update entity with validation
export async function updateEntity(
  model: any,
  id: string,
  data: any,
  uniqueFields: { field: string; message: string }[] = []
) {
  // Get existing entity
  const existing = await model.findUnique({
    where: { id },
  });
  
  if (!existing) {
    throw new Error('Entity not found');
  }
  
  // Check for unique constraints
  for (const { field, message } of uniqueFields) {
    if (data[field] && data[field] !== existing[field]) {
      const duplicate = await model.findFirst({
        where: { [field]: data[field] },
      });
      
      if (duplicate) {
        throw new Error(message);
      }
    }
  }
  
  return model.update({
    where: { id },
    data,
  });
}

// Helper function to delete entity with validation
export async function deleteEntity(
  model: any,
  id: string,
  checkRelations: { model: any; field: string; message: string }[] = []
) {
  // Get existing entity
  const existing = await model.findUnique({
    where: { id },
  });
  
  if (!existing) {
    throw new Error('Entity not found');
  }
  
  // Check for related entities
  for (const { model: relatedModel, field, message } of checkRelations) {
    const relatedCount = await relatedModel.count({
      where: { [field]: id },
    });
    
    if (relatedCount > 0) {
      throw new Error(message);
    }
  }
  
  return model.delete({
    where: { id },
  });
}
