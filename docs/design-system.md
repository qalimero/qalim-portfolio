# Design System — Qyu Portfolio

> Single source of truth for every visual, interaction, and motion decision.
> Last updated 2026-04-12

---

## 1. Token Architecture

Tokens follow the **Design Token Community Group (DTCG)** specification and are organized in three tiers. Every visual value in the codebase traces back to this hierarchy.

### Tier 1 — Core Tokens

Raw, immutable values. The single source of truth for every visual decision. Changing a core token propagates everywhere.

Examples: `--color-brand-primary`, `--font-size-xs`, `--spacing-md`, `--duration-fast`.

### Tier 2 — Alias Tokens

Semantic references to core tokens. They describe **intent**, not value. Alias tokens bridge the gap between the abstract palette and specific component needs.

Examples: `--color-surface-brand → var(--color-brand-primary)`, `--color-text-on-accent → var(--color-neutral-lightest)`.

### Tier 3 — Component Tokens

Scoped to a single component. Always reference alias or core tokens — never raw values. Each component owns its token namespace.

Examples: `--marquee-background-color → var(--color-surface-brand)`, `--btn-font-size → var(--font-size-xs)`.

### Token naming convention

```
--{category}-{property}-{variant}         (core)
--{semantic-intent}-{property}            (alias)
--{component}-{element}-{property}        (component)
```

### Token rules

1. Component tokens never hold raw values — they always reference alias or core tokens.
2. Alias tokens never reference other alias tokens — they point directly to core.
3. Changing a core token must propagate predictably to every alias and component that references it.
4. No magic numbers in SCSS — every value comes from a token. If a value doesn't exist, add it to core first.
5. Token files live in `src/styles/tokens/tokens.css` and are imported globally.

---

## 2. Color

### Core palette

| Token | Value | Role |
|---|---|---|
| `--color-brand-primary` | `#3200F2` | Electric violet — dominant brand surface |
| `--color-brand-secondary` | `#FF602F` | Warm coral/orange — accent & interaction |
| `--color-neutral-darkest` | `#232121` | Near-black — page background, text on light |
| `--color-neutral-lightest` | `#FFFFFF` | White — text on dark surfaces |

### Alias layer

| Alias Token | References | Intent |
|---|---|---|
| `--color-surface-brand` | `--color-brand-primary` | Brand-colored backgrounds (marquee, popin) |
| `--color-surface-accent` | `--color-brand-secondary` | Accent backgrounds (CTA, button primary) |
| `--color-text-on-brand` | `--color-neutral-lightest` | Text on violet surfaces |
| `--color-text-on-accent` | `--color-neutral-lightest` | Text on orange surfaces |
| `--color-text-on-dark` | `--color-neutral-lightest` | Text on dark page background |
| `--color-interactive-hover` | `--color-brand-secondary` | Hover state highlight |
| `--color-border-accent` | `--color-brand-secondary` | Decorative accent borders |

### Color rules

1. **Primary** is always a surface, never a text color on light backgrounds.
2. **Secondary** is used exclusively for interactive states and accent surfaces — it must stay scarce to stay energetic.
3. Text on `primary` or `secondary` surfaces is always `lightest` (white). No exceptions.
4. No intermediate grays are tokenized — intentional high-contrast binary palette.
5. Never use `#FF602F` as text color on white — it fails WCAG AA at small sizes.

---

## 3. Typography

### Font families

| Token | Value | Use |
|---|---|---|
| `--font-family-base` | `Satoshi` | Content layer — body, labels, UI prose |
| `--font-family-mono` | `PP Fraktion Mono` | Identity layer — display, hero, ticker |

### Font size scale

| Token | Size | px equivalent |
|---|---|---|
| `--font-size-xxs` | `0.625rem` | 10px |
| `--font-size-2xs` | `0.875rem` | 14px |
| `--font-size-xs` | `1rem` | 16px |
| `--font-size-sm` | `1.625rem` | 26px |
| `--font-size-md` | `2.625rem` | 42px |
| `--font-size-lg` | `4.25rem` | 68px |
| `--font-size-xl` | `6.875rem` | 110px |

### Font weight tokens

| Token | Value |
|---|---|
| `--font-weight-regular` | `400` |
| `--font-weight-bold` | `700` |

### Typography roles

