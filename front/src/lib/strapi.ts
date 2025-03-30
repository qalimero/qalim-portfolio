// src/lib/strapi.ts
import type { StrapiResponse, StrapiArrayResponse, MaintenanceContent } from './../interfaces/strapi';

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

    const response = await fetch(`${STRAPI_URL}/api/${endpoint}`, mergedOptions);

    if (!response.ok) {
        throw new Error(`Une erreur est survenue: ${response.status}`);
    }

    const data = await response.json();
    return data as T;
}

/**
 * Récupère les données de la page de maintenance
 */
export async function getMaintenancePage(): Promise<StrapiResponse<MaintenanceContent>> {
    return fetchAPI<StrapiResponse<MaintenanceContent>>(
        'maintenance-page?populate=*'
    );
}

/**
 * Récupère tous les articles
 */
export async function getArticles() {
    return fetchAPI<StrapiArrayResponse<any>>(
        'articles?populate=*'
    );
}

/**
 * Récupère un article par son slug
 */
export async function getArticleBySlug(slug: string) {
    const response = await fetchAPI<StrapiArrayResponse<any>>(
        `articles?filters[slug][$eq]=${slug}&populate=*`
    );
    return response.data[0];
}

/**
 * Récupère toutes les pages
 */
export async function getPages() {
    return fetchAPI<StrapiArrayResponse<any>>(
        'pages?populate=*'
    );
}

/**
 * Récupère une page par son slug
 */
export async function getPageBySlug(slug: string) {
    const response = await fetchAPI<StrapiArrayResponse<any>>(
        `pages?filters[slug][$eq]=${slug}&populate=*`
    );
    return response.data[0];
}

/**
 * Construit l'URL complète d'une image Strapi
 */
export function getStrapiMedia(url: string): string {
    if (!url) return '';
    if (url.startsWith('http') || url.startsWith('//')) return url;
    return `${STRAPI_URL}${url}`;
}