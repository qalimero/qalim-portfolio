# Shader Animation Patterns

Advanced animation techniques for WebGL 2 (with WebGL 1 fallback notes). Each section includes the concept, GLSL snippets, and JavaScript wiring guidance.

## Use this file for

- Physics simulation on the GPU (forces, springs, gravity, collisions)
- Particle systems with Transform Feedback or GPGPU ping-pong
- Noise-driven motion (Perlin, simplex, curl noise, flow fields)
- Procedural animation (oscillation, waves, easing)
- Visual effects (trails, bloom, displacement, morphing, feedback loops)
- Instanced drawing for large object counts

---

## 1. Physics Simulation in Shaders

### Euler integration

The simplest integrator. Update position and velocity each frame in the vertex shader or in a Transform Feedback pass.

```glsl
// WebGL 2 Transform Feedback vertex shader
#version 300 es
precision highp float;

in vec2 aPosition;
in vec2 aVelocity;

out vec2 vPosition;
out vec2 vVelocity;

uniform float uDeltaTime;
uniform vec2 uGravity; // e.g. vec2(0.0, -9.81)

void main() {
  vec2 acceleration = uGravity;
  vec2 newVelocity = aVelocity + acceleration * uDeltaTime;
  vec2 newPosition = aPosition + newVelocity * uDeltaTime;
  vPosition = newPosition;
  vVelocity = newVelocity;
}
```

### Verlet integration

More stable for constrained systems (cloth, chains). Store current and previous position instead of velocity.

```glsl
vec2 verletStep(vec2 current, vec2 previous, vec2 acceleration, float dt) {
  return 2.0 * current - previous + acceleration * dt * dt;
}
```

### Spring forces

Hooke's law: force = -k * displacement - damping * velocity.

```glsl
vec2 springForce(vec2 position, vec2 anchor, float stiffness, float damping, vec2 velocity) {
  vec2 displacement = position - anchor;
  return -stiffness * displacement - damping * velocity;
}
```

### Collision response

Reflect velocity on boundary contact. Apply restitution for energy loss.

```glsl
// Floor collision at y = 0
void collideFloor(inout vec2 position, inout vec2 velocity, float restitution) {
  if (position.y < 0.0) {
    position.y = 0.0;
    velocity.y = -velocity.y * restitution;
  }
}

// Circle-circle collision check
bool circlesOverlap(vec2 a, vec2 b, float rA, float rB) {
  return length(a - b) < rA + rB;
}
```

### JavaScript wiring (Transform Feedback)

```js
// 1. Create two sets of buffers (ping-pong)
const bufA = { position: gl.createBuffer(), velocity: gl.createBuffer() };
const bufB = { position: gl.createBuffer(), velocity: gl.createBuffer() };

// 2. Create Transform Feedback object
const tf = gl.createTransformFeedback();

// 3. When linking the simulation program, specify varyings BEFORE linking
gl.transformFeedbackVaryings(
  simProgram,
  ['vPosition', 'vVelocity'],
  gl.SEPARATE_ATTRIBS
);
gl.linkProgram(simProgram);

// 4. Each frame — bind source as attributes, destination as TF targets
function simulationStep(source, destination, deltaTime) {
  gl.useProgram(simProgram);
  gl.uniform1f(uDeltaTimeLoc, deltaTime);

  // Bind source buffers as vertex attributes
  gl.bindBuffer(gl.ARRAY_BUFFER, source.position);
  gl.vertexAttribPointer(aPositionLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aPositionLoc);

  gl.bindBuffer(gl.ARRAY_BUFFER, source.velocity);
  gl.vertexAttribPointer(aVelocityLoc, 2, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(aVelocityLoc);

  // Bind destination buffers as transform feedback targets
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, destination.position);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, destination.velocity);

  // Run the simulation (no rasterization needed)
  gl.enable(gl.RASTERIZER_DISCARD);
  gl.beginTransformFeedback(gl.POINTS);
  gl.drawArrays(gl.POINTS, 0, particleCount);
  gl.endTransformFeedback();
  gl.disable(gl.RASTERIZER_DISCARD);

  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);
}
```

---

## 2. Particle Systems

### Transform Feedback particles (WebGL 2)

Best for moderate particle counts (10k–500k). Physics runs in the vertex shader, results are captured back into buffers without CPU readback.

**Particle state layout (interleaved or separate):**

