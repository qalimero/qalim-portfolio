import * as THREE from 'three';
import { createCamera } from './createCamera';
import { createRenderer } from './createRenderer';
import { loadCard } from './loadCard';

interface SplineSceneInstance {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  animationId: void;
  cleanup: () => void;
}

export function initSplineScene(
  containerId: string
): SplineSceneInstance | null {
  const container = document.getElementById(containerId);
  if (!container) {
    if (import.meta.env.DEV) {
      console.error(`Container with id "${containerId}" not found`);
    }
    return null;
  }

  // Check if there's already a canvas in the container
  const existingCanvas = container.querySelector('canvas');
  if (existingCanvas) {
    if (import.meta.env.DEV) {
      console.warn('Canvas already exists in container, removing it first');
    }
    existingCanvas.remove();
  }

  const scene = new THREE.Scene();
  const camera = createCamera();
  const renderer = createRenderer(container);

  // Load Spline card and store reference for resize handling
  let cardObject: THREE.Object3D | null = null;
  let disposeCardInteraction: (() => void) | null = null;
  console.log('[initSplineScene] Starting to load card...');
  loadCard(scene, camera, renderer)
    .then(card => {
      console.log('[initSplineScene] loadCard promise resolved');
      cardObject = card;
      if (card) {
        console.log('[initSplineScene] Card loaded successfully, fitting camera...');
        // Initial camera fitting
        fitCameraToCard(card, camera);
        console.log('[initSplineScene] Camera fitted to card');

        // Add click interaction for LinkedIn link
        console.log('[initSplineScene] Adding click interaction...');
        disposeCardInteraction = addCardClickInteraction(card, camera, renderer);
        console.log('[initSplineScene] ✓ Card fully initialized!');
      } else {
        console.warn('[initSplineScene] ⚠ Card is null - scene will render without 3D object');
      }
    })
    .catch(error => {
      console.error('[initSplineScene] ✘ Failed to load card:', error);
    });

  // Smooth resize handling with coherent rendering
  let resizeTimeout: NodeJS.Timeout;
  let isResizing = false;
  let lastResizeTime = 0;

  const handleResize = () => {
    const now = performance.now();
    lastResizeTime = now;

    if (!isResizing) {
      isResizing = true;
    }

    // FIX: Use container dimensions instead of window
    const width = container.clientWidth;
    const height = container.clientHeight;

    // Immediate renderer update for responsive feel
    renderer.setSize(width, height, false);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    // FIX: Update camera aspect ratio immediately
    camera.aspect = width / height;
    camera.updateProjectionMatrix();

    // FIX: Refit camera to card on resize to maintain proper framing
    if (cardObject) {
      fitCameraToCard(cardObject, camera);
    }

    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Only proceed if this is still the latest resize event
      if (now === lastResizeTime) {
        isResizing = false;
      }
    }, 100); // Debounce final resize
  };

  window.addEventListener('resize', handleResize);

  // Cache pour éviter les calculs répétitifs
  let cardCenter: THREE.Vector3 | null = null;

  // Performance monitoring
  let frameCount = 0;
  let lastTime = performance.now();
  let fps = 60;

  // Animation loop with optimized rendering
  function animate() {
    // Simple FPS counter for adaptive quality
    frameCount++;
    const currentTime = performance.now();
    if (currentTime >= lastTime + 1000) {
      fps = Math.round((frameCount * 1000) / (currentTime - lastTime));
      frameCount = 0;
      lastTime = currentTime;
    }

    // Calculate card center only once when card is loaded
    if (cardObject && !cardCenter) {
      const box = new THREE.Box3().setFromObject(cardObject);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      cardCenter = sphere.center.clone();
    }

    // Camera already looks at card center via fitCameraToCard
    // No need to update every frame

    renderer.render(scene, camera);

    // Adaptive quality: if FPS drops below 30, reduce pixel ratio
    if (fps < 30 && renderer.getPixelRatio() > 1) {
      renderer.setPixelRatio(1);
      if (import.meta.env.DEV) {
        console.warn('Low FPS detected, reducing pixel ratio for better performance');
      }
    }
  }

  const animationId = renderer.setAnimationLoop(animate);

  // Cleanup function
  const cleanup = () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', handleResize);
    clearTimeout(resizeTimeout);

    // Background click event listeners removed

    if (disposeCardInteraction) {
      disposeCardInteraction();
      disposeCardInteraction = null;
    }

    // Dispose of geometries and materials
    scene.traverse(object => {
      if (object instanceof THREE.Mesh) {
        object.geometry?.dispose();
        if (Array.isArray(object.material)) {
          object.material.forEach(material => material.dispose());
        } else {
          object.material?.dispose();
        }
      }
    });

    renderer.dispose();
    container.removeChild(renderer.domElement);
  };

  return {
    scene,
    camera,
    renderer,
    animationId,
    cleanup,
  };
}

