import * as THREE from 'three';

import {
  fragmentShader,
  MAX_CLICKS,
  SHAPE_SQUARE,
  type BayerDitherUniforms,
  vertexShader,
} from './shaders/bayerDitherShader';

export interface AnimatedBackgroundInstance {
  mesh: THREE.Mesh<THREE.PlaneGeometry, THREE.ShaderMaterial>;
  uniforms: BayerDitherUniforms;
}

export function createAnimatedBackground(): AnimatedBackgroundInstance {
  const resolution =
    typeof window !== 'undefined'
      ? new THREE.Vector2(window.innerWidth, window.innerHeight)
      : new THREE.Vector2(0, 0);

  const uniforms: BayerDitherUniforms = {
    uResolution: { value: resolution },
    uTime: { value: 0 },
    uColor: { value: new THREE.Color('#0d1030') },
    uPixelSize: { value: 4 },
    uShapeType: { value: SHAPE_SQUARE },
    uClickPos: {
      value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector2(-1, -1)),
    },
    uClickTimes: { value: new Float32Array(MAX_CLICKS) },
    uMouse: { value: new THREE.Vector4() },
  };

  const material = new THREE.ShaderMaterial({
    uniforms,
    vertexShader,
    fragmentShader,
    glslVersion: THREE.GLSL3,
    transparent: true,
    depthWrite: false,
    depthTest: false,
    side: THREE.DoubleSide,
  });

  const geometry = new THREE.PlaneGeometry(2, 2);
  const mesh = new THREE.Mesh(geometry, material);
  mesh.frustumCulled = false;
  mesh.renderOrder = -1;

  return { mesh, uniforms };
}
