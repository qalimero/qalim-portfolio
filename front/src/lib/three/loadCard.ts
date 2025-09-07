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

        // Calculer une distance caméra adaptée
        const maxDim = Math.max(size.x, size.y, size.z);
        const fov = camera.fov * (Math.PI / 180);
        const distance = maxDim / (2 * Math.tan(fov / 2));

// Positionner la caméra de façon à regarder le centre
        camera.position.set(center.x, center.y, center.z + distance * 1.5);
        camera.lookAt(center);
        // Forcer la carte à être rendue après le background
        card.renderOrder = 1;


        // 🎯 Fonction pour ajuster la caméra
        const fitCamera = () => {
            const box = new THREE.Box3().setFromObject(card);
            const sphere = box.getBoundingSphere(new THREE.Sphere());

            const aspect = camera.aspect || 1;
            const vFov = THREE.MathUtils.degToRad(camera.fov);
            const hFov = 2 * Math.atan(Math.tan(vFov/2) * aspect);

            const distV = sphere.radius / Math.sin(vFov/5);
            const distH = sphere.radius / Math.sin(hFov/5);
            const dist  = Math.max(distV, distH) * 0.4; // marge

            camera.position.set(sphere.center.x, sphere.center.y, sphere.center.z + dist);
            camera.near = Math.max(6, dist - sphere.radius*2);
            camera.far  = dist + sphere.radius*2.9;
            camera.updateProjectionMatrix();
            camera.lookAt(sphere.center);
        };

        // Premier fit
        fitCamera();

        // Réfit automatique au resize
        window.addEventListener('resize', fitCamera);

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
