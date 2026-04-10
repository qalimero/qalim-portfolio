// ---------------------------------------------------------------------------
// easing.glsl — Common easing functions for GLSL
//
// Each function maps t ∈ [0, 1] → [0, 1].
// Paste or #include into any shader. No version directive so it works with
// both GLSL ES 1.00 (WebGL 1) and GLSL ES 3.00 (WebGL 2).
//
// Naming: ease<Family><Direction>
//   Direction: In, Out, InOut
//
// Reference: https://easings.net
// ---------------------------------------------------------------------------

// ---- Constants ------------------------------------------------------------

#ifndef PI
#define PI 3.14159265358979323846
#endif

#ifndef HALF_PI
#define HALF_PI 1.5707963267948966
#endif

// ---- Linear (identity) ----------------------------------------------------

float easeLinear(float t) {
    return t;
}

// ---- Quad -----------------------------------------------------------------

float easeQuadIn(float t) {
    return t * t;
}

float easeQuadOut(float t) {
    return t * (2.0 - t);
}

float easeQuadInOut(float t) {
    return t < 0.5
    ? 2.0 * t * t : -1.0 + (4.0 - 2.0 * t) * t;
}

// ---- Cubic ----------------------------------------------------------------

float easeCubicIn(float t) {
    return t * t * t;
}

float easeCubicOut(float t) {
    float f = t - 1.0;
    return f * f * f + 1.0;
}

float easeCubicInOut(float t) {
    return t < 0.5
    ? 4.0 * t * t * t : (t - 1.0) * (2.0 * t - 2.0) * (2.0 * t - 2.0) + 1.0;
}

// ---- Quart ----------------------------------------------------------------

float easeQuartIn(float t) {
    return t * t * t * t;
}

float easeQuartOut(float t) {
    float f = t - 1.0;
    return 1.0 - f * f * f * f;
}

float easeQuartInOut(float t) {
    float f = t - 1.0;
    return t < 0.5
    ? 8.0 * t * t * t * t : 1.0 - 8.0 * f * f * f * f;
}

// ---- Quint ----------------------------------------------------------------

float easeQuintIn(float t) {
    return t * t * t * t * t;
}

float easeQuintOut(float t) {
    float f = t - 1.0;
    return f * f * f * f * f + 1.0;
}

float easeQuintInOut(float t) {
    float f = t - 1.0;
    return t < 0.5
    ? 16.0 * t * t * t * t * t : 1.0 + 16.0 * f * f * f * f * f;
}

// ---- Sine -----------------------------------------------------------------

float easeSineIn(float t) {
    return 1.0 - cos(t * HALF_PI);
}

float easeSineOut(float t) {
    return sin(t * HALF_PI);
}

float easeSineInOut(float t) {
    return 0.5 * (1.0 - cos(PI * t));
}

// ---- Expo -----------------------------------------------------------------

float easeExpoIn(float t) {
    return t == 0.0 ? 0.0 : pow(2.0, 10.0 * (t - 1.0));
}

float easeExpoOut(float t) {
    return t == 1.0 ? 1.0 : 1.0 - pow(2.0, -10.0 * t);
}

float easeExpoInOut(float t) {
    if (t == 0.0) return 0.0;
    if (t == 1.0) return 1.0;
    return t < 0.5
    ? 0.5 * pow(2.0, 20.0 * t - 10.0) : 1.0 - 0.5 * pow(2.0, -20.0 * t + 10.0);
}

// ---- Circ -----------------------------------------------------------------

float easeCircIn(float t) {
    return 1.0 - sqrt(1.0 - t * t);
}

float easeCircOut(float t) {
    float f = t - 1.0;
    return sqrt(1.0 - f * f);
}

float easeCircInOut(float t) {
    return t < 0.5
    ? 0.5 * (1.0 - sqrt(1.0 - 4.0 * t * t)) : 0.5 * (sqrt(1.0 - (2.0 * t - 2.0) * (2.0 * t - 2.0)) + 1.0);
}

