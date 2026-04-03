# GitHub Copilot — Repository Instructions

> These instructions apply to every Copilot chat and code-generation request in this repository.

## Project Overview

**qyu** — static Astro site (portfolio / coming-soon page) with a Three.js/Spline 3D scene.
Content is managed via local JSON files editable through Decap CMS.
Output mode: fully pre-rendered at build time (`output: 'static'`).

- **Framework**: Astro (static)
- **Styling**: SCSS + BEM — no Tailwind, no utility classes
- **3D scene**: Three.js / Spline via a React island (`ThreeScene.jsx`)
- **CMS**: Decap CMS (`/admin`) connected to GitHub via Git Gateway
- **Hosting**: Netlify
- **Node version**: 22.14.0 (see `.nvmrc`)

---

## Project Structure

All source code lives in `front/`.

```
quentin/
├── front/
│   ├── src/
│   │   ├── pages/             # maintenance.astro + _layout.astro
│   │   ├── components/
│   │   │   ├── ui/            # Marquee.astro, Popin.astro
│   │   │   └── scenes/        # ThreeScene.jsx (React island, client:load)
│   │   ├── layouts/           # Layout.astro (base HTML shell)
│   │   ├── content/           # site.config.json (CMS-editable content)
│   │   ├── content.config.ts  # Astro content collection schema (Zod)
│   │   ├── lib/
│   │   │   ├── env.ts         # Zod-validated env vars — always use this
│   │   │   └── three/         # Three.js scene helpers
│   │   ├── middleware.ts      # Maintenance mode redirect + security headers
│   │   ├── styles/            # SCSS partials (BEM), entry: main.scss
│   │   │   └── tokens/        # tokens.css — hand-authored CSS custom properties
│   └── public/admin/          # Decap CMS admin UI
├── docs/                      # All documentation lives here only
└── netlify.toml
```

---

## Commands (run from `front/`)

```bash
npm run dev          # Astro dev server → http://localhost:4321
npm run build        # Production build → dist/
npm run preview      # Preview production build
npm run type-check   # TypeScript + Astro type checking (astro check)
```

### Linting & Formatting

**Biome** is used — no ESLint, no Prettier.

```bash
npx biome check .           # Lint + format check
npx biome check --write .   # Auto-fix
```

---

## Data Flow

Content lives in `src/content/site.config.json` and flows through Astro Content Collections:

```
site.config.json
  → content.config.ts  (loader + Zod schema)
  → getEntry('siteConfig', 'main')
  → maintenance.astro
```

**Always update `src/content.config.ts` when `site.config.json` structure changes.**

---

## Key Conventions

### Content
- Edit `src/content/site.config.json` for content changes.
- Schema is enforced at build time via `src/content.config.ts`.

### Environment Variables
- Always access env vars through `src/lib/env.ts` (Zod-validated proxy).
- Never use `import.meta.env` directly.

```
PUBLIC_SITE_URL=https://example.com   # optional, canonical/OG tags
PUBLIC_MAINTENANCE_MODE=true          # enables maintenance redirect
```

### Styling
- **SCSS + BEM only.** No utility classes, no inline styles.
- Page styles → `styles/pages/`, component styles → `styles/components/`.
- Design tokens live in `styles/tokens/tokens.css` as hand-authored CSS custom properties — edit this file directly. It is committed to the repo and loaded globally via `@import` in `main.scss`.

### Components
- Reuse existing components before creating new ones.
- All components are `.astro` except `ThreeScene.jsx` (React, client-side only).
- React is used solely for the client-side Three.js lifecycle — no React state management elsewhere.

### Commits
Conventional commits with a required scope:
```
feat(scope):
fix(scope):
refactor(scope):
chore(scope):
```

### Documentation
- Single source of truth: `/docs` folder.
- Never create documentation files outside `/docs`. Delete any stray doc files.

---

## Middleware

`src/middleware.ts` handles:
- **Maintenance mode redirect** — if `PUBLIC_MAINTENANCE_MODE=true`, all non-`/maintenance` paths redirect to `/maintenance`.
- **Security headers** in dev (Netlify applies them in production via `netlify.toml`).
- **Dev logging** — request/response logs with timing.

---

## Routing

- `/` redirects to `/maintenance` via both `netlify.toml` and Astro's `redirects`.
- `maintenance.astro` is the only real page.
- All pages are pre-rendered at build time — no SSR.