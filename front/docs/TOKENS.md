# Design Tokens System

## Overview

This system converts your JSON design tokens into CSS custom properties that you can use in your SCSS components.

## Usage

### 1. Generate Tokens

```bash
npm run tokens
```

This creates `src/styles/design-system/tokens/design-tokens.css` with all your tokens as CSS custom properties.

### 2. Use in Your SCSS Components

```scss
.my-component {
  background-color: var(--color-powerfull-blue);
  padding: var(--spacing-md);
  border-radius: var(--border-radius-md);
}
```

**Note**: Design tokens are automatically imported globally in `main.scss`, so you don't need to import them in individual SCSS files.

### 3. Use in Components

```scss
.button {
  background: var(--color-powerfull-blue);
  color: var(--color-white);
  padding: var(--spacing-sm) var(--spacing-lg);
  border-radius: var(--border-radius-md);

  &:hover {
    background: var(--color-powerfull-orange);
  }
}
```

## Token Structure

Your tokens are automatically converted to CSS custom properties:

### Colors

- `--color-powerfull-blue`
- `--color-powerfull-orange`
- `--color-dark`
- `--color-white`

### Spacing

- `--spacing-xxs`
- `--spacing-xs`
- `--spacing-sm`
- `--spacing-md`
- `--spacing-lg`
- `--spacing-xl`
- `--spacing-2xl`
- `--spacing-3xl`
- `--spacing-4xl`
- `--spacing-5xl`

### Typography

- `--font-size-xxs`
- `--font-size-xs`
- `--font-size-sm`
- `--font-size-md`
- `--font-size-lg`
- `--font-size-xl`

### Border Radius

- `--border-radius-sm`
- `--border-radius-md`

### Component Tokens

- `--marquee-font-sizeMobile`
- `--marquee-font-sizeDesktop`
- `--marquee-background-colorBrand`
- `--marquee-font-colorBrand`
- `--marquee-border-radiusDesktop`
- `--marquee-border-radiusMobile`

## Adding New Tokens

1. Add your tokens to JSON files in `src/styles/design-system/data-tokens/`
2. Run `npm run tokens` to regenerate CSS custom properties
3. Use the new variables in your SCSS components

## File Structure

```
src/
├── data/                 # 📊 Data files (separated from styles)
│   └── design-tokens/    # 🎨 JSON design token files
│       ├── foundation/   # 🏗️ Core tokens
│       │   ├── borderRadius.json
│       │   ├── colors.json
│       │   ├── fontSize.json
│       │   └── spacing.json
│       └── components/   # 📦 Component tokens
│           └── marquee.json
└── styles/               # 🎨 Style files
    ├── design-system/    # 🎯 Generated CSS custom properties
    │   └── tokens/
    │       └── design-tokens.css
    ├── abstracts/        # 📚 SCSS abstracts
    ├── base/             # 📄 Base styles
    ├── components/       # 🧩 Component styles
    ├── layouts/          # 📐 Layout styles
    └── pages/            # 🌐 Page-specific styles
```
