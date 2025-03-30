// src/lib/strapi.ts
import type { StrapiResponse, MaintenanceContent } from '../../interfaces/strapi';

const STRAPI_URL = import.meta.env.STRAPI_URL || 'http://localhost:1337';

// Options des requêtes API
interface FetchOptions extends RequestInit {
    headers?: HeadersInit;
}

/**
 * Fonction générique pour les appels à l'API Strapi
 */
export async function fetchAPI<T>(
    endpoint: string,
    options: FetchOptions = {}
): Promise<T> {
    const defaultOptions: FetchOptions = {
        headers: {
            'Content-Type': 'application/json',
        },
    };

    const mergedOptions = {
        ...defaultOptions,
        ...options,
    };

    try {
        const response = await fetch(`${STRAPI_URL}/api/${endpoint}`, mergedOptions);

        if (!response.ok) {
            throw new Error(`Une erreur est survenue: ${response.status}`);
        }

        const data = await response.json();
        return data as T;
    } catch (error) {
        console.error(`Erreur lors de l'appel API: ${error}`);
        throw error;
    }
}

/**
 * Récupère les données de la page de maintenance
 */
export async function getMaintenancePage(): Promise<StrapiResponse<MaintenanceContent>> {
    try {
        return await fetchAPI<StrapiResponse<MaintenanceContent>>(
            'maintenance?populate=*'
        );
    } catch (error) {
        console.error(`Erreur lors de la récupération de la page de maintenance: ${error}`);
    }
}

// Autres fonctions...