| Attribute | Components | Purpose |
|---|---|---|
| `aPosition` | vec2 / vec3 | Current position |
| `aVelocity` | vec2 / vec3 | Current velocity |
| `aLife` | float | Remaining lifetime (seconds) |
| `aAge` | float | Current age (for size/color ramp) |

**Lifecycle in the simulation shader:**

```glsl
#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aVelocity;
in float aLife;
in float aAge;

out vec3 vPosition;
out vec3 vVelocity;
out float vLife;
out float vAge;

uniform float uDeltaTime;
uniform vec3 uGravity;
uniform vec3 uEmitOrigin;
uniform float uTime;

// Simple hash for respawn randomness
float hash(float n) {
  return fract(sin(n) * 43758.5453123);
}

void main() {
  float newAge = aAge + uDeltaTime;

  if (newAge >= aLife) {
    // Respawn — reset position and randomize velocity
    float id = float(gl_VertexID);
    vPosition = uEmitOrigin;
    vVelocity = vec3(
      hash(id + uTime) - 0.5,
      hash(id + uTime + 100.0) * 0.5 + 0.5,
      hash(id + uTime + 200.0) - 0.5
    ) * 2.0;
    vLife = 1.0 + hash(id + uTime + 300.0) * 2.0;
    vAge = 0.0;
  } else {
    // Integrate
    vec3 accel = uGravity;
    vVelocity = aVelocity + accel * uDeltaTime;
    vPosition = aPosition + vVelocity * uDeltaTime;
    vLife = aLife;
    vAge = newAge;
  }
}
```

### GPGPU ping-pong particles (WebGL 1 compatible)

Encode particle state in floating-point textures. Use two framebuffers and alternate reading from one while writing to the other.

**Setup:**

1. Create two RGBA float textures (requires `OES_texture_float` in WebGL 1).
2. Attach each to its own framebuffer.
3. Each texel stores one particle: `(x, y, vx, vy)`.
4. A fullscreen quad shader reads the source texture, computes new state, writes to the destination framebuffer.
5. Swap source and destination each frame.
6. A separate draw pass samples the latest texture to position point sprites.

```js
// Ping-pong framebuffer setup
function createParticleState(gl, width, height) {
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0,
                gl.RGBA, gl.FLOAT, null);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0,
                          gl.TEXTURE_2D, tex, 0);
  return { texture: tex, framebuffer: fbo };
}

const stateA = createParticleState(gl, texWidth, texHeight);
const stateB = createParticleState(gl, texWidth, texHeight);
let source = stateA, destination = stateB;

function stepSimulation() {
  gl.bindFramebuffer(gl.FRAMEBUFFER, destination.framebuffer);
  gl.viewport(0, 0, texWidth, texHeight);
  gl.useProgram(simProgram);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, source.texture);
  gl.uniform1i(uStateSamplerLoc, 0);
  drawFullscreenQuad();
  // Swap
  [source, destination] = [destination, source];
}
```

**GPGPU simulation fragment shader:**

```glsl
precision highp float;
varying vec2 vTexCoord;
uniform sampler2D uState;
uniform float uDeltaTime;
uniform vec2 uGravity;

void main() {
  vec4 state = texture2D(uState, vTexCoord);
  vec2 pos = state.xy;
  vec2 vel = state.zw;

  vel += uGravity * uDeltaTime;
  pos += vel * uDeltaTime;

  // Respawn if below floor
  if (pos.y < -1.0) {
    pos = vec2(0.0);
    vel = vec2((fract(sin(dot(vTexCoord, vec2(12.9898, 78.233))) * 43758.5453) - 0.5) * 2.0,
               fract(sin(dot(vTexCoord, vec2(93.9898, 67.345))) * 24631.134) * 3.0);
  }

  gl_FragColor = vec4(pos, vel);
}
```

---

## 3. Noise-Driven Motion

### When to use each noise type

| Noise | Character | Best for |
|---|---|---|
| Value noise | Blocky, linear interpolation | Quick prototyping |
| Perlin / simplex | Smooth, gradient-based | Organic displacement, terrain |
| Curl noise | Divergence-free (incompressible) | Fluid-like particle advection |
| Worley / cellular | Cell boundaries, organic cracks | Voronoi patterns, caustics |

### Using simplex noise for displacement

See `shaders/noise.glsl` for the full implementation. Import or paste it above your main function.

