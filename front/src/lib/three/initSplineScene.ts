import * as THREE from 'three';
import { createCamera } from './createCamera';
import { createRenderer } from './createRenderer';
import { createAnimatedBackground } from './createAnimatedBackground';
import { loadCard } from './loadCard';

export function initSplineScene(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1e1b4b');

    const camera = createCamera();
    const renderer = createRenderer(container);

    // Ajout du background (derrière)
    const background = createAnimatedBackground();
    scene.add(background);

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
        background.material.uniforms.time.value += 0.0001;
        console.log('time:', background.material.uniforms.time.value);
        renderer.render(scene, camera);
    }

    renderer.setAnimationLoop(animate);
}
