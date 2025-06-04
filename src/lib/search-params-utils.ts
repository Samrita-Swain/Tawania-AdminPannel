/**
 * Utility functions for handling search parameters in Next.js
 * Fixes the issue with symbol properties being passed to client components
 */

/**
 * Sanitizes search parameters by removing symbol properties
 * This prevents the "Objects with symbol properties like async_id_symbol are not supported" error
 * when passing searchParams to client components
 */
export function sanitizeSearchParams(
  searchParams: { [key: string]: string | string[] | undefined }
): Record<string, string> {
  const cleanParams: Record<string, string> = {};
  
  // Only include string values and exclude symbol properties
  Object.keys(searchParams).forEach(key => {
    const value = searchParams[key];
    if (typeof value === 'string' && value.length > 0) {
      cleanParams[key] = value;
    }
  });
  
  return cleanParams;
}

/**
 * Creates pagination query parameters for Next.js Link components
 * Ensures no symbol properties are included
 */
export function createPaginationQuery(
  searchParams: { [key: string]: string | string[] | undefined },
  page: number
): Record<string, string | number> {
  const cleanParams = sanitizeSearchParams(searchParams);
  return {
    ...cleanParams,
    page,
  };
}

/**
 * Extracts and validates pagination parameters from search params
 */
export function extractPaginationParams(
  searchParams: { [key: string]: string | string[] | undefined }
) {
  const page = parseInt((searchParams.page as string) || "1");
  const pageSize = 10; // Default page size
  
  return {
    page: Math.max(1, page), // Ensure page is at least 1
    pageSize,
  };
}

/**
 * Extracts common filter parameters from search params
 */
export function extractFilterParams(
  searchParams: { [key: string]: string | string[] | undefined }
) {
  return {
    search: searchParams.search as string | undefined,
    status: searchParams.status as string | undefined,
    category: searchParams.category as string | undefined,
    store: searchParams.store as string | undefined,
    warehouse: searchParams.warehouse as string | undefined,
  };
}
