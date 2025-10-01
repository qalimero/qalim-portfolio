// src/lib/strapi.ts
import { strapi } from '@strapi/client';
import type {
  StrapiResponse,
  MaintenanceContent,
} from '../../interfaces/strapi';

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';

// Initialize the official Strapi client
export const strapiClient = strapi({ 
  baseURL: `${STRAPI_URL}/api` 
});

/**
 * Utility functions for common Strapi operations
 */

// Get maintenance page data using the official client
export async function getMaintenancePage() {
  try {
    return await strapiClient.single('maintenance').find();
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


