// ============================================================================
// sdf-2d.glsl — Reusable 2D Signed Distance Field primitives and operations
// ============================================================================
//
// Usage:
//   Copy the functions you need into your fragment shader, or paste the whole
//   file and let the compiler tree-shake unused functions.
//
//   All primitives are centered at the origin. Translate by passing (p - center)
//   instead of p. Rotate by multiplying p with a 2×2 rotation matrix.
//
//   Convention:
//     distance < 0.0  →  inside the shape
//     distance = 0.0  →  on the boundary
//     distance > 0.0  →  outside the shape
//
// Compatible with GLSL ES 1.00 (WebGL 1) and GLSL ES 3.00 (WebGL 2).
// ============================================================================

// ---------------------------------------------------------------------------
// 1. PRIMITIVES
// ---------------------------------------------------------------------------

// Circle centered at origin.
//   p      — sample point
//   radius — circle radius
float sdCircle(vec2 p, float radius) {
    return length(p) - radius;
}

// Axis-aligned box (rectangle) centered at origin.
//   p    — sample point
//   half — half-extents (width/2, height/2)
float sdBox(vec2 p, vec2 half) {
    vec2 d = abs(p) - half;
    return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

// Rounded box — same as sdBox but with per-corner radii.
//   p    — sample point
//   half — half-extents before rounding
//   r    — corner radii: (top-right, bottom-right, top-left, bottom-left)
float sdRoundedBox(vec2 p, vec2 half, vec4 r) {
    // Select correct pair based on quadrant.
    vec2 rr = (p.x > 0.0) ? r.xy : r.zw;
    float radius = (p.y > 0.0) ? rr.x : rr.y;
    vec2 q = abs(p) - half + radius;
    return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - radius;
}

// Line segment from point a to point b.
//   p — sample point
//   a — start of segment
//   b — end of segment
float sdSegment(vec2 p, vec2 a, vec2 b) {
    vec2 pa = p - a;
    vec2 ba = b - a;
    float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
    return length(pa - ba * h);
}

// Equilateral triangle centered at origin, one vertex pointing up.
//   p — sample point
//   r — circumradius (center to vertex)
float sdEquilateralTriangle(vec2 p, float r) {
    const float k = sqrt(3.0);
    p.x = abs(p.x) - r;
    p.y = p.y + r / k;
    if (p.x + k * p.y > 0.0) {
        p = vec2(p.x - k * p.y, -k * p.x - p.y) / 2.0;
    }
    p.x -= clamp(p.x, -2.0 * r, 0.0);
    return -length(p) * sign(p.y);
}

// Ring (annulus) — circle outline with thickness.
//   p     — sample point
//   radius — center-line radius
//   thick  — half-thickness of the ring
float sdRing(vec2 p, float radius, float thick) {
    return abs(length(p) - radius) - thick;
}

// Oriented ellipse centered at origin.
//   p  — sample point
//   ab — semi-axes (a along x, b along y)
// Approximate — exact ellipse SDF is expensive.
float sdEllipse(vec2 p, vec2 ab) {
    vec2 q = abs(p);
    // Cheap approximation by Inigo Quilez.
    float k = dot(q / ab, q / ab);
    return (k - 1.0) * min(ab.x, ab.y) / (2.0 * sqrt(k));
}

// Regular polygon with n sides, one flat edge at the bottom.
//   p — sample point
//   r — circumradius
//   n — number of sides (use float; e.g. 6.0 for hexagon)
float sdRegularPolygon(vec2 p, float r, float n) {
    float angle = 3.141592653589793 / n;
    float a = atan(p.x, p.y) + angle; // rotate half-step
    a = mod(a, 2.0 * angle) - angle; // fold into one wedge
    vec2 q = vec2(cos(a), abs(sin(a))) * length(p);
    return q.x - r * cos(angle);
}

// Arc — partial ring defined by an angular aperture.
//   p     — sample point
//   sc    — vec2(sin, cos) of the half-aperture angle
//   ra    — arc radius
//   rb    — arc thickness (half)
float sdArc(vec2 p, vec2 sc, float ra, float rb) {
    p.x = abs(p.x);
    float k = (sc.y * p.x > sc.x * p.y) ? dot(p, sc) : length(p);
    return sqrt(dot(p, p) + ra * ra - 2.0 * ra * k) - rb;
}

// Capsule — line segment with rounded ends.
//   p — sample point
//   a — start
//   b — end
//   r — radius
float sdCapsule(vec2 p, vec2 a, vec2 b, float r) {
    return sdSegment(p, a, b) - r;
}

// ---------------------------------------------------------------------------
// 2. BOOLEAN OPERATIONS (hard edges)
// ---------------------------------------------------------------------------

// Union — merge two shapes (keep closest surface).
float opUnion(float d1, float d2) {
    return min(d1, d2);
}

// Subtraction — carve d2 out of d1.
float opSubtraction(float d1, float d2) {
    return max(d1, -d2);
}

// Intersection — keep only the overlap.
float opIntersection(float d1, float d2) {
    return max(d1, d2);
}

// XOR — keep everything except the overlap.
float opXor(float d1, float d2) {
    return max(min(d1, d2), -max(d1, d2));
}

// ---------------------------------------------------------------------------
// 3. SMOOTH BOOLEAN OPERATIONS (blended edges)
// ---------------------------------------------------------------------------

// Smooth union — blend two shapes together.
//   k — blending radius (try 0.05–0.3)
float opSmoothUnion(float d1, float d2, float k) {
    float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) - k * h * (1.0 - h);
}

