#version 300 es
precision highp float;

uniform vec2 u_mouse;
uniform float u_aspect;
uniform vec4 u_color;
uniform float u_mode;   // 0.0 = grid, 1.0 = circle border
uniform float u_radius; // dynamic circle radius (default 0.25)

in vec2 v_origPos;
out vec4 fragColor;

void main() {
    if (u_mode < 0.5) {
        // ── Grid mode ──
        // Use the original (pre-magnification) position to test circle membership.
        vec2 origCorr = vec2(v_origPos.x * u_aspect, v_origPos.y);
        vec2 mouseCorr = vec2(u_mouse.x * u_aspect, u_mouse.y);
        float dist = distance(origCorr, mouseCorr);

        // Inside the circle: show magnified grid lines (slightly brighter).
        // Outside: show normal grid lines.
        // Discard fragments right at the boundary to keep the edge clean
        // (the circle-border draw call covers it).
        if (dist > u_radius + 0.01) {
            // Outside — normal grid
            fragColor = u_color;
        } else if (dist < u_radius - 0.05) {
            // Inside — magnified grid, slightly brighter
            fragColor = vec4(u_color.rgb, u_color.a * 1.8);
        } else {
            // Thin band at boundary — discard so blue border is clean
            discard;
        }
    } else {
        // ── Circle-border mode — solid color ──
        fragColor = u_color;
    }
}
