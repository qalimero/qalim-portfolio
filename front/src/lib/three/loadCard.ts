import SplineLoader from '@splinetool/loader';
import * as THREE from 'three';
import gsap from 'gsap';

const SPLINE_URL =
  'https://prod.spline.design/OUx-puNBhhRf-AN4/scene.splinecode';
const CARD_NAME = 'Ticket';

export function loadCard(
  scene: THREE.Scene,
  camera: THREE.PerspectiveCamera,
  renderer: THREE.WebGLRenderer
): Promise<THREE.Object3D | null> {
  return new Promise((resolve, reject) => {
    console.log('[loadCard] Starting to load Spline card from:', SPLINE_URL);
    const loader = new SplineLoader();

    // Add loading timeout
    const timeout = setTimeout(() => {
      console.error('[loadCard] Spline scene loading timeout after 10 seconds');
      reject(new Error('Spline scene loading timeout'));
    }, 10000);

    loader.load(
      SPLINE_URL,
      splineScene => {
        clearTimeout(timeout);
        console.log('[loadCard] ✓ Spline scene loaded successfully');
        console.log('[loadCard] Scene children count:', splineScene.children.length);

        // Log all object names in the scene for debugging
        console.log('[loadCard] Available objects in scene:');
        splineScene.traverse((child) => {
          if (child.name) {
            console.log('  -', child.name);
          }
        });

        try {
          const card = splineScene.getObjectByName(CARD_NAME);
          if (!card) {
            console.warn(`[loadCard] ⚠ Card object "${CARD_NAME}" not found in Spline scene`);
            console.warn('[loadCard] This might mean the object name changed in Spline or the scene structure is different');
            resolve(null);
            return;
          }
          console.log('[loadCard] ✓ Card object found:', card);
          console.log('[loadCard] Card position:', card.position);
          console.log('[loadCard] Card scale:', card.scale);

          // Remove everything except the card
          console.log('[loadCard] Removing other objects from spline scene...');
          const childrenToRemove = splineScene.children.filter(child => child !== card);
          childrenToRemove.forEach(child => {
            splineScene.remove(child);
          });
          console.log('[loadCard] Removed', childrenToRemove.length, 'objects');

          // Add card to scene
          console.log('[loadCard] Adding card to main scene...');
          scene.add(card);
          console.log('[loadCard] ✓ Card added to scene. Scene children count:', scene.children.length);

          // Set render order to appear above background
          card.renderOrder = 1;

          // Camera will be fitted by the main scene on resize

          // Add smooth rotation animation
          console.log('[loadCard] Starting card animation...');
          addCardAnimation(card);

          console.log('[loadCard] ✓ Card setup complete!');
          resolve(card);
        } catch (error) {
          console.error('[loadCard] ✘ Error during card setup:', error);
          reject(error);
        }
      },
      progress => {
        console.log('[loadCard] Loading progress:', progress);
      },
      error => {
        clearTimeout(timeout);
        console.error('[loadCard] ✘ Error loading Spline scene:', error);
        reject(error);
      }
    );
  });
}

function addCardAnimation(card: THREE.Object3D) {
  // Original animation - rotation douce
  gsap.to(card.rotation, {
    x: 0.5,
    y: 0.01,
    duration: 4,
    ease: 'sine.inOut',
    yoyo: true,
    repeat: -1,
  });
}
