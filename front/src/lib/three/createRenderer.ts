import * as THREE from 'three';

export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('webgl2', {
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });

  if (!context) {
    throw new Error('WebGL2 not supported in this browser');
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
    preserveDrawingBuffer: false,
  });

  renderer.setSize(container.clientWidth, container.clientHeight, false);
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));
  renderer.setClearColor(0x0d1030, 1); // Dark blue background

  // Optimize for smooth rendering
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  // Enable smooth rendering
  // renderer.physicallyCorrectLights = true; // This property doesn't exist in current Three.js version

  container.appendChild(renderer.domElement);
  return renderer;
}
