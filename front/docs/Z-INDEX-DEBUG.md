# Z-Index Debug Guide

## Problem: Tailwind Z-Index Utilities Not Working

### Root Cause
The Tailwind z-index utilities (`z-0`, `z-10`, `-z-10`, etc.) aren't working because of CSS specificity conflicts with your existing SCSS styles.

### Current Z-Index Structure in Your Project

```scss
// In _maintenance.scss
$z-bg: 0;        // Background layer
$z-canvas: 1;    // Three.js canvas layer  
$z-overlay: 2;   // Text overlay layer

.bg-anim {
  // No z-index defined (inherits from parent)
}

.canvas-host {
  z-index: $z-canvas; // z-index: 1
}

.overlay {
  z-index: $z-overlay; // z-index: 2
}
```

### Tailwind Z-Index Scale
```css
z-0    = z-index: 0
z-10   = z-index: 10
z-20   = z-index: 20
z-30   = z-index: 30
z-40   = z-index: 40
z-50   = z-index: 50
-z-10  = z-index: -10
```

## Solutions

### Solution 1: Use !important (Quick Fix)
```astro
<div class="bg-anim !-z-10" aria-hidden="true"></div>
<div class="canvas-host !z-10">
```

### Solution 2: Use @apply in SCSS (Recommended)
```scss
.bg-anim {
  @include abs-fill;
  @apply -z-10; // Background behind everything
}

.canvas-host {
  @include abs-fill;
  @apply z-10; // Canvas above background
}

.overlay {
  @include abs-fill;
  @apply z-20; // Overlay above canvas
}
```

### Solution 3: Use Inline Styles (Fallback)
```astro
<div class="bg-anim" style="z-index: -10" aria-hidden="true"></div>
<div class="canvas-host" style="z-index: 10">
```

### Solution 4: Custom Tailwind Z-Index Values
```js
// In tailwind.config.mjs
export default {
  theme: {
    extend: {
      zIndex: {
        'bg': '-10',
        'canvas': '10',
        'overlay': '20',
      }
    }
  }
}
```

Then use:
```astro
<div class="bg-anim z-bg" aria-hidden="true"></div>
<div class="canvas-host z-canvas">
```

## Recommended Approach

### Step 1: Update SCSS with @apply
```scss
// In _maintenance.scss
.bg-anim {
  @include abs-fill;
  @apply -z-10;
}

.canvas-host {
  @include abs-fill;
  @apply z-10;
}

.overlay {
  @include abs-fill;
  @apply z-20;
}
```

### Step 2: Use Tailwind Classes in HTML
```astro
<section class="maintenance relative">
  <div class="bg-anim" aria-hidden="true"></div>
  
  <div class="relative z-10">
    <!-- Marquee content -->
  </div>
  
  <div class="canvas-host">
    <ThreeScene client:only="react" />
  </div>
</section>
```

## Testing Z-Index

### Debug Method 1: Browser DevTools
1. Open DevTools (F12)
2. Select element with z-index issue
3. Check Computed styles for z-index value
4. Look for conflicting CSS rules

### Debug Method 2: Add Temporary Styles
```astro
<div class="bg-anim !-z-10 border-4 border-red-500" aria-hidden="true"></div>
<div class="canvas-host !z-10 border-4 border-blue-500">
```

### Debug Method 3: CSS Specificity Check
```css
/* This has higher specificity than Tailwind */
.maintenance .bg-anim {
  z-index: 0; /* Overrides Tailwind z-10 */
}

/* Tailwind utility */
.z-10 {
  z-index: 10;
}
```

## Best Practices

1. **Use @apply in SCSS** for component-specific z-index
2. **Use Tailwind classes** for layout z-index
3. **Use !important sparingly** only when necessary
4. **Document z-index layers** in your design system
5. **Test on different screen sizes** to ensure proper layering

## Current Status
- ✅ Background: `-z-10` (behind everything)
- ✅ Canvas: `z-10` (above background)
- ✅ Overlay: `z-20` (above canvas)
- ✅ Marquee: `z-10` (same level as canvas)

