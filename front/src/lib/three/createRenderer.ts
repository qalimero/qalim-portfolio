import * as THREE from "three";

export function createRenderer(container: HTMLElement): THREE.WebGLRenderer {
  const canvas = document.createElement("canvas");

  // Check device capabilities for optimal settings
  const isMobile =
    /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(
      navigator.userAgent,
    );
  const hasHighDPI = window.devicePixelRatio > 1;

  const context = canvas.getContext("webgl2", {
    antialias: !isMobile && hasHighDPI, // Disable AA on mobile for performance
    alpha: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
    stencil: false, // Disable stencil buffer if not needed
    depth: true,
  });

  if (!context) {
    throw new Error("WebGL2 not supported in this browser");
  }

  const renderer = new THREE.WebGLRenderer({
    canvas,
    context,
    antialias: !isMobile && hasHighDPI,
    alpha: true,
    powerPreference: "high-performance",
    preserveDrawingBuffer: false,
  });

  renderer.setSize(container.clientWidth, container.clientHeight, false);

  // Cap pixel ratio for better performance
  const pixelRatio = isMobile ? 1 : Math.min(window.devicePixelRatio || 1, 2);
  renderer.setPixelRatio(pixelRatio);
  renderer.setClearColor(0x000000, 0);

  // Optimize rendering settings
  renderer.shadowMap.enabled = false; // Disable shadows for better performance
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.0;

  container.appendChild(renderer.domElement);

  return renderer;
}
