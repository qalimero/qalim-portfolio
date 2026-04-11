#version 300 es
precision highp float;

in vec2 a_position;

void main() {
    // Pure minimal grid — no mouse interaction, no distortion
    gl_Position = vec4(a_position, 0.0, 1.0);
}