```glsl
// Vertex shader — displace mesh surface along normals
uniform float uTime;
uniform float uNoiseScale;
uniform float uNoiseAmplitude;

void main() {
  float n = snoise(vec3(aPosition.xy * uNoiseScale, uTime * 0.3));
  vec3 displaced = aPosition + aNormal * n * uNoiseAmplitude;
  gl_Position = uProjectionMatrix * uViewMatrix * uModelMatrix * vec4(displaced, 1.0);
}
```

### Curl noise for fluid motion

Curl noise produces divergence-free velocity fields — particles move along implicit stream surfaces without converging or diverging, creating fluid-like motion.

```glsl
// 2D curl noise: returns a vec2 velocity
vec2 curlNoise2D(vec2 p) {
  float eps = 0.001;
  float n1 = snoise(vec3(p.x, p.y + eps, 0.0));
  float n2 = snoise(vec3(p.x, p.y - eps, 0.0));
  float n3 = snoise(vec3(p.x + eps, p.y, 0.0));
  float n4 = snoise(vec3(p.x - eps, p.y, 0.0));
  float dndx = (n3 - n4) / (2.0 * eps);
  float dndy = (n1 - n2) / (2.0 * eps);
  return vec2(dndy, -dndx);
}

// 3D curl noise: returns a vec3 velocity
vec3 curlNoise3D(vec3 p) {
  float eps = 0.001;
  vec3 dx = vec3(eps, 0.0, 0.0);
  vec3 dy = vec3(0.0, eps, 0.0);
  vec3 dz = vec3(0.0, 0.0, eps);

  float x0 = snoise(p + dy); float x1 = snoise(p - dy);
  float y0 = snoise(p + dz); float y1 = snoise(p - dz);
  float z0 = snoise(p + dx); float z1 = snoise(p - dx);

  // For full 3D curl, we need three independent noise fields.
  // Use offset seeds to create them:
  float ax0 = snoise(p + dy + vec3(31.416, 0.0, 0.0));
  float ax1 = snoise(p - dy + vec3(31.416, 0.0, 0.0));
  float ay0 = snoise(p + dz + vec3(31.416, 0.0, 0.0));
  float ay1 = snoise(p - dz + vec3(31.416, 0.0, 0.0));

  float bx0 = snoise(p + dy + vec3(0.0, 47.123, 0.0));
  float bx1 = snoise(p - dy + vec3(0.0, 47.123, 0.0));
  float bz0 = snoise(p + dx + vec3(0.0, 47.123, 0.0));
  float bz1 = snoise(p - dx + vec3(0.0, 47.123, 0.0));

  float inv2eps = 1.0 / (2.0 * eps);
  return vec3(
    (ax0 - ax1) * inv2eps - (y0 - y1) * inv2eps,
    (bz0 - bz1) * inv2eps - (x0 - x1) * inv2eps,
    (ay0 - ay1) * inv2eps - (bx0 - bx1) * inv2eps
  );
}
```

### Flow fields

Advect particles through a precomputed or real-time noise field. Each particle looks up its velocity from the field based on its position.

```glsl
// In a Transform Feedback or GPGPU step:
vec2 fieldVelocity = curlNoise2D(aPosition.xy * uFieldScale + uTime * 0.1);
vec2 newPosition = aPosition.xy + fieldVelocity * uDeltaTime * uSpeed;
```

### Fractal Brownian Motion (fBm)

Layer multiple octaves of noise for richer detail.

```glsl
float fbm(vec3 p, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < 8; i++) { // unroll-friendly upper bound
    if (i >= octaves) break;
    value += amplitude * snoise(p * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
```

### Domain warping

Feed noise output back as input coordinates for organic distortion.

```glsl
float domainWarp(vec2 p, float time) {
  vec2 q = vec2(
    fbm(vec3(p, time), 4),
    fbm(vec3(p + vec2(5.2, 1.3), time), 4)
  );
  vec2 r = vec2(
    fbm(vec3(p + 4.0 * q + vec2(1.7, 9.2), time * 0.5), 4),
    fbm(vec3(p + 4.0 * q + vec2(8.3, 2.8), time * 0.5), 4)
  );
  return fbm(vec3(p + 4.0 * r, time * 0.25), 4);
}
```

---

## 4. Procedural Animation

### Oscillation

