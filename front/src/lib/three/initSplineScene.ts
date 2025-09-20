import * as THREE from 'three';
import { createCamera } from './createCamera';
import { createRenderer } from './createRenderer';
import { createAnimatedBackground } from './createAnimatedBackground';
import { loadCard } from './loadCard';

interface SplineSceneInstance {
  scene: THREE.Scene;
  camera: THREE.PerspectiveCamera;
  renderer: THREE.WebGLRenderer;
  background: THREE.Mesh;
  animationId: void;
  cleanup: () => void;
}

export function initSplineScene(
  containerId: string
): SplineSceneInstance | null {
  const container = document.getElementById(containerId);
  if (!container) {
    console.error(`Container with id "${containerId}" not found`);
    return null;
  }

  const scene = new THREE.Scene();
  const camera = createCamera();
  const renderer = createRenderer(container);

  // Add animated background
  const background = createAnimatedBackground();
  scene.add(background);

  // Load Spline card and store reference for resize handling
  let cardObject: THREE.Object3D | null = null;
  loadCard(scene, camera, renderer).then(card => {
    cardObject = card;
    if (card) {
      // Initial camera fitting
      fitCameraToCard(card, camera);

      // Add click interaction for LinkedIn link
      addCardClickInteraction(card, camera, renderer);
    }
  });

  // Smooth resize handling with coherent rendering
  let resizeTimeout: NodeJS.Timeout;
  let isResizing = false;
  let resizeStartTime = 0;
  let lastResizeTime = 0;

  const handleResize = () => {
    const now = performance.now();
    lastResizeTime = now;

    if (!isResizing) {
      isResizing = true;
      resizeStartTime = now;
    }

    // Immediate renderer update for responsive feel
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, 2));

    clearTimeout(resizeTimeout);
    resizeTimeout = setTimeout(() => {
      // Only proceed if this is still the latest resize event
      if (now === lastResizeTime) {
        isResizing = false;
      }
    }, 100); // Debounce final resize
  };

  window.addEventListener('resize', handleResize);

  // Animation loop with smooth rendering and perfect centering
  function animate() {
    // Update background animation
    if (background.material instanceof THREE.ShaderMaterial) {
      background.material.uniforms.time.value = performance.now() * 0.001;
    }

    // Continue smooth aspect ratio interpolation during resize
    if (isResizing) {
      const targetAspect = window.innerWidth / window.innerHeight;
      const currentAspect = camera.aspect;

      if (Math.abs(currentAspect - targetAspect) > 0.001) {
        camera.aspect = THREE.MathUtils.lerp(currentAspect, targetAspect, 0.15);
        camera.updateProjectionMatrix();
      } else {
        camera.aspect = targetAspect;
        camera.updateProjectionMatrix();
        isResizing = false;
      }
    }

    // Ensure camera always looks at the card center for perfect centering
    if (cardObject) {
      const box = new THREE.Box3().setFromObject(cardObject);
      const sphere = box.getBoundingSphere(new THREE.Sphere());
      camera.lookAt(sphere.center);
    }

    renderer.render(scene, camera);
  }

  const animationId = renderer.setAnimationLoop(animate);

  // Cleanup function
  const cleanup = () => {
    renderer.setAnimationLoop(null);
    window.removeEventListener('resize', handleResize);
    clearTimeout(resizeTimeout);

    // Remove click event listeners
    if (renderer.domElement) {
      renderer.domElement.removeEventListener('click', () => {});
      renderer.domElement.removeEventListener('mousemove', () => {});
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
    background,
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

  console.log('Card center:', sphere.center);
  console.log('Camera positioned at:', camera.position);
  console.log('Camera distance:', finalDistance);
  console.log(
    'Screen size:',
    screenSize,
    'Mobile multiplier:',
    mobileMultiplier
  );
}

// Add click interaction to open LinkedIn profile
function addCardClickInteraction(
  card: THREE.Object3D,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
) {
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
      console.log('Card clicked! Opening LinkedIn profile...');
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

  console.log('Card click interaction added - click to open LinkedIn profile');
}
