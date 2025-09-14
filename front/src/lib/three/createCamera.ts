import * as THREE from 'three';

export function createCamera(): THREE.PerspectiveCamera {
  const camera = new THREE.PerspectiveCamera(
    50, // FOV - slightly wider for better viewing
    window.innerWidth / window.innerHeight,
    0.1, // Near plane - much closer for better precision
    1000 // Far plane - reasonable distance
  );

  // Set initial position for perfect centering
  camera.position.set(0, 0, 5);
  camera.lookAt(0, 0, 0); // Look at the origin for perfect centering

  return camera;
}
