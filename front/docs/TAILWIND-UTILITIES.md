# Tailwind CSS Utilities Guide

## Overview
Your project is fully configured to use Tailwind CSS utility classes alongside your existing BEM methodology and design tokens.

## Configuration Status
- ✅ **Tailwind Config**: `tailwind.config.mjs` configured
- ✅ **Content Paths**: Scans all `.astro`, `.jsx`, `.tsx`, `.html` files
- ✅ **CSS Import**: Tailwind directives imported in `main.scss`
- ✅ **Design Tokens**: Compatible with existing CSS custom properties

## Usage Methods

### 1. **Direct Utility Classes in HTML/Astro**

```astro
<!-- Layout utilities -->
<div class="flex items-center justify-center min-h-screen">
  <div class="max-w-4xl mx-auto px-4">
    <!-- Content -->
  </div>
</div>

<!-- Spacing utilities -->
<div class="space-y-4 p-6 m-4">
  <div class="mb-2">Item 1</div>
  <div class="mt-4">Item 2</div>
</div>

<!-- Color utilities -->
<div class="bg-gradient-to-r from-blue-500 to-purple-600 text-white">
  <h1 class="text-2xl font-bold">Gradient Background</h1>
</div>

<!-- Responsive utilities -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
  <div class="bg-white p-4 rounded-lg shadow-md">Card 1</div>
  <div class="bg-white p-4 rounded-lg shadow-md">Card 2</div>
  <div class="bg-white p-4 rounded-lg shadow-md">Card 3</div>
</div>
```

### 2. **@apply Directive in SCSS**

```scss
// Mix Tailwind with BEM methodology
.marquee {
  @apply w-full py-4 my-4 rounded-lg overflow-hidden;
  
  // Keep design tokens for brand colors
  background-color: var(--marquee-background-colorBrand);
  color: var(--marquee-font-colorBrand);
  
  &__content {
    @apply inline-block;
    animation: marquee-scroll linear infinite;
  }
  
  &__item {
    @apply inline-block mr-8 font-medium;
    font-size: var(--marquee-font-sizeDesktop);
  }
}

// Responsive utilities
.maintenance-page {
  @apply min-h-screen relative;
  
  &__content {
    @apply container mx-auto px-4 py-8;
  }
  
  @media (max-width: 768px) {
    @apply px-2 py-4;
  }
}
```

### 3. **Conditional Classes with JavaScript**

```astro
---
// Dynamic classes based on data
const statusClasses = maintenanceData 
  ? 'bg-green-500 text-white' 
  : 'bg-red-500 text-white';

const sizeClasses = marqueeComponents.length > 3 
  ? 'text-sm' 
  : 'text-lg';
---

<div class={`status-indicator ${statusClasses} px-3 py-1 rounded-full`}>
  Status: {maintenanceData ? 'Connected' : 'Offline'}
</div>

<div class={`marquee-container ${sizeClasses}`}>
  <!-- Marquee content -->
</div>
```

## Common Utility Patterns

### **Layout & Positioning**
```astro
<!-- Flexbox layouts -->
<div class="flex flex-col md:flex-row items-center justify-between">
  <div class="flex-1">Content</div>
  <div class="flex-shrink-0">Sidebar</div>
</div>

<!-- Grid layouts -->
<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
  <!-- Grid items -->
</div>

<!-- Positioning -->
<div class="relative">
  <div class="absolute top-4 right-4 z-10">Fixed element</div>
  <div class="sticky top-0">Sticky header</div>
</div>
```

### **Spacing & Sizing**
```astro
<!-- Spacing -->
<div class="p-4 m-2 space-y-4">
  <div class="px-6 py-3">Padded content</div>
  <div class="mx-auto max-w-4xl">Centered with max width</div>
</div>

<!-- Sizing -->
<div class="w-full h-screen min-h-96 max-h-screen">
  <div class="w-1/2 h-1/2">Half size</div>
</div>
```

