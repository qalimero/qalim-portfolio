# 🚀 Quentin Serda Portfolio - Complete Workflow Guide

## 📋 Project Overview

This is a modern portfolio project built with **Astro** (frontend) and **Strapi** (backend CMS), featuring a sophisticated design system, 3D interactive scenes, and a maintenance page with dynamic content management.

---

## 🏗️ Architecture

### **Frontend (Astro)**
- **Framework**: Astro v5.12.3 with React integration
- **Styling**: SCSS with BEM methodology + Tailwind CSS + DaisyUI
- **3D Graphics**: Three.js with Spline integration
- **Design System**: JSON-based design tokens with CSS custom properties
- **Port**: `http://localhost:4321`

### **Backend (Strapi)**
- **CMS**: Strapi v5.11.2 (Community Edition)
- **Database**: SQLite (development)
- **API**: RESTful API with content management
- **Port**: `http://localhost:1337`

---

## 🎨 Design System

### **Token Structure**
```
src/data/design-tokens/
├── foundation/           # Core design tokens
│   ├── colors.json      # Color palette
│   ├── spacing.json     # Spacing values
│   ├── fontSize.json    # Typography sizes
│   └── borderRadius.json # Border radius values
└── components/          # Component-specific tokens
    └── marquee.json     # Marquee component tokens
```

### **Generated CSS Custom Properties**
```css
:root {
  --color-powerfull-blue: #3200f2;
  --color-powerfull-orange: #ff602f;
  --spacing-md: 1.0000rem;
  --font-size-lg: 4.2358rem;
  --marquee-background-colorBrand: #3200f2;
}
```

### **Usage in SCSS**
```scss
.marquee {
  background-color: var(--marquee-background-colorBrand);
  padding: var(--spacing-md);
  border-radius: var(--marquee-border-radiusDesktop);
}
```

---

## 🛠️ Development Workflow

### **1. Environment Setup**

#### **Prerequisites**
- Node.js v22.14.0+
- npm
- VS Code (recommended)

#### **VS Code Extensions**
```bash
# Essential Extensions
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension astro-build.astro-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
```

### **2. Project Setup**

#### **Install Dependencies**
```bash
# Backend
cd backend && npm install

# Frontend
cd front && npm install
```

#### **Environment Configuration**
```typescript
// env.d.ts
interface ImportMetaEnv {
  readonly STRAPI_URL: string;
  readonly PUBLIC_SITE_URL: string;
  readonly PROD: boolean;
}
```

### **3. Development Commands**

#### **Backend (Strapi)**
```bash
cd backend
npm run develop    # Start Strapi CMS
# Access admin: http://localhost:1337/admin
```

#### **Frontend (Astro)**
```bash
cd front
npm run dev        # Start development server
npm run build      # Build for production
npm run preview    # Preview production build
```

#### **Design System**
```bash
npm run tokens       # Generate design tokens
npm run build:tokens # Build tokens only
```

#### **Code Quality**
```bash
npm run lint         # Check for linting errors
npm run lint:fix     # Fix auto-fixable errors
npm run format       # Format code with Prettier
npm run type-check   # Run TypeScript type checking
```

---

## 🎯 Key Features

### **1. Maintenance Page**
- **Dynamic Content**: Fetches data from Strapi CMS
- **Marquee Components**: Multiple animated text marquees
- **3D Background**: Interactive Three.js scene
- **Responsive Design**: Mobile-optimized layout

#### **API Integration**
```typescript
// Fetch maintenance data
const maintenanceData = await getMaintenancePage();
const marqueeComponents = maintenanceData?.data?.attributes?.marquee 
  ? maintenanceData.data.attributes.marquee.filter(marquee => marquee.items?.trim())
  : [];
```

#### **Component Usage**
```astro
<Marquee 
  text={marquee.items}
  className={`marquee-${index + 1}`}
  speed={marquee.speed ?? 1 + (index * 0.3)}
  direction={marquee.direction ?? (index % 2 === 0 ? 'left' : 'right')}
/>
```

### **2. Three.js Scene**
- **Spline Integration**: 3D models from Spline
- **Perfect Centering**: Automatic camera positioning
- **Mobile Optimization**: Responsive 3D rendering
- **Interactive Elements**: Click interactions for links

### **3. Design System**
- **BEM Methodology**: Consistent CSS naming
- **SCSS Concatenation**: Modular style architecture
- **Design Tokens**: JSON-to-CSS transformation
- **Tailwind Integration**: Utility-first styling

---

## 📁 Project Structure