```glsl
// Smooth oscillation between 0 and 1
float pulse(float t, float frequency) {
  return sin(t * frequency * 6.2831853) * 0.5 + 0.5;
}

// Ping-pong between 0 and 1 (triangle wave)
float pingPong(float t) {
  return abs(fract(t) * 2.0 - 1.0);
}
```

### Wave functions

```glsl
// Radial wave from a center point
float radialWave(vec2 uv, vec2 center, float time, float frequency, float speed) {
  float dist = length(uv - center);
  return sin(dist * frequency - time * speed);
}

// Traveling sine wave
float travelingWave(float x, float time, float frequency, float speed, float amplitude) {
  return amplitude * sin(frequency * x - speed * time);
}

// Combine waves for complex motion
vec3 oceanDisplacement(vec2 xz, float time) {
  float y = 0.0;
  y += 0.3  * sin(xz.x * 1.0 + time * 1.2);
  y += 0.15 * sin(xz.y * 1.5 + time * 0.8);
  y += 0.08 * sin((xz.x + xz.y) * 2.5 + time * 2.0);
  return vec3(xz.x, y, xz.y);
}
```

### Easing in shaders

See `shaders/easing.glsl` for a full library. Common patterns:

```glsl
// Map a 0–1 progress to an eased value
float t = clamp((uTime - startTime) / duration, 0.0, 1.0);
float eased = t * t * (3.0 - 2.0 * t); // smoothstep equivalent
vec3 position = mix(startPos, endPos, eased);
```

### Stagger and sequence

Offset animation start times per instance for cascade effects:

```glsl
float staggerDelay = float(gl_InstanceID) * 0.05;
float localTime = max(uTime - staggerDelay, 0.0);
float t = clamp(localTime / duration, 0.0, 1.0);
```

---

## 5. Visual Effects

### Trails (persistent buffer feedback)

Draw the previous frame at reduced opacity before drawing new content. This creates motion trails.

```js
function drawWithTrails(gl, sceneDrawFn) {
  // 1. Draw previous frame's FBO onto screen with fade
  gl.useProgram(fadeProgram);
  gl.uniform1f(uAlphaLoc, 0.92); // higher = longer trails
  gl.bindTexture(gl.TEXTURE_2D, previousFrameTexture);
  drawFullscreenQuad();

  // 2. Draw current scene on top
  sceneDrawFn();

  // 3. Copy the result into the trail texture for next frame
  gl.bindTexture(gl.TEXTURE_2D, previousFrameTexture);
  gl.copyTexSubImage2D(gl.TEXTURE_2D, 0, 0, 0, 0, 0, width, height);
}
```

Or use two FBOs and alternate (render-to-texture ping-pong):

```js
// Frame N: read from fboA, write to fboB
// Frame N+1: read from fboB, write to fboA
```

### Bloom (multi-pass)

1. Render scene to an FBO.
2. Extract bright pixels (threshold pass) into a second FBO.
3. Apply separable Gaussian blur (horizontal + vertical, two passes).
4. Composite the blurred brightness on top of the original scene.

```glsl
// Brightness extraction fragment shader
precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D uScene;
uniform float uThreshold;

void main() {
  vec4 color = texture(uScene, vTexCoord);
  float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  gl_FragColor = brightness > uThreshold ? color : vec4(0.0);
}
```

```glsl
// Single-axis Gaussian blur (run twice — H then V)
precision mediump float;
varying vec2 vTexCoord;
uniform sampler2D uTexture;
uniform vec2 uDirection; // vec2(1.0/width, 0.0) or vec2(0.0, 1.0/height)

void main() {
  vec4 sum = vec4(0.0);
  // 9-tap Gaussian kernel
  float weights[5];
  weights[0] = 0.227027;
  weights[1] = 0.194596;
  weights[2] = 0.121622;
  weights[3] = 0.054054;
  weights[4] = 0.016216;

  sum += texture(uTexture, vTexCoord) * weights[0];
  for (int i = 1; i < 5; i++) {
    vec2 offset = uDirection * float(i);
    sum += texture(uTexture, vTexCoord + offset) * weights[i];
    sum += texture(uTexture, vTexCoord - offset) * weights[i];
  }
  gl_FragColor = sum;
}
```

### Displacement mapping

Offset UV coordinates or vertex positions using a texture or noise.

```glsl
// Fragment shader UV displacement
vec2 displacedUV = vTexCoord + texture(uDisplacementMap, vTexCoord).rg * uDisplacementStrength;
vec4 color = texture(uMainTexture, displacedUV);
```

