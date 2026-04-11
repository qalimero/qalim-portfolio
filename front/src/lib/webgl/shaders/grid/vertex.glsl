#version 300 es
precision highp float;

in vec2 a_position;

uniform vec2 u_mouse;
uniform float u_aspect;
uniform float u_mode;   // 0.0 = grid, 1.0 = circle border
uniform float u_radius; // dynamic circle radius (default 0.25)

out vec2 v_origPos; // original clip-space position (for fragment clipping)

void main() {
    vec2 pos = a_position;
    v_origPos = a_position;

    if (u_mode < 0.5) {
        // ── Grid mode: magnify vertices inside the circle ──
        vec2 corrected = vec2(pos.x * u_aspect, pos.y);
        vec2 mouseCorr = vec2(u_mouse.x * u_aspect, u_mouse.y);
        float dist = distance(corrected, mouseCorr);

        float zoom = 1.25;

        if (dist < u_radius) {
            // Scale toward mouse center → content appears magnified
            corrected = mouseCorr + (corrected - mouseCorr) / zoom;
            pos = vec2(corrected.x / u_aspect, corrected.y);
        }
    } else {
        // ── Circle-border mode: unit circle → screen position ──
        pos = u_mouse + vec2(a_position.x * u_radius / u_aspect,
                    a_position.y * u_radius);
    }

    gl_Position = vec4(pos, 0.0, 1.0);
}
