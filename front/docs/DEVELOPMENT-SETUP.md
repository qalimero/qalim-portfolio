# 🛠️ Development Setup Guide

This guide will help you set up your development environment with all the necessary tools and extensions.

## 📦 Installed Development Tools

### **Linting & Formatting**

- **ESLint**: JavaScript/TypeScript linting with React and accessibility rules
- **Prettier**: Code formatting for consistent style
- **TypeScript**: Type checking and IntelliSense

### **VS Code Extensions (Recommended)**

Install these extensions for the best development experience:

```bash
# Essential Extensions
code --install-extension esbenp.prettier-vscode
code --install-extension dbaeumer.vscode-eslint
code --install-extension astro-build.astro-vscode
code --install-extension bradlc.vscode-tailwindcss
code --install-extension ms-vscode.vscode-typescript-next
code --install-extension formulahendry.auto-rename-tag
code --install-extension christian-kohler.path-intellisense
code --install-extension ms-vscode.vscode-json
code --install-extension redhat.vscode-yaml
code --install-extension ms-vscode.vscode-css-peek
code --install-extension zignd.html-css-class-completion
code --install-extension formulahendry.auto-close-tag
```

## 🚀 Available Scripts

### **Development**

```bash
npm run dev          # Start development server
npm run build        # Build for production
npm run preview      # Preview production build
```

### **Code Quality**

```bash
npm run lint         # Check for linting errors
npm run lint:fix     # Fix auto-fixable linting errors
npm run format       # Format code with Prettier
npm run format:check # Check if code is formatted
npm run type-check   # Run TypeScript type checking
```

### **Design System**

```bash
npm run tokens       # Generate design tokens
npm run build:tokens # Build tokens only
```

## ⚙️ Configuration Files

### **ESLint** (`.eslintrc.js`)

- TypeScript support
- React and React Hooks rules
- Accessibility rules (jsx-a11y)
- Prettier integration

### **Prettier** (`.prettierrc`)

- Single quotes
- Semicolons
- 2-space indentation
- 80 character line width

### **VS Code** (`.vscode/settings.json`)

- Format on save
- Auto-fix ESLint on save
- Organize imports on save
- TypeScript preferences

## 🎯 Best Practices

### **Code Style**

1. **Format on Save**: Code is automatically formatted when you save
2. **Lint on Save**: ESLint errors are auto-fixed when possible
3. **Import Organization**: Imports are automatically organized

### **File Organization**

- Use relative imports for local files
- Group imports: external → internal → relative
- Use TypeScript for all new files

### **Git Workflow**

```bash
# Before committing
npm run lint:fix     # Fix linting issues
npm run format       # Format code
npm run type-check   # Check types

# Then commit
git add .
git commit -m "feat: your feature description"
```

## 🔧 Troubleshooting

### **ESLint Errors**

```bash
npm run lint:fix     # Auto-fix most issues
```

### **TypeScript Errors**

```bash
npm run type-check   # Check for type errors
```

### **Formatting Issues**

```bash
npm run format       # Format all files
```

## 📁 Project Structure

```
front/
├── .vscode/                 # VS Code settings
├── src/
│   ├── components/          # React components
│   ├── lib/                 # Utility functions
│   │   └── three/          # Three.js scene files
│   ├── pages/              # Astro pages
│   ├── styles/             # SCSS styles
│   │   └── design-system/  # Design tokens
│   └── scripts/            # Build scripts
├── .eslintrc.js            # ESLint config
├── .prettierrc             # Prettier config
└── package.json            # Dependencies & scripts
```

## 🎨 Design System Integration

Your project includes a complete design system with:

- **Design Tokens**: JSON-based design properties
- **CSS Custom Properties**: Generated from tokens
- **SCSS Integration**: Global access to design tokens
- **Tailwind CSS**: Utility-first styling

## 🚀 Getting Started

1. **Install VS Code Extensions** (see list above)
2. **Open Project**: `code .` in the front directory
3. **Start Development**: `npm run dev`
4. **Open Browser**: Navigate to `http://localhost:4322`

## 📝 Notes

- All configuration files are already set up
- VS Code will automatically suggest installing recommended extensions
- Code formatting and linting happen automatically on save
- TypeScript provides full IntelliSense support

Happy coding! 🎉
