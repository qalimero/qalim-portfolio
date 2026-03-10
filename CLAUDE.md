# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Portfolio application ("Qyu Is Coming") — monorepo with an Astro SSR frontend and a Strapi v5 headless CMS backend. Currently displays a maintenance/coming-soon page with a Three.js/Spline 3D scene and CMS-driven popins.

Node version: **v22.14.0** (see `.nvmrc`).

---

## Commands

All commands must be run from the respective subdirectory unless stated otherwise.

### Frontend (`cd front/`)

```bash
npm run dev          # Astro dev server (http://localhost:4321)
npm run build        # Production build
npm run preview      # Preview production build
npm run type-check   # TypeScript + Astro type checking (astro check)
npm run build:tokens # Compile design tokens via Style Dictionary
npm run tokens       # Run token generation script (generate-tokens.js)
npm run security:check # Bundle security audit
```

### Backend (`cd backend/`)

```bash
npm run develop      # Strapi dev server with auto-reload (http://localhost:1337)
npm run build        # Build Strapi admin panel
npm run start        # Start in production mode
npm run console      # Node REPL with Strapi context
```

### Linting & Formatting

Biome is used instead of ESLint/Prettier (frontend only):

```bash
# From front/
npx biome check .           # Lint + format check
npx biome check --write .   # Auto-fix
```

---

## Architecture

### Monorepo Structure

```
quentin/
├── front/       # Astro frontend (SSR, Node adapter)
└── backend/     # Strapi v5 CMS
```

### Frontend (`front/src/`)

- **`pages/`** — Astro pages (`index.astro`, `maintenance.astro`). Pages fetch CMS data server-side at request time.
- **`components/ui/`** — Reusable Astro components (`Popin.astro` using `<dialog>`, `Marquee.astro`).
- **`layouts/`** — Page wrappers (`Layout.astro`).
- **`lib/api/strapi.ts`** — Strapi API client using `@strapi/client` with in-memory caching (5-min TTL) and Zod validation. Main functions: `getMaintenancePage()`, `fetchStrapiData<T>()`, `clearStrapiCache()`.
- **`lib/schemas/strapi.schema.ts`** — Zod schemas for all API responses. **Always update schemas when Strapi content types change.**
- **`lib/three/`** — Three.js scene setup: `createRenderer.ts`, `createCamera.ts`, `initSplineScene.ts`, `loadCard.ts`. Includes adaptive pixel ratio and FPS-based quality adjustments.
- **`lib/env.ts`** — Lazy-validated env via Zod. Access env vars through this module, not `import.meta.env` directly.
- **`styles/`** — SCSS with BEM methodology, organized by `base/`, `components/`, `layouts/`, `pages/`, `tokens/`.
- **`data/design-tokens/`** — W3C DTCG-format JSON token files. Compiled to CSS variables and a Tailwind theme export via Style Dictionary.

### Backend (`backend/src/`)

- **`api/`** — Strapi content types: `qyu-is-coming` (single type for maintenance page), `popin`, `health`.
- **`middlewares/security.ts`** — Rate limiting (koa-ratelimit) + Winston request logging.
- **`lib/env.ts`** — Eagerly validated env at startup (throws if invalid).
- **`config/`** — Strapi configuration files (`database.ts`, `server.ts`, `middlewares.ts`, etc.).

### Data Flow

```
Strapi CMS → REST API → front/src/lib/api/strapi.ts (cache + Zod) → Astro pages (SSR) → HTML
```

Astro runs in `output: 'server'` mode with the Node.js standalone adapter — all pages are server-rendered on each request (no static generation by default).

### Styling Architecture

- **SCSS + BEM** for component/page styles
- **Tailwind CSS** (utility classes, with DaisyUI for component themes)
- **Design tokens** defined in JSON → compiled to CSS custom properties in `styles/tokens/`
- Tailwind is configured with `applyBaseStyles: false` to avoid conflicts with custom SCSS resets

### React in Astro

React components use `client:idle` (or similar) directives for progressive hydration. Server-side Astro components are preferred; React is used only where interactivity is needed.

### Vite / Build

Heavy libraries (Three.js, GSAP, Spline) are split into named manual chunks (`three`, `gsap`, `spline`) to optimize caching. Chunk size warning limit is 600 KB.

---

## Environment Variables

### Frontend (`.env` in `front/`)

```
STRAPI_URL=http://127.0.0.1:1337
PUBLIC_MAINTENANCE_MODE=true
```

### Backend (`.env` in `backend/`, see `.env.example`)

```
HOST=0.0.0.0
PORT=1337
APP_KEYS=...
API_TOKEN_SALT=...
ADMIN_JWT_SECRET=...
JWT_SECRET=...
DATABASE_CLIENT=sqlite
DATABASE_FILENAME=.tmp/data.db
CLIENT_URL=http://localhost:4321
RATE_LIMIT_MAX=100
RATE_LIMIT_DURATION=60000
```

---

## Key Conventions

- **Type safety:** Use Zod schemas for all Strapi API responses. Add/update schemas in `front/src/lib/schemas/strapi.schema.ts` when content types change.
- **API access:** Always go through `front/src/lib/api/strapi.ts`; don't call `@strapi/client` directly from pages.
- **Env vars:** Access via the `env` module (`front/src/lib/env.ts` or `backend/src/lib/env.ts`), not raw `process.env` / `import.meta.env`.
- **Styling:** Follow BEM for SCSS class names. Page-specific styles go in `styles/pages/`, component styles in `styles/components/`.
- **Commits:** Use conventional commits (`feat:`, `fix:`, `refactor:`, `docs:`).
- **Linting:** Biome (frontend). No ESLint config.
- **Create reusable component:** re use component instead duplicating code
- **Create single source of documentation:** one source of documentation in folder /docs about the workflow of the project and how it works, never create multiple documentation files and delete each documentation files which not in folder /docs
