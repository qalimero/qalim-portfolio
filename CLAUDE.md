# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Portfolio application ("qyu") — static Astro site serving a coming-soon/maintenance page with a Three.js/Spline 3D scene. Content is managed via local JSON files editable through Decap CMS.

Node version: **v22.14.0** (see `.nvmrc`).

---

## Commands

All commands run from `front/`.

```bash
npm run dev          # Astro dev server (http://localhost:4321)
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run type-check   # TypeScript + Astro type checking (astro check)
```

### Linting & Formatting

```bash
# From front/
npx biome check .           # Lint + format check
npx biome check --write .   # Auto-fix
```

Biome is used instead of ESLint/Prettier. No ESLint config exists.

---

## Architecture

### Structure

```
quentin/
├── front/           # Astro static site
│   ├── src/
│   │   ├── pages/             # maintenance.astro + _layout.astro
│   │   ├── components/
│   │   │   ├── ui/            # Marquee.astro, Popin.astro, Button.astro
│   │   │   ├── shapes/        # Standalone SVG shape components (HexagonShape.astro, …)
│   │   │   └── scenes/        # ThreeScene.jsx (React island)
│   │   ├── layouts/           # Layout.astro (base HTML shell)
│   │   ├── content/           # site.config.json (CMS-editable content)
│   │   ├── content.config.ts  # Astro content collection definition
│   │   ├── lib/
│   │   │   ├── env.ts         # Zod-validated env vars
│   │   │   └── three/         # Three.js scene helpers (unused at build time)
│   │   ├── middleware.ts      # Maintenance mode redirect + security headers
│   │   ├── styles/            # SCSS (BEM), see Styling section
│   └── public/admin/          # Decap CMS admin UI
└── netlify.toml               # Deploy config, redirects, cache/security headers
```

### Data Flow

Content lives in `src/content/site.config.json` and is loaded via Astro Content Collections:

```
site.config.json → content.config.ts (loader + Zod schema) → getEntry('siteConfig', 'main') → maintenance.astro
```

The collection schema is defined in `src/content.config.ts`. **Always update the schema there when `site.config.json` structure changes.**

Decap CMS (`/admin`) provides a browser-based editor for `site.config.json` — changes commit directly to the repo via Git Gateway.

### Output Mode

`output: 'static'` — fully pre-rendered at build time. The `maintenance.astro` page is the only real page; `/` redirects to `/maintenance` via both Netlify config and Astro's `redirects`.

### Middleware

`src/middleware.ts` handles:
- **Maintenance mode redirect** — if `PUBLIC_MAINTENANCE_MODE=true`, all non-`/maintenance` paths redirect to `/maintenance`
- **Security headers** in dev (Netlify applies them in production via `netlify.toml`)
- **Dev logging** — request/response logs with timing

### Styling Architecture

- **SCSS + BEM** only — no Tailwind, no utility classes
- Entry point: `styles/main.scss`, imports all partials
- Organized: `base/`, `components/`, `layouts/`, `pages/`, `tokens/`
- `styles/tokens/tokens.css` defines all CSS custom properties (colors, typography, spacing) — edit this file directly, it is not generated

### React in Astro

`ThreeScene.jsx` is the only React component. It loads the Spline 3D scene client-side (`client:load`). All other components are `.astro`. No React state management; React is used purely for the client-side Three.js lifecycle.

---

## Environment Variables

### Frontend (`.env` in `front/`)

```
PUBLIC_SITE_URL=https://example.com   # optional, for canonical/OG tags
PUBLIC_MAINTENANCE_MODE=true          # enables maintenance redirect in middleware
```

Access via `src/lib/env.ts` (Zod-validated proxy), not `import.meta.env` directly.

---

## Key Conventions

- **Content changes:** Edit `src/content/site.config.json`. Schema is enforced at build time via `src/content.config.ts`.
- **Styling:** BEM for SCSS. Page styles → `styles/pages/`, component styles → `styles/components/`.
- **Env vars:** Always go through `src/lib/env.ts`.
- **Commits:** Conventional commits with required scope: `feat(scope):`, `fix(scope):`, `refactor(scope):`, `chore(scope):`.
- **Documentation:** Single source in `/docs`. Never create docs outside that folder; delete any stray doc files.
- **Components:** Reuse existing components before creating new ones.
