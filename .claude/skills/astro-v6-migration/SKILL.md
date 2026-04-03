---
name: astro-v6-migration
description: >
  Guide complet pour migrer un projet Astro de la v5 vers la v6. Utilise ce skill dès que l'utilisateur
  mentionne une migration Astro v5→v6, une mise à jour vers Astro 6, des erreurs après upgrade Astro,
  ou veut utiliser les nouvelles fonctionnalités v6 (Fonts API, Live Collections, CSP, Rust compiler).
  Couvre toutes les breaking changes : Node 22 requis, Vite 7, Shiki 4, Zod 4, suppression des
  collections legacy, changements de l'Adapter API, et Cloudflare refactor. Déclenche aussi si
  l'utilisateur demande à utiliser `defineLiveCollection`, `fontProviders`, ou `security.csp`.
---

# Astro V5 → V6 Migration Skill

## Vue d'ensemble

Astro 6 introduit des changements majeurs autour du dev server (Vite Environment API), les Fonts,
les Live Content Collections (stables), le CSP, et un nouveau compilateur Rust expérimental.

**Lire [`references/breaking-changes.md`](references/breaking-changes.md) en premier** pour identifier
les breaking changes applicables au projet.

---

## Étape 1 — Vérifier les prérequis

### Node.js 22 obligatoire

```bash
node --version  # doit être >= 22.12.0
```

> Astro 6 supprime le support de Node 18 et Node 20 (Node 18 est EOL depuis mars 2025,
> Node 20 approche son EOL en avril 2026).

Si la version est insuffisante :
- Mettre à jour Node localement (`.nvmrc`, `volta`, `nvm`)
- Sur **Netlify** : ajouter `NODE_VERSION=22` dans les variables d'env ou dans `netlify.toml`

---

## Étape 2 — Lancer l'upgrade automatique

```bash
# Méthode recommandée (gère les intégrations automatiquement)
npx @astrojs/upgrade

# Méthode manuelle
npm install astro@latest
```

Puis vérifier que toutes les intégrations `@astrojs/*` sont aussi mises à jour.

---

## Étape 3 — Corriger les breaking changes

Consulter [`references/breaking-changes.md`](references/breaking-changes.md) pour le détail complet.

### Résumé rapide des changements critiques

| Changement | Action requise |
|---|---|
| Node < 22 | Mettre à jour Node → 22.12.0+ |
| Vite 7 | Vérifier plugins Vite custom |
| Shiki 4 | Vérifier config `<Code />` et Markdown |
| Zod 4 | Importer depuis `astro/zod` (pas `astro:content`) |
| Collections legacy | Migrer vers Content Layer API (ou activer `legacy.collectionsBackwardsCompat`) |
| `@astrojs/cloudflare` | Refactor complet — lire section dédiée |
| `emitESMImage()` | Supprimé — utiliser l'asset pipeline standard |

---

## Étape 4 — Nouvelles fonctionnalités disponibles

Pour utiliser les nouvelles fonctionnalités v6, lire [`references/new-features.md`](references/new-features.md) :

- **Fonts API** — configuration centralisée des polices Google/Fontsource
- **Live Content Collections** — contenu CMS sans rebuild
- **Content Security Policy** — CSP automatique hash-based
- **Experimental: Rust Compiler** — remplaçant du compilateur Go
- **Experimental: Queued Rendering** — jusqu'à 2x plus rapide
- **Experimental: Route Caching** — cache SSR platform-agnostic

---

## Étape 5 — Vérifier le build

```bash
npm run build
npm run preview
```

Si des erreurs apparaissent sur les collections de contenu :
```ts
// astro.config.mjs — solution temporaire
export default defineConfig({
  legacy: {
    collectionsBackwardsCompat: true,
  },
});
```
> ⚠️ Ce flag est temporaire. Migrer vers Content Layer API dès que possible.

---

## Ressources officielles

- [Blog Astro 6.0](https://astro.build/blog/astro-6/)
- [Guide de migration officiel](https://docs.astro.build/en/guides/upgrade-to/v6/)
- [Changelog complet](https://github.com/withastro/astro/releases)
