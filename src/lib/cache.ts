import { cache } from 'react';
import { unstable_cache } from 'next/cache';

// Define cache key generator
export function generateCacheKey(prefix: string, params: Record<string, any> = {}) {
  const sortedParams = Object.keys(params)
    .sort()
    .reduce((result, key) => {
      result[key] = params[key];
      return result;
    }, {} as Record<string, any>);

  return `${prefix}:${JSON.stringify(sortedParams)}`;
}

// Cache function with default TTL of 1 minute
export function cacheFunction<T>(
  fn: (...args: any[]) => Promise<T>,
  keyPrefix: string,
  ttl: number = 60 // 60 seconds
) {
  return unstable_cache(
    async (...args: any[]) => {
      try {
        return await fn(...args);
      } catch (error) {
        console.error(`Cache error for ${keyPrefix}:`, error);
        throw error;
      }
    },
    [keyPrefix],
    {
      revalidate: ttl,
    }
  );
}

// Cache data fetching for React components
export const cachedFetch = cache(async (url: string, options?: RequestInit) => {
  try {
    const response = await fetch(url, options);

    if (!response.ok) {
      throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
    }

    return response.json();
  } catch (error) {
    console.error(`Fetch error for ${url}:`, error);
    throw error;
  }
});

// Cache data fetching with custom key and TTL
export async function fetchWithCache<T>(
  url: string,
  options?: RequestInit,
  cacheKey?: string,
  ttl: number = 60 // 60 seconds
): Promise<T> {
  const key = cacheKey || `fetch:${url}`;

  const cachedFetchWithTTL = unstable_cache(
    async () => {
      const response = await fetch(url, options);

      if (!response.ok) {
        throw new Error(`Failed to fetch: ${response.status} ${response.statusText}`);
      }

      return response.json();
    },
    [key],
    {
      revalidate: ttl,
    }
  );

  return cachedFetchWithTTL();
}

// Cache for warehouse data
export const getWarehousesWithCache = cacheFunction(
  async (params: Record<string, any> = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await fetch(`/api/warehouses?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch warehouses: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
  'warehouses',
  300 // 5 minutes
);

// Cache for store data
export const getStoresWithCache = cacheFunction(
  async (params: Record<string, any> = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await fetch(`/api/stores?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch stores: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
  'stores',
  300 // 5 minutes
);

// Cache for product data
export const getProductsWithCache = cacheFunction(
  async (params: Record<string, any> = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await fetch(`/api/products?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch products: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
  'products',
  300 // 5 minutes
);

// Cache for inventory data
export const getInventoryWithCache = cacheFunction(
  async (params: Record<string, any> = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await fetch(`/api/inventory?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch inventory: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
  'inventory',
  60 // 1 minute (shorter TTL for inventory data)
);

// Cache for transfer data
export const getTransfersWithCache = cacheFunction(
  async (params: Record<string, any> = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await fetch(`/api/transfers?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch transfers: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
  'transfers',
  60 // 1 minute (shorter TTL for transfer data)
);

// Cache for sales data
export const getSalesWithCache = cacheFunction(
  async (params: Record<string, any> = {}) => {
    const queryParams = new URLSearchParams();

    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        queryParams.append(key, String(value));
      }
    });

    const response = await fetch(`/api/sales?${queryParams.toString()}`);

    if (!response.ok) {
      throw new Error(`Failed to fetch sales: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
  'sales',
  300 // 5 minutes
);

// Cache for dashboard data
export const getDashboardDataWithCache = cacheFunction(
  async () => {
    const response = await fetch('/api/dashboard');

    if (!response.ok) {
      throw new Error(`Failed to fetch dashboard data: ${response.status} ${response.statusText}`);
    }

    return response.json();
  },
  'dashboard',
  300 // 5 minutes
);
