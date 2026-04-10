// ============================================================================
// noise.glsl — Reusable simplex noise for WebGL shaders
// ============================================================================
//
// Contents:
//   - mod289, permute, taylorInvSqrt  (internal helpers)
//   - snoise2(vec2)                   → float  2D simplex noise
//   - snoise3(vec3)                   → float  3D simplex noise
//   - snoise4(vec4)                   → float  4D simplex noise
//   - fbm2(vec2, int)                → float  fractional Brownian motion (2D)
//   - fbm3(vec3, int)                → float  fractional Brownian motion (3D)
//   - curlNoise2(vec2)               → vec2   2D curl noise (divergence-free)
//   - curlNoise3(vec3)               → vec3   3D curl noise (divergence-free)
//
// Usage:
//   Copy this file into your shader source or import via Vite ?raw.
//   All functions are self-contained — no uniforms or varyings required.
//   These are pure functions: same input always gives same output.
//
// Origin:
//   Based on Ashima Arts / Stefan Gustavson simplex noise (MIT-compatible).
//   curl and FBM wrappers added for practical creative-coding use.
//
// Precision:
//   This file does NOT declare precision — add your own at the top of your
//   fragment shader:  precision highp float;
//   highp is recommended for noise to avoid banding on mobile GPUs.
//
// ============================================================================

// ---------------------------------------------------------------------------
// Internal helpers
// ---------------------------------------------------------------------------

vec3 mod289_3(vec3 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec4 mod289_4(vec4 x) {
    return x - floor(x * (1.0 / 289.0)) * 289.0;
}

vec3 permute_3(vec3 x) {
    return mod289_3(((x * 34.0) + 10.0) * x);
}

vec4 permute_4(vec4 x) {
    return mod289_4(((x * 34.0) + 10.0) * x);
}

vec4 taylorInvSqrt(vec4 r) {
    return 1.79284291400159 - 0.85373472095314 * r;
}

// ---------------------------------------------------------------------------
// 2D Simplex Noise
// Range: approximately [-1, 1]
// ---------------------------------------------------------------------------

float snoise2(vec2 v) {
    const vec4 C = vec4(
            0.211324865405187, // (3.0 - sqrt(3.0)) / 6.0
            0.366025403784439, // 0.5 * (sqrt(3.0) - 1.0)
            -0.577350269189626, // -1.0 + 2.0 * C.x
            0.024390243902439 // 1.0 / 41.0
        );

    // First corner
    vec2 i = floor(v + dot(v, C.yy));
    vec2 x0 = v - i + dot(i, C.xx);

    // Other corners
    vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
    vec4 x12 = x0.xyxy + C.xxzz;
    x12.xy -= i1;

    // Permutations
    i = mod289_3(vec3(i, 0.0)).xy; // avoid truncation on some GPUs
    vec3 p = permute_3(
            permute_3(i.y + vec3(0.0, i1.y, 1.0))
                + i.x + vec3(0.0, i1.x, 1.0)
        );

    vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
    m = m * m;
    m = m * m;

    // Gradients from 41-element set mapped to 2D directions
    vec3 x = 2.0 * fract(p * C.www) - 1.0;
    vec3 h = abs(x) - 0.5;
    vec3 ox = floor(x + 0.5);
    vec3 a0 = x - ox;

    // Normalize gradients implicitly by scaling m
    m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);

    // Compute final noise value at P
    vec3 g;
    g.x = a0.x * x0.x + h.x * x0.y;
    g.yz = a0.yz * x12.xz + h.yz * x12.yw;

    return 130.0 * dot(m, g);
}

// ---------------------------------------------------------------------------
// 3D Simplex Noise
// Range: approximately [-1, 1]
// ---------------------------------------------------------------------------

float snoise3(vec3 v) {
    const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

    // First corner
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);

    // Other corners
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);

    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy; // 2.0 * C.x = 1/3
    vec3 x3 = x0 - D.yyy; // -1.0 + 3.0 * C.x = -0.5

    // Permutations
    i = mod289_3(i);
    vec4 p = permute_4(
            permute_4(
                permute_4(i.z + vec4(0.0, i1.z, i2.z, 1.0))
                    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
                + i.x + vec4(0.0, i1.x, i2.x, 1.0)
        );

    // Gradients: 7x7 points over a square, mapped onto an octahedron
    float n_ = 0.142857142857; // 1.0 / 7.0
    vec3 ns = n_ * D.wyz - D.xzx;

    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);

    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);

    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);

    vec4 s0 = floor(b0) * 2.0 + 1.0;
    vec4 s1 = floor(b1) * 2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));

    vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

    vec3 p0 = vec3(a0.xy, h.x);
    vec3 p1 = vec3(a0.zw, h.y);
    vec3 p2 = vec3(a1.xy, h.z);
    vec3 p3 = vec3(a1.zw, h.w);

    // Normalize gradients
    vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
    p0 *= norm.x;
    p1 *= norm.y;
    p2 *= norm.z;
    p3 *= norm.w;

    // Mix contributions from the four corners
    vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
    m = m * m;

    return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

