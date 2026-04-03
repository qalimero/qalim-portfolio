# Design System — Qyu Portfolio

> Extracted from the Penpot file `portfolio` · Last updated 2026-03-22

---

## 1. Color

### Primitive palette

| Token | Value | Role |
|---|---|---|
| `color.brand.primary` | `#3200F2` | Electric violet — dominant brand color |
| `color.brand.secondary` | `#FF602F` | Warm coral/orange — accent & interaction |
| `color.neutral.darkest` | `#232121` | Near-black — text on light |
| `color.neutral.lightest` | `#FFFFFF` | White — text on dark, backgrounds |

### Semantic usage (current)

- **Marquee bg** → `color.brand.primary`
- **Marquee link hover bg** → `color.brand.secondary`
- **Popin bg** → `color.brand.primary`
- **Popin text** → `color.neutral.lightest`

### Color rules

1. Primary is always the surface, never a text color on a light background.
2. Secondary is used exclusively for interactive states (hover, focus, active).
3. Text on `primary` surfaces is always `lightest` (never `darkest`).
4. No intermediate grays are tokenized — intentional high-contrast binary palette.

---

## 2. Typography

### Font families

| Token | Value | Use |
|---|---|---|
| `font.family.base` | `Satoshi` | UI, body, documentation |
| `font.family.mono` | `PP Fraktion Mono` | Display, hero, ticker, identity |

### Type scale (Satoshi — base)

| Token | Size | Weight | Line-height | Letter-spacing |
|---|---|---|---|---|
| `typography.base.xxs` | 10px | 400 | 1.5 | 0 |
| `typography.base.xs` | 16px | 400 | 1.5 | 0 |
| `typography.base.sm` | 26px | 400 | 1.5 | 0 |
| `typography.base.md` | 42px | 400 | 1.5 | 0 |
| `typography.base.lg` | 68px | 400 | 1.5 | 0 |
| `typography.base.xl` | 110px | 400 | 1.5 | 0 |

### PP Fraktion Mono — library style

| Property | Value |
|---|---|
| Font size | 25.888px (≈ `font.size.sm`) |
| Weight | 700 |
| Letter spacing | −1px |
| Transform | Capitalize |

**In components:**
- Marquee desktop: 26px / 700
- Marquee mobile: 16px / 700
- Always uppercase via `text-transform`

### Typography rules

1. PP Fraktion Mono = identity layer — reserved for high-visibility, display-level text.
2. Satoshi = content layer — body copy, labels, documentation, UI prose.
3. The two families must never compete on the same visual plane at equal weight.
4. The type scale jumps aggressively (10 → 16 → 26 → 42 → 68 → 110) — each step is visually distinct. Do not interpolate.
5. No italic or light weight variants are defined — bold mono is the personality.

---

## 3. Spacing

| Token | Value |
|---|---|
| `spacing.xxs` | 4px |
| `spacing.xs` | 8px |
| `spacing.sm` | 12px |
| `spacing.md` | 16px |
| `spacing.lg` | 24px |
| `spacing.xl` | 32px |
| `spacing.2xl` | 40px |
| `spacing.3xl` | 48px |
| `spacing.4xl` | 64px |
| `spacing.5xl` | 80px |

### Spacing rules

1. All spacing comes from this scale — no arbitrary values.
2. Base unit is 4px. Any value not on the scale is a violation.
3. Components use semantic tokens (e.g. `popin.padding → 24px`) that reference primitives.

---

## 4. Border Radius

| Token | Value | Usage |
|---|---|---|
| `borderRadius.sm` | 16px | Mobile container radius, mobile hover pill |
| `borderRadius.md` | 40px | Desktop container radius (capsule/pill), desktop hover pill |

### Border radius rules

1. Only two radii exist — no intermediate values.
2. Radius is responsive: `sm` on mobile, `md` on desktop.
3. The pill shape (40px) is a core identity marker on desktop — do not reduce it.

---

## 5. Components

### Marquee

**Semantic tokens:**

