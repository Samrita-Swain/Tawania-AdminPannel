import { prisma } from './db';

/**
 * Executes a Prisma query with retry logic
 * @param queryFn Function that executes the Prisma query
 * @param maxRetries Maximum number of retry attempts
 * @param retryDelay Delay between retries in milliseconds
 * @returns Result of the query
 */
export async function executeWithRetry<T>(
  queryFn: () => Promise<T>,
  maxRetries: number = 3,
  retryDelay: number = 1000
): Promise<T> {
  let lastError: any;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await queryFn();
    } catch (error: any) {
      lastError = error;
      
      // Check if error is related to database connection
      const isConnectionError = 
        error.message.includes("Can't reach database server") ||
        error.message.includes("Connection refused") ||
        error.message.includes("Connection terminated unexpectedly");
      
      if (!isConnectionError || attempt >= maxRetries) {
        throw error;
      }
      
      console.warn(`Database connection attempt ${attempt} failed. Retrying in ${retryDelay}ms...`);
      
      // Wait before retrying
      await new Promise(resolve => setTimeout(resolve, retryDelay));
      
      // Increase delay for next attempt (exponential backoff)
      retryDelay *= 2;
    }
  }
  
  throw lastError;
}