// ---------------------------------------------------------------------------
// 4D Simplex Noise
// Range: approximately [-1, 1]
// ---------------------------------------------------------------------------

float snoise4(vec4 v) {
    const vec4 C = vec4(
            0.138196601125011, // (5.0 - sqrt(5.0)) / 20.0
            0.276393202250021, // 2.0 * C.x
            0.414589803375032, // 3.0 * C.x
            -0.447213595499958 // -1.0 + 4.0 * C.x
        );

    // First corner
    vec4 i = floor(v + dot(v, vec4(0.309016994374947451))); // (sqrt(5) - 1) / 4
    vec4 x0 = v - i + dot(i, C.xxxx);

    // Rank sorting: determine which simplex we are in
    vec4 i0;
    vec3 isX = step(x0.yzw, x0.xxx);
    vec3 isYZ = step(x0.zww, x0.yyz);
    i0.x = isX.x + isX.y + isX.z;
    i0.yzw = 1.0 - isX;
    i0.y += isYZ.x + isYZ.y;
    i0.zw += 1.0 - isYZ.xy;
    i0.z += isYZ.z;
    i0.w += 1.0 - isYZ.z;

    // i0 now contains the unique values 0,1,2,3 in each channel
    vec4 i3 = clamp(i0, 0.0, 1.0);
    vec4 i2 = clamp(i0 - 1.0, 0.0, 1.0);
    vec4 i1 = clamp(i0 - 2.0, 0.0, 1.0);

    vec4 x1 = x0 - i1 + C.xxxx;
    vec4 x2 = x0 - i2 + C.yyyy;
    vec4 x3 = x0 - i3 + C.zzzz;
    vec4 x4 = x0 + C.wwww;

    // Permutations
    i = mod289_4(i);
    float j0 = permute_4(
            permute_4(
                permute_4(
                    permute_4(vec4(i.w)).x + i.z
                ).x + i.y
            ).x + i.x
        ).x;

    vec4 j1 = permute_4(
            permute_4(
                permute_4(
                    permute_4(
                        i.w + vec4(i1.w, i2.w, i3.w, 1.0))
                        + i.z + vec4(i1.z, i2.z, i3.z, 1.0))
                    + i.y + vec4(i1.y, i2.y, i3.y, 1.0))
                + i.x + vec4(i1.x, i2.x, i3.x, 1.0)
        );

    // Gradients: 7x7x6 = 294, mapped to a 4D cross-polytope
    vec4 ip = vec4(1.0 / 294.0, 1.0 / 49.0, 1.0 / 7.0, 0.0);

    vec4 p0_4 = grad4(j0, ip);
    vec4 p1_4 = grad4(j1.x, ip);
    vec4 p2_4 = grad4(j1.y, ip);
    vec4 p3_4 = grad4(j1.z, ip);
    vec4 p4_4 = grad4(j1.w, ip);

    // Normalize gradients
    vec4 norm4 = taylorInvSqrt(vec4(
                dot(p0_4, p0_4), dot(p1_4, p1_4), dot(p2_4, p2_4), dot(p3_4, p3_4)
            ));
    p0_4 *= norm4.x;
    p1_4 *= norm4.y;
    p2_4 *= norm4.z;
    p3_4 *= norm4.w;
    p4_4 *= taylorInvSqrt(vec4(dot(p4_4, p4_4))).x;

    // Mix contributions
    vec3 m0 = max(0.6 - vec3(dot(x0, x0), dot(x1, x1), dot(x2, x2)), 0.0);
    vec2 m1 = max(0.6 - vec2(dot(x3, x3), dot(x4, x4)), 0.0);
    m0 = m0 * m0;
    m1 = m1 * m1;

    return 49.0 * (
        dot(m0 * m0, vec3(dot(p0_4, x0), dot(p1_4, x1), dot(p2_4, x2)))
            + dot(m1 * m1, vec2(dot(p3_4, x3), dot(p4_4, x4)))
        );
}

