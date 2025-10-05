# 📊 Data Organization

This folder contains all data files used in the project, separated from styles and components for better organization and maintainability.

## 📁 Folder Structure

```
src/data/
├── design-tokens/           # 🎨 Design token JSON files
│   ├── foundation/         # 🏗️ Core design tokens
│   │   ├── colors.json     # Color palette
│   │   ├── spacing.json    # Spacing values
│   │   ├── fontSize.json   # Typography sizes
│   │   └── borderRadius.json # Border radius values
│   └── components/         # 📦 Component-specific tokens
│       └── marquee.json    # Marquee component tokens
└── README.md               # 📖 This documentation
```

## 🎨 **Design Tokens** (`design-tokens/`)

### **Purpose**
Design tokens are the single source of truth for design decisions. They define colors, spacing, typography, and other design properties that can be used across the entire project.

### **Structure**
- **Foundation Tokens**: Core design properties (colors, spacing, typography, border radius)
- **Component Tokens**: Component-specific design properties

### **File Organization**
- **`foundation/`**: Core design tokens used throughout the project
- **`components/`**: Component-specific tokens that extend or override foundation tokens

### **Token Types**
- **Colors**: Brand colors, semantic colors, neutral colors
- **Spacing**: Consistent spacing scale for margins, padding, gaps
- **Typography**: Font sizes, line heights, font weights
- **Border Radius**: Consistent corner rounding values
- **Component Tokens**: Specific to individual components

## 🔄 **Token Processing**

### **Generation Process**
1. **JSON Tokens**: Source of truth in `src/data/design-tokens/`
2. **Style Dictionary**: Processes JSON tokens
3. **CSS Custom Properties**: Generated in `src/styles/design-system/tokens/`
4. **SCSS Integration**: Available globally in all stylesheets

### **Build Commands**
```bash
# Generate tokens from JSON to CSS
npm run tokens

# Build tokens only (without post-processing)
npm run build:tokens
```

## 📋 **Token Guidelines**

### **Naming Conventions**
- Use camelCase in JSON files
- Converted to kebab-case in CSS custom properties
- Use descriptive, semantic names
- Group related tokens with prefixes

### **Value Guidelines**
- Use consistent units (px for borders, rem for spacing/typography)
- Provide multiple scales (xs, sm, md, lg, xl, etc.)
- Include both light and dark mode variants when needed
- Use semantic naming over specific values

### **Organization Principles**
- **Foundation First**: Core tokens before component tokens
- **Hierarchical**: General to specific
- **Consistent**: Same structure across all token files
- **Extensible**: Easy to add new tokens and categories

## 🎯 **Usage Examples**

### **Adding New Foundation Tokens**
```json
// src/data/design-tokens/foundation/colors.json
{
  "color": {
    "brand": {
      "primary": {
        "value": "#007bff",
        "type": "color"
      },
      "secondary": {
        "value": "#6c757d",
        "type": "color"
      }
    }
  }
}
```

### **Adding Component Tokens**
```json
// src/data/design-tokens/components/button.json
{
  "button": {
    "background": {
      "primary": {
        "value": "{color.brand.primary}",
        "type": "color"
      }
    },
    "padding": {
      "default": {
        "value": "{spacing.md}",
        "type": "spacing"
      }
    }
  }
}
```

## 🔧 **Integration with Build System**

### **Style Dictionary Configuration**
- **Source**: `src/data/design-tokens/**/*.json`
- **Output**: `src/styles/design-system/tokens/design-tokens.css`
- **Format**: CSS custom properties with `:root` selector

### **Post-Processing**
- Converts camelCase to kebab-case
- Converts px values to rem for spacing/typography
- Keeps border properties in pixels
- Adds type prefixes for better organization

## 📱 **Responsive Considerations**

### **Token Scaling**
- Use relative units (rem) for responsive scaling
- Provide mobile and desktop variants when needed
- Consider device-specific adjustments

### **Breakpoint Integration**
- Tokens work with Tailwind CSS breakpoints
- Responsive variants can be defined in component tokens
- Use CSS custom properties for dynamic theming

## 🎨 **Design System Integration**

### **CSS Custom Properties**
```css
:root {
  --color-brand-primary: #007bff;
  --spacing-md: 1rem;
  --font-size-lg: 1.125rem;
  --border-radius-md: 0.375rem;
}
```

### **SCSS Usage**
```scss
.button {
  background-color: var(--color-brand-primary);
  padding: var(--spacing-md);
  font-size: var(--font-size-lg);
  border-radius: var(--border-radius-md);
}
```

### **Tailwind Integration**
- Tokens can be referenced in Tailwind configuration
- CSS custom properties work with Tailwind utilities
- Responsive variants supported

## 📋 **Maintenance Guidelines**

### **Adding New Tokens**
1. Add JSON file to appropriate folder (`foundation/` or `components/`)
2. Follow naming conventions and structure
3. Run `npm run tokens` to generate CSS
4. Test tokens in components
5. Update documentation if needed

### **Modifying Existing Tokens**
1. Update JSON source files
2. Regenerate tokens with `npm run tokens`
3. Test all components using the tokens
4. Update any hardcoded values that should use tokens

### **Token Validation**
- Ensure consistent naming across all files
- Validate token references and dependencies
- Test generated CSS custom properties
- Verify responsive behavior

## 🚀 **Benefits of This Organization**

### **Separation of Concerns**
- **Data**: JSON tokens in `src/data/`
- **Styles**: Generated CSS in `src/styles/`
- **Components**: Usage in `src/components/`

### **Maintainability**
- Single source of truth for design decisions
- Easy to update and modify tokens
- Clear separation between data and presentation

### **Scalability**
- Easy to add new token categories
- Component-specific tokens supported
- Extensible structure for future needs

### **Developer Experience**
- Clear organization and structure
- Easy to find and modify tokens
- Consistent naming and conventions

---

**Last Updated**: December 2024  
**Maintained by**: Development Team



