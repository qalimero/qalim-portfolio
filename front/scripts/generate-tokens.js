#!/usr/bin/env node

/**
 * Generate Design Tokens Script
 * Converts JSON design tokens to CSS custom properties with proper naming
 */

import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const projectRoot = path.join(__dirname, '..');

console.log('🎨 Generating design tokens...\n');

try {
  // Run style-dictionary to generate CSS custom properties
  execSync('npm run build:tokens', { 
    cwd: projectRoot, 
    stdio: 'inherit' 
  });
  
  // Post-process the CSS to fix naming
  const cssPath = path.join(projectRoot, 'src/styles/design-system/tokens/design-tokens.css');
  let cssContent = fs.readFileSync(cssPath, 'utf8');
  
  // Fix variable naming to be more consistent first
  cssContent = cssContent
    // Convert camelCase to kebab-case for all variables
    .replace(/--([a-z]+)([A-Z][a-z]*)/g, (match, first, rest) => {
      return `--${first}-${rest.toLowerCase()}`;
    })
    // Handle multiple camelCase words
    .replace(/--([a-z]+)-([a-z]+)([A-Z][a-z]*)/g, (match, first, second, rest) => {
      return `--${first}-${second}-${rest.toLowerCase()}`;
    })
    // Fix specific naming patterns
    .replace(/--marquee-font-size-mobile/g, '--marquee-font-size-mobile')
    .replace(/--marquee-font-size-desktop/g, '--marquee-font-size-desktop')
    .replace(/--marquee-background-color-brand/g, '--marquee-background-color-brand')
    .replace(/--marquee-font-color-brand/g, '--marquee-font-color-brand')
    .replace(/--marquee-border-radius-desktop/g, '--marquee-border-radius-desktop')
    .replace(/--marquee-border-radius-mobile/g, '--marquee-border-radius-mobile')
    .replace(/--border-radius-md/g, '--border-radius-md')
    .replace(/--border-radius-sm/g, '--border-radius-sm')
    .replace(/--font-size-xs/g, '--font-size-xs')
    .replace(/--font-size-sm/g, '--font-size-sm')
    .replace(/--font-size-xxs/g, '--font-size-xxs')
    .replace(/--font-size-md/g, '--font-size-md')
    .replace(/--font-size-lg/g, '--font-size-lg')
    .replace(/--font-size-xl/g, '--font-size-xl')
    // Add prefixes for better organization
    .replace(/--powerfull-orange/g, '--color-powerfull-orange')
    .replace(/--dark/g, '--color-dark')
    .replace(/--white/g, '--color-white')
    .replace(/--powerfull-blue/g, '--color-powerfull-blue')
    .replace(/--xs/g, '--spacing-xs')
    .replace(/--md/g, '--spacing-md')
    .replace(/--3xl/g, '--spacing-3xl')
    .replace(/--4xl/g, '--spacing-4xl')
    .replace(/--2xl/g, '--spacing-2xl')
    .replace(/--lg/g, '--spacing-lg')
    .replace(/--xxs/g, '--spacing-xxs')
    .replace(/--xl/g, '--spacing-xl')
    .replace(/--5xl/g, '--spacing-5xl')
    .replace(/--sm/g, '--spacing-sm');
  
  // Function to convert px values to rem (assuming 16px = 1rem)
  function convertToRem(cssContent) {
    return cssContent
      // Convert spacing values to rem
      .replace(/--spacing-([^:]+):\s*(\d+(?:\.\d+)?)px/g, (match, name, value) => {
        const remValue = (parseFloat(value) / 16).toFixed(4);
        return `--spacing-${name}: ${remValue}rem`;
      })
      // Convert font-size values to rem
      .replace(/--font-size-([^:]+):\s*(\d+(?:\.\d+)?)px/g, (match, name, value) => {
        const remValue = (parseFloat(value) / 16).toFixed(4);
        return `--font-size-${name}: ${remValue}rem`;
      })
      // Convert border-radius values to rem (but keep border properties in px)
      .replace(/--border-radius-([^:]+):\s*(\d+(?:\.\d+)?)(?!px)/g, (match, name, value) => {
        const remValue = (parseFloat(value) / 16).toFixed(4);
        return `--border-radius-${name}: ${remValue}rem`;
      })
      // Convert marquee border-radius values to rem
      .replace(/--marquee-border-radius([^:]+):\s*(\d+(?:\.\d+)?)(?!px)/g, (match, name, value) => {
        const remValue = (parseFloat(value) / 16).toFixed(4);
        return `--marquee-border-radius${name}: ${remValue}rem`;
      })
      // Convert marquee font-size values to rem
      .replace(/--marquee-font-size([^:]+):\s*(\d+(?:\.\d+)?)px/g, (match, name, value) => {
        const remValue = (parseFloat(value) / 16).toFixed(4);
        return `--marquee-font-size${name}: ${remValue}rem`;
      });
  }
  
  // Convert values to rem after naming fixes
  cssContent = convertToRem(cssContent);
  
  // Write the improved CSS
  fs.writeFileSync(cssPath, cssContent);
  
  console.log('✅ Design tokens generated successfully!');
  console.log('📁 Output: src/styles/design-system/tokens/design-tokens.css');
  console.log('🔄 Converted spacing, font-size, and border-radius to rem units');
  console.log('📏 Border properties remain in pixels for precision');
  console.log('🌐 Tokens are globally available in all SCSS files');
  console.log('\n💡 Use directly in any SCSS file:');
  console.log('   color: var(--color-powerfull-blue);');
  console.log('   padding: var(--spacing-md); /* now in rem */');
  console.log('   font-size: var(--font-size-lg); /* now in rem */');
  console.log('   border-radius: var(--border-radius-md); /* now in rem */');
  
} catch (error) {
  console.error('❌ Token generation failed:', error.message);
  process.exit(1);
}
