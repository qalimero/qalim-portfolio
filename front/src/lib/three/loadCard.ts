import SplineLoader from '@splinetool/loader';
import * as THREE from 'three';
import gsap from 'gsap';


export function loadCard(scene: THREE.Scene, camera: THREE.PerspectiveCamera) {
    const loader = new SplineLoader();

    loader.load('https://prod.spline.design/OUx-puNBhhRf-AN4/scene.splinecode', (splineScene) => {
        const card = splineScene.getObjectByName('Ticket');
        if (!card) return;

        // Supprimer tout sauf la carte
        splineScene.children.forEach((child) => {
            if (child !== card) splineScene.remove(child);
        });

        // Ajouter la carte à la scène
        scene.add(card);

        // Centrage géométrique de la carte autour de (0,0,0)
        const box = new THREE.Box3().setFromObject(card);
        const center = box.getCenter(new THREE.Vector3());
        const size = box.getSize(new THREE.Vector3());


        console.log('Position locale de la carte :', card.position);

        // Calculer une distance caméra adaptée
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const distance = maxDim / (2 * Math.tan(fov / 2));

// Positionner la caméra de façon à regarder le centre
        camera.position.set(center.x, center.y, center.z + distance * 1.5);
        camera.lookAt(center);
        // Forcer la carte à être rendue après le background
        card.renderOrder = 1;

        // Optionnel : rotation douce
        gsap.to(card.rotation, {
            x: 0.5,
            y: 0.01,
            duration: 4,
            ease: 'sine.inOut',
            yoyo: true,
            repeat: -1,
        });
    });
}
