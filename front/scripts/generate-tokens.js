#!/usr/bin/env node

/**
 * Generate Design Tokens Script
 * Converts JSON design tokens to CSS custom properties
 * - Normalizes variable naming to kebab-case
 * - Converts all numeric values to rem (except colors)
 * - Generates Tailwind and DaisyUI theme configurations
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');
const PX_TO_REM_RATIO = 16;

console.log('🎨 Generating design tokens...\n');

try {
  // Step 1: Run style-dictionary to generate initial CSS
  execSync('npm run build:tokens', {
    cwd: projectRoot,
    stdio: 'inherit',
  });

  const cssPath = path.join(projectRoot, 'src/styles/tokens/tokens.css');
  let cssContent = fs.readFileSync(cssPath, 'utf8');

  // Step 2: Normalize variable naming
  cssContent = normalizeVariableNames(cssContent);

  // Step 3: Convert component tokens to camelCase for SCSS compatibility
  cssContent = convertComponentsToCamelCase(cssContent);

  // Step 4: Convert all non-color values to rem
  cssContent = convertToRem(cssContent);

  // Step 5: Write the processed CSS
  fs.writeFileSync(cssPath, cssContent);

  // Step 5: Extract tokens and generate Tailwind/DaisyUI configs
  const tokens = extractTokens(cssContent);
  const tailwindThemePath = writeTailwindThemeModule(tokens);

  // Success output
  console.log('✅ Design tokens generated successfully!');
  console.log('📁 CSS Output: src/styles/tokens/tokens.css');
  console.log(`🌀 Tailwind theme: ${path.relative(projectRoot, tailwindThemePath)}`);
  console.log('🔄 All numeric values converted to rem (colors preserved)');
  console.log('🌐 Tokens are globally available in all SCSS files');
  console.log('\n💡 Usage examples:');
  console.log('   color: var(--color-powerfull-blue);');
  console.log('   padding: var(--spacing-md);');
  console.log('   font-size: var(--font-size-lg);');
  console.log('   border-radius: var(--border-radius-md);');
} catch (error) {
  console.error('❌ Token generation failed:', error.message);
  process.exit(1);
}

/**
 * Normalize variable names to kebab-case with proper prefixes
 */
function normalizeVariableNames(cssContent) {
  return cssContent
    // Convert camelCase to kebab-case
    .replace(/--([a-z]+)([A-Z][a-z]*)/g, (match, first, rest) => {
      return `--${first}-${rest.toLowerCase()}`;
    })
    .replace(/--([a-z]+)-([a-z]+)([A-Z][a-z]*)/g, (match, first, second, rest) => {
      return `--${first}-${second}-${rest.toLowerCase()}`;
    })
    // Add semantic prefixes for better organization
    .replace(/--powerfull-orange/g, '--color-powerfull-orange')
    .replace(/--powerfull-blue/g, '--color-powerfull-blue')
    .replace(/--dark(?!-)/g, '--color-dark')
    .replace(/--white(?!-)/g, '--color-white')
    // Prefix spacing values (avoid conflicts with existing prefixes)
    .replace(/--(?!color-|spacing-|font-|border-|marquee-|popin-)(xs|sm|md|lg|xl|2xl|3xl|4xl|5xl|xxs)(?=:)/g, '--spacing-$1');
}

/**
 * Convert component tokens (marquee, popin, etc.) to camelCase for SCSS compatibility
 */
function convertComponentsToCamelCase(cssContent) {
  return cssContent
    // Marquee tokens: kebab-case to camelCase
    .replace(/--marquee-font-size-mobile/g, '--marquee-font-sizeMobile')
    .replace(/--marquee-font-size-desktop/g, '--marquee-font-sizeDesktop')
    .replace(/--marquee-background-color-brand/g, '--marquee-background-colorBrand')
    .replace(/--marquee-font-color-brand/g, '--marquee-font-colorBrand')
    .replace(/--marquee-link-background-color-hover/g, '--marquee-link-backgroundColorHover')
    .replace(/--marquee-link-border-radius-hover-desktop/g, '--marquee-link-borderRadiusHoverDesktop')
    .replace(/--marquee-link-border-radius-hover-mobile/g, '--marquee-link-borderRadiusHoverMobile')
    .replace(/--marquee-link-padding-v-hover-mobile/g, '--marquee-link-paddingVHoverMobile')
    .replace(/--marquee-link-padding-v-hover-desktop/g, '--marquee-link-paddingVHoverDesktop')
    .replace(/--marquee-link-padding-h-hover-mobile/g, '--marquee-link-paddingHHoverMobile')
    .replace(/--marquee-link-padding-h-hover-desktop/g, '--marquee-link-paddingHHoverDesktop')
    .replace(/--marquee-padding-h-desktop/g, '--marquee-padding-hDesktop')
    .replace(/--marquee-padding-h-mobile/g, '--marquee-padding-hMobile')
    .replace(/--marquee-padding-v-desktop/g, '--marquee-padding-vDesktop')
    .replace(/--marquee-padding-v-mobile/g, '--marquee-padding-vMobile')
    .replace(/--marquee-border-radius-desktop/g, '--marquee-border-radiusDesktop')
    .replace(/--marquee-border-radius-mobile/g, '--marquee-border-radiusMobile')
    // Popin tokens: kebab-case to camelCase
    .replace(/--popin-background-color-brand/g, '--popin-background-colorBrand')
    .replace(/--popin-text-color-brand/g, '--popin-text-colorBrand');
}