| Role | Family | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|---|
| `h1` (hero) | Satoshi | xl (110px) | 700 | 1.1 | −0.03em |
| `h2` (section) | Satoshi | lg (68px) | 700 | 1.1 | −0.02em |
| `h3` (card title) | Satoshi | md (42px) | 700 | 1.2 | −0.02em |
| `h4` (ticker) | Satoshi | sm (26px) | 700 | 1.2 | −0.05em |
| `body` (paragraph) | PP Fraktion Mono | xs (16px) | 400 | 1.6 | 0 |
| `label` (caption) | PP Fraktion Mono | xxs (10px) | 400 | 1.5 | 0 |

### Typography rules

1. **PP Fraktion Mono = identity layer** — reserved for high-visibility, display-level text.
2. **Satoshi = content layer** — body copy, labels, documentation, UI prose.
3. The two families must never compete on the same visual plane at equal weight.
4. The type scale jumps aggressively (10 → 14 → 16 → 26 → 42 → 68 → 110). Each step is visually distinct. Do not interpolate.
5. No italic or light weight variants are used in the design. Bold mono is the personality.
6. Mono uppercase = identity, not content. Never set paragraphs in PP Fraktion Mono bold.

---

## 4. Spacing

### Scale

| Token | Value | px |
|---|---|---|
| `--spacing-xxs` | `0.25rem` | 4px |
| `--spacing-xs` | `0.5rem` | 8px |
| `--spacing-sm` | `0.75rem` | 12px |
| `--spacing-md` | `1rem` | 16px |
| `--spacing-lg` | `1.5rem` | 24px |
| `--spacing-xl` | `2rem` | 32px |
| `--spacing-2xl` | `2.5rem` | 40px |
| `--spacing-3xl` | `3rem` | 48px |
| `--spacing-4xl` | `4rem` | 64px |
| `--spacing-5xl` | `5rem` | 80px |

### Spacing rules

1. All spacing comes from this scale — no arbitrary values.
2. Base unit is 4px. Any value not on the scale is a violation.
3. Components use their own component tokens (e.g. `--popin-padding-xy`) that reference this scale.

---

## 5. Border Radius

| Token | Value | Usage |
|---|---|---|
| `--border-radius-sm` | `1rem` (16px) | Mobile containers, mobile hover pills |
| `--border-radius-md` | `2.5rem` (40px) | Desktop containers, capsule/pill shapes |

### Alias layer

| Alias | References |
|---|---|
| `--radius-container-mobile` | `--border-radius-sm` |
| `--radius-container-desktop` | `--border-radius-md` |

### Border radius rules

1. Only two radii exist — no intermediate values.
2. Radius is responsive: `sm` on mobile, `md` on desktop.
3. The pill shape (40px) is a core identity marker on desktop — never reduce it.

---

## 6. Motion & Animation

### Core timing tokens

| Token | Value | Use |
|---|---|---|
| `--duration-instant` | `200ms` | Micro-interactions: hover, press, focus |
| `--duration-fast` | `300ms` | Transitions: color, border, opacity |
| `--duration-normal` | `400ms` | Reveal delays, entrance timing |
| `--duration-slow` | `600ms` | Morph transitions (circle → square) |
| `--duration-reveal` | `525ms` | Content appear animations |

### Easing tokens

| Token | Value | Character |
|---|---|---|
| `--ease-default` | `ease` | Standard micro-interactions |
| `--ease-in-out` | `ease-in-out` | Symmetric transitions |
| `--ease-out-back` | `cubic-bezier(0.34, 1.56, 0.64, 1)` | Playful overshoot — morph, pop |
| `--ease-out-expo` | `cubic-bezier(0.33, 1, 0.68, 1)` | Smooth deceleration — reveal, entrance |

### Animation catalog

