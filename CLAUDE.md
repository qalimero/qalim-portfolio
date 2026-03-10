# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Portfolio application ("Qyu Is Coming") — Astro static frontend. Displays a maintenance/coming-soon page with a Three.js/Spline 3D scene and a CMS-driven popin. Content is managed via Decap CMS (GitHub-connected), stored in `src/content/site.config.json`.

Node version: **v22.14.0** (see `.nvmrc`). All commands run from `front/`.

---

## Commands

```bash
npm run dev           # Astro dev server (http://localhost:4321)
npm run build         # Static build → dist/
npm run preview       # Preview built output
npm run type-check    # TypeScript + Astro type checking (astro check)
npm run build:tokens  # Compile design tokens via Style Dictionary
npm run tokens        # Run token generation script (generate-tokens.js)
```

### Linting

Biome is used instead of ESLint/Prettier:

```bash
npx biome check .           # Lint + format check
npx biome check --write .   # Auto-fix
```

### Decap CMS (local editing)

```bash
npx decap-server   # Start local CMS backend (then uncomment local_backend in public/admin/config.yml)
```

---

## Architecture

### Project Structure

```
quentin/
└── front/              # Astro static frontend (the only project)
    ├── src/
    │   ├── content/    # Content collections
    │   │   ├── config.ts          # Collection schemas (Zod)
    │   │   └── site.config.json   # All editable site content
    │   ├── pages/
    │   │   └── maintenance.astro  # Only routed page
    │   ├── components/
    │   │   ├── scenes/ThreeScene.jsx   # Three.js/Spline scene (React, client:load)
    │   │   └── ui/                    # Popin.astro, Marquee.astro
    │   ├── layouts/Layout.astro
    │   ├── lib/
    │   │   ├── env.ts             # Lazy Zod-validated env vars
    │   │   └── three/             # createRenderer, createCamera, initSplineScene, loadCard
    │   ├── styles/                # SCSS + BEM
    │   │   └── tokens/            # Compiled CSS custom properties
    │   ├── data/design-tokens/    # W3C DTCG JSON tokens → compiled via Style Dictionary
    │   └── middleware.ts          # Request logging, security headers, maintenance redirect
    └── public/
        └── admin/                 # Decap CMS (index.html + config.yml)
```

### Data Flow

```
src/content/site.config.json
  → Astro content collection (file() loader, Zod-validated)
  → getEntry('siteConfig', 'main') in maintenance.astro
  → Static HTML at build time
```

Edited via Decap CMS at `/admin/` — saves directly to `site.config.json` in the GitHub repo, triggering a rebuild.

### Content Collection

Defined in `src/content/config.ts` with `file()` loader (Astro 5 content layer). The JSON is a flat object; the loader wraps it as entry `id: 'main'`. `MarqueeItem` type is exported from `config.ts` and used by `Marquee.astro`.

To change the content schema:
1. Update `config.ts` (Zod schema)
2. Update `site.config.json` to match
3. Update `public/admin/config.yml` (Decap CMS fields)

### Routing

`/` redirects to `/maintenance` via `redirects` in `astro.config.mjs`. `maintenance.astro` is the only real page. `output: 'static'` — all pages pre-rendered at build time.

### Middleware (`src/middleware.ts`)

Runs at request time (dev server / preview). Handles:
- Dev request logging
- `PUBLIC_MAINTENANCE_MODE` redirect to `/maintenance`
- Security response headers (X-Frame-Options, CSP-adjacent headers)

### Styling Architecture

- **SCSS + BEM** — component styles in `styles/components/`, page styles in `styles/pages/`
- **Tailwind CSS** with DaisyUI — `applyBaseStyles: false` to avoid conflicts with SCSS resets
- **Design tokens** — W3C DTCG JSON in `src/data/design-tokens/` → compiled to CSS vars in `styles/tokens/` and a Tailwind theme export via Style Dictionary

### Vite / Build

Three.js, GSAP, and Spline are split into named manual chunks in `astro.config.mjs` to optimize caching.

---

## Environment Variables

```
# front/.env
PUBLIC_MAINTENANCE_MODE=true   # Redirects all routes → /maintenance via middleware
PUBLIC_SITE_URL=               # Optional canonical URL
```

---

## Key Conventions

- **Content edits:** Always go through `src/content/site.config.json`. Do not hardcode content in components or pages.
- **Env vars:** Access via `front/src/lib/env.ts`, not `import.meta.env` directly.
- **Types:** `MarqueeItem` and collection schemas live in `src/content/config.ts`.
- **Styling:** BEM for SCSS class names. No style logic in pages — use component/page SCSS files.
- **Components:** Reuse existing components before creating new ones.
- **Documentation:** Single source of documentation named `docs`. Never create multiple documentation files; delete any documentation file not named `docs`.
- **Commits:** Conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`).
- **Linting:** Biome only (no ESLint).
