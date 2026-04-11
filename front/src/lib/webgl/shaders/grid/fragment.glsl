#version 300 es
precision highp float;

uniform vec4  u_color;
uniform vec2  u_resolution;
uniform float u_cellSize;
uniform float u_lineWidth;

in vec2 v_uv;
out vec4 fragColor;

void main() {
    vec2 px = v_uv * u_resolution;

    // Centre the grid so lines pass through the viewport midpoint
    vec2 centred = mod(px - u_resolution * 0.5, vec2(u_cellSize));
    vec2 dist = min(centred, vec2(u_cellSize) - centred);
    float d = min(dist.x, dist.y);

    // Anti-aliased line edge
    float hw = u_lineWidth * 0.5;
    float alpha = 1.0 - smoothstep(hw - 0.5, hw + 0.5, d);

    if (alpha <= 0.001) discard;
    fragColor = vec4(u_color.rgb, u_color.a * alpha);
}
