export const vertexShader = `
    varying vec2 vUv;
    void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    }
`;

export const fragmentShader = `
    uniform float time;
    uniform vec3 color1;
    uniform vec3 color2;
    varying vec2 vUv;

    void main() {
        float waveX = sin((vUv.y + time * 0.05) * 10.0) * 0.03;
        float waveY = cos((vUv.x + time * 0.03) * 10.0) * 0.03;
        vec2 distortedUv = vUv + vec2(waveX, waveY);

        float mixStrength = smoothstep(0.0, 1.0, distortedUv.y);
        vec3 color = mix(color1, color2, mixStrength);

        gl_FragColor = vec4(color, 0.85);
    }
`;