### **Colors & Effects**
```astro
<!-- Background colors -->
<div class="bg-blue-500 bg-opacity-50">
  <div class="bg-gradient-to-r from-purple-400 to-pink-400">
    Gradient background
  </div>
</div>

<!-- Text colors -->
<h1 class="text-gray-900 dark:text-white">
  <span class="text-blue-600">Colored</span> text
</h1>

<!-- Shadows & Effects -->
<div class="shadow-lg rounded-lg border border-gray-200">
  <div class="backdrop-blur-sm bg-white/80">
    Glass effect
  </div>
</div>
```

### **Responsive Design**
```astro
<!-- Mobile-first responsive -->
<div class="
  text-sm md:text-base lg:text-lg
  p-2 md:p-4 lg:p-6
  grid-cols-1 md:grid-cols-2 lg:grid-cols-3
">
  Responsive content
</div>

<!-- Hide/show on different screens -->
<div class="hidden md:block">Desktop only</div>
<div class="block md:hidden">Mobile only</div>
```

## Integration with Existing Code

### **Combining with BEM**
```scss
// Use Tailwind for common utilities, BEM for component structure
.marquee {
  @apply w-full py-4 my-4 rounded-lg overflow-hidden;
  
  // BEM elements with Tailwind utilities
  &__content {
    @apply inline-block;
    animation: marquee-scroll linear infinite;
  }
  
  &__item {
    @apply inline-block mr-8 font-medium;
    // Keep design tokens for brand-specific styling
    font-size: var(--marquee-font-sizeDesktop);
  }
  
  // BEM modifiers with Tailwind
  &--large {
    @apply py-8 text-xl;
  }
  
  &--small {
    @apply py-2 text-sm;
  }
}
```

### **Combining with Design Tokens**
```scss
.component {
  // Use Tailwind for layout and spacing
  @apply flex items-center justify-center p-4 rounded-lg;
  
  // Use design tokens for brand colors
  background-color: var(--component-background-colorBrand);
  color: var(--component-text-colorBrand);
  
  // Use Tailwind for responsive behavior
  @apply text-sm md:text-base lg:text-lg;
}
```

## Best Practices

### **1. Use Tailwind for:**
- ✅ Layout (flexbox, grid, positioning)
- ✅ Spacing (margins, padding)
- ✅ Typography (font sizes, weights)
- ✅ Colors (when not brand-specific)
- ✅ Responsive behavior
- ✅ Common effects (shadows, borders, rounded corners)

### **2. Keep Design Tokens for:**
- 🎨 Brand colors
- 🎨 Custom animations
- 🎨 Component-specific styling
- 🎨 Complex design system values

### **3. Use BEM for:**
- 🏗️ Component structure
- 🏗️ Component-specific styling
- 🏗️ Complex component states
- 🏗️ Maintainable CSS architecture

## Examples in Your Project

### **Maintenance Page**
```astro
<section class="maintenance relative min-h-screen overflow-hidden">
  <!-- Debug panel with Tailwind -->
  <div class="fixed top-4 right-4 bg-black/80 text-white p-3 rounded-lg text-xs z-50">
    <div class="flex flex-col space-y-1">
      <span>Marquees: {marqueeComponents.length}</span>
      <span>Status: {maintenanceData ? 'Connected' : 'Offline'}</span>
    </div>
  </div>
  
  <!-- Marquee container with Tailwind -->
  <div class="relative z-10 space-y-4">
    <!-- Marquee components -->
  </div>
</section>
```

### **Marquee Component**
```astro
<div class={`marquee${className} relative overflow-hidden whitespace-nowrap`}>
  <ul class="marquee__content inline-block">
    {repeatedText.map((item) => (
      <li class="marquee__content-item inline-block mr-8 font-medium">
        {item}
      </li>
    ))}
  </ul>
</div>
```

## Benefits

- 🚀 **Faster Development**: No need to write custom CSS for common patterns
- 🎯 **Consistent Spacing**: Built-in spacing scale
- 📱 **Responsive by Default**: Mobile-first responsive utilities
- 🎨 **Design System**: Consistent colors, typography, and effects
- 🔧 **Maintainable**: Less custom CSS to maintain
- ⚡ **Performance**: Only used utilities are included in final CSS

Your project now has the best of both worlds: Tailwind utilities for rapid development and your existing BEM + design tokens architecture for maintainable, brand-consistent styling!