```glsl
// Vertex shader height displacement
float height = texture(uHeightMap, aTexCoord).r;
vec3 displaced = aPosition + aNormal * height * uHeightScale;
```

### Morphing between shapes

Linearly interpolate vertex positions between two geometries that share the same vertex count.

```glsl
uniform float uMorphProgress; // 0.0 = shape A, 1.0 = shape B

in vec3 aPositionA;
in vec3 aPositionB;
in vec3 aNormalA;
in vec3 aNormalB;

void main() {
  vec3 pos = mix(aPositionA, aPositionB, uMorphProgress);
  vec3 nrm = normalize(mix(aNormalA, aNormalB, uMorphProgress));
  // ... continue with MVP transform
}
```

### Feedback loops

Render to a texture, then use that texture as input for the next frame. Creates recursive visual effects (fractals, reaction-diffusion, fluid simulation).

**Reaction-diffusion fragment shader (Gray-Scott model):**

```glsl
precision highp float;
varying vec2 vTexCoord;
uniform sampler2D uState; // RG channels = chemical concentrations A, B
uniform vec2 uTexelSize;  // 1.0 / resolution
uniform float uFeedRate;  // ~0.055
uniform float uKillRate;  // ~0.062
uniform float uDiffuseA;  // ~1.0
uniform float uDiffuseB;  // ~0.5
uniform float uDeltaTime;

void main() {
  vec2 state = texture(uState, vTexCoord).rg;
  float a = state.r;
  float b = state.g;

  // Laplacian via 3x3 convolution
  vec2 laplacian = -state;
  laplacian += texture(uState, vTexCoord + vec2( uTexelSize.x, 0.0)).rg * 0.2;
  laplacian += texture(uState, vTexCoord + vec2(-uTexelSize.x, 0.0)).rg * 0.2;
  laplacian += texture(uState, vTexCoord + vec2(0.0,  uTexelSize.y)).rg * 0.2;
  laplacian += texture(uState, vTexCoord + vec2(0.0, -uTexelSize.y)).rg * 0.2;
  laplacian += texture(uState, vTexCoord + uTexelSize).rg * 0.05;
  laplacian += texture(uState, vTexCoord - uTexelSize).rg * 0.05;
  laplacian += texture(uState, vTexCoord + vec2(uTexelSize.x, -uTexelSize.y)).rg * 0.05;
  laplacian += texture(uState, vTexCoord + vec2(-uTexelSize.x, uTexelSize.y)).rg * 0.05;

  float reaction = a * b * b;
  float newA = a + (uDiffuseA * laplacian.r - reaction + uFeedRate * (1.0 - a)) * uDeltaTime;
  float newB = b + (uDiffuseB * laplacian.g + reaction - (uKillRate + uFeedRate) * b) * uDeltaTime;

  gl_FragColor = vec4(clamp(newA, 0.0, 1.0), clamp(newB, 0.0, 1.0), 0.0, 1.0);
}
```

---

## 6. Instanced Drawing

### When to use

Use instancing when drawing many copies of the same geometry with per-instance variation (position, color, scale, rotation). One draw call replaces thousands.

### WebGL 2

```js
// --- Setup ---
// Per-instance data: mat4 model matrix stored as 4 vec4 columns
const instanceBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
gl.bufferData(gl.ARRAY_BUFFER, instanceMatrices, gl.DYNAMIC_DRAW);

// A mat4 occupies 4 attribute slots (4 consecutive vec4s)
const loc = gl.getAttribLocation(program, 'aInstanceMatrix');
const bytesPerMatrix = 4 * 16; // 4 columns * 4 floats * 4 bytes
for (let i = 0; i < 4; i++) {
  const attribLoc = loc + i;
  gl.enableVertexAttribArray(attribLoc);
  gl.vertexAttribPointer(attribLoc, 4, gl.FLOAT, false, bytesPerMatrix, i * 16);
  gl.vertexAttribDivisor(attribLoc, 1); // advance once per instance
}

// --- Draw ---
gl.drawArraysInstanced(gl.TRIANGLES, 0, vertexCount, instanceCount);
// or
gl.drawElementsInstanced(gl.TRIANGLES, indexCount, gl.UNSIGNED_SHORT, 0, instanceCount);
```

### Vertex shader for instanced drawing

