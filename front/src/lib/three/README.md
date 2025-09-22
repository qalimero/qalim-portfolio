# Three.js Pixelated Background

A modular, organized Three.js implementation for creating interactive pixelated backgrounds with click ripple effects.

## Structure

```
src/lib/three/
├── config/
│   ├── uniforms.ts          # Uniforms configuration and types
│   └── sceneConfig.ts       # HTML attribute parsing
├── interactions/
│   └── clickHandler.ts      # Click interaction handling
├── scene/
│   └── createPixelatedScene.ts # Scene, renderer, and material setup
├── shaders/
│   ├── vertex.glsl          # Vertex shader
│   └── fragment.glsl        # Fragment shader with pixelation effects
├── examples/
│   └── usage.ts             # Usage examples
├── pixelatedBackground.ts   # Main class that ties everything together
└── index.ts                 # Public API exports
```

## Usage

### Basic Usage

```typescript
import { createPixelatedBackground } from './lib/three/pixelatedBackground';

// Initialize with default configuration
const background = createPixelatedBackground();
```

### HTML Configuration

The background reads configuration from HTML data attributes:

```html
<div id="hero_bg" 
     data-shape="circle" 
     data-pixel-size="4" 
     data-ink="#FFFFFF">
</div>
```

### Available Shapes

- `square` (default)
- `circle`
- `triangle`
- `diamond`

### Advanced Usage

```typescript
import { PixelatedBackground } from './lib/three/pixelatedBackground';

// Custom configuration
const background = new PixelatedBackground({
  containerId: 'my-custom-container'
});

// Reset click effects
background.resetClicks();

// Clean up
background.dispose();
```

## Features

- **Modular Architecture**: Clean separation of concerns
- **TypeScript Support**: Full type safety
- **Interactive Effects**: Click ripple animations
- **Configurable Shapes**: Multiple pixelation patterns
- **Responsive**: Automatically handles window resizing
- **Performance Optimized**: Efficient WebGL2 rendering

## API Reference

### PixelatedBackground

Main class for managing the pixelated background.

#### Constructor
```typescript
new PixelatedBackground(config?: PixelatedBackgroundConfig)
```

#### Methods
- `stop()`: Stop the animation loop
- `dispose()`: Clean up resources
- `resetClicks()`: Reset all click effects

### Configuration Options

```typescript
interface PixelatedBackgroundConfig {
  containerId?: string; // Default: 'hero_bg'
}
```

## Shader Features

The fragment shader includes:
- Bayer matrix dithering
- Fractal Brownian Motion (fBm) noise
- Click ripple effects
- Multiple shape masks
- Real-time animation
