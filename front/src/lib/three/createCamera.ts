import * as THREE from 'three';

export function createCamera(): THREE.PerspectiveCamera {
    return new THREE.PerspectiveCamera(
        48,
        window.innerWidth / window.innerHeight,
        297.01,
        30381
    );
}
