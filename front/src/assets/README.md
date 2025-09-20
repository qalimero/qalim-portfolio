# 🎨 Assets Organization

This folder contains all static assets used in the project, organized by type for better maintainability and performance.

## 📁 Folder Structure

```
src/assets/
├── icons/          # 🎯 Icon files (SVG, PNG, ICO)
├── images/         # 🖼️ Image files (JPG, PNG, WebP, AVIF)
├── vectors/        # 📐 Vector graphics (SVG, AI, EPS)
├── fonts/          # 🔤 Font files (WOFF, WOFF2, TTF, OTF)
└── README.md       # 📖 This documentation
```

## 🎯 **Icons** (`icons/`)
- **Purpose**: UI icons, favicons, and small graphics
- **Formats**: SVG (preferred), PNG, ICO
- **Naming**: Use kebab-case (e.g., `user-profile.svg`, `arrow-right.svg`)
- **Current files**:
  - `astro.svg` - Astro framework logo

### Best Practices for Icons:
- Use SVG format for scalability
- Optimize SVG files (remove unnecessary metadata)
- Use consistent sizing (24x24, 32x32, etc.)
- Include both filled and outlined versions when needed

## 🖼️ **Images** (`images/`)
- **Purpose**: Photos, illustrations, and raster graphics
- **Formats**: WebP (preferred), AVIF, PNG, JPG
- **Naming**: Use descriptive names (e.g., `hero-background.webp`, `team-photo.jpg`)

### Best Practices for Images:
- Use modern formats (WebP, AVIF) for better compression
- Provide multiple sizes for responsive design
- Optimize file sizes without losing quality
- Use descriptive alt text for accessibility

## 📐 **Vectors** (`vectors/`)
- **Purpose**: Complex vector graphics, logos, and illustrations
- **Formats**: SVG (preferred), AI, EPS
- **Naming**: Use descriptive names (e.g., `company-logo.svg`, `hero-illustration.svg`)
- **Current files**:
  - `background.svg` - Background vector graphic

### Best Practices for Vectors:
- Use SVG for web compatibility
- Keep file sizes optimized
- Use semantic IDs and classes for styling
- Consider using icon fonts for simple icons

## 🔤 **Fonts** (`fonts/`)
- **Purpose**: Custom font files
- **Formats**: WOFF2 (preferred), WOFF, TTF, OTF
- **Naming**: Use font family names (e.g., `inter-regular.woff2`, `inter-bold.woff2`)

### Best Practices for Fonts:
- Use WOFF2 format for best compression
- Include fallback fonts in CSS
- Preload critical fonts
- Consider font-display: swap for better performance

## 🚀 **Usage in Code**

### Importing Assets in Astro/React:
```astro
---
import AstroIcon from '../assets/icons/astro.svg';
import BackgroundVector from '../assets/vectors/background.svg';
---

<img src={AstroIcon} alt="Astro Logo" />
<BackgroundVector class="hero-background" />
```

### Importing in SCSS:
```scss
.hero-section {
  background-image: url('../assets/vectors/background.svg');
}

.icon {
  background-image: url('../assets/icons/user-profile.svg');
}
```

### Importing in JavaScript:
```javascript
import astroIcon from '../assets/icons/astro.svg';
import backgroundVector from '../assets/vectors/background.svg';
```

## 📦 **Asset Optimization**

### SVG Optimization:
- Remove unnecessary metadata
- Use viewBox for responsive scaling
- Optimize paths and shapes
- Use tools like SVGO for automatic optimization

### Image Optimization:
- Use responsive images with srcset
- Implement lazy loading
- Consider using next-gen formats
- Compress images without quality loss

### Font Optimization:
- Use font-display: swap
- Preload critical fonts
- Subset fonts to include only needed characters
- Use variable fonts when possible

## 🔧 **Build Process**

Assets are processed by:
- **Vite**: Handles asset imports and optimization
- **Astro**: Processes assets for production builds
- **Tailwind CSS**: Can reference assets in configuration

## 📋 **Asset Checklist**

When adding new assets:

- [ ] Choose the correct folder based on asset type
- [ ] Use descriptive, kebab-case naming
- [ ] Optimize file size and quality
- [ ] Add appropriate alt text for images
- [ ] Update this README if adding new categories
- [ ] Test asset loading in different browsers
- [ ] Consider responsive versions for images

## 🎨 **Design System Integration**

Assets work seamlessly with the design system:
- Icons can use design token colors
- Images respect responsive breakpoints
- Fonts integrate with typography tokens
- Vectors can be styled with CSS custom properties

## 📱 **Responsive Considerations**

- Provide multiple image sizes for different screen densities
- Use SVG for icons to ensure crisp rendering at all sizes
- Consider using CSS media queries for different asset versions
- Test assets on various devices and screen sizes

---

**Last Updated**: December 2024  
**Maintained by**: Development Team