| Animation | Element | Description |
|---|---|---|
| `marquee-scroll` | `.marquee__track` | Infinite horizontal scroll, −50% translateX loop. Pauses on hover/focus. Speed: 20s base. |
| `icon-rotate` | `.marquee__content__item__icon` | Continuous 360° counter-clockwise spin, 8s linear infinite. Decorative wheel icons. |
| `scroll-indicator-pulse` | `.maintenance__scroll-indicator` | Subtle right-drift pulse (6px) + opacity shift. 2s ease-in-out infinite. Mobile only. |
| `btn-circle-draw` | Button shape ring | SVG stroke-dashoffset reveal (616 → 0). Ring traces itself. |
| `btn-circle-fill-appear` | `.btn__shape-fill` | Scale 0.92→1 + opacity fade-in. Fill appears after ring. |
| `btn-circle-text-appear` | `.btn__content` | TranslateY 6px→0 + opacity. Text slides up last. |
| `btn-circle-pop` | Button shape | Subtle scale overshoot 0.94→1. Lively "pop" feel. |
| `ml-content-appear` | `.maintenance-link__content` | TranslateY 4px→0 + opacity. CTA content entrance. |
| `ml-icon-spin` | `.maintenance-link__icon-wrapper` | RotateY 360° continuous spin. 4s linear, starts 0.8s after reveal. |
| Pixel-creation | CTA overlay | WebGL pixel-diffusion builds the CTA square visually, then `.is-revealed` fades in CSS children. |
| Particle diffusion | CTA hover | Canvas 2D particles burst from circular edge on hover. Brand colors (white + blue). DPR-aware. |

### Reveal choreography

The CTA link follows a multi-stage reveal:
1. **400ms delay** → `.is-visible` (link becomes visible, pixel-creation overlay starts)
2. **Pixel-creation completes** → `.is-revealed` (border appears, content fades in)
3. **Content appears** → label slides up (0.15s delay), icon slides up (0.3s delay) + starts spinning (0.8s delay)

### Motion rules

1. **Entrance only via opacity + translateY** — no zoom, no rotateX on content.
2. **The 3D scene is the one exception** to the "no decorative animation on content" rule.
3. **Interactive feedback is instant** (200ms) — hover, press, focus responses must feel immediate.
4. **Morph transitions use overshoot easing** (`ease-out-back`) for a playful, lively feel.
5. **Marquee must respect `prefers-reduced-motion`** — pause the scroll animation.
6. **Particles are cosmetic** — pointer-events: none, never intercept interaction.
7. **Reveal sequences are additive** — each stage builds on the previous one, never resets.
8. **Canvas effects are DPR-aware** — render at device pixel ratio, cap at 2× for performance.

---

## 7. Accessibility

### Contrast

- White on `#3200F2` (primary): contrast ratio ≈ 8.6:1 — passes WCAG AA and AAA.
- White on `#FF602F` (secondary/accent): contrast ratio ≈ 3.6:1 — passes AA for large text only. Use bold weight (≥ 14px bold / 18px regular) on orange surfaces.
- White on `#232121` (darkest): contrast ratio ≈ 15.4:1 — passes all levels.

### Font size minimums

- **Minimum text on orange surfaces**: 0.875rem (14px) bold — this meets WCAG AA for large text (14px bold qualifies).
- **Button text minimum**: 1rem (16px) — always legible.
- **Smallest text in the system**: 0.625rem (10px) — used only for labels/captions on high-contrast surfaces (white on dark or violet).

### Interactive targets

- Minimum touch target: 44×44px (WCAG 2.5.5).
- Close buttons: `min-width: 2.75rem; min-height: 2.75rem` (44px).
- Focus rings: 2px solid, 3px offset. Visible on all interactive elements.

### RGAA / RAWEB compliance

- External links announce "(nouvelle fenêtre)" to assistive technologies (RGAA 13.2).
- All buttons have explicit accessible names via `label` prop or `aria-label`.
- Visually hidden labels use the `.btn__label--sr-only` pattern (clip-path inset).
- Decorative SVGs are `aria-hidden="true" focusable="false"`.

### Focus management

- All interactive elements receive a visible focus ring via `:focus-visible`.
- Focus ring color: `--color-brand-primary` (default) or `--color-neutral-lightest` (on dark surfaces).
- Focus ring offset: 3px (buttons), 6px (shape variants, CTA).

---

## 8. Components

### Marquee

**Purpose**: Sticky full-width horizontal scroller at the top of the page. Brand identity, social links, availability status.

**Tokens**: `--marquee-*` namespace. References `--color-surface-brand`, `--color-text-on-brand`, `--color-interactive-hover`.

**Responsive behavior**:
- Desktop: 26px font, 40px radius, 16px vertical padding, 24px horizontal padding.
- Mobile: 16px font, 16px radius, 8px vertical padding, 16px horizontal padding.

