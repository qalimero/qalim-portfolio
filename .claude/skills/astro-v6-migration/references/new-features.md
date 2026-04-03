# Nouvelles fonctionnalités — Astro V6

## 1. Fonts API (stable)

Configuration centralisée des polices depuis `astro.config.mjs`.
Astro gère automatiquement : téléchargement, self-hosting, fallbacks optimisés, preload hints.

```ts
// astro.config.mjs
import { defineConfig, fontProviders } from 'astro/config';

export default defineConfig({
  fonts: [
    {
      name: 'Roboto',
      cssVariable: '--font-roboto',
      provider: fontProviders.fontsource(),
    },
    {
      name: 'Inter',
      cssVariable: '--font-inter',
      provider: fontProviders.google(),
    },
  ],
});
```

```astro
---
// src/layouts/BaseLayout.astro
import { Font } from 'astro:assets';
---
<head>
  <Font cssVariable="--font-roboto" preload />
  <style is:global>
    body { font-family: var(--font-roboto); }
  </style>
</head>
```

📖 [Guide des fonts](https://docs.astro.build/en/guides/fonts/)

---

## 2. Live Content Collections (stable)

Contenu fetché à la requête (plus de rebuild nécessaire). Compatible avec le même API que les
collections build-time (`getCollection()`, `getEntry()`, schemas, loaders).

```ts
// src/live.config.ts  ← nouveau fichier dédié
import { defineLiveCollection } from 'astro:content';
import { z } from 'astro/zod';

const blog = defineLiveCollection({
  loader: myApiLoader({ apiKey: import.meta.env.API_KEY }),
  schema: z.object({
    slug: z.string(),
    title: z.string(),
    content: z.string(),
    publishedAt: z.coerce.date(),
  }),
});

export const collections = { blog };
```

```astro
---
// src/pages/blog/[slug].astro
import { getLiveEntry } from 'astro:content';

const { entry, error } = await getLiveEntry('blog', Astro.params.slug);
if (error || !entry) return Astro.redirect('/404');
---
<h1>{entry.data.title}</h1>
```

📖 [Guide content collections](https://docs.astro.build/en/guides/content-collections/)

---

## 3. Content Security Policy (stable)

Astro est l'un des premiers meta-frameworks à offrir un CSP built-in pour les pages statiques
et dynamiques. Astro hash automatiquement tous les scripts et styles.

### Configuration minimale

```ts
// astro.config.mjs
export default defineConfig({
  security: { csp: true },
});
```

### Configuration avancée

```ts
export default defineConfig({
  security: {
    csp: {
      algorithm: 'SHA-512',
      directives: [
        "default-src 'self'",
        "img-src 'self' https://images.cdn.example.com",
      ],
    },
  },
});
```

📖 [Référence security config](https://docs.astro.build/en/reference/configuration-reference/#security)

---

## 4. Experimental: Compilateur Rust

Remplaçant du compilateur Go pour les fichiers `.astro`. Plus rapide, meilleurs diagnostics.

```bash
npm install @astrojs/compiler-rs
```

```ts
// astro.config.mjs
export default defineConfig({
  experimental: {
    rustCompiler: true,
  },
});
```

📖 [Doc compilateur Rust](https://docs.astro.build/en/reference/experimental-flags/rust-compiler/)

---

## 5. Experimental: Queued Rendering

Nouveau moteur de rendu deux passes — jusqu'à **2x plus rapide** que le rendu récursif actuel.
Prévu comme défaut dans Astro v7.

```ts
export default defineConfig({
  experimental: {
    queuedRendering: {
      enabled: true,
    },
  },
});
```

📖 [Doc queued rendering](https://docs.astro.build/en/reference/experimental-flags/queued-rendering/)

---

## 6. Experimental: Route Caching

API de cache SSR platform-agnostic avec sémantique web standard.

```ts
// astro.config.mjs
import { defineConfig, memoryCache } from 'astro/config';

export default defineConfig({
  experimental: {
    cache: { provider: memoryCache() },
  },
});
```

```astro
---
// Dans une page ou route SSR
Astro.cache.set({
  maxAge: 120,      // Cache 2 minutes
  swr: 60,          // Stale-while-revalidate 1 minute
  tags: ['home'],   // Tags pour invalidation ciblée
});
---
```

**Intégration automatique avec Live Collections :** quand une entrée de contenu change,
les pages qui en dépendent sont invalidées automatiquement.

```ts
const product = await getEntry('products', Astro.params.slug);
Astro.cache.set(product);  // Invalidation auto quand product change
```

📖 [Doc route caching](https://docs.astro.build/en/reference/experimental-flags/route-caching/)

---

## 7. Dev server amélioré (Vite Environment API)

- `astro dev` peut maintenant exécuter le runtime de production exact pendant le développement
- Support complet de Cloudflare Workers (`workerd`) en dev — plus de surprises "works in dev, breaks in prod"
- Accès aux bindings Cloudflare (KV, D1, R2, Durable Objects) directement en développement
