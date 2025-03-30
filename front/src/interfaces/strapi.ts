// src/interfaces/strapi.ts

// Interfaces de base pour les réponses de l'API Strapi
export interface StrapiResponse<T> {
    data: StrapiData<T>;
    meta: StrapiMeta;
}

export interface StrapiArrayResponse<T> {
    data: StrapiData<T>[];
    meta: StrapiMeta;
}

export interface StrapiData<T> {
    id: number;
    attributes: T;
}

export interface StrapiMeta {
    pagination?: {
        page: number;
        pageSize: number;
        pageCount: number;
        total: number;
    };
    // Autres métadonnées possibles
}

// Interface pour les relations dans Strapi
export interface StrapiRelation<T> {
    data: StrapiData<T> | null;
}

export interface StrapiArrayRelation<T> {
    data: StrapiData<T>[];
}

// Interface pour les médias
export interface StrapiMedia {
    name: string;
    alternativeText: string | null;
    caption: string | null;
    width: number;
    height: number;
    formats: {
        thumbnail?: StrapiMediaFormat;
        small?: StrapiMediaFormat;
        medium?: StrapiMediaFormat;
        large?: StrapiMediaFormat;
    };
    hash: string;
    ext: string;
    mime: string;
    size: number;
    url: string;
    previewUrl: string | null;
    provider: string;
    createdAt: string;
    updatedAt: string;
}

export interface StrapiMediaFormat {
    name: string;
    hash: string;
    ext: string;
    mime: string;
    width: number;
    height: number;
    size: number;
    url: string;
}

// Interface générique pour tout type de contenu avec champs communs
export interface StrapiBaseContent {
    createdAt: string;
    updatedAt: string;
    publishedAt: string;
    locale?: string;
    localizations?: StrapiArrayRelation<StrapiBaseContent>;
}

// Interface pour les SEO (utilisable dans plusieurs types de contenu)
export interface StrapiSeo {
    metaTitle?: string;
    metaDescription?: string;
    keywords?: string;
    metaImage?: StrapiRelation<StrapiMedia>;
    canonicalURL?: string;
}

// Interface pour un composant de lien social
export interface SocialLink {
    platform: string;
    url: string;
    icon: string;
}

// Types spécifiques qui étendent les interfaces de base
// Type pour la page de maintenance
export interface MaintenanceContent extends StrapiBaseContent {
    title: string;
    message: string; // Contenu richtext (Markdown)
    image: StrapiRelation<StrapiMedia>;
    isMaintenance: boolean;
}

// Type pour un article de blog (comme exemple d'extension)
export interface ArticleContent extends StrapiBaseContent {
    title: string;
    slug: string;
    content: string; // Contenu richtext (Markdown)
    excerpt?: string;
    coverImage: StrapiRelation<StrapiMedia>;
    categories?: StrapiArrayRelation<CategoryContent>;
    author?: StrapiRelation<AuthorContent>;
    seo?: StrapiSeo;
}

// Types additionnels pour compléter les relations
export interface CategoryContent extends StrapiBaseContent {
    name: string;
    slug: string;
    description?: string;
}

export interface AuthorContent extends StrapiBaseContent {
    name: string;
    bio?: string;
    avatar?: StrapiRelation<StrapiMedia>;
}