// Smooth subtraction — soft carve d2 out of d1.
float opSmoothSubtraction(float d1, float d2, float k) {
    float h = clamp(0.5 - 0.5 * (d1 + d2) / k, 0.0, 1.0);
    return mix(d1, -d2, h) + k * h * (1.0 - h);
}

// Smooth intersection — soft overlap.
float opSmoothIntersection(float d1, float d2, float k) {
    float h = clamp(0.5 - 0.5 * (d2 - d1) / k, 0.0, 1.0);
    return mix(d2, d1, h) + k * h * (1.0 - h);
}

// ---------------------------------------------------------------------------
// 4. DOMAIN TRANSFORMS
// ---------------------------------------------------------------------------

// Translate a point before evaluating an SDF.
vec2 opTranslate(vec2 p, vec2 offset) {
    return p - offset;
}

// Rotate a point before evaluating an SDF.
//   angle — rotation in radians
vec2 opRotate(vec2 p, float angle) {
    float c = cos(angle);
    float s = sin(angle);
    return vec2(c * p.x + s * p.y, -s * p.x + c * p.y);
}

// Scale — divide p by scale, then multiply the resulting distance by scale.
//   Usage:  float d = sdCircle(opScale(p, 2.0), 1.0) * 2.0;
vec2 opScale(vec2 p, float s) {
    return p / s;
}

// Mirror across the Y axis (left ↔ right symmetry).
vec2 opMirrorX(vec2 p) {
    return vec2(abs(p.x), p.y);
}

// Mirror across the X axis (top ↔ bottom symmetry).
vec2 opMirrorY(vec2 p) {
    return vec2(p.x, abs(p.y));
}

// Infinite repetition — tile the domain.
//   spacing — cell size on each axis
vec2 opRepeat(vec2 p, vec2 spacing) {
    return mod(p + 0.5 * spacing, spacing) - 0.5 * spacing;
}

// Finite repetition — tile within a bounded region.
//   count — number of copies on each side of the origin (total = 2*count + 1)
vec2 opRepeatFinite(vec2 p, vec2 spacing, vec2 count) {
    return p - spacing * clamp(floor(p / spacing + 0.5), -count, count);
}

// ---------------------------------------------------------------------------
// 5. RENDERING HELPERS
// ---------------------------------------------------------------------------

// Anti-aliased fill — returns 1.0 inside, 0.0 outside, smooth at boundary.
//   d  — signed distance
//   px — pixel size in SDF space (use fwidth(st) or 1.0/resolution)
float fillSDF(float d, float px) {
    return 1.0 - smoothstep(-px, px, d);
}

// Anti-aliased stroke (outline) at a given width.
//   d     — signed distance
//   width — stroke width in SDF space
//   px    — pixel size
float strokeSDF(float d, float width, float px) {
    return 1.0 - smoothstep(-px, px, abs(d) - width * 0.5);
}

// Annular (ring) operation — turns any SDF into an outline.
//   d     — signed distance
//   thick — ring half-thickness
float opOnion(float d, float thick) {
    return abs(d) - thick;
}

// Shadow / glow falloff — soft gradient outside a shape.
//   d        — signed distance
//   radius   — glow radius
//   softness — falloff exponent (1.0 = linear, 2.0 = quadratic)
float glowSDF(float d, float radius, float softness) {
    return pow(clamp(1.0 - d / radius, 0.0, 1.0), softness);
}
