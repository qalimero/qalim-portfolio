/**
 * Zod schemas for Strapi API validation
 * Provides runtime validation and type inference for API responses
 */
import { z } from 'zod';

/**
 * Base Strapi content fields (timestamps, locale, etc.)
 */
export const strapiBaseContentSchema = z.object({
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
  publishedAt: z.string().datetime().nullable(),
  locale: z.string().optional(),
});

/**
 * Strapi pagination metadata
 */
export const strapiPaginationSchema = z.object({
  page: z.number().int().positive(),
  pageSize: z.number().int().positive(),
  pageCount: z.number().int().nonnegative(),
  total: z.number().int().nonnegative(),
});

/**
 * Strapi meta wrapper
 */
export const strapiMetaSchema = z.object({
  pagination: strapiPaginationSchema.optional(),
});

/**
 * Generic Strapi data wrapper
 */
export const strapiDataSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    id: z.number().int().positive(),
    attributes: dataSchema,
  });

/**
 * Generic Strapi response wrapper for single items
 */
export const strapiResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: strapiDataSchema(dataSchema),
    meta: strapiMetaSchema,
  });

/**
 * Generic Strapi response wrapper for arrays
 */
export const strapiArrayResponseSchema = <T extends z.ZodTypeAny>(dataSchema: T) =>
  z.object({
    data: z.array(strapiDataSchema(dataSchema)),
    meta: strapiMetaSchema,
  });

/**
 * Strapi media format schema
 */
export const strapiMediaFormatSchema = z.object({
  name: z.string(),
  hash: z.string(),
  ext: z.string(),
  mime: z.string(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  size: z.number().positive(),
  url: z.string().url(),
});

/**
 * Strapi media schema (images, videos, etc.)
 */
export const strapiMediaSchema = z.object({
  name: z.string(),
  alternativeText: z.string().nullable(),
  caption: z.string().nullable(),
  width: z.number().int().positive(),
  height: z.number().int().positive(),
  formats: z
    .object({
      thumbnail: strapiMediaFormatSchema.optional(),
      small: strapiMediaFormatSchema.optional(),
      medium: strapiMediaFormatSchema.optional(),
      large: strapiMediaFormatSchema.optional(),
    })
    .optional(),
  hash: z.string(),
  ext: z.string(),
  mime: z.string(),
  size: z.number().positive(),
  url: z.string().url(),
  previewUrl: z.string().url().nullable(),
  provider: z.string(),
  createdAt: z.string().datetime(),
  updatedAt: z.string().datetime(),
});

/**
 * SEO component schema
 */
export const strapiSeoSchema = z.object({
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  keywords: z.string().optional(),
  metaImage: z
    .object({
      data: strapiDataSchema(strapiMediaSchema).nullable(),
    })
    .optional(),
  canonicalURL: z.string().url().optional(),
});

/**
 * Marquee item schema - matches your component props
 */
export const marqueeItemSchema = z.object({
  listItem: z.string().min(1, 'List item cannot be empty'),
  linkItem: z.string().url().nullable().optional(),
});

/**
 * Marquee component schema
 */
export const marqueeSchema = z.object({
  items: z.array(marqueeItemSchema).min(1, 'Marquee must have at least one item'),
  speed: z.number().positive().default(1),
  direction: z.enum(['left', 'right']).default('left'),
});

/**
 * Maintenance page content schema
 */
export const maintenanceContentSchema = strapiBaseContentSchema.extend({
  title: z.string().min(1, 'Title is required'),
  message: z.string().optional(),
  marquee: z.array(marqueeItemSchema).default([]),
});

/**
 * Full maintenance page response schema
 */
export const maintenancePageResponseSchema = z.object({
  data: maintenanceContentSchema,
});

// Type exports inferred from schemas
export type StrapiBaseContent = z.infer<typeof strapiBaseContentSchema>;
export type StrapiPagination = z.infer<typeof strapiPaginationSchema>;
export type StrapiMeta = z.infer<typeof strapiMetaSchema>;
export type StrapiMedia = z.infer<typeof strapiMediaSchema>;
export type StrapiMediaFormat = z.infer<typeof strapiMediaFormatSchema>;
export type StrapiSeo = z.infer<typeof strapiSeoSchema>;
export type MarqueeItem = z.infer<typeof marqueeItemSchema>;
export type Marquee = z.infer<typeof marqueeSchema>;
export type MaintenanceContent = z.infer<typeof maintenanceContentSchema>;
export type MaintenancePageResponse = z.infer<typeof maintenancePageResponseSchema>;

/**
 * Helper type for Strapi data wrapper
 */
export type StrapiData<T> = {
  id: number;
  attributes: T;
};

/**
 * Helper type for Strapi response
 */
export type StrapiResponse<T> = {
  data: StrapiData<T>;
  meta: StrapiMeta;
};

/**
 * Helper type for Strapi array response
 */
export type StrapiArrayResponse<T> = {
  data: StrapiData<T>[];
  meta: StrapiMeta;
};
