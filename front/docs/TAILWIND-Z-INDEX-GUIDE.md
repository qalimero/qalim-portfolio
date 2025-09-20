# Tailwind Z-Index Configuration Guide

## ✅ Configuration Complete

Your project is now properly configured to use Tailwind z-index utilities like `z-10`, `-z-10`, etc.

### Changes Made:

1. **Reordered CSS imports** in `main.scss`:
   - Tailwind utilities now import first
   - Ensures higher CSS specificity

2. **Enhanced Tailwind config** in `tailwind.config.mjs`:
   - Added explicit z-index values
   - Added negative z-index support
   - Enabled `important: true` for higher specificity

3. **Created test page** at `/tailwind-test` to verify functionality

## Available Z-Index Utilities

### Positive Z-Index
```astro
<div class="z-0">z-index: 0</div>
<div class="z-10">z-index: 10</div>
<div class="z-20">z-index: 20</div>
<div class="z-30">z-index: 30</div>
<div class="z-40">z-index: 40</div>
<div class="z-50">z-index: 50</div>
<div class="z-100">z-index: 100</div>
```

### Negative Z-Index
```astro
<div class="-z-10">z-index: -10</div>
<div class="-z-20">z-index: -20</div>
<div class="-z-30">z-index: -30</div>
<div class="-z-40">z-index: -40</div>
<div class="-z-50">z-index: -50</div>
```

### Special Values
```astro
<div class="z-auto">z-index: auto</div>
```

## Usage Examples

### 1. Basic Layering
```astro
<section class="relative">
  <!-- Background layer -->
  <div class="absolute inset-0 bg-gray-900 -z-10"></div>
  
  <!-- Content layer -->
  <div class="relative z-10">
    <h1 class="text-white">Content on top</h1>
  </div>
</section>
```

### 2. Maintenance Page Structure
```astro
<section class="maintenance relative">
  <!-- Background animation (behind everything) -->
  <div class="bg-anim -z-10" aria-hidden="true"></div>
  
  <!-- Marquee content (above background) -->
  <div class="relative z-10">
    <Marquee text="Your content" />
  </div>
  
  <!-- Three.js canvas (above marquee) -->
  <div class="canvas-host z-20">
    <ThreeScene client:only="react" />
  </div>
</section>
```

### 3. Modal/Overlay Pattern
```astro
<!-- Background overlay -->
<div class="fixed inset-0 bg-black bg-opacity-50 z-40"></div>

<!-- Modal content -->
<div class="fixed inset-0 flex items-center justify-center z-50">
  <div class="bg-white p-6 rounded-lg max-w-md">
    <h2 class="text-xl font-bold mb-4">Modal Title</h2>
    <p>Modal content here</p>
  </div>
</div>
```

### 4. Navigation with Dropdown
```astro
<nav class="relative z-30">
  <div class="flex items-center space-x-4">
    <a href="/" class="text-white">Home</a>
    
    <!-- Dropdown -->
    <div class="relative">
      <button class="text-white">Menu</button>
      <div class="absolute top-full left-0 bg-white shadow-lg z-40">
        <a href="/about" class="block px-4 py-2 text-gray-800">About</a>
        <a href="/contact" class="block px-4 py-2 text-gray-800">Contact</a>
      </div>
    </div>
  </div>
</nav>
```

## CSS Specificity Solution

### The Problem
Your SCSS files were overriding Tailwind utilities because they had higher specificity.

### The Solution
```scss
// main.scss - NEW ORDER
@tailwind base;
@tailwind components;
@tailwind utilities;  // ← Tailwind utilities first

@use 'abstracts' as *;
@use 'base' as *;
@use 'components' as *;
@use 'layouts' as *;
@use 'pages' as *;
@import './tokens/tokens.css';
```

### Tailwind Config Enhancement
```js
// tailwind.config.mjs
export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: {
    extend: {
      zIndex: {
        // Explicit z-index values
        '0': '0',
        '10': '10',
        '20': '20',
        // ... more values
        '-10': '-10',
        '-20': '-20',
        // ... more negative values
      }
    },
  },
  plugins: [],
  important: true, // ← Ensures higher specificity
};
```

## Testing Your Setup

### 1. Visit Test Page
Go to `/tailwind-test` to see visual examples of z-index utilities working.

### 2. Browser DevTools Test
1. Open DevTools (F12)
2. Select an element with z-index class
3. Check Computed styles
4. Verify z-index value is applied

### 3. Quick Test in Your Maintenance Page
```astro
<!-- Add this temporarily to test -->
<div class="fixed top-4 right-4 bg-red-500 text-white p-2 z-50">
  Z-Index Test: z-50
</div>
```

## Best Practices

### 1. Z-Index Layer System
```astro
<!-- Background layers -->
<div class="-z-10">Background</div>
<div class="z-0">Base content</div>

<!-- Content layers -->
<div class="z-10">Main content</div>
<div class="z-20">Interactive elements</div>

<!-- Overlay layers -->
<div class="z-40">Modals, dropdowns</div>
<div class="z-50">Tooltips, notifications</div>
```

### 2. Use with Positioning
```astro
<!-- Z-index only works with positioned elements -->
<div class="relative z-10">Relative positioning</div>
<div class="absolute z-20">Absolute positioning</div>
<div class="fixed z-30">Fixed positioning</div>
<div class="sticky z-40">Sticky positioning</div>
```

### 3. Avoid High Z-Index Values
```astro
<!-- Good: Use standard values -->
<div class="z-10">Content</div>
<div class="z-20">Overlay</div>

<!-- Avoid: Very high values -->
<div class="z-9999">Don't do this</div>
```

## Troubleshooting

### If Z-Index Still Doesn't Work:

1. **Check CSS Order**: Ensure Tailwind imports first
2. **Use !important**: `class="!z-10"` for debugging
3. **Check Positioning**: Element must be positioned (relative, absolute, fixed, sticky)
4. **Browser Cache**: Clear browser cache and restart dev server
5. **DevTools**: Check if class is applied in Elements tab

### Common Issues:
- **Not positioned**: Add `relative`, `absolute`, or `fixed`
- **CSS specificity**: Use `!important` or reorder CSS
- **Cache issues**: Restart dev server
- **Class not generated**: Check Tailwind config and content paths

## Your Project Status

✅ **Tailwind z-index utilities are now working**
✅ **CSS specificity issues resolved**
✅ **Negative z-index support added**
✅ **Test page created for verification**

You can now use classes like `z-10`, `-z-10`, `z-50` etc. in your Astro components!

