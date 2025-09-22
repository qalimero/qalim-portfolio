import * as THREE from 'three';

export interface UniformsConfig {
  uResolution: THREE.IUniform<THREE.Vector2>;
  uTime: THREE.IUniform<number>;
  uColor: THREE.IUniform<THREE.Color>;
  uClickPos: THREE.IUniform<THREE.Vector2[]>;
  uClickTimes: THREE.IUniform<Float32Array>;
  uShapeType: THREE.IUniform<number>;
  uPixelSize: THREE.IUniform<number>;
}

export const SHAPE_MAP: Record<string, number> = {
  square: 0,
  circle: 1,
  triangle: 2,
  diamond: 3,
};

export const MAX_CLICKS = 10;

export function createUniforms(
  inkColor: string = '#FFFFFF',
  shapeType: string = 'square',
  pixelSize: number = 4
): UniformsConfig {
  return {
    uResolution: { value: new THREE.Vector2() },
    uTime: { value: 0 },
    uColor: { value: new THREE.Color(inkColor) },
    uClickPos: { 
      value: Array.from({ length: MAX_CLICKS }, () => new THREE.Vector2(-1, -1)) 
    },
    uClickTimes: { value: new Float32Array(MAX_CLICKS) },
    uShapeType: { value: SHAPE_MAP[shapeType] ?? 0 },
    uPixelSize: { value: pixelSize },
  };
}
