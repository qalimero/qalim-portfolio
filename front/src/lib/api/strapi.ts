/**
 * Type-safe Strapi API client with Zod validation
 * Provides runtime validation and type safety for all API calls
 */
import { strapi } from '@strapi/client';
import { z } from 'zod';
import {
  maintenancePageResponseSchema,
  type MaintenancePageResponse,
  type MaintenanceContent,
  type PopinComponent,
} from '../schemas/strapi.schema';
import { apiCache } from './cache';
import { env } from '../env';

// Initialize the official Strapi client with validated env
export const strapiClient = strapi({
  baseURL: `${env.STRAPI_URL}/api`,
});

/**
 * Generic function to fetch and validate Strapi data
 * @param key - Cache key
 * @param fetcher - Function that fetches data
 * @param schema - Zod schema for validation
 * @param cacheDuration - Cache duration in milliseconds
 */
async function fetchWithValidation<T>(
  key: string,
  fetcher: () => Promise<unknown>,
  schema: z.ZodSchema<T>,
  cacheDuration = 5 * 60 * 1000 // 5 minutes default
): Promise<T> {
  // Try to get from cache first
  const cached = apiCache.get(key);
  if (cached) {
    if (import.meta.env.DEV) {
      console.log(`Returning cached data for: ${key}`);
    }
    // Validate cached data to ensure type safety
    return schema.parse(cached);
  }

  try {
    // Fetch raw data
    const rawData = await fetcher();

    // Validate with Zod schema
    const validatedData = schema.parse(rawData);

    // Cache the validated data
    apiCache.set(key, validatedData, cacheDuration);

    return validatedData;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`Validation error for ${key}:`, error.errors);
      throw new Error(`Invalid data format received from Strapi: ${error.message}`);
    }
    console.error(`Error fetching data for ${key}:`, error);
    throw error;
  }
}

/**
 * Get maintenance page data with validation
 * Populates all nested components (marquee, popinInfo)
 * Returns type-safe and validated data
 */
export async function getMaintenancePage(): Promise<MaintenancePageResponse> {
  return fetchWithValidation(
    'qyu-is-coming-page',
    () => strapiClient.single('qyu-is-coming').find({
      populate: '*', // Populate all components
    }),
    maintenancePageResponseSchema,
    5 * 60 * 1000 // 5 minutes cache
  );
}

/**
 * Test connection to Strapi backend
 * Returns true if connection is successful
 */
export async function testStrapiConnection(): Promise<boolean> {
  try {
    await strapiClient.single('qyu-is-coming').find();
    return true;
  } catch (error) {
    console.error('Strapi connection test failed:', error);
    return false;
  }
}

/**
 * Generic fetch function with optional validation
 * @param endpoint - API endpoint
 * @param options - Fetch options
 * @param schema - Optional Zod schema for validation
 */
export async function fetchStrapiData<T = unknown>(
  endpoint: string,
  options: any = {},
  schema?: z.ZodSchema<T>
): Promise<T> {
  try {
    const data = await strapiClient.fetch(endpoint, options);

    // If schema provided, validate the data
    if (schema) {
      return schema.parse(data);
    }

    return data as T;
  } catch (error) {
    if (error instanceof z.ZodError) {
      console.error(`Validation error for ${endpoint}:`, error.errors);
      throw new Error(`Invalid data format: ${error.message}`);
    }
    console.error(`Error fetching data from ${endpoint}:`, error);
    throw error;
  }
}

/**
 * Clear cache for a specific key or all cache
 * Useful for development or when you need fresh data
 */
export function clearStrapiCache(key?: string): void {
  if (key) {
    apiCache.delete(key);
    if (import.meta.env.DEV) {
      console.log(`Cache cleared for: ${key}`);
    }
  } else {
    apiCache.clear();
    if (import.meta.env.DEV) {
      console.log('All Strapi cache cleared');
    }
  }
}


