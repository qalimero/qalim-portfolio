import * as THREE from 'three';

export function createAnimatedBackground() {
    const uniforms = {
        time: { value: 0 },
        color1: { value: new THREE.Color('#08ed0f') },
        color2: { value: new THREE.Color('#001bb3') },
        color3: { value: new THREE.Color('#600f41') },
    };

    const material = new THREE.ShaderMaterial({
        uniforms,
        vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
        fragmentShader: `
   uniform float time;
uniform vec3 color1;
uniform vec3 color2;
uniform vec3 color3;
varying vec2 vUv;

void main() {
  float wave = sin(vUv.y * 10.0 + time * 0.5) * 0.05;
  float mixStrength = clamp(vUv.y + wave, 0.0, 1.0);

  vec3 color;
  if (mixStrength < 0.5) {
    float subMix = mixStrength / 0.5; // [0.0 - 0.5] → [0.0 - 1.0]
    color = mix(color1, color2, subMix);
  } else {
    float subMix = (mixStrength - 0.5) / 0.5; // [0.5 - 1.0] → [0.0 - 1.0]
    color = mix(color2, color3, subMix);
  }

  gl_FragColor = vec4(color, 0.9);
      }
    `,
        transparent: true,
        depthWrite: false,
        depthTest: true,
        side: THREE.DoubleSide,
    });

    const geometry = new THREE.PlaneGeometry(8000, 6000);
    const mesh = new THREE.Mesh(geometry, material);

    mesh.position.set(0, 0, -1000);

    return mesh;
}
