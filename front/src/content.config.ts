import { defineCollection } from "astro:content";
import { z } from "astro/zod";
import { file } from "astro/loaders";

export const marqueeItemSchema = z.object({
  listItem: z.string().min(1),
  linkItem: z.string().url().nullable().optional(),
});

export type MarqueeItem = z.infer<typeof marqueeItemSchema>;

export const buttonCtaSchema = z.object({
  label: z.string().min(1),
  href: z.string().optional(),
  icon: z.string().optional(),
});
export type ButtonCta = z.infer<typeof buttonCtaSchema>;

const siteConfigCollection = defineCollection({
  loader: file("src/content/site.config.json", {
    parser: (text) => {
      const data = JSON.parse(text);
      return [{ id: "main", ...data }];
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
        }),
      )
      .optional(),
    cta: buttonCtaSchema.optional(),
  }),
});

export const collections = {
  siteConfig: siteConfigCollection,
};