// ---- Back -----------------------------------------------------------------
// Overshoot constant c1 = 1.70158, c3 = c1 + 1.0

float easeBackIn(float t) {
    const float c1 = 1.70158;
    const float c3 = c1 + 1.0;
    return c3 * t * t * t - c1 * t * t;
}

float easeBackOut(float t) {
    const float c1 = 1.70158;
    const float c3 = c1 + 1.0;
    float f = t - 1.0;
    return 1.0 + c3 * f * f * f + c1 * f * f;
}

float easeBackInOut(float t) {
    const float c1 = 1.70158;
    const float c2 = c1 * 1.525;
    float f = t * 2.0;
    return t < 0.5
    ? 0.5 * (f * f * ((c2 + 1.0) * f - c2)) : 0.5 * ((f - 2.0) * (f - 2.0) * ((c2 + 1.0) * (f - 2.0) + c2) + 2.0);
}

// ---- Elastic --------------------------------------------------------------

float easeElasticIn(float t) {
    if (t == 0.0) return 0.0;
    if (t == 1.0) return 1.0;
    return -pow(2.0, 10.0 * t - 10.0) * sin((t * 10.0 - 10.75) * (2.0 * PI / 3.0));
}

float easeElasticOut(float t) {
    if (t == 0.0) return 0.0;
    if (t == 1.0) return 1.0;
    return pow(2.0, -10.0 * t) * sin((t * 10.0 - 0.75) * (2.0 * PI / 3.0)) + 1.0;
}

float easeElasticInOut(float t) {
    if (t == 0.0) return 0.0;
    if (t == 1.0) return 1.0;
    float period = 2.0 * PI / 4.5;
    return t < 0.5
    ? -0.5 * pow(2.0, 20.0 * t - 10.0) * sin((20.0 * t - 11.125) * period) : 0.5 * pow(2.0, -20.0 * t + 10.0) * sin((20.0 * t - 11.125) * period) + 1.0;
}

// ---- Bounce ---------------------------------------------------------------

float easeBounceOut(float t) {
    const float n1 = 7.5625;
    const float d1 = 2.75;
    if (t < 1.0 / d1) {
        return n1 * t * t;
    } else if (t < 2.0 / d1) {
        float f = t - 1.5 / d1;
        return n1 * f * f + 0.75;
    } else if (t < 2.5 / d1) {
        float f = t - 2.25 / d1;
        return n1 * f * f + 0.9375;
    } else {
        float f = t - 2.625 / d1;
        return n1 * f * f + 0.984375;
    }
}

float easeBounceIn(float t) {
    return 1.0 - easeBounceOut(1.0 - t);
}

float easeBounceInOut(float t) {
    return t < 0.5
    ? 0.5 * (1.0 - easeBounceOut(1.0 - 2.0 * t)) : 0.5 * (1.0 + easeBounceOut(2.0 * t - 1.0));
}

// ---- Smooth helpers -------------------------------------------------------

// Attempt-free smooth pulse: rises from 0 at edge0, reaches 1 at center,
// falls back to 0 at edge1.  Combines two smoothsteps.
float easePulse(float edge0, float edge1, float t) {
    float center = (edge0 + edge1) * 0.5;
    return smoothstep(edge0, center, t) * (1.0 - smoothstep(center, edge1, t));
}

// Attempt-free ping-pong: goes 0→1→0 over t ∈ [0, 1].
// Apply any easing to the result for shaped ping-pong.
float easePingPong(float t) {
    return 1.0 - abs(2.0 * t - 1.0);
}

// Attempt-free remap: rescale t from [inMin, inMax] to [outMin, outMax],
// clamped. Useful before feeding into an easing function.
float easeRemap(float t, float inMin, float inMax, float outMin, float outMax) {
    float clamped = clamp((t - inMin) / (inMax - inMin), 0.0, 1.0);
    return mix(outMin, outMax, clamped);
}
