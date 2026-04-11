// ============================================================================
// color-utils.glsl — Color space conversions, palettes, and utilities
// ============================================================================
//
// Usage: copy the functions you need into your shader, or #include this file
// if your build tool supports it. All functions are pure (no global state).
//
// Compatible with GLSL ES 1.00 (WebGL 1) and GLSL ES 3.00 (WebGL 2).
// ============================================================================

// ----------------------------------------------------------------------------
// RGB ↔ HSV
// ----------------------------------------------------------------------------

// Convert RGB [0,1] to HSV where H is in [0,1] (not degrees).
vec3 rgb2hsv(vec3 c) {
    vec4 K = vec4(0.0, -1.0 / 3.0, 2.0 / 3.0, -1.0);
    vec4 p = mix(vec4(c.bg, K.wz), vec4(c.gb, K.xy), step(c.b, c.g));
    vec4 q = mix(vec4(p.xyw, c.r), vec4(c.r, p.yzx), step(p.x, c.r));

    float d = q.x - min(q.w, q.y);
    float e = 1.0e-10; // avoid division by zero
    return vec3(
        abs(q.z + (q.w - q.y) / (6.0 * d + e)),
        d / (q.x + e),
        q.x
    );
}

// Convert HSV [0,1] to RGB [0,1].
vec3 hsv2rgb(vec3 c) {
    vec3 p = abs(fract(c.xxx + vec3(1.0, 2.0 / 3.0, 1.0 / 3.0)) * 6.0 - 3.0);
    return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

// ----------------------------------------------------------------------------
// RGB ↔ HSL
// ----------------------------------------------------------------------------

// Helper: hue to RGB channel value (used by hsl2rgb).
float hue2rgb(float p, float q, float t) {
    float tt = fract(t); // wrap to [0, 1]
    if (tt < 1.0 / 6.0) return p + (q - p) * 6.0 * tt;
    if (tt < 1.0 / 2.0) return q;
    if (tt < 2.0 / 3.0) return p + (q - p) * (2.0 / 3.0 - tt) * 6.0;
    return p;
}

// Convert HSL [0,1] to RGB [0,1].
vec3 hsl2rgb(vec3 hsl) {
    float h = hsl.x;
    float s = hsl.y;
    float l = hsl.z;

    if (s < 1.0e-6) {
        return vec3(l); // achromatic
    }

    float q = l < 0.5 ? l * (1.0 + s) : l + s - l * s;
    float p = 2.0 * l - q;

    return vec3(
        hue2rgb(p, q, h + 1.0 / 3.0),
        hue2rgb(p, q, h),
        hue2rgb(p, q, h - 1.0 / 3.0)
    );
}

// Convert RGB [0,1] to HSL [0,1].
vec3 rgb2hsl(vec3 c) {
    float maxC = max(c.r, max(c.g, c.b));
    float minC = min(c.r, min(c.g, c.b));
    float l = (maxC + minC) * 0.5;

    if (maxC - minC < 1.0e-6) {
        return vec3(0.0, 0.0, l); // achromatic
    }

    float d = maxC - minC;
    float s = l > 0.5 ? d / (2.0 - maxC - minC) : d / (maxC + minC);

    float h = 0.0;
    if (maxC == c.r) {
        h = (c.g - c.b) / d + (c.g < c.b ? 6.0 : 0.0);
    } else if (maxC == c.g) {
        h = (c.b - c.r) / d + 2.0;
    } else {
        h = (c.r - c.g) / d + 4.0;
    }
    h /= 6.0;

    return vec3(h, s, l);
}

// ----------------------------------------------------------------------------
// Linear ↔ sRGB (gamma correction)
// ----------------------------------------------------------------------------

// Convert a single sRGB channel to linear.
float srgbToLinear(float c) {
    return c <= 0.04045
    ? c / 12.92 : pow((c + 0.055) / 1.055, 2.4);
}

// Convert sRGB color to linear RGB.
vec3 srgbToLinear(vec3 c) {
    return vec3(
        srgbToLinear(c.r),
        srgbToLinear(c.g),
        srgbToLinear(c.b)
    );
}

// Convert a single linear channel to sRGB.
float linearToSrgb(float c) {
    return c <= 0.0031308
    ? c * 12.92 : 1.055 * pow(c, 1.0 / 2.4) - 0.055;
}

// Convert linear RGB to sRGB.
vec3 linearToSrgb(vec3 c) {
    return vec3(
        linearToSrgb(c.r),
        linearToSrgb(c.g),
        linearToSrgb(c.b)
    );
}

// Fast approximation: gamma 2.2
vec3 gammaToLinearFast(vec3 c) {
    return pow(c, vec3(2.2));
}

vec3 linearToGammaFast(vec3 c) {
    return pow(c, vec3(1.0 / 2.2));
}

// ----------------------------------------------------------------------------
// Luminance
// ----------------------------------------------------------------------------

// Perceived luminance (ITU-R BT.709 coefficients, assumes linear RGB).
float luminance(vec3 c) {
    return dot(c, vec3(0.2126, 0.7152, 0.0722));
}

// Luma for sRGB (the coefficients used in video, e.g. NTSC).
// Use this when the input is already in gamma-encoded sRGB space.
float luma(vec3 c) {
    return dot(c, vec3(0.299, 0.587, 0.114));
}

// ----------------------------------------------------------------------------
// Inigo Quilez cosine palettes
// https://iquilezles.org/articles/palettes/
// ----------------------------------------------------------------------------
//
// Attempt to express a full color palette with a single formula:
//   color(t) = a + b * cos(2π * (c * t + d))
//
// Each parameter (a, b, c, d) is a vec3 controlling R, G, B independently.
//   a — bias (brightness offset)
//   b — amplitude (color range)
//   c — frequency (how many color cycles)
//   d — phase (shifts the palette hue)
//
// Pass t in [0, 1] for a single cycle, or let it wrap for repeating palettes.

vec3 cosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
    return a + b * cos(6.28318530718 * (c * t + d));
}