```glsl
#version 300 es
precision highp float;

in vec3 aPosition;
in vec3 aNormal;

// Per-instance model matrix (4 attribute slots)
in mat4 aInstanceMatrix;

// Per-instance color
in vec4 aInstanceColor;

uniform mat4 uViewMatrix;
uniform mat4 uProjectionMatrix;

out vec3 vNormal;
out vec4 vColor;

void main() {
  vec4 worldPos = aInstanceMatrix * vec4(aPosition, 1.0);
  vNormal = mat3(aInstanceMatrix) * aNormal;
  vColor = aInstanceColor;
  gl_Position = uProjectionMatrix * uViewMatrix * worldPos;
}
```

### WebGL 1 fallback

Use the `ANGLE_instanced_arrays` extension:

```js
const ext = gl.getExtension('ANGLE_instanced_arrays');
if (!ext) {
  console.error('Instancing not supported — fall back to batched draws');
  return;
}

// Same attribute setup, but use the extension methods:
ext.vertexAttribDivisorANGLE(attribLoc, 1);
ext.drawArraysInstancedANGLE(gl.TRIANGLES, 0, vertexCount, instanceCount);
```

### Lightweight per-instance data

If instances only differ by position and color (no rotation/scale), skip the mat4 and use simpler attributes:

```glsl
#version 300 es
in vec3 aPosition;       // shared geometry
in vec3 aInstanceOffset;  // per-instance position offset
in vec3 aInstanceColor;   // per-instance color
in float aInstanceScale;  // per-instance uniform scale

uniform mat4 uViewProjection;

out vec3 vColor;

void main() {
  vec3 worldPos = aPosition * aInstanceScale + aInstanceOffset;
  vColor = aInstanceColor;
  gl_Position = uViewProjection * vec4(worldPos, 1.0);
}
```

```js
// aInstanceOffset — divisor 1
gl.vertexAttribPointer(offsetLoc, 3, gl.FLOAT, false, stride, 0);
gl.vertexAttribDivisor(offsetLoc, 1);

// aInstanceColor — divisor 1
gl.vertexAttribPointer(colorLoc, 3, gl.FLOAT, false, stride, 12);
gl.vertexAttribDivisor(colorLoc, 1);

// aInstanceScale — divisor 1
gl.vertexAttribPointer(scaleLoc, 1, gl.FLOAT, false, stride, 24);
gl.vertexAttribDivisor(scaleLoc, 1);
```

### Updating instance data each frame

```js
// Update positions on the CPU, then re-upload
gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
gl.bufferSubData(gl.ARRAY_BUFFER, 0, updatedInstanceData);
// bufferSubData avoids reallocating — use when the count is fixed.
// If count changes, use bufferData with gl.DYNAMIC_DRAW.
```

---

## Combining Techniques

Many effects compose naturally:

| Combination | Result |
|---|---|
| Curl noise + Transform Feedback particles | Fluid-like particle streams |
| Instancing + per-instance noise offset | Organic crowds / forests |
| Bloom + particle system | Glowing sparks / fire |
| Displacement + wave functions | Animated water surface |
| Feedback loop + blur | Ghostly trails |
| fBm domain warping + color palette | Abstract generative backgrounds |
| Morphing + easing | Smooth shape transitions |
| SDF rendering + noise | Organic blob shapes |

## Performance Notes

- Transform Feedback is faster than GPGPU for simple particle physics because it avoids fullscreen fragment passes.
- GPGPU is more flexible — easier to do neighbor lookups (fluid sim, reaction-diffusion).
- Instancing saves draw calls but each instance still has its own vertices — keep per-instance geometry low-poly.
- Noise functions are expensive. Precompute into a texture when the noise field is static or slowly changing.
- Use `gl.RASTERIZER_DISCARD` during simulation-only passes to skip fragment processing entirely.
- Profile on target hardware — mobile GPUs have very different bottlenecks than desktop.

## Debugging Tips

- Start with 1 particle or 1 instance and verify the math before scaling up.
- Visualize intermediate state: render velocity as color, render noise as grayscale.
- Check Transform Feedback buffer contents with `gl.getBufferSubData()` during development.
- For GPGPU, read back the simulation texture with `gl.readPixels()` and inspect values.
- If particles disappear, check for NaN (often caused by normalizing a zero vector).
- If instanced draws show nothing, verify `vertexAttribDivisor` is set correctly — forgetting it is the #1 instancing bug.