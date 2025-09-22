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
    console.log('Loading Spline card from:', SPLINE_URL);
    const loader = new SplineLoader();

    // Add loading timeout
    const timeout = setTimeout(() => {
      console.error('Spline scene loading timeout');
      reject(new Error('Spline scene loading timeout'));
    }, 10000);

    loader.load(
      SPLINE_URL,
      splineScene => {
        clearTimeout(timeout);
        console.log('Spline scene loaded successfully');

        try {
          const card = splineScene.getObjectByName(CARD_NAME);
          if (!card) {
            console.warn(`Card object "${CARD_NAME}" not found in Spline scene`);
            resolve(null);
            return;
          }
          console.log('Card object found:', card);

          // Remove everything except the card
          splineScene.children.forEach(child => {
            if (child !== card) {
              splineScene.remove(child);
            }
          });

          // Add card to scene
          scene.add(card);

          // Set render order to appear above background
          card.renderOrder = 1;

          // Camera will be fitted by the main scene on resize

          // Add smooth rotation animation
          addCardAnimation(card);

          resolve(card);
        } catch (error) {
          reject(error);
        }
      },
      progress => {

      },
      error => {
        clearTimeout(timeout);
        console.error('Error loading Spline scene:', error);
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
