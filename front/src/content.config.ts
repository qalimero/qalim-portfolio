import { defineCollection } from 'astro:content';
import { z } from 'astro/zod';
import { file } from 'astro/loaders';

export const marqueeItemSchema = z.object({
  listItem: z.string().min(1),
  linkItem: z.string().url().nullable().optional(),
});

export type MarqueeItem = z.infer<typeof marqueeItemSchema>;

const siteConfigCollection = defineCollection({
  loader: file('src/content/site.config.json', {
    parser: (text) => {
      const data = JSON.parse(text);
      return [{ id: 'main', ...data }];
    },
  }),
  schema: z.object({
    title: z.string().min(1),
    marquee: z.array(marqueeItemSchema).min(1),
    popinInfo: z
      .array(
        z.object({
          title: z.string().min(1),
          text: z.string(),
          closable: z.boolean().default(true),
        })
      )
      .optional(),
  }),
});

export const collections = {
  siteConfig: siteConfigCollection,
};