```
quentin/
├── backend/                    # Strapi CMS
│   ├── src/
│   │   ├── api/               # API endpoints
│   │   │   ├── maintenance/   # Maintenance page API
│   │   │   └── ...
│   │   ├── components/        # Strapi components
│   │   └── extensions/        # Custom extensions
│   ├── config/                # Strapi configuration
│   └── data/                  # Database and uploads
│
└── front/                     # Astro Frontend
    ├── src/
    │   ├── components/        # React/Astro components
    │   │   ├── ui/           # UI components (Marquee, etc.)
    │   │   └── scenes/       # Three.js scenes
    │   ├── data/             # Design tokens (JSON)
    │   ├── lib/              # Utility functions
    │   │   ├── api/          # Strapi API client
    │   │   └── three/        # Three.js utilities
    │   ├── pages/            # Astro pages
    │   ├── styles/           # SCSS styles
    │   │   ├── abstracts/    # Variables, mixins
    │   │   ├── base/         # Reset, typography
    │   │   ├── components/   # Component styles
    │   │   ├── layouts/      # Layout styles
    │   │   ├── pages/        # Page-specific styles
    │   │   └── tokens/       # Generated CSS tokens
    │   └── layouts/          # Astro layouts
    ├── public/               # Static assets
    └── docs/                 # Documentation
```

---

## 🔧 Configuration Files

### **Astro Configuration**
```javascript
// astro.config.mjs
export default defineConfig({
  output: 'server',
  integrations: [react(), tailwind({
    applyBaseStyles: false,
  })],
  devToolbar: { enabled: false },
});
```

### **Tailwind Configuration**
```javascript
// tailwind.config.mjs
import daisyui from 'daisyui';
import { daisyThemes, tailwindTheme } from './src/styles/tokens/tailwind-theme.mjs';

export default {
  content: ['./src/**/*.{astro,html,js,jsx,md,mdx,svelte,ts,tsx,vue}'],
  theme: { extend: tailwindTheme },
  plugins: [daisyui],
  daisyui: { themes: daisyThemes },
};
```

### **Style Dictionary**
```javascript
// style-dictionary.config.mjs
export default {
  source: ['src/data/design-tokens/**/*.json'],
  platforms: {
    css: {
      transformGroup: 'css',
      buildPath: 'src/styles/tokens/',
      files: [{
        destination: 'tokens.css',
        format: 'css/variables',
      }],
    },
  },
};
```

---

## 🚀 Deployment Workflow

### **1. Development**
```bash
# Start both servers
cd backend && npm run develop &
cd front && npm run dev
```

### **2. Code Quality Check**
```bash
cd front
npm run lint:fix     # Fix linting issues
npm run format       # Format code
npm run type-check   # Check TypeScript
```

### **3. Build & Test**
```bash
cd front
npm run build        # Build for production
npm run preview      # Test production build
```

### **4. Git Workflow**
```bash
git add .
git commit -m "feat: your feature description"
git push
```

---

## 🎨 Design System Workflow

### **1. Add New Tokens**
```json
// src/data/design-tokens/foundation/colors.json
{
  "color": {
    "brand": {
      "primary": { "value": "#3200f2" },
      "secondary": { "value": "#ff602f" }
    }
  }
}
```

### **2. Generate CSS**
```bash
npm run tokens
```

### **3. Use in Components**
```scss
.button {
  background: var(--color-brand-primary);
  color: var(--color-white);
}
```

---

## 🔍 Troubleshooting

### **Common Issues**

#### **TypeScript Errors**
```bash
npm run type-check   # Check for type errors
npm install @astrojs/check typescript  # Install missing deps
```

#### **API Connection Issues**
- Verify Strapi is running on `http://localhost:1337`
- Check API endpoint: `http://localhost:1337/api/maintenance?populate=*`
- Verify environment variables in `env.d.ts`

#### **Design Token Issues**
```bash
npm run tokens       # Regenerate tokens
npm run build:tokens # Force rebuild
```

#### **Styling Issues**
- Check SCSS compilation
- Verify Tailwind classes
- Check CSS custom properties in browser dev tools

---

## 📊 Current Status

### **✅ Working Features**
- Backend API (Strapi) running on port 1337
- Frontend (Astro) running on port 4321
- Maintenance page with dynamic content
- Marquee components with animations
- Three.js 3D scene integration
- Design system with tokens
- TypeScript type checking
- Code quality tools (ESLint, Prettier)

### **🎯 Key Endpoints**
- **Frontend**: `http://localhost:4321/maintenance`
- **Backend Admin**: `http://localhost:1337/admin`
- **API**: `http://localhost:1337/api/maintenance?populate=*`

### **📈 Performance**
- Fast development server startup
- Optimized 3D rendering
- Responsive design
- Clean, maintainable code

---

## 🎉 Success Metrics

- ✅ **Zero TypeScript errors**
- ✅ **Zero linting errors**
- ✅ **Both servers running smoothly**
- ✅ **API integration working**
- ✅ **Design system functional**
- ✅ **3D scene rendering**
- ✅ **Responsive design**
- ✅ **Clean code architecture**

---

**Last Updated**: September 2025  
**Project Version**: 1.0.0  
**Status**: Production Ready 🚀
