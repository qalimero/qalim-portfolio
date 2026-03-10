#!/usr/bin/env node

/**
 * Generate Design Tokens Script
 * Converts JSON design tokens to CSS custom properties
 * - Normalizes variable naming to kebab-case
 * - Converts all numeric values to rem (except colors)
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

  // Success output
  console.log('✅ Design tokens generated successfully!');
  console.log('📁 CSS Output: src/styles/tokens/tokens.css');
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