// Helper function to fit camera to card with perfect centering
function fitCameraToCard(
  card: THREE.Object3D,
  camera: THREE.PerspectiveCamera
) {
  const box = new THREE.Box3().setFromObject(card);
  const sphere = box.getBoundingSphere(new THREE.Sphere());

  const aspect = camera.aspect || 1;
  const vFov = THREE.MathUtils.degToRad(camera.fov);
  const hFov = 2 * Math.atan(Math.tan(vFov / 2) * aspect);

  // Adjust margin based on screen size for better responsiveness
  const screenSize = Math.min(window.innerWidth, window.innerHeight);
  const margin = screenSize < 768 ? 0.1 : 0.2; // Much smaller margin on mobile for closer view

  // Calculate optimal distance for perfect framing
  const distV = sphere.radius / Math.tan(vFov / 2);
  const distH = sphere.radius / Math.tan(hFov / 2);
  const distance = Math.max(distV, distH) * (1 + margin);

  // Additional mobile optimization - bring card closer on small screens
  const mobileMultiplier = screenSize < 768 ? 0.7 : 1.0;
  const finalDistance = distance * mobileMultiplier;

  // Position camera to look at the card center
  camera.position.set(
    sphere.center.x,
    sphere.center.y,
    sphere.center.z + finalDistance
  );
  camera.lookAt(sphere.center);

  // Set appropriate near and far planes
  camera.near = Math.max(0.1, finalDistance - sphere.radius * 2);
  camera.far = finalDistance + sphere.radius * 3;
  camera.updateProjectionMatrix();

}

// Add click interaction to open LinkedIn profile
function addCardClickInteraction(
  card: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): () => void {
  const raycaster = new THREE.Raycaster();
  const mouse = new THREE.Vector2();

  // LinkedIn profile URL
  const LINKEDIN_URL = 'https://www.linkedin.com/in/quentin-serda/';

  const handleClick = (event: MouseEvent) => {
    // Calculate mouse position in normalized device coordinates (-1 to +1)
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    // Update the raycaster with the camera and mouse position
    raycaster.setFromCamera(mouse, camera);

    // Calculate objects intersecting the ray
    const intersects = raycaster.intersectObject(card, true);

    if (intersects.length > 0) {
      window.open(LINKEDIN_URL, '_blank');
    }
  };

  // Add click event listener
  renderer.domElement.addEventListener('click', handleClick);

  // Add visual feedback on hover
  const handleMouseMove = (event: MouseEvent) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    const intersects = raycaster.intersectObject(card, true);

    // Change cursor style based on hover
    if (intersects.length > 0) {
      renderer.domElement.style.cursor = 'pointer';
    } else {
      renderer.domElement.style.cursor = 'default';
    }
  };

  renderer.domElement.addEventListener('mousemove', handleMouseMove);

  const cleanup = () => {
    renderer.domElement.removeEventListener('click', handleClick);
    renderer.domElement.removeEventListener('mousemove', handleMouseMove);
    renderer.domElement.style.cursor = '';
  };

  return cleanup;
}
