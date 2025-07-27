import * as THREE from 'three';
import { createCamera } from './createCamera';
import { createRenderer } from './createRenderer';
import { loadCard } from './loadCard';


export function initSplineScene(containerId: string) {
    const container = document.getElementById(containerId);
    if (!container) return;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color('#1e1b4b');

    const camera = createCamera();
    const renderer = createRenderer(container);

    loadCard(scene, camera);

    window.addEventListener('resize', () => {
        camera.aspect = window.innerWidth / window.innerHeight;
        camera.updateProjectionMatrix();
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(window.devicePixelRatio);
    });


    // Resize handling
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