// Internal helper for 4D gradient
vec4 grad4(float j, vec4 ip) {
    vec4 p;
    p.xyz = floor(fract(vec3(j) * ip.xyz) * 7.0) * ip.z - 1.0;
    p.w = 1.5 - dot(abs(p.xyz), vec3(1.0));
    vec4 s = vec4(lessThan(p, vec4(0.0)));
    p.xyz = p.xyz + (s.xyz * 2.0 - 1.0) * s.www;
    return p;
}

// ---------------------------------------------------------------------------
// Fractional Brownian Motion (FBM)
// Layers multiple octaves of noise for natural-looking detail.
//
//   octaves : number of layers (4–8 typical, higher = more detail + cost)
//   Returns : roughly [-1, 1] but amplitude depends on octave count
//
// Tip: for a [0,1] range use  fbm * 0.5 + 0.5
// ---------------------------------------------------------------------------

float fbm2(vec2 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * snoise2(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }

    return value;
}

float fbm3(vec3 p, int octaves) {
    float value = 0.0;
    float amplitude = 0.5;
    float frequency = 1.0;

    for (int i = 0; i < 8; i++) {
        if (i >= octaves) break;
        value += amplitude * snoise3(p * frequency);
        frequency *= 2.0;
        amplitude *= 0.5;
    }

    return value;
}

// ---------------------------------------------------------------------------
// Curl Noise
// Produces a divergence-free velocity field — ideal for particles, fluid
// motion, and trails that never converge or diverge unnaturally.
//
// How it works:
//   curl(F) = ( dF/dy, -dF/dx )          in 2D
//   curl(F) = ( dFz/dy - dFy/dz, ... )   in 3D (uses 3 noise channels)
//
// The epsilon value controls the derivative step size.
// Smaller = more accurate but noisier on low-precision GPUs.
// ---------------------------------------------------------------------------

vec2 curlNoise2(vec2 p) {
    const float e = 0.001;

    float dndx = snoise2(vec2(p.x + e, p.y)) - snoise2(vec2(p.x - e, p.y));
    float dndy = snoise2(vec2(p.x, p.y + e)) - snoise2(vec2(p.x, p.y - e));

    return vec2(dndy, -dndx) / (2.0 * e);
}

vec3 curlNoise3(vec3 p) {
    const float e = 0.001;

    // Offset each noise sample by a large constant so the three channels
    // are decorrelated — otherwise all three would return the same field.
    float n1 = snoise3(p + vec3(0.0, 0.0, 0.0));
    float n2 = snoise3(p + vec3(31.416, 0.0, 0.0));
    float n3 = snoise3(p + vec3(0.0, 0.0, 73.156));

    // Partial derivatives via central differences
    float dn1dy = snoise3(p + vec3(0.0, e, 0.0)) - snoise3(p - vec3(0.0, e, 0.0));
    float dn1dz = snoise3(p + vec3(0.0, 0.0, e)) - snoise3(p - vec3(0.0, 0.0, e));
    float dn2dx = snoise3(p + vec3(e + 31.416, 0.0, 0.0)) - snoise3(p + vec3(-e + 31.416, 0.0, 0.0));
    float dn2dz = snoise3(p + vec3(31.416, 0.0, e)) - snoise3(p + vec3(31.416, 0.0, -e));
    float dn3dx = snoise3(p + vec3(e, 0.0, 73.156)) - snoise3(p + vec3(-e, 0.0, 73.156));
    float dn3dy = snoise3(p + vec3(0.0, e, 73.156)) - snoise3(p + vec3(0.0, -e, 73.156));

    float inv2e = 1.0 / (2.0 * e);

    return vec3(
        (dn3dy - dn2dz) * inv2e,
        (dn1dz - dn3dx) * inv2e,
        (dn2dx - dn1dy) * inv2e
    );
}

// ---------------------------------------------------------------------------
// Domain warping helper
// Feed noise back into itself for organic, cloudy distortions.
//
// Example:
//   float n = domainWarp2(uv * 4.0, 0.5, 4);
//   gl_FragColor = vec4(vec3(n * 0.5 + 0.5), 1.0);
// ---------------------------------------------------------------------------

float domainWarp2(vec2 p, float warpStrength, int octaves) {
    vec2 q = vec2(
            fbm2(p + vec2(0.0, 0.0), octaves),
            fbm2(p + vec2(5.2, 1.3), octaves)
        );

    vec2 r = vec2(
            fbm2(p + warpStrength * q + vec2(1.7, 9.2), octaves),
            fbm2(p + warpStrength * q + vec2(8.3, 2.8), octaves)
        );

    return fbm2(p + warpStrength * r, octaves);
}