| Token | Mobile | Desktop |
|---|---|---|
| `marquee.backgroundColor` | `#3200F2` | `#3200F2` |
| `marquee.fontColor` | `#FFFFFF` | `#FFFFFF` |
| `marquee.text` | PP Fraktion Mono · 16px · 700 | PP Fraktion Mono · 26px · 700 |
| `marquee.container.padding.vertical` | 8px | 16px |
| `marquee.container.padding.horizontal` | 16px | 24px |
| `marquee.container.borderRadius` | 16px (bottom only) | 40px (bottom only) |
| `marquee.itemGap` | 8px | 16px |
| `marquee.link.hover.backgroundColor` | `#FF602F` | `#FF602F` |
| `marquee.link.hover.borderRadius` | 16px | 40px |

**Props:** `items: MarqueeItem[]`, `speed`, `direction: 'left' | 'right'`

**Content:** QUENTIN SERDA · DEVELOPER · COMING SOON · 2025 · FULL STACK · OPEN TO WORK (separators: ✦)

**Rules:**
- Anchored to top of viewport, full-width.
- Bottom radius only → visually connects to page content below.
- Links receive the secondary color on hover.

---

### Popin

**Semantic tokens:**

| Token | Value |
|---|---|
| `popin.backgroundColor` | `#3200F2` |
| `popin.textColor` | `#FFFFFF` |
| `popin.text` | Satoshi · 16px · 400 |
| `popin.padding` | 24px (all sides) |
| `popin.gapY` | 16px (header → content) |

**Structure:** `popin > popin__container > popin__header + popin__content`

**Props:** `id` (required), `title`, `closeable` (default: true), `autoOpen` (default: false)

**Rules:**
- Fixed at bottom of viewport.
- Full-width on mobile, auto-width on desktop (≥992px).
- Opened/closed via `window.Popin.open(id)` / `window.Popin.close(id)`.

---

### Icon / Wheel

Two variants: `default` and `inverse`.
Used as decorative motion element inside Marquee links.

---

### Layout / no-scroll

Utility frame — disables body scroll. Used for modal/overlay states.

---

## 6. Token Architecture

Tokens are organized in two tiers:

**Primitive** (source of truth):
- `primitive/color`
- `primitive/spacing`
- `primitive/border-radius`
- `primitive/typography`

**Semantic** (component-scoped aliases):
- `semantic/marquee`
- `semantic/popin`

This means: changing `color.brand.primary` propagates everywhere. Semantic tokens never define raw values — they always reference primitives.

---

---

# Suggestions — Building a Portfolio with Real Storytelling

The current system is a solid foundation but is scoped to a holding/waiting page only. Below are prioritized recommendations to evolve it into a full storytelling portfolio.

---

## S1. Expand the color palette without breaking identity

The current palette is binary (violet + orange + black + white). For a full portfolio you will need:

```
Additions to tokenize:
color.neutral.dark        #2E2D2D   (softer dark, for cards/panels)
color.neutral.medium      #999999   (already used in Penpot docs — formalize it)
color.neutral.light       #F4F3FF   (light violet tint — for sections on white)
color.brand.primary-dark  #1A00A8   (pressed/active state for primary)
```

**Rule:** Brand colors define the atmosphere. Neutrals carry the content. Never use `brand.secondary` for more than one element per viewport — it must stay scarce to stay energetic.

---

## S2. Add a display typographic role for the mono font

The existing `PP Fraktion Mono 700` is used only at 16/26px. A real portfolio hero needs it at scale:

```
Add to token set:
font.size.2xl   → 160px  (or clamp-based fluid value)

Add typography composite:
typography.display.hero   → PP Fraktion Mono · 110px · 700 · letter-spacing: -3px · uppercase
typography.display.large  → PP Fraktion Mono · 68px  · 700 · letter-spacing: -2px · uppercase
typography.display.medium → PP Fraktion Mono · 42px  · 700 · letter-spacing: -1px · uppercase
```

**Rule:** Satoshi stays for reading. PP Fraktion Mono claims the visual stage. The hero headline should be the loudest thing on the page at ≥110px — the brand identity is the font.

---

## S3. Define a proper section/layout system

No layout tokens exist yet. A portfolio needs:

```
layout.maxWidth.content     → 1200px
layout.maxWidth.narrow      → 720px
layout.section.padding.y    → spacing.5xl (80px) desktop / spacing.3xl (48px) mobile
layout.section.gap          → spacing.4xl (64px)
layout.grid.columns         → 12 (desktop), 4 (mobile)
layout.grid.gutter          → spacing.md (16px)
```

---

## S4. Storytelling structure — pages to design

The portfolio needs a narrative arc, not just a list of projects. Suggested sequence:

### 4.1 Hero — "Who is Qyu"
- Full-viewport section.
- Giant PP Fraktion Mono headline: **"QUENTIN SERDA"** at 110px+.
- Subtitle: role + availability in Satoshi xs.
- 3D Spline scene continues in the background (already built).
- No CTA yet — let the scene speak first.

### 4.2 Manifesto — "How I work"
- 2–3 short, opinionated sentences. Not a list of technologies.
- Example: *"I build things that load fast, feel alive, and don't embarrass the designer who trusted me."*
- Typography: Satoshi `typography.base.md` (42px) — single column, generous padding.
- Background: `color.neutral.light` (#F4F3FF) — change of rhythm.

### 4.3 Selected Work — "What I've made"
- 3–5 projects max. Each is a narrative, not a screenshot.
- Card structure: project name (mono display) + one-sentence summary + tech stack + outcome.
- Hover reveals a secondary color flash (`#FF602F`) on the card border or background tint.
- **Storytelling rule:** Lead with impact (*"Reduced build time by 60%"*), then method, then tools.

### 4.4 Stack — "What I use"
- Not a logo wall. A curated list organized by intent:
  - *"To build fast UIs"* → Astro, React
  - *"To ship with confidence"* → TypeScript, Biome, Vitest
  - *"To design with system"* → Penpot
- This communicates *thinking*, not just tool familiarity.

### 4.5 Contact — "Let's work"
- Single focused CTA: email + one social link (LinkedIn or GitHub).
- Reuse the Popin component — opening contact triggers a `Popin.open('contact')`.
- Background: `color.brand.primary` — closes the visual loop with the Marquee header.

---

## S5. Motion & interaction principles

The 3D scene and Marquee already establish motion as a core identity element. Extend consistently:

- **Scroll-triggered reveals:** text and cards enter with opacity + translateY, not zoom.
- **Cursor follow:** the wheel icon (already exists) can follow the cursor on desktop — reinforces the spinning/dynamic identity.
- **Marquee as navigation signal:** items in the marquee should eventually link to sections (already supports `linkItem`).
- **No decorative animations on content:** motion only for entrance and interaction. The 3D scene is the one exception.

---

## S6. Missing components to design

| Component | Purpose | Priority |
|---|---|---|
| `ProjectCard` | Work section item — name, summary, tags, hover state | High |
| `Tag` | Technology/skill label — pill shaped, sm radius | High |
| `SectionHeader` | Consistent section title block — mono display + label | High |
| `Button` | CTA link — primary (violet filled) + ghost (outline) variants | High |
| `NavBar` | Sticky navigation — logo + section anchors + availability badge | Medium |
| `AvailabilityBadge` | Animated "open to work" indicator | Medium |
| `SkillGroup` | Stack category block | Low |

---

## S7. Content voice — rules for copy

The current copy ("Stay tuned for something worth the wait") is good but passive. For the full portfolio:

1. **First person, direct.** "I built X" not "X was built."
2. **Lead with outcome, not process.** "Cut load time to 800ms" before "used Astro."
3. **Mono uppercase = identity, not content.** Never put paragraphs in PP Fraktion Mono.
4. **Minimal.** Every section should fit in a single glance before the user scrolls. If it needs a second paragraph, it's two sections.
5. **Personality in the details.** The `✦` separator in the marquee is the right instinct — small typographic decisions carry the voice.

---

## S8. Accessibility minimums

The current contrast (white on `#3200F2`) passes WCAG AA (contrast ratio ≈ 8.6:1). Maintain this:

- Never use `#FF602F` as a text color on white — it fails AA at small sizes.
- The `title` prop on Popin (screen-reader only) is already planned — implement it.
- Marquee motion must respect `prefers-reduced-motion` — pause the scroll animation.
- All interactive elements need visible focus rings using `color.brand.secondary` as the outline.
