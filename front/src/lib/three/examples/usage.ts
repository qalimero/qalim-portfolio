import { createPixelatedBackground } from '../pixelatedBackground';

// Example usage of the pixelated background
export function initPixelatedBackground() {
  // Initialize with default configuration (reads from #hero_bg element)
  const background = createPixelatedBackground();
  
  // Or initialize with custom container
  // const background = createPixelatedBackground({ containerId: 'my-custom-container' });
  
  // You can reset clicks if needed
  // background.resetClicks();
  
  // Clean up when needed (e.g., on page unload)
  // background.dispose();
  
  return background;
}

// Auto-initialize if the DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initPixelatedBackground);
} else {
  initPixelatedBackground();
}
