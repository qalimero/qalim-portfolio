import { useEffect } from 'react';
import { initSplineScene } from '../lib/three/initSplineScene';

export default function ThreeScene() {
    useEffect(() => {
        initSplineScene('three-container');
    }, []);

    return <div id="three-container" style={{ position: 'absolute', inset: 0, zIndex: 0 }} />;
}