**Interaction**: Links get orange hover background. Track pauses on hover/focus-within.

### Popin

**Purpose**: Modal dialog for announcements. Fixed at viewport bottom (desktop) or top (mobile).

**Tokens**: `--popin-*` namespace. References `--color-surface-brand`, `--color-text-on-brand`.

**Structure**: `popin > popin__container > popin__header + popin__content`.

**Accessibility**: Title is visually hidden but available to screen readers. Close button meets 44px minimum.

### Button

**Purpose**: Polymorphic button/anchor. Renders as `<a>` when `href` is provided.

**Variants**:
- `primary`: Solid orange rectangle with pill radius. Font: 1rem (16px) mono bold.
- `shape-circle`: Circular SVG-framed button with pixel-creation reveal. Morphs circle → square (desktop) or circle → bar (tablet).

**Tokens**: `--btn-*` namespace. References `--color-surface-accent`, `--color-text-on-accent`.

**Interaction**: Hover opacity 0.88 (primary) or scale 1.06 on shape SVG. Active: scale 0.97.

### TextMaintenance

**Purpose**: Bordered text block displaying configurable maintenance copy.

**Tokens**: `--text-maintenance-*` namespace. Font: 0.875rem (14px) mono bold. Orange border, transparent background.

### Maintenance Link (Orange Square CTA)

**Purpose**: Square call-to-action on the maintenance page. Orange background, white text and icon inline.

**Tokens**: `--maintenance-link-*` namespace. Font: 0.875rem (14px) mono bold. Orange background via `--color-surface-accent`.

**Layout**: Text and icon are inline (`flex-direction: row`) with 0.5rem gap. Grid-aligned: 2×2 cells (desktop), 4×1 cells (mobile).

**Reveal**: Multi-stage pixel-creation → CSS fade-in. See Motion & Animation section.

---

## 9. Layout

### Grid

- Desktop: 12 columns.
- Mobile: 8 columns.
- Gutter: 1rem (16px).
- Cell size: `--grid-cell-size` (default 80px).

### Responsive breakpoints

| Name | Max-width | Use |
|---|---|---|
| `small` | 576px | Compact mobile |
| `medium` | 768px | Tablet |
| `large` | 992px | Desktop breakpoint |
| `xlarge` | 1200px | Wide desktop |

### Layout patterns

- **Split-screen**: Desktop ≥ lg — 3D card left half, content right half.
- **Horizontal snap-scroll**: Mobile < lg — full-viewport panels with `scroll-snap-type: x mandatory`.

---

## 10. Artsy Direction

### Visual identity

The Qyu portfolio is a **tension between precision and expression**. The codebase is the craft; the visuals are the art.

- **Monospace as identity**: PP Fraktion Mono in bold uppercase is not a font choice — it's a statement. The mono font claims the visual stage. It says "developer" louder than any tech stack list.
- **Violet + orange**: The palette is intentionally binary. Violet is the calm, structural surface. Orange is the spark — scarce, energetic, only where the eye needs to go.
- **High contrast, no grays**: The design rejects soft gradients and neutral middle ground. It's black, white, violet, orange — and nothing in between. This is a deliberate aesthetic of confidence.
- **3D as atmosphere**: The Spline scene is not a feature demo. It's ambiance. The 3D card sits behind content, creating depth without competing for attention.

### Storytelling philosophy

> *"Stories were never meant to be easy to discover, pieces of ourselves deserve to be protected."*

The portfolio treats content as something to be earned, not consumed. The maintenance page is a gate — an invitation to be curious. Reveals are slow, deliberate, staged. The pixel-creation effect builds the CTA physically on screen, rewarding patience.

### Creative constraints

1. **Motion serves narrative** — every animation tells the user where to look next.
2. **Scarcity creates value** — orange appears only where interaction matters. If everything is orange, nothing is.
3. **Typography is hierarchy** — mono for identity, sans for content. Never mix at equal visual weight.
4. **The grid is invisible** — layout is mathematical but never feels mechanical. Cell-aligned elements feel placed, not computed.
5. **Particles are breath** — the CTA hover particles are organic, alive. They diffuse outward like the button is exhaling. This is the one moment where the design feels biological, not digital.