/**
 * Convert all px and unitless numeric values to rem (except colors)
 */
function convertToRem(cssContent) {
  // Universal converter for non-color properties
  // Skip values that already use var() or have 'rem' unit
  return cssContent.replace(
    /--((?!.*color)[^:]+):\s*(\d+(?:\.\d+)?)(px)?\s*;/g,
    (match, propertyName, value, unit) => {
      // Skip if the value is already in rem or uses var()
      if (match.includes('rem') || match.includes('var(')) {
        return match;
      }
      
      const numericValue = parseFloat(value);
      if (!Number.isNaN(numericValue)) {
        const remValue = (numericValue / PX_TO_REM_RATIO).toFixed(4);
        return `--${propertyName}: ${remValue}rem;`;
      }
      return match;
    }
  );
}

/**
 * Extract all CSS variables into a key-value object
 */
function extractTokens(cssContent) {
  const variableRegex = /--([a-z0-9-]+):\s*([^;]+);/gi;
  const tokens = {};
  let match;

  while ((match = variableRegex.exec(cssContent))) {
    const [, tokenName, tokenValue] = match;
    tokens[tokenName] = tokenValue.trim();
  }

  return tokens;
}

/**
 * Build Tailwind theme configuration from tokens
 */
function buildTailwindTheme(variables) {
  const theme = {
    colors: {},
    spacing: {},
    fontSize: {},
    borderRadius: {},
  };

  for (const [token, value] of Object.entries(variables)) {
    if (token.startsWith('color-')) {
      theme.colors[token.replace('color-', '')] = value;
    } else if (token.startsWith('spacing-')) {
      theme.spacing[token.replace('spacing-', '')] = value;
    } else if (token.startsWith('font-size-')) {
      theme.fontSize[token.replace('font-size-', '')] = value;
    } else if (token.startsWith('border-radius-')) {
      theme.borderRadius[token.replace('border-radius-', '')] = value;
    }
  }

  // Return only non-empty theme sections
  return Object.fromEntries(
    Object.entries(theme).filter(([, values]) => Object.keys(values).length > 0)
  );
}

/**
 * Build DaisyUI theme configuration
 */
function buildDaisyThemes(variables) {
  const theme = {};
  const mapToken = (daisyKey, tokenName) => {
    if (variables[tokenName]) {
      theme[daisyKey] = variables[tokenName];
    }
  };

  // Map design tokens to DaisyUI theme keys
  mapToken('primary', 'color-powerfull-blue');
  mapToken('primary-content', 'color-white');
  mapToken('secondary', 'color-powerfull-orange');
  mapToken('secondary-content', 'color-white');
  mapToken('accent', 'color-powerfull-orange');
  mapToken('neutral', 'color-dark');
  mapToken('neutral-content', 'color-white');
  mapToken('base-100', 'color-white');
  mapToken('base-200', 'color-dark');
  mapToken('base-300', 'color-dark');
  mapToken('base-content', 'color-dark');
  mapToken('info', 'color-powerfull-blue');
  mapToken('success', 'color-powerfull-blue');
  mapToken('warning', 'color-powerfull-orange');
  mapToken('error', 'color-powerfull-orange');
  mapToken('--rounded-box', 'border-radius-md');
  mapToken('--rounded-btn', 'border-radius-sm');
  mapToken('--rounded-badge', 'border-radius-sm');

  return [{ qalim: theme }];
}

/**
 * Write Tailwind theme module file
 */
function writeTailwindThemeModule(variables) {
  const tailwindTheme = buildTailwindTheme(variables);
  const daisyThemes = buildDaisyThemes(variables);
  const themeDir = path.join(projectRoot, 'src/styles/tokens');
  const themePath = path.join(themeDir, 'tailwind-theme.mjs');

  const fileContent = `// Auto-generated by scripts/generate-tokens.js. Do not edit directly.
export const tailwindTheme = ${JSON.stringify(tailwindTheme, null, 2)};

export const daisyThemes = ${JSON.stringify(daisyThemes, null, 2)};
`;

  fs.writeFileSync(themePath, fileContent);
  return themePath;
}
