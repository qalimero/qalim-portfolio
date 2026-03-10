# Deployment Platforms for Astro Static Sites

Comprehensive deployment guides for major hosting platforms.

## Platform Comparison

| Platform | Auto CI/CD | Custom Domain | Edge CDN | Free Tier |
|----------|------------|---------------|----------|-----------|
| Netlify | Yes | Yes | Yes | 100GB/mo |

## Netlify

### Quick Setup

1. Push code to GitHub/GitLab
2. Connect repository in Netlify dashboard
3. Set build command: `npm run build`
4. Set publish directory: `dist`

### netlify.toml

```toml
[build]
  command = "npm run build"
  publish = "dist"

[build.environment]
  NODE_VERSION = "18"

# Redirects for SPA-style routing (if needed)
[[redirects]]
  from = "/*"
  to = "/index.html"
  status = 200

# Custom headers
[[headers]]
  for = "/*"
    [headers.values]
    X-Frame-Options = "DENY"
    X-Content-Type-Options = "nosniff"

# Trailing slashes
[build.processing]
  skip_processing = false
[build.processing.html]
  pretty_urls = true
```

### Environment Variables

Set in Netlify dashboard or `netlify.toml`:

```toml
[context.production.environment]
  API_URL = "https://api.example.com"

[context.deploy-preview.environment]
  API_URL = "https://staging-api.example.com"
```

## Common Issues and Solutions

### Trailing Slashes

```javascript
// astro.config.mjs
export default defineConfig({
  trailingSlash: 'always'  // or 'never' or 'ignore'
});
```

### Base Path for Subdirectory

```javascript
// astro.config.mjs
export default defineConfig({
  site: 'https://example.com',
  base: '/my-app'
});
```

Update all internal links:

```astro
<a href={`${import.meta.env.BASE_URL}about`}>About</a>
```

### 404 Handling

Most platforms need explicit 404 configuration:

1. Create `src/pages/404.astro`
2. Configure platform-specific redirects

### Build Failures

Common causes:
- Node version mismatch (use v18+)
- Missing environment variables
- Case-sensitive file systems (Linux vs macOS)
- Memory limits for large sites

### Asset Caching

For optimal performance, ensure assets have cache headers:

```javascript
// astro.config.mjs
export default defineConfig({
  build: {
    assets: '_assets'  // Prefixed directory for fingerprinted assets
  }
});
```

## Performance Optimization

### Pre-compression

```javascript
// astro.config.mjs
import compress from 'astro-compress';

export default defineConfig({
  integrations: [compress()]
});
```

### Image Optimization

```javascript
// astro.config.mjs
export default defineConfig({
  image: {
    service: {
      entrypoint: 'astro/assets/services/sharp'
    }
  }
});
```

### Prefetching

```javascript
// astro.config.mjs
export default defineConfig({
  prefetch: {
    prefetchAll: true,
    defaultStrategy: 'viewport'
  }
});
```
