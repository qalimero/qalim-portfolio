# Breaking Changes — Astro V5 → V6

## 1. Node.js 22 minimum

**Astro 6 exige Node 22.12.0 ou supérieur.**

```bash
# Vérifier
node --version

# Configurer avec nvm
echo "22" > .nvmrc
nvm use

# Configurer avec volta
volta pin node@22
```

Vérifier aussi l'environnement de déploiement. Sur **Netlify**, spécifier Node 22 via `.nvmrc` ou dans le dashboard (variable `NODE_VERSION=22`), ou dans `netlify.toml` :

```toml
# netlify.toml
[build.environment]
  NODE_VERSION = "22"
```

---

## 2. Vite 7

Astro 6 utilise Vite 7 en interne. Si tu utilises :
- Des plugins Vite personnalisés → vérifier leur compatibilité v7
- `getViteConfig()` de Astro → requires **Vitest 3.2** (Vitest 4 pas encore supporté)
- Des options Vite dans `astro.config.mjs` → consulter le [guide de migration Vite 7](https://vite.dev/guide/migration)

---

## 3. Shiki 4 (syntax highlighting)

Astro 6 utilise Shiki 4 pour la coloration syntaxique dans `<Code />` et les blocs Markdown/MDX.

Si tu utilises des APIs Shiki spécifiques (transformers custom, themes custom) → consulter le
[changelog Shiki 4](https://github.com/shikijs/shiki/releases).

---

## 4. Zod 4

Astro 6 utilise **Zod 4** pour la validation des schémas de content collections.

**Migration obligatoire de l'import :**

```ts
// ❌ Avant (v5)
import { z } from 'astro:content';

// ✅ Après (v6)
import { z } from 'astro/zod';
```

Si tu as des schemas Zod complexes (`.refine()`, `.transform()`, types custom), consulter le
[guide de migration Zod v4](https://zod.dev/v4).

---

## 5. Collections legacy supprimées

Les "legacy collections" (l'ancienne API de content collections avant le Content Layer API d'Astro 5)
ne sont plus supportées en v6.

**Option A — Migration complète (recommandée)**

Suivre le [guide de migration v5](https://docs.astro.build/en/guides/upgrade-to/v5/#legacy-content-collections-to-content-layer-api) pour passer au Content Layer API :

```ts
// src/content.config.ts (nouveau fichier)
import { defineCollection, z } from 'astro:content';
import { glob } from 'astro/loaders';

const blog = defineCollection({
  loader: glob({ pattern: '**/*.md', base: './src/content/blog' }),
  schema: z.object({
    title: z.string(),
    date: z.date(),
  }),
});

export const collections = { blog };
```

**Option B — Flag de compatibilité temporaire**

```ts
// astro.config.mjs
export default defineConfig({
  legacy: {
    collectionsBackwardsCompat: true,
  },
});
```
> ⚠️ Ce flag sera supprimé dans une future version majeure.

---

## 6. Adapter API — changements

### `entrypointResolution` (renommé)

```ts

setAdapter({ entryType: 'legacy-dynamic' })

// ✅ Après (v6 stable)
setAdapter({ entrypointResolution: 'auto' })
```

La valeur par défaut `"explicit"` maintient le comportement v5 pour les adapters existants.
Migrer vers `"auto"` dès que possible.

### `emitESMImage()` supprimée

Cette fonction utilitaire est supprimée. Utiliser le pipeline d'assets standard d'Astro à la place.

---

### Changements principaux

- Le dev server tourne maintenant sur `workerd` (plus de simulation Node.js)
- Accès direct aux bindings KV, D1, R2, Durable Objects en développement

---

## 8. Vite Environment API — intégrations/adapters custom

Si tu maintiens une **intégration ou un adapter personnalisé**, Astro 6 a refactorisé en interne
la gestion des environnements runtime (client, server, prerender) pour utiliser la Vite Environment API.

Les hooks d'intégration et l'Adapter API sont affectés. Consulter le
[guide officiel v6](https://docs.astro.build/en/guides/upgrade-to/v6/) pour les détails.
