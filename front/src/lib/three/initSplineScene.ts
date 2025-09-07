import * as THREE from 'three';
import { createCamera } from './createCamera';
import { createRenderer } from './createRenderer';
import { createAnimatedBackground } from './createAnimatedBackground';
import { loadCard } from './loadCard';

export function initSplineScene(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const scene = new THREE.Scene();


    const camera = createCamera();
    const renderer = createRenderer(container);

    // Chargement et ajout de la carte (devant)
    loadCard(scene, camera);

    // Ajuster la caméra pour centrer la carte
    // (à faire dans loadCard ou ici selon ton implémentation)

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
    });

    function animate() {

        renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);
}
