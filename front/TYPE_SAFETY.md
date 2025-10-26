# Type Safety & Modern Astro Patterns

Ce document explique les améliorations apportées au typage et aux patterns Astro du projet.

## 📋 Table des matières

1. [Validation des variables d'environnement](#validation-des-variables-denvironnement)
2. [Schémas Zod pour Strapi](#schémas-zod-pour-strapi)
3. [API Client type-safe](#api-client-type-safe)
4. [Middleware avec typed context](#middleware-avec-typed-context)
5. [Composants avec validation](#composants-avec-validation)
6. [Utilisation dans vos pages](#utilisation-dans-vos-pages)

---

## Validation des variables d'environnement

### Fichier: `src/lib/env.ts`

Toutes les variables d'environnement sont maintenant validées avec Zod au démarrage de l'application.

**Utilisation:**
```typescript
import { env, isProduction, isDevelopment } from '@/lib/env';

// Variables validées et typées
const strapiUrl = env.STRAPI_URL; // string (URL)
const siteUrl = env.PUBLIC_SITE_URL; // string | undefined

// Utilitaires
if (isDevelopment()) {
  console.log('Mode développement');
}
```

**Avantages:**
- ✅ Typage strict des env vars
- ✅ Validation au démarrage (fail-fast)
- ✅ Autocomplete dans votre IDE
- ✅ Erreurs claires si variable manquante

---

## Schémas Zod pour Strapi

### Fichier: `src/lib/schemas/strapi.schema.ts`

Tous les types de données Strapi ont des schémas Zod correspondants.

**Types disponibles:**
```typescript
import {
  maintenanceContentSchema,
  marqueeItemSchema,
  strapiMediaSchema,
  type MaintenanceContent,
  type MarqueeItem,
} from '@/lib/schemas/strapi.schema';
```

**Créer un nouveau schéma:**
```typescript
// Définir le schéma
export const myContentSchema = strapiBaseContentSchema.extend({
  title: z.string().min(1),
  description: z.string().optional(),
  image: strapiMediaSchema.optional(),
});

// Exporter le type inféré
export type MyContent = z.infer<typeof myContentSchema>;
```

---

## API Client type-safe

### Fichier: `src/lib/api/strapi.ts`

L'API client Strapi valide automatiquement toutes les réponses.

**Utilisation:**
```typescript
import { getMaintenancePage } from '@/lib/api/strapi';

// Données validées et typées automatiquement
const data = await getMaintenancePage();
// Type: MaintenancePageResponse

// Accès type-safe
const title = data.data.title; // string
const marquee = data.data.marquee; // MarqueeItem[]
```

**Créer une nouvelle fonction API:**
```typescript
export async function getMyContent(): Promise<MyContentResponse> {
  return fetchWithValidation(
    'my-content-cache-key',
    () => strapiClient.single('my-content').find({ populate: '*' }),
    myContentResponseSchema,
    5 * 60 * 1000 // 5min cache
  );
}
```

**Avantages:**
- ✅ Validation runtime des données API
- ✅ Types inférés automatiquement
- ✅ Cache intégré
- ✅ Erreurs claires si format invalide

---

## Middleware avec typed context

### Fichier: `src/middleware.ts`

Le middleware utilise maintenant `context.locals` typé.

**Accès aux données dans vos pages:**
```astro
---
// Dans n'importe quelle page .astro
const { requestId, requestStartTime, maintenanceMode } = Astro.locals;

console.log(`Request ID: ${requestId}`);
console.log(`Request started: ${requestStartTime}`);
---
```

**Ajouter des données au context:**
```typescript
// Dans middleware.ts
declare global {
  namespace App {
    interface Locals {
      myCustomData: string;
    }
  }
}

// Puis dans le middleware
context.locals.myCustomData = "valeur";
```

**Avantages:**
- ✅ Autocomplete de context.locals
- ✅ Type-safe dans toute l'app
- ✅ Performance monitoring intégré
- ✅ Request IDs pour le debugging

---

## Composants avec validation

### Exemple: `src/components/ui/Marquee.astro`

Les props des composants sont validées avec Zod.

**Dans le composant:**
```astro
---
import { z } from 'zod';

const propsSchema = z.object({
  title: z.string(),
  items: z.array(z.string()).min(1),
  speed: z.number().positive().default(1),
});

type Props = z.infer<typeof propsSchema>;

const validatedProps = propsSchema.parse(Astro.props);
---
```

**Utilisation:**
```astro
---
// ✅ Props valides
<Marquee items={["item1", "item2"]} speed={2} />

// ❌ Erreur de validation à la build
<Marquee items={[]} /> <!-- Minimum 1 item requis -->
<Marquee speed={-1} /> <!-- Speed doit être positif -->
---
```

---

## Utilisation dans vos pages

### Pattern complet

```astro
---
/**
 * Ma page avec typage strict
 */
import { getMyContent } from '@/lib/api/strapi';
import type { MyContent } from '@/lib/schemas/strapi.schema';
import MyComponent from '@/components/MyComponent.astro';

// Données avec fallback typé
const FALLBACK_DATA: MyContentResponse = {
  data: {
    title: "Default Title",
    // ... autres champs requis
  }
};

// Fetch avec gestion d'erreur
let data: MyContentResponse;
try {
  data = await getMyContent();
  console.log('✓ Data fetched and validated');
} catch (error) {
  console.error('✗ Error:', error);
  data = FALLBACK_DATA;
}

// Extraction type-safe
const { title, description } = data.data;
---

<MyComponent title={title} description={description} />
```

---

## Checklist pour nouveaux features

Quand vous ajoutez un nouveau type de contenu:

1. ✅ Créer le schéma Zod dans `src/lib/schemas/`
2. ✅ Exporter le type inféré
3. ✅ Créer la fonction API dans `src/lib/api/strapi.ts`
4. ✅ Utiliser `fetchWithValidation` avec votre schéma
5. ✅ Définir des fallbacks typés dans vos pages
6. ✅ Valider les props si c'est un composant

---

## Ressources

- [Zod Documentation](https://zod.dev/)
- [Astro Middleware](https://docs.astro.build/en/guides/middleware/)
- [TypeScript Handbook](https://www.typescriptlang.org/docs/handbook/intro.html)
- [Astro Content Collections](https://docs.astro.build/en/guides/content-collections/)
