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
    const loader = new SplineLoader();

    // Add loading timeout
    const timeout = setTimeout(() => {
      reject(new Error('Spline scene loading timeout'));
    }, 10000);

    loader.load(
      SPLINE_URL,
      splineScene => {
        clearTimeout(timeout);

        try {
          const card = splineScene.getObjectByName(CARD_NAME);
          if (!card) {
            console.warn(
              `Card object "${CARD_NAME}" not found in Spline scene`
            );
            resolve(null);
            return;
          }

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

          console.log('Spline card loaded successfully');
          resolve(card);
        } catch (error) {
          console.error('Error processing Spline scene:', error);
          reject(error);
        }
      },
      progress => {
        console.log(
          'Loading progress:',
          (progress.loaded / progress.total) * 100 + '%'
        );
      },
      error => {
        clearTimeout(timeout);
        console.error('Failed to load Spline scene:', error);
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
