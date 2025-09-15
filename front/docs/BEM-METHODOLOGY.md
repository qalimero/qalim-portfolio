# BEM Methodology Implementation

## Overview
This project implements the BEM (Block Element Modifier) CSS methodology for consistent, maintainable, and scalable stylesheets.

## BEM Structure

### Block
- **Purpose**: Standalone component that is meaningful on its own
- **Naming**: `.block-name`
- **Example**: `.marquee`, `.maintenance-page`, `.three-scene`

### Element
- **Purpose**: Part of a block that has no standalone meaning
- **Naming**: `.block-name__element-name`
- **Example**: `.marquee__content`, `.maintenance-page__stage`, `.three-scene__canvas`

### Modifier
- **Purpose**: Flag on blocks or elements used to change appearance or behavior
- **Naming**: `.block-name--modifier-name` or `.block-name__element-name--modifier-name`
- **Example**: `.marquee--direction-right`, `.maintenance-page--reduced-motion`

## SCSS Concatenation Structure

### File Organization
```
src/styles/
├── abstracts/          # Variables, mixins, functions
│   ├── _variables.scss
│   ├── _mixins.scss
│   └── _index.scss     # @forward all abstracts
├── base/               # Reset, typography, base elements
│   ├── _reset.scss
│   └── _index.scss     # @forward all base
├── components/         # Reusable UI components
│   ├── _marquee.scss
│   └── _index.scss     # @forward all components
├── layouts/            # Page layout components
│   ├── _scene.scss
│   └── _index.scss     # @forward all layouts
├── pages/              # Page-specific styles
│   ├── _maintenance.scss
│   └── _index.scss     # @forward all pages
└── main.scss           # Main entry point with @use
```

### Import Strategy
- **@use**: Modern SCSS import system with namespace control
- **@forward**: Re-exports modules for concatenation
- **as \***: Global namespace for easier access to variables and mixins

## Implementation Examples

### Marquee Component
```scss
// Block: marquee
.marquee {
  // Element: marquee__content
  &__content {
    // Element: marquee__item
    &-item {
      // styles
    }
  }

  // Modifier: marquee--direction-right
  &--direction-right &__content {
    // styles
  }
}
```

### Maintenance Page
```scss
// Block: maintenance-page
.maintenance-page {
  // Element: maintenance-page__stage
  &__stage {
    // styles
  }

  // Element: maintenance-page__background
  &__background {
    // Element: maintenance-page__grain (pseudo-element)
    &::after {
      // styles
    }
  }

  // Modifier: maintenance-page--reduced-motion
  @media (prefers-reduced-motion: reduce) {
    &__background {
      // styles
    }
  }
}
```

## Benefits

1. **Consistency**: Uniform naming convention across all components
2. **Maintainability**: Clear structure makes code easier to understand and modify
3. **Scalability**: Easy to add new components following the same pattern
4. **Performance**: SCSS concatenation reduces HTTP requests
5. **Modularity**: Each component is self-contained and reusable

## Best Practices

1. **Single Responsibility**: Each block should have one clear purpose
2. **Nesting**: Use SCSS nesting to show BEM relationships
3. **Comments**: Document blocks, elements, and modifiers clearly
4. **Modifiers**: Use modifiers for variations, not for different components
5. **Naming**: Use descriptive, semantic names for blocks and elements

## Migration Notes

- All existing CSS classes have been converted to BEM methodology
- SCSS files now use modern @use/@forward syntax
- Components are properly organized and concatenated
- Design tokens remain globally available via CSS custom properties
