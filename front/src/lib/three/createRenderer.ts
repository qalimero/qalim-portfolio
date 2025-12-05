import * as THREE from 'three';

export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  console.log('[createRenderer] Creating canvas element...');
  const canvas = document.createElement('canvas');

  // Check device capabilities for optimal settings
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent);
  const hasHighDPI = window.devicePixelRatio > 1;
  console.log('[createRenderer] Device info:', { isMobile, hasHighDPI, devicePixelRatio: window.devicePixelRatio });

  const context = canvas.getContext('webgl2', {
    antialias: !isMobile && hasHighDPI, // Disable AA on mobile for performance
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
    stencil: false, // Disable stencil buffer if not needed
    depth: true,
  });

  if (!context) {
    throw new Error('WebGL2 not supported in this browser');
  }
  console.log('[createRenderer] ✓ WebGL2 context created');

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: !isMobile && hasHighDPI,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });

  console.log('[createRenderer] Container dimensions:', {
    width: container.clientWidth,
    height: container.clientHeight
  });

  renderer.setSize(container.clientWidth, container.clientHeight, false);

  // Cap pixel ratio for better performance
  const pixelRatio = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x0d1030, 1);
  console.log('[createRenderer] Clear color set to:', '0x0d1030 (dark blue background)');

  // Optimize rendering settings
  renderer.shadowMap.enabled = false; // Disable shadows for better performance
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  console.log('[createRenderer] Appending canvas to container...');
  container.appendChild(renderer.domElement);
  console.log('[createRenderer] ✓ Renderer created and canvas attached to DOM');

  return renderer;
}
