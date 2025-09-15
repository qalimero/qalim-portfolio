# Marquee Component Documentation

## Overview
The Marquee component is a simplified, focused component designed to display scrolling text with smooth animations. It's optimized for displaying Strapi CMS data from the maintenance page.

## Features

- ✅ **Simple Text Display**: Clean, focused text scrolling
- ✅ **Flexible Configuration**: Customizable speed and direction
- ✅ **BEM Methodology**: Clean, maintainable CSS structure
- ✅ **Responsive Design**: Mobile-optimized with design tokens
- ✅ **Seamless Looping**: Automatic repetition for continuous scrolling
- ✅ **Multiple Instances**: Support for multiple marquees with different configurations

## Props Interface

```typescript
export interface Props {
  text: string;                     // Text to display (required)
  className?: string;               // Additional CSS classes
  speed?: number;                   // Animation speed (default: 1)
  direction?: 'left' | 'right';     // Scroll direction (default: 'left')
}
```

## Usage Examples

### 1. Basic Text Marquee
```astro
<Marquee 
  text="Welcome to our website"
  speed={1}
  direction="left"
/>
```

### 2. Strapi Maintenance Data Integration
```astro
<Marquee 
  text={marquee.items}
  className=" marquee-1"
  speed={1.3}
  direction="right"
/>
```

## Strapi Integration

### Backend Setup
The component integrates with the Strapi maintenance page structure:

```json
{
  "data": {
    "attributes": {
      "title": "Maintenance Page Title",
      "marquee": [
        {
          "items": "First marquee text"
        },
        {
          "items": "Second marquee text"
        }
      ]
    }
  }
}
```

### Frontend Implementation
```astro
---
import { getMaintenancePage } from '../lib/api/strapi';

// Fetch maintenance page data from Strapi
let maintenanceData = null;
try {
  maintenanceData = await getMaintenancePage();
} catch (error) {
  console.error('Error fetching maintenance data:', error);
}

// Process maintenance data for display
const hasMaintenanceData = maintenanceData && maintenanceData.data && maintenanceData.data.attributes;
const marqueeComponents = hasMaintenanceData && maintenanceData?.data?.attributes?.marquee 
  ? maintenanceData.data.attributes.marquee 
  : [];
---

<!-- Display marquees from maintenance page data -->
{marqueeComponents.length > 0 ? (
  marqueeComponents.map((marquee: any, index: number) => (
    <Marquee 
      text={marquee.items}
      className={` marquee-${index + 1}`}
      speed={1 + (index * 0.3)}
      direction={index % 2 === 0 ? 'left' : 'right'}
    />
  ))
) : (
  <Marquee 
    text="Fallback text"
    speed={1}
    direction="left"
  />
)}
```

## CSS Structure (BEM)

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

  // Multiple marquee instances
  &-1 { /* First marquee instance */ }
  &-2 { /* Second marquee instance */ }
  &-3 { /* Third marquee instance */ }
}
```

## Design Tokens

The component uses CSS custom properties for consistent styling:

```css
--marquee-background-colorBrand
--marquee-font-colorBrand
--marquee-border-radiusDesktop
--marquee-border-radiusMobile
--marquee-font-sizeDesktop
--marquee-font-sizeMobile
--marquee-item-gap
--spacing-md
```

## Responsive Behavior

- **Desktop**: Full opacity and positioning
- **Mobile**: Reduced opacity and adjusted positioning for better readability
- **Reduced Motion**: Respects `prefers-reduced-motion` for accessibility

## Performance Considerations

- Uses CSS transforms for smooth GPU-accelerated animations
- Configurable repetition count to balance performance and visual effect
- Efficient data processing with array methods

## Accessibility

- Respects user motion preferences
- Semantic HTML structure with `<ul>` and `<li>` elements
- Proper ARIA attributes can be added as needed

## Demo Page

Visit `/marquee-demo` to see all component variations and configurations in action.

## Maintenance Page Integration

The component is fully integrated into the maintenance page (`/maintenance`) and automatically displays Strapi data when available, with fallback to default text when the API is unavailable.
