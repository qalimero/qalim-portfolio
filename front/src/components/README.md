# Components Structure

This folder contains all reusable components organized by category.

## 📁 Folder Structure

```
src/components/
├── ui/                    # 🎨 UI Components (buttons, cards, inputs, etc.)
│   └── Marquee.astro     # Marquee component
├── layout/               # 📐 Layout Components (headers, footers, grids, etc.)
├── scenes/               # 🎮 3D Scene Components
│   └── ThreeScene.jsx    # Three.js scene component
├── content/              # 📝 Content Components (markdown, text, etc.)
│   └── MarkdownContent.astro
└── README.md             # 📖 This file
```

## 🎯 Component Categories

### **UI Components** (`ui/`)
- Basic, reusable UI elements
- Buttons, cards, inputs, modals, marquees, etc.
- Should be framework-agnostic when possible

### **Layout Components** (`layout/`)
- Page structure components
- Headers, footers, navigation, grids
- Define the overall page layout

### **Scene Components** (`scenes/`)
- 3D scene components
- Three.js, WebGL, interactive 3D elements
- 3D visualization and rendering

### **Content Components** (`content/`)
- Content-related components
- Markdown renderers, text components
- Content display and formatting

## 📝 Naming Conventions

- Use PascalCase for component names: `Marquee.astro`
- Use descriptive names: `AnimatedButton.astro` not `Button2.astro`
- Group related components in subfolders if needed

## 🚀 Usage in Pages

```astro
---
// Import from the appropriate category
import Marquee from '../components/ui/Marquee.astro';
import ThreeScene from '../components/scenes/ThreeScene.jsx';
import MarkdownContent from '../components/content/MarkdownContent.astro';
---

<Marquee />
<ThreeScene client:only="react" />
<MarkdownContent content={content} />
```

## 💡 Best Practices

1. **Keep components focused** - One responsibility per component
2. **Use props for customization** - Make components reusable
3. **Document props** - Add JSDoc comments for complex props
4. **Test components** - Ensure they work in different contexts
5. **Follow the folder structure** - Put components in the right category