// --- Preset palettes (from iquilezles.org/articles/palettes/) ---

// Rainbow: cycles through all hues smoothly.
vec3 paletteRainbow(float t) {
    return cosinePalette(t,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(1.0, 1.0, 1.0),
        vec3(0.00, 0.33, 0.67)
    );
}

// Warm sunset: reds, oranges, yellows, and pinks.
vec3 paletteSunset(float t) {
    return cosinePalette(t,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(1.0, 1.0, 1.0),
        vec3(0.00, 0.10, 0.20)
    );
}

// Cool ocean: blues, cyans, and greens.
vec3 paletteOcean(float t) {
    return cosinePalette(t,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(1.0, 1.0, 1.0),
        vec3(0.30, 0.20, 0.20)
    );
}

// Electric neon: vivid magentas, cyans, yellows.
vec3 paletteNeon(float t) {
    return cosinePalette(t,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(2.0, 1.0, 0.0),
        vec3(0.50, 0.20, 0.25)
    );
}

// Fire: dark reds to bright yellows and whites.
vec3 paletteFire(float t) {
    return cosinePalette(t,
        vec3(0.5, 0.5, 0.5),
        vec3(0.5, 0.5, 0.5),
        vec3(1.0, 0.7, 0.4),
        vec3(0.00, 0.15, 0.20)
    );
}

// Pastel: soft muted tones.
vec3 palettePastel(float t) {
    return cosinePalette(t,
        vec3(0.8, 0.5, 0.4),
        vec3(0.2, 0.4, 0.2),
        vec3(2.0, 1.0, 1.0),
        vec3(0.00, 0.25, 0.25)
    );
}

// ----------------------------------------------------------------------------
// Color blending and adjustment
// ----------------------------------------------------------------------------

// Soft light blend (Photoshop-style). Both inputs in [0,1].
vec3 blendSoftLight(vec3 base, vec3 blend) {
    return mix(
        sqrt(base) * (2.0 * blend - 1.0) + 2.0 * base * (1.0 - blend),
        2.0 * base * blend + base * base * (1.0 - 2.0 * blend),
        step(blend, vec3(0.5))
    );
}

// Overlay blend.
vec3 blendOverlay(vec3 base, vec3 blend) {
    return mix(
        1.0 - 2.0 * (1.0 - base) * (1.0 - blend),
        2.0 * base * blend,
        step(base, vec3(0.5))
    );
}

// Screen blend.
vec3 blendScreen(vec3 base, vec3 blend) {
    return 1.0 - (1.0 - base) * (1.0 - blend);
}

// Adjust saturation. amount=0 is grayscale, amount=1 is original.
vec3 adjustSaturation(vec3 color, float amount) {
    float gray = luma(color);
    return mix(vec3(gray), color, amount);
}

// Adjust contrast around midpoint 0.5. factor=1 is unchanged, >1 increases.
vec3 adjustContrast(vec3 color, float factor) {
    return (color - 0.5) * factor + 0.5;
}

// Adjust brightness. offset is added directly.
vec3 adjustBrightness(vec3 color, float offset) {
    return color + offset;
}

// ----------------------------------------------------------------------------
// Utility: hex color
// ----------------------------------------------------------------------------

// Convert a hex color (as integer via float) to RGB. This is mainly useful
// as documentation; in practice you'll set uniforms from JS.
//
// Example: hexToRgb(0xFF6633) → vec3(1.0, 0.4, 0.2)
//
// Note: GLSL ES has limited integer precision. For colors above 0xFFFFFF
// this may lose precision. Prefer passing uniforms from JavaScript.
vec3 hexToRgb(float hex) {
    float r = floor(hex / 65536.0);
    float g = floor(mod(hex / 256.0, 256.0));
    float b = mod(hex, 256.0);
    return vec3(r, g, b) / 255.0;
}

// ----------------------------------------------------------------------------
// Color temperature (attempt at Kelvin → RGB, simplified)
// ----------------------------------------------------------------------------

// Attempt to approximate a blackbody color from temperature in Kelvin.
// Rough approximation for creative use, not physically accurate.
// Valid roughly in [1000, 15000] K range.
vec3 colorTemperature(float kelvin) {
    float t = kelvin / 100.0;
    vec3 color;

    // Red
    if (t <= 66.0) {
        color.r = 1.0;
    } else {
        color.r = clamp(1.292936 * pow(t - 60.0, -0.1332047592), 0.0, 1.0);
    }

    // Green
    if (t <= 66.0) {
        color.g = clamp(0.3900816 * log(t) - 0.6318414, 0.0, 1.0);
    } else {
        color.g = clamp(1.129891 * pow(t - 60.0, -0.0755148492), 0.0, 1.0);
    }

    // Blue
    if (t >= 66.0) {
        color.b = 1.0;
    } else if (t <= 19.0) {
        color.b = 0.0;
    } else {
        color.b = clamp(0.5432068 * log(t - 10.0) - 1.19625408914, 0.0, 1.0);
    }

    return color;
}
