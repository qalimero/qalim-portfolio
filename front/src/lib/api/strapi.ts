// src/lib/strapi.ts
import { strapi } from '@strapi/client';
import type {
  StrapiResponse,
  MaintenanceContent,
} from '../../interfaces/strapi';
import { apiCache } from './cache';

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';

// Initialize the official Strapi client
export const strapiClient = strapi({
  baseURL: `${STRAPI_URL}/api`
});

/**
 * Utility functions for common Strapi operations
 */

// Get maintenance page data using the official client with caching
export async function getMaintenancePage() {
  const cacheKey = 'maintenance-page';

  // Try to get from cache first
  const cached = apiCache.get(cacheKey);
  if (cached) {
    console.log('Returning cached maintenance data');
    return cached;
  }

  try {
    const data = await strapiClient.single('maintenance').find({ populate: '*' });
    // Cache for 5 minutes
    apiCache.set(cacheKey, data, 5 * 60 * 1000);
    return data;
  } catch (error) {
    console.error('Error fetching maintenance data:', error);
    throw error;
  }
}

// Test connection to Strapi backend
export async function testStrapiConnection(): Promise<boolean> {
  try {
    await strapiClient.single('maintenance').find();
    return true;
  } catch (error) {
    console.error('Strapi connection test failed:', error);
    return false;
  }
}

// Generic fetch function using the official client
export async function fetchStrapiData(endpoint: string, options: any = {}) {
  try {
    return await strapiClient.fetch(endpoint, options);
  } catch (error) {
    console.error(`Error fetching data from ${endpoint}:`, error);
    throw error;
  }
}


