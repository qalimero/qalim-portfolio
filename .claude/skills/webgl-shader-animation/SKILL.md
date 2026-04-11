---
name: webgl-shader-animation
description: >
  Comprehensive reference for GPU-accelerated animation, physics simulation, and creative coding
  in WebGL2 with GLSL. Use when working with particle systems in shaders, GPGPU techniques,
  transform feedback, flow fields, flocking/boids, spring physics, noise-driven motion, cellular
  automata, reaction-diffusion, fractals, trail effects, morphing, distortion, feedback loops,
  instanced drawing for particles, data textures, render-to-texture pipelines, or any task that
  combines Nature of Code algorithms with WebGL shader techniques. Also use when optimizing
  existing WebGL animations for performance or when translating CPU-based simulations to the GPU.
---

# WebGL Shader Animation Skill

Use this skill when the task involves:

- GPU-accelerated particle systems or physics simulations
- Transform feedback for stateful particle updates
- GPGPU ping-pong framebuffers for grid/field simulations
- Noise-driven procedural animation (Perlin, simplex, curl)
- Flocking, boids, steering behaviors in shaders
- Cellular automata or reaction-diffusion on the GPU
- Fractal rendering, L-systems, SDF raymarching
- Visual effects: trails, morphing, distortion, chromatic aberration, bloom, feedback loops
- Instanced drawing for large particle counts
- Data textures encoding simulation state as RGBA32F
- Spring physics, gravity, drag, friction in vertex shaders
- Flow fields, displacement mapping, procedural geometry
- Creative coding patterns combining math and GPU power

## Workflow

1. Classify the simulation domain (particles, fields, agents, grids, fractals).
2. Choose the GPU pipeline (transform feedback, GPGPU ping-pong, fragment-only, hybrid).
3. Build the minimal working shader — one particle, one force, one frame.
4. Validate state persistence across frames (buffer swap or FBO swap).
5. Scale particle/cell count and confirm performance.
6. Layer visual effects (trails, color, post-processing) only after simulation is correct.
7. Optimize with instancing, spatial partitioning, or LOD as needed.

## Read these sections as needed

- [GPU Pipeline Strategies](#gpu-pipeline-strategies)
- [Transform Feedback](#transform-feedback)
- [GPGPU Ping-Pong](#gpgpu-ping-pong-framebuffers)
- [Nature of Code on GPU](#nature-of-code-on-gpu)
- [Noise and Flow Fields](#noise-and-flow-fields)
- [Flocking and Steering Behaviors](#flocking-and-steering-behaviors)
- [Physics in Shaders](#physics-in-shaders)
- [Cellular Automata and Reaction-Diffusion](#cellular-automata-and-reaction-diffusion)
- [Fractals and SDF](#fractals-and-signed-distance-fields)
- [Visual Effects](#visual-effects)
- [Instanced Drawing](#instanced-drawing)
- [GLSL Utility Library](#glsl-utility-library)
- [Performance Guide](#performance-guide)
- [Debugging Motion Shaders](#debugging-motion-shaders)
- [File Architecture](#file-architecture)
- [Uniform Conventions](#uniform-conventions)

---

## GPU Pipeline Strategies

### When to use which pipeline

| Simulation Type | Best Pipeline | Why |
|---|---|---|
| Particles with position + velocity | Transform feedback | State lives in buffers, zero-copy update |
| Grid simulations (automata, fluids) | GPGPU ping-pong | Neighbor sampling needs texture reads |
| Flow fields driving particles | Hybrid | Field computed in FBO, particles read via texture |
| Fragment-only effects (fractals, SDF) | Fragment shader | No state, pure math per pixel |
| Boids / steering (< 5K agents) | Transform feedback | Each agent is a vertex |
| Boids / steering (> 5K agents) | GPGPU ping-pong | Neighbor queries need texture sampling |

### Pipeline diagrams

```
Transform Feedback:
  [Buffer A: pos+vel] → Vertex Shader (update) → [Buffer B: pos+vel] → swap A↔B
                                                ↘ Render Shader → Screen

GPGPU Ping-Pong:
  [Texture A: state] → Fullscreen Quad → Fragment Shader (compute) → [FBO → Texture B] → swap A↔B
                                                                    ↘ Render pass → Screen

Hybrid:
  [Texture: field] → Fragment compute → [FBO: updated field]
                                        ↓ (sampled by)
  [Buffer: particles] → Vertex update (reads field texture) → [Transform Feedback] → Render → Screen
```

---

## Transform Feedback

Transform feedback captures vertex shader outputs into buffers without rasterization. This is the most efficient way to do stateful particle simulations in WebGL2.

### Setup pattern (JavaScript)

```javascript
// 1. Create two sets of buffers (ping-pong)
const buffers = [createParticleBuffers(gl, count), createParticleBuffers(gl, count)];

// 2. Create update program with transform feedback varyings
const updateProgram = gl.createProgram();
gl.attachShader(updateProgram, updateVertexShader);
gl.attachShader(updateProgram, updateFragmentShader); // minimal, can be empty
gl.transformFeedbackVaryings(
  updateProgram,
  ['v_position', 'v_velocity', 'v_age'],
  gl.SEPARATE_ATTRIBS // or gl.INTERLEAVED_ATTRIBS
);
gl.linkProgram(updateProgram);

// 3. Create transform feedback object
const tf = gl.createTransformFeedback();

// 4. In the render loop — update pass
gl.useProgram(updateProgram);
gl.bindVertexArray(vaos[currentIndex]);
gl.enable(gl.RASTERIZER_DISCARD); // skip fragment stage during update

gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, buffers[1 - currentIndex].position);
gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 1, buffers[1 - currentIndex].velocity);
gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 2, buffers[1 - currentIndex].age);

gl.beginTransformFeedback(gl.POINTS);
gl.drawArrays(gl.POINTS, 0, count);
gl.endTransformFeedback();

gl.disable(gl.RASTERIZER_DISCARD);
gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

// 5. Render pass — draw the updated particles
gl.useProgram(renderProgram);
gl.bindVertexArray(renderVaos[1 - currentIndex]);
gl.drawArrays(gl.POINTS, 0, count);

// 6. Swap
currentIndex = 1 - currentIndex;
```

### Update vertex shader (GLSL)

```glsl
#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_velocity;
in float a_age;

uniform float u_dt;
uniform float u_time;
uniform vec2 u_mouse;
uniform vec2 u_gravity;
uniform float u_drag;
uniform float u_maxAge;

out vec2 v_position;
out vec2 v_velocity;
out float v_age;

// Include noise function here or via shared snippet

void main() {
  float newAge = a_age + u_dt;

  // Respawn dead particles
  if (newAge > u_maxAge) {
    v_position = u_mouse + vec2(
      fract(sin(float(gl_VertexID) * 12.9898 + u_time) * 43758.5453) - 0.5,
      fract(sin(float(gl_VertexID) * 78.233 + u_time) * 23421.631) - 0.5
    ) * 0.1;
    v_velocity = vec2(0.0);
    v_age = 0.0;
    return;
  }

  // Accumulate forces
  vec2 acceleration = u_gravity;

  // Mouse attraction
  vec2 toMouse = u_mouse - a_position;
  float dist = length(toMouse);
  if (dist > 0.001) {
    acceleration += normalize(toMouse) * 0.5 / (dist + 0.1);
  }

  // Integrate
  vec2 newVel = (a_velocity + acceleration * u_dt) * u_drag;
  vec2 newPos = a_position + newVel * u_dt;

  // Boundary wrapping
  newPos = mod(newPos + 1.0, 2.0) - 1.0;

  v_position = newPos;
  v_velocity = newVel;
  v_age = newAge;
}
```

### Render vertex shader

```glsl
#version 300 es
precision highp float;

in vec2 a_position;
in vec2 a_velocity;
in float a_age;

uniform float u_maxAge;
uniform float u_aspect;

out float v_life;   // 0.0 = born, 1.0 = dying
out float v_speed;

void main() {
  v_life = a_age / u_maxAge;
  v_speed = length(a_velocity);
  gl_Position = vec4(a_position.x, a_position.y * u_aspect, 0.0, 1.0);
  gl_PointSize = mix(4.0, 1.0, v_life); // shrink as they age
}
```

### Render fragment shader

```glsl
#version 300 es
precision highp float;

in float v_life;
in float v_speed;

out vec4 fragColor;

vec3 palette(float t) {
  // Inigo Quilez cosine palette
  vec3 a = vec3(0.5, 0.5, 0.5);
  vec3 b = vec3(0.5, 0.5, 0.5);
  vec3 c = vec3(1.0, 1.0, 1.0);
  vec3 d = vec3(0.00, 0.33, 0.67);
  return a + b * cos(6.28318 * (c * t + d));
}

void main() {
  // Circular point sprite
  vec2 coord = gl_PointCoord * 2.0 - 1.0;
  float r = dot(coord, coord);
  if (r > 1.0) discard;

  float alpha = (1.0 - v_life) * (1.0 - r);
  vec3 color = palette(v_speed * 2.0 + v_life * 0.5);
  fragColor = vec4(color, alpha);
}
```

---

## GPGPU Ping-Pong Framebuffers

For simulations where each cell/agent needs to sample neighbors (grids, flocking at scale, fluid dynamics), encode state in floating-point textures and compute updates in a fragment shader.

### Requirements

```javascript
// WebGL2 must support rendering to float textures
const ext = gl.getExtension('EXT_color_buffer_float');
if (!ext) {
  console.error('EXT_color_buffer_float not supported — GPGPU unavailable');
}
```

### FBO setup

```javascript
function createSimulationFBO(gl, width, height, initialData) {
  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D, 0, gl.RGBA32F,
    width, height, 0,
    gl.RGBA, gl.FLOAT,
    initialData // Float32Array or null
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);

  const fbo = gl.createFramebuffer();
  gl.bindFramebuffer(gl.FRAMEBUFFER, fbo);
  gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, texture, 0);

  const status = gl.checkFramebufferStatus(gl.FRAMEBUFFER);
  if (status !== gl.FRAMEBUFFER_COMPLETE) {
    console.error('Framebuffer incomplete:', status);
  }

  gl.bindFramebuffer(gl.FRAMEBUFFER, null);
  return { texture, fbo };
}

// Create ping-pong pair
const simWidth = Math.ceil(Math.sqrt(particleCount));
const simHeight = simWidth;
const stateA = createSimulationFBO(gl, simWidth, simHeight, initialStateData);
const stateB = createSimulationFBO(gl, simWidth, simHeight, null);
let current = stateA;
let next = stateB;
```

### Compute pass

```javascript
// Bind output FBO
gl.bindFramebuffer(gl.FRAMEBUFFER, next.fbo);
gl.viewport(0, 0, simWidth, simHeight);

// Use compute shader program
gl.useProgram(computeProgram);

// Bind input state texture
gl.activeTexture(gl.TEXTURE0);
gl.bindTexture(gl.TEXTURE_2D, current.texture);
gl.uniform1i(u_stateTex, 0);

// Upload uniforms
gl.uniform1f(u_dt, deltaTime);
gl.uniform1f(u_time, elapsedTime);
gl.uniform2f(u_resolution, simWidth, simHeight);

// Draw fullscreen quad to run fragment shader on every texel
gl.bindVertexArray(fullscreenQuadVAO);
gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

// Swap
[current, next] = [next, current];

// Restore default framebuffer for rendering
gl.bindFramebuffer(gl.FRAMEBUFFER, null);
gl.viewport(0, 0, canvas.width, canvas.height);
```

### Encoding conventions for data textures

| Channel | Common Usage (Position Texture) | Common Usage (Velocity Texture) |
|---|---|---|
| R | position.x | velocity.x |
| G | position.y | velocity.y |
| B | position.z (or age) | velocity.z (or angular velocity) |
| A | mass (or life) | flags (or phase) |

For 2D simulations, a single RGBA32F texture can hold both position (RG) and velocity (BA):

```glsl
vec4 state = texture(u_stateTex, v_uv);
vec2 pos = state.rg;
vec2 vel = state.ba;
// ... compute ...
fragColor = vec4(newPos, newVel);
```

### Index-to-UV helper

```glsl
vec2 indexToUV(int index, float texSize) {
  float y = floor(float(index) / texSize);
  float x = float(index) - y * texSize;
  return (vec2(x, y) + 0.5) / texSize;
}
```

---

## Nature of Code on GPU

### Vectors and forces

The fundamental Nature of Code loop — accumulate forces, update velocity, update position — maps directly to a vertex shader with transform feedback or a GPGPU fragment shader.

**Force accumulation pattern:**

```glsl
vec2 acceleration = vec2(0.0);

// Gravity
acceleration += vec2(0.0, -9.81) * u_gravityScale;

// Wind (time-varying)
acceleration += vec2(sin(u_time * 0.7) * 0.5, 0.0);

// Mouse attraction/repulsion
vec2 toMouse = u_mouse - pos;
float d = length(toMouse);
float strength = u_mouseForce / (d * d + 0.01);
acceleration += normalize(toMouse) * strength;

// Drag (velocity-dependent)
acceleration -= vel * u_drag;

// Integration (semi-implicit Euler)
vel += acceleration * u_dt;
pos += vel * u_dt;
```

### Verlet integration (more stable for constraints)

```glsl
// State: current position + previous position (no explicit velocity)
vec2 velocity = a_position - a_prevPosition;
vec2 acceleration = computeForces(a_position);
vec2 newPos = a_position + velocity * u_damping + acceleration * u_dt * u_dt;
v_prevPosition = a_position;
v_position = newPos;
```

### Mass and per-particle properties

Encode mass as an attribute or in a data texture channel:

```glsl
// F = ma → a = F / m
vec2 acceleration = totalForce / a_mass;
```

---

## Noise and Flow Fields

### Simplex noise in GLSL

A minimal 2D simplex noise (Ashima Arts / Ian McEwan):

```glsl
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec2 mod289(vec2 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec3 permute(vec3 x) { return mod289(((x * 34.0) + 1.0) * x); }

float snoise(vec2 v) {
  const vec4 C = vec4(
    0.211324865405187,   // (3.0 - sqrt(3.0)) / 6.0
    0.366025403784439,   // 0.5 * (sqrt(3.0) - 1.0)
   -0.577350269189626,   // -1.0 + 2.0 * C.x
    0.024390243902439    // 1.0 / 41.0
  );
  vec2 i = floor(v + dot(v, C.yy));
  vec2 x0 = v - i + dot(i, C.xx);
  vec2 i1 = (x0.x > x0.y) ? vec2(1.0, 0.0) : vec2(0.0, 1.0);
  vec4 x12 = x0.xyxy + C.xxzz;
  x12.xy -= i1;
  i = mod289(i);
  vec3 p = permute(permute(i.y + vec3(0.0, i1.y, 1.0)) + i.x + vec3(0.0, i1.x, 1.0));
  vec3 m = max(0.5 - vec3(dot(x0, x0), dot(x12.xy, x12.xy), dot(x12.zw, x12.zw)), 0.0);
  m = m * m;
  m = m * m;
  vec3 x = 2.0 * fract(p * C.www) - 1.0;
  vec3 h = abs(x) - 0.5;
  vec3 ox = floor(x + 0.5);
  vec3 a0 = x - ox;
  m *= 1.79284291400159 - 0.85373472095314 * (a0 * a0 + h * h);
  vec3 g;
  g.x = a0.x * x0.x + h.x * x0.y;
  g.yz = a0.yz * x12.xz + h.yz * x12.yw;
  return 130.0 * dot(m, g);
}
```

### 3D simplex noise

For time-varying 2D fields, use 3D noise with time as the third dimension. The full implementation is longer — prefer a precomputed 3D noise texture sampled with trilinear filtering when performance matters.

### Flow field from noise

```glsl
vec2 flowField(vec2 pos, float time) {
  float angle = snoise(vec3(pos * u_noiseScale, time * u_noiseSpeed)) * 3.14159265 * 2.0;
  return vec2(cos(angle), sin(angle)) * u_flowStrength;
}
```

### Curl noise (divergence-free — no sources or sinks)

```glsl
vec2 curlNoise(vec2 pos, float time) {
  float eps = 0.001;
  float n1 = snoise(vec3(pos.x, pos.y + eps, time));
  float n2 = snoise(vec3(pos.x, pos.y - eps, time));
  float n3 = snoise(vec3(pos.x + eps, pos.y, time));
  float n4 = snoise(vec3(pos.x - eps, pos.y, time));
  float dx = (n1 - n2) / (2.0 * eps);
  float dy = (n3 - n4) / (2.0 * eps);
  return vec2(dx, -dy); // curl of a 2D scalar field
}
```

### Fractal Brownian Motion (fBm)

```glsl
float fbm(vec2 pos, int octaves) {
  float value = 0.0;
  float amplitude = 0.5;
  float frequency = 1.0;
  for (int i = 0; i < octaves; i++) {
    value += amplitude * snoise(pos * frequency);
    frequency *= 2.0;
    amplitude *= 0.5;
  }
  return value;
}
```

### Domain warping

```glsl
float warpedNoise(vec2 pos, float time) {
  vec2 q = vec2(
    fbm(pos + vec2(0.0, 0.0), 4),
    fbm(pos + vec2(5.2, 1.3), 4)
  );
  vec2 r = vec2(
    fbm(pos + 4.0 * q + vec2(1.7, 9.2) + 0.15 * time, 4),
    fbm(pos + 4.0 * q + vec2(8.3, 2.8) + 0.126 * time, 4)
  );
  return fbm(pos + 4.0 * r, 4);
}
```

### Texture-based noise (faster for complex noise)

Precompute a noise texture on the CPU and sample it:

```javascript
function generateNoiseTexture(gl, size) {
  const data = new Float32Array(size * size * 4);
  for (let i = 0; i < size * size; i++) {
    data[i * 4 + 0] = Math.random() * 2.0 - 1.0;
    data[i * 4 + 1] = Math.random() * 2.0 - 1.0;
    data[i * 4 + 2] = Math.random() * 2.0 - 1.0;
    data[i * 4 + 3] = Math.random() * 2.0 - 1.0;
  }
  const tex = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, tex);
  gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, size, size, 0, gl.RGBA, gl.FLOAT, data);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
  return tex;
}
```

---

## Flocking and Steering Behaviors

### The three rules (Reynolds boids)

1. **Separation** — steer away from nearby neighbors
2. **Alignment** — steer toward the average heading of nearby neighbors
3. **Cohesion** — steer toward the average position of nearby neighbors

### GPGPU boids fragment shader

Each texel represents one agent. Position and velocity stored in separate textures.

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_positionTex;
uniform sampler2D u_velocityTex;
uniform float u_texSize;
uniform int u_agentCount;
uniform float u_dt;
uniform float u_maxSpeed;
uniform float u_maxForce;
uniform float u_perceptionRadius;
uniform float u_separationRadius;
uniform float u_sepWeight;
uniform float u_aliWeight;
uniform float u_cohWeight;
uniform vec2 u_mouse;
uniform float u_mouseForce;

in vec2 v_uv;
out vec4 fragColor;

vec2 indexToUV(int index) {
  float y = floor(float(index) / u_texSize);
  float x = float(index) - y * u_texSize;
  return (vec2(x, y) + 0.5) / u_texSize;
}

vec2 limit(vec2 v, float maxLen) {
  float len = length(v);
  return (len > maxLen) ? v * (maxLen / len) : v;
}

// Output: steering force to write to force texture
// Caller must integrate force into velocity in a second pass or combined pass
void main() {
  vec2 myPos = texture(u_positionTex, v_uv).xy;
  vec2 myVel = texture(u_velocityTex, v_uv).xy;

  vec2 separation = vec2(0.0);
  vec2 alignment = vec2(0.0);
  vec2 cohesion = vec2(0.0);
  float sepCount = 0.0;
  float flockCount = 0.0;

  for (int i = 0; i < u_agentCount; i++) {
    vec2 uv = indexToUV(i);
    vec2 otherPos = texture(u_positionTex, uv).xy;
    float d = distance(myPos, otherPos);

    if (d < 0.0001) continue; // self

    if (d < u_separationRadius) {
      separation += (myPos - otherPos) / max(d, 0.001);
      sepCount += 1.0;
    }
    if (d < u_perceptionRadius) {
      vec2 otherVel = texture(u_velocityTex, uv).xy;
      alignment += otherVel;
      cohesion += otherPos;
      flockCount += 1.0;
    }
  }

  vec2 steer = vec2(0.0);

  if (sepCount > 0.0) {
    separation = separation / sepCount;
    separation = normalize(separation) * u_maxSpeed - myVel;
    separation = limit(separation, u_maxForce);
    steer += separation * u_sepWeight;
  }
  if (flockCount > 0.0) {
    alignment = alignment / flockCount;
    alignment = normalize(alignment) * u_maxSpeed - myVel;
    alignment = limit(alignment, u_maxForce);
    steer += alignment * u_aliWeight;

    cohesion = cohesion / flockCount;
    vec2 desired = normalize(cohesion - myPos) * u_maxSpeed;
    vec2 cohSteer = desired - myVel;
    cohSteer = limit(cohSteer, u_maxForce);
    steer += cohSteer * u_cohWeight;
  }

  // Optional: mouse attraction
  vec2 toMouse = u_mouse - myPos;
  float mouseDist = length(toMouse);
  if (mouseDist > 0.01) {
    steer += normalize(toMouse) * u_mouseForce;
  }

  fragColor = vec4(steer, 0.0, 1.0);
}
```

### Integration pass (separate fragment shader or combined)

```glsl
void main() {
  vec2 pos = texture(u_positionTex, v_uv).xy;
  vec2 vel = texture(u_velocityTex, v_uv).xy;
  vec2 force = texture(u_forceTex, v_uv).xy;

  vel = limit(vel + force * u_dt, u_maxSpeed);
  pos += vel * u_dt;

  // Wrap boundaries
  pos = mod(pos + 1.0, 2.0) - 1.0;

  fragColor = vec4(pos, vel);
}
```

### Additional steering behaviors

**Seek:**
```glsl
vec2 seek(vec2 pos, vec2 vel, vec2 target, float maxSpeed) {
  vec2 desired = normalize(target - pos) * maxSpeed;
  return desired - vel;
}
```

**Flee:**
```glsl
vec2 flee(vec2 pos, vec2 vel, vec2 threat, float maxSpeed) {
  return -(normalize(threat - pos) * maxSpeed - vel);
}
```

**Arrive (slow down near target):**
```glsl
vec2 arrive(vec2 pos, vec2 vel, vec2 target, float maxSpeed, float slowRadius) {
  vec2 desired = target - pos;
  float d = length(desired);
  float speed = (d < slowRadius) ? maxSpeed * (d / slowRadius) : maxSpeed;
  desired = normalize(desired) * speed;
  return desired - vel;
}
```

**Wander:**
```glsl
vec2 wander(vec2 vel, float wanderAngle, float wanderRadius, float wanderDist) {
  vec2 center = normalize(vel) * wanderDist;
  vec2 offset = vec2(cos(wanderAngle), sin(wanderAngle)) * wanderRadius;
  return center + offset;
}
```

**Obstacle avoidance (simple circle):**
```glsl
vec2 avoid(vec2 pos, vec2 vel, vec2 obstacle, float obstacleRadius, float lookAhead) {
  vec2 ahead = pos + normalize(vel) * lookAhead;
  vec2 avoidForce = ahead - obstacle;
  float d = length(avoidForce);
  if (d < obstacleRadius) {
    return normalize(avoidForce) * (obstacleRadius - d);
  }
  return vec2(0.0);
}
```

### Spatial hashing for large flocks

For > 5000 agents, O(n²) neighbor loops become too slow even on the GPU. Encode a spatial hash grid as a texture:

1. Sort agents into grid cells (can be done in a fragment shader pass)
2. Store cell start/end indices in a lookup texture
3. Each agent only samples agents from its cell and 8 neighbors

This is an advanced pattern — for most creative coding, 1K–5K boids with brute-force sampling runs fine at 60fps.

---

## Physics in Shaders

### Spring-damper system

```glsl
vec2 springForce(vec2 pos, vec2 vel, vec2 anchor, float stiffness, float damping, float restLength) {
  vec2 delta = pos - anchor;
  float dist = length(delta);
  float displacement = dist - restLength;
  vec2 dir = (dist > 0.001) ? delta / dist : vec2(0.0);
  return -stiffness * displacement * dir - damping * vel;
}
```

### Multiple springs (soft body mesh)

Each vertex connected to neighbors. Store neighbor indices in a data texture:

```glsl
vec2 totalForce = vec2(0.0);
for (int i = 0; i < u_neighborCount; i++) {
  int neighborIdx = int(texelFetch(u_neighborTex, ivec2(gl_VertexID, i), 0).r);
  vec2 neighborPos = texelFetch(u_positionTex, ivec2(neighborIdx % texWidth, neighborIdx / texWidth), 0).xy;
  totalForce += springForce(a_position, a_velocity, neighborPos, u_stiffness, u_damping, u_restLength);
}
totalForce += vec2(0.0, -u_gravity); // gravity
```

### Collision detection (simple)

**Circle-circle:**
```glsl
float d = distance(posA, posB);
float overlap = (radiusA + radiusB) - d;
if (overlap > 0.0) {
  vec2 normal = normalize(posA - posB);
  posA += normal * overlap * 0.5;
  posB -= normal * overlap * 0.5;
  // Elastic velocity exchange
  float relVel = dot(velA - velB, normal);
  velA -= relVel * normal * 0.5;
  velB += relVel * normal * 0.5;
}
```

**Point-in-circle boundary:**
```glsl
float d = length(pos - boundaryCenter);
if (d > boundaryRadius) {
  pos = boundaryCenter + normalize(pos - boundaryCenter) * boundaryRadius;
  vel = reflect(vel, normalize(pos - boundaryCenter)) * u_restitution;
}
```

### Gravity (n-body approximation)

For a small number of attractor points passed as uniforms:

```glsl
vec2 gravityForce = vec2(0.0);
for (int i = 0; i < u_attractorCount; i++) {
  vec2 delta = u_attractors[i] - a_position;
  float dist2 = dot(delta, delta) + u_softening; // softening prevents singularity
  gravityForce += u_attractorMass[i] * delta / (dist2 * sqrt(dist2));
}
```

---

## Cellular Automata and Reaction-Diffusion

### Framebuffer ping-pong for grid state

The core loop: read current state from texture A, compute next state in a fragment shader, write to FBO B, swap.

### Conway's Game of Life

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_stateTex;
uniform vec2 u_resolution;
in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 texel = 1.0 / u_resolution;
  float neighbors = 0.0;

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      if (x == 0 && y == 0) continue;
      neighbors += step(0.5, texture(u_stateTex, v_uv + vec2(x, y) * texel).r);
    }
  }

  float current = texture(u_stateTex, v_uv).r;
  float alive = step(0.5, current);

  // Conway's rules
  float next = 0.0;
  if (alive > 0.5) {
    next = (neighbors >= 2.0 && neighbors <= 3.0) ? 1.0 : 0.0;
  } else {
    next = (neighbors >= 2.5 && neighbors <= 3.5) ? 1.0 : 0.0; // exactly 3
  }

  fragColor = vec4(vec3(next), 1.0);
}
```

### Gray-Scott reaction-diffusion

```glsl
#version 300 es
precision highp float;

uniform sampler2D u_stateTex;
uniform vec2 u_resolution;
uniform float u_dA;      // diffusion rate A (~1.0)
uniform float u_dB;      // diffusion rate B (~0.5)
uniform float u_feed;    // feed rate (~0.055)
uniform float u_kill;    // kill rate (~0.062)
uniform float u_dt;

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec2 texel = 1.0 / u_resolution;
  vec2 state = texture(u_stateTex, v_uv).rg;
  float a = state.r;
  float b = state.g;

  // 9-point Laplacian stencil
  vec2 lap = -state;
  lap += texture(u_stateTex, v_uv + vec2( texel.x, 0.0)).rg * 0.2;
  lap += texture(u_stateTex, v_uv + vec2(-texel.x, 0.0)).rg * 0.2;
  lap += texture(u_stateTex, v_uv + vec2(0.0,  texel.y)).rg * 0.2;
  lap += texture(u_stateTex, v_uv + vec2(0.0, -texel.y)).rg * 0.2;
  lap += texture(u_stateTex, v_uv + vec2( texel.x,  texel.y)).rg * 0.05;
  lap += texture(u_stateTex, v_uv + vec2(-texel.x,  texel.y)).rg * 0.05;
  lap += texture(u_stateTex, v_uv + vec2( texel.x, -texel.y)).rg * 0.05;
  lap += texture(u_stateTex, v_uv + vec2(-texel.x, -texel.y)).rg * 0.05;

  float reaction = a * b * b;
  float newA = a + (u_dA * lap.r - reaction + u_feed * (1.0 - a)) * u_dt;
  float newB = b + (u_dB * lap.g + reaction - (u_kill + u_feed) * b) * u_dt;

  fragColor = vec4(clamp(newA, 0.0, 1.0), clamp(newB, 0.0, 1.0), 0.0, 1.0);
}
```

**Interesting parameter ranges for Gray-Scott:**

| Pattern | feed | kill |
|---|---|---|
| Mitosis (spots that divide) | 0.0367 | 0.0649 |
| Coral growth | 0.0545 | 0.062 |
| Moving spots | 0.014 | 0.054 |
| Worms | 0.078 | 0.061 |
| Fingerprints | 0.06 | 0.062 |
| Holes | 0.039 | 0.058 |

### Multiple simulation steps per frame

Run the compute pass several times before rendering to speed up simulation without increasing framerate:

```javascript
for (let i = 0; i < stepsPerFrame; i++) {
  runComputePass(current, next);
  [current, next] = [next, current];
}
renderToScreen(current);
```

---

## Fractals and Signed Distance Fields

### Mandelbrot / Julia set (fragment shader)

```glsl
#version 300 es
precision highp float;

uniform vec2 u_center;
uniform float u_zoom;
uniform float u_maxIter;
uniform bool u_julia;
uniform vec2 u_juliaC;

in vec2 v_uv;
out vec4 fragColor;

vec3 palette(float t) {
  return 0.5 + 0.5 * cos(6.28318 * (t * vec3(1.0) + vec3(0.0, 0.33, 0.67)));
}

void main() {
  vec2 c = (v_uv * 2.0 - 1.0) * u_zoom + u_center;
  vec2 z = u_julia ? c : vec2(0.0);
  if (u_julia) c = u_juliaC;

  float i;
  for (i = 0.0; i < u_maxIter; i += 1.0) {
    z = vec2(z.x * z.x - z.y * z.y, 2.0 * z.x * z.y) + c;
    if (dot(z, z) > 4.0) break;
  }

  if (i >= u_maxIter) {
    fragColor = vec4(0.0, 0.0, 0.0, 1.0);
  } else {
    // Smooth coloring
    float smoothI = i - log2(log2(dot(z, z))) + 4.0;
    float t = smoothI / u_maxIter;
    fragColor = vec4(palette(t), 1.0);
  }
}
```

### SDF raymarching (2D or 3D)

**2D SDF compositing in fragment shader:**

```glsl
float scene(vec2 p) {
  float d = 1e10;
  // Circle
  d = min(d, length(p - vec2(0.3, 0.0)) - 0.2);
  // Box
  d = smin(d, sdBox(p - vec2(-0.3, 0.0), vec2(0.15)), 0.05);
  return d;
}

void main() {
  vec2 uv = (v_uv * 2.0 - 1.0) * vec2(u_aspect, 1.0);
  float d = scene(uv);
  vec3 color = (d < 0.0) ? vec3(0.2, 0.5, 0.9) : vec3(0.95);
  color *= 1.0 - exp(-6.0 * abs(d)); // gradient at edges
  color *= 0.8 + 0.2 * cos(120.0 * d); // contour lines
  fragColor = vec4(color, 1.0);
}
```

### L-systems

L-systems are string-rewriting systems best computed on the CPU, with the resulting geometry rendered on the GPU:

1. CPU: expand the L-system string for N iterations
2. CPU: interpret the string as a turtle-graphics path → generate vertex positions
3. GPU: upload vertex buffer, render as `gl.LINES` or `gl.LINE_STRIP`
4. GPU: add noise displacement, growth animation via vertex shader

```javascript
function expandLSystem(axiom, rules, iterations) {
  let current = axiom;
  for (let i = 0; i < iterations; i++) {
    let next = '';
    for (const ch of current) {
      next += rules[ch] || ch;
    }
    current = next;
  }
  return current;
}

function interpretLSystem(str, angle, stepLength) {
  const positions = [];
  const stack = [];
  let x = 0, y = 0, dir = Math.PI / 2;
  positions.push(x, y);
  for (const ch of str) {
    switch (ch) {
      case 'F':
        x += Math.cos(dir) * stepLength;
        y += Math.sin(dir) * stepLength;
        positions.push(x, y);
        break;
      case '+': dir += angle; break;
      case '-': dir -= angle; break;
      case '[': stack.push({ x, y, dir }); break;
      case ']': ({ x, y, dir } = stack.pop()); positions.push(NaN, NaN, x, y); break;
    }
  }
  return new Float32Array(positions);
}
```

---

## Visual Effects

### Trail / persistence effect (feedback loop)

Two FBOs: one for the trail accumulator, one for the current frame's particles.

```glsl
// Trail composite fragment shader
#version 300 es
precision highp float;

uniform sampler2D u_trailTex;     // previous trail
uniform sampler2D u_particleTex;  // this frame's particles
uniform float u_decay;            // 0.95 = long trails, 0.8 = short trails

in vec2 v_uv;
out vec4 fragColor;

void main() {
  vec4 trail = texture(u_trailTex, v_uv) * u_decay;
  vec4 particles = texture(u_particleTex, v_uv);
  fragColor = max(trail, particles); // screen-like blend
}
```

### Bloom (post-process)

1. Render scene to FBO
2. Extract bright pixels (threshold)
3. Blur bright pixels (Gaussian, multi-pass for performance)
4. Composite blurred brightness back onto original

**Threshold pass:**
```glsl
void main() {
  vec4 color = texture(u_scene, v_uv);
  float brightness = dot(color.rgb, vec3(0.2126, 0.7152, 0.0722));
  fragColor = (brightness > u_threshold) ? color : vec4(0.0);
}
```

**Separable Gaussian blur (horizontal pass — repeat for vertical):**
```glsl
void main() {
  vec2 texel = vec2(1.0 / u_resolution.x, 0.0); // horizontal
  vec4 result = texture(u_input, v_uv) * 0.227027;
  result += texture(u_input, v_uv + texel * 1.0) * 0.1945946;
  result += texture(u_input, v_uv - texel * 1.0) * 0.1945946;
  result += texture(u_input, v_uv + texel * 2.0) * 0.1216216;
  result += texture(u_input, v_uv - texel * 2.0) * 0.1216216;
  result += texture(u_input, v_uv + texel * 3.0) * 0.0540540;
  result += texture(u_input, v_uv - texel * 3.0) * 0.0540540;
  result += texture(u_input, v_uv + texel * 4.0) * 0.0162162;
  result += texture(u_input, v_uv - texel * 4.0) * 0.0162162;
  fragColor = result;
}
```

### Chromatic aberration

```glsl
void main() {
  vec2 dir = v_uv - 0.5;
  fragColor.r = texture(u_scene, v_uv + dir * u_aberration).r;
  fragColor.g = texture(u_scene, v_uv).g;
  fragColor.b = texture(u_scene, v_uv - dir * u_aberration).b;
  fragColor.a = 1.0;
}
```

### Vignette

```glsl
float vignette(vec2 uv, float intensity, float smoothness) {
  vec2 d = uv - 0.5;
  float dist = dot(d, d);
  return smoothstep(intensity, intensity - smoothness, dist);
}
```

### Morphing between point clouds

Encode two shapes as textures (each texel = one point's target position). Interpolate in vertex shader:

```glsl
vec3 posA = texelFetch(u_shapeA, ivec2(a_index % u_texWidth, a_index / u_texWidth), 0).xyz;
vec3 posB = texelFetch(u_shapeB, ivec2(a_index % u_texWidth, a_index / u_texWidth), 0).xyz;
float t = smoothstep(0.0, 1.0, u_morphProgress);
vec3 pos = mix(posA, posB, t);
// Add organic noise during transition
pos += snoise3(pos * 3.0 + u_time) * 0.03 * sin(t * 3.14159);
gl_Position = u_mvp * vec4(pos, 1.0);
```

### Displacement mapping

```glsl
// Vertex shader
float height = texture(u_displacementMap, a_uv).r;
vec3 displaced = a_position + a_normal * height * u_scale;
gl_Position = u_mvp * vec4(displaced, 1.0);
```

### Screen-space distortion

```glsl
void main() {
  vec2 uv = v_uv;
  // Ripple from mouse
  vec2 delta = uv - u_mouse;
  float dist = length(delta);
  float wave = sin(dist * u_frequency - u_time * u_speed) * u_amplitude;
  wave *= smoothstep(u_radius, 0.0, dist); // fade with distance
  uv += normalize(delta) * wave;
  fragColor = texture(u_scene, uv);
}
```

### Film grain

```glsl
float grain(vec2 uv, float time) {
  return fract(sin(dot(uv, vec2(12.9898, 78.233)) + time) * 43758.5453) * 2.0 - 1.0;
}

void main() {
  vec4 color = texture(u_scene, v_uv);
  color.rgb += grain(v_uv * u_resolution, u_time) * u_grainIntensity;
  fragColor = color;
}
```

---

## Instanced Drawing

For rendering many identical shapes (particle quads, sprites, meshes), instanced drawing is far more efficient than individual draw calls.

### Setup

```javascript
// Geometry buffer (shared quad — drawn once per instance)
const quadVerts = new Float32Array([
  -1, -1,  1, -1,  -1, 1,  1, 1
]);
const quadBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

// Instance data buffer (per-particle: position, color, size, rotation)
const instanceBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
gl.bufferData(gl.ARRAY_BUFFER, instanceData, gl.DYNAMIC_DRAW);

// VAO setup
const vao = gl.createVertexArray();
gl.bindVertexArray(vao);

// Quad vertices (per-vertex, divisor = 0)
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuffer);
gl.enableVertexAttribArray(a_quadPos);
gl.vertexAttribPointer(a_quadPos, 2, gl.FLOAT, false, 0, 0);

// Instance position (per-instance, divisor = 1)
gl.bindBuffer(gl.ARRAY_BUFFER, instanceBuffer);
gl.enableVertexAttribArray(a_instancePos);
gl.vertexAttribPointer(a_instancePos, 2, gl.FLOAT, false, stride, offsetPos);
gl.vertexAttribDivisor(a_instancePos, 1);

// Instance color (per-instance, divisor = 1)
gl.enableVertexAttribArray(a_instanceColor);
gl.vertexAttribPointer(a_instanceColor, 4, gl.FLOAT, false, stride, offsetColor);
gl.vertexAttribDivisor(a_instanceColor, 1);

// Instance size (per-instance, divisor = 1)
gl.enableVertexAttribArray(a_instanceSize);
gl.vertexAttribPointer(a_instanceSize, 1, gl.FLOAT, false, stride, offsetSize);
gl.vertexAttribDivisor(a_instanceSize, 1);

gl.bindVertexArray(null);
```

### Draw call

```javascript
gl.bindVertexArray(vao);
gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, particleCount);
```

### Instance vertex shader

```glsl
#version 300 es
in vec2 a_quadPos;       // per-vertex
in vec2 a_instancePos;   // per-instance
in vec4 a_instanceColor; // per-instance
in float a_instanceSize; // per-instance

uniform float u_aspect;

out vec4 v_color;

void main() {
  vec2 pos = a_quadPos * a_instanceSize * 0.01 + a_instancePos;
  pos.x /= u_aspect;
  gl_Position = vec4(pos, 0.0, 1.0);
  v_color = a_instanceColor;
}
```

### Combining instancing with transform feedback

Update particle state via transform feedback, then render using instanced drawing with the updated buffers. This gives you GPU-only simulation AND efficient multi-vertex-per-particle rendering.

---

## GLSL Utility Library

### Rotation

```glsl
mat2 rotate2D(float angle) {
  float s = sin(angle), c = cos(angle);
  return mat2(c, -s, s, c);
}

mat3 rotateX(float angle) {
  float s = sin(angle), c = cos(angle);
  return mat3(1,0,0, 0,c,-s, 0,s,c);
}

mat3 rotateY(float angle) {
  float s = sin(angle), c = cos(angle);
  return mat3(c,0,s, 0,1,0, -s,0,c);
}

mat3 rotateZ(float angle) {
  float s = sin(angle), c = cos(angle);
  return mat3(c,-s,0, s,c,0, 0,0,1);
}
```

### SDF primitives

```glsl
float sdCircle(vec2 p, float r) {
  return length(p) - r;
}

float sdBox(vec2 p, vec2 b) {
  vec2 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0);
}

float sdRoundedBox(vec2 p, vec2 b, float r) {
  vec2 d = abs(p) - b + r;
  return length(max(d, 0.0)) + min(max(d.x, d.y), 0.0) - r;
}

float sdSegment(vec2 p, vec2 a, vec2 b) {
  vec2 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h);
}

float sdRing(vec2 p, float r, float thickness) {
  return abs(length(p) - r) - thickness;
}

// 3D
float sdSphere(vec3 p, float r) {
  return length(p) - r;
}

float sdBox3(vec3 p, vec3 b) {
  vec3 d = abs(p) - b;
  return length(max(d, 0.0)) + min(max(d.x, max(d.y, d.z)), 0.0);
}

float sdTorus(vec3 p, vec2 t) {
  vec2 q = vec2(length(p.xz) - t.x, p.y);
  return length(q) - t.y;
}
```

### SDF operations

```glsl
float opUnion(float d1, float d2) { return min(d1, d2); }
float opSubtract(float d1, float d2) { return max(-d1, d2); }
float opIntersect(float d1, float d2) { return max(d1, d2); }

// Smooth blending (Inigo Quilez)
float smin(float a, float b, float k) {
  float h = clamp(0.5 + 0.5 * (b - a) / k, 0.0, 1.0);
  return mix(b, a, h) - k * h * (1.0 - h);
}

float smax(float a, float b, float k) {
  return -smin(-a, -b, k);
}
```

### Color utilities

```glsl
// Inigo Quilez cosine palettes — vary a, b, c, d for different palettes
vec3 cosinePalette(float t, vec3 a, vec3 b, vec3 c, vec3 d) {
  return a + b * cos(6.28318 * (c * t + d));
}

// Common beautiful palettes (just pass t):
vec3 paletteSunset(float t) {
  return cosinePalette(t, vec3(0.5), vec3(0.5), vec3(1.0), vec3(0.0, 0.33, 0.67));
}
vec3 paletteRainbow(float t) {
  return cosinePalette(t, vec3(0.5), vec3(0.5), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.1, 0.2));
}
vec3 paletteOcean(float t) {
  return cosinePalette(t, vec3(0.5, 0.5, 0.5), vec3(0.5, 0.5, 0.3), vec3(1.0, 1.0, 1.0), vec3(0.0, 0.1, 0.3));
}
vec3 paletteFire(float t) {
  return cosinePalette(t, vec3(0.5, 0.2, 0.1), vec3(0.5, 0.3, 0.2), vec3(1.0, 1.0, 0.5), vec3(0.0, 0.15, 0.2));
}

// HSV to RGB
vec3 hsv2rgb(vec3 c) {
  vec3 p = abs(fract(c.xxx + vec3(0.0, 2.0/3.0, 1.0/3.0)) * 6.0 - 3.0);
  return c.z * mix(vec3(1.0), clamp(p - 1.0, 0.0, 1.0), c.y);
}

// Gamma correction
vec3 gammaCorrect(vec3 color, float gamma) {
  return pow(color, vec3(1.0 / gamma));
}
```

### Easing functions in GLSL

```glsl
float easeInQuad(float t) { return t * t; }
float easeOutQuad(float t) { return t * (2.0 - t); }
float easeInOutQuad(float t) { return t < 0.5 ? 2.0*t*t : -1.0+(4.0-2.0*t)*t; }
float easeInCubic(float t) { return t * t * t; }
float easeOutCubic(float t) { float m = t - 1.0; return m*m*m + 1.0; }
float easeInOutCubic(float t) { return t < 0.5 ? 4.0*t*t*t : (t-1.0)*(2.0*t-2.0)*(2.0*t-2.0)+1.0; }
float easeOutElastic(float t) {
  return sin(-13.0 * (t + 1.0) * 3.14159 / 2.0) * pow(2.0, -10.0 * t) + 1.0;
}
float easeOutBounce(float t) {
  if (t < 1.0/2.75) return 7.5625*t*t;
  else if (t < 2.0/2.75) { t -= 1.5/2.75; return 7.5625*t*t + 0.75; }
  else if (t < 2.5/2.75) { t -= 2.25/2.75; return 7.5625*t*t + 0.9375; }
  else { t -= 2.625/2.75; return 7.5625*t*t + 0.984375; }
}
```

### Bezier curves

```glsl
// Quadratic bezier
vec2 quadraticBezier(vec2 p0, vec2 p1, vec2 p2, float t) {
  float mt = 1.0 - t;
  return mt * mt * p0 + 2.0 * mt * t * p1 + t * t * p2;
}

// Cubic bezier
vec2 cubicBezier(vec2 p0, vec2 p1, vec2 p2, vec2 p3, float t) {
  float mt = 1.0 - t;
  float mt2 = mt * mt;
  float t2 = t * t;
  return mt2 * mt * p0 + 3.0 * mt2 * t * p1 + 3.0 * mt * t2 * p2 + t2 * t * p3;
}
```

### Remapping

```glsl
float remap(float value, float inMin, float inMax, float outMin, float outMax) {
  return outMin + (value - inMin) * (outMax - outMin) / (inMax - inMin);
}

float saturate(float x) { return clamp(x, 0.0, 1.0); }
```

### Hash functions (cheap pseudo-random)

```glsl
float hash11(float p) {
  p = fract(p * 0.1031);
  p *= p + 33.33;
  p *= p + p;
  return fract(p);
}

float hash21(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * 0.1031);
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.x + p3.y) * p3.z);
}

vec2 hash22(vec2 p) {
  vec3 p3 = fract(vec3(p.xyx) * vec3(0.1031, 0.1030, 0.0973));
  p3 += dot(p3, p3.yzx + 33.33);
  return fract((p3.xx + p3.yz) * p3.zy);
}
```

---

## Performance Guide

### Particle count targets

| Count | Strategy | Notes |
|---|---|---|
| < 1K | CPU arrays + `gl.drawArrays` | Simple, no special architecture needed |
| 1K–10K | `gl.POINTS` or instanced quads | Single draw call, attributes for per-particle data |
| 10K–100K | Transform feedback | GPU-only state, zero CPU readback |
| 100K–1M | GPGPU data textures + instanced render | Fragment shader compute, float textures |
| 1M+ | GPGPU + LOD + spatial culling + viewport clipping | Reduce fragment overdraw, cull off-screen |

### Optimization checklist

1. **Minimize draw calls** — batch everything, use instancing
2. **No per-frame allocations** — create all buffers/textures at init time
3. **No CPU readback** — avoid `gl.readPixels` in the render loop
4. **Use `gl.RASTERIZER_DISCARD`** during transform feedback update pass
5. **Use VAOs** — one bind instead of many attribute setup calls
6. **Separate update from render** — different shader programs for simulation vs display
7. **Profile the bottleneck** — is it vertex-bound (too many particles) or fragment-bound (too much overdraw)?
8. **Reduce overdraw** — smaller point sizes, discard transparent fragments early
9. **Use `NEAREST` filtering** on data textures — `LINEAR` adds interpolation cost for no visual benefit
10. **Batch uniform uploads** — prefer UBOs (Uniform Buffer Objects) for shared uniforms in WebGL2

### Fragment shader cost awareness

Expensive operations to minimize in hot fragment shaders:
- `texture()` calls (especially with dependent UVs)
- `pow()`, `exp()`, `log()`
- Loops with variable iteration counts
- Branching on per-pixel data (coherence matters)

Cheap operations:
- `mix()`, `clamp()`, `smoothstep()`, `step()`
- `dot()`, `cross()`, `normalize()`
- `fract()`, `floor()`, `abs()`
- Swizzling (free)

### WebGL2 features to leverage

| Feature | Benefit |
|---|---|
| Transform feedback | GPU-only particle state, no readback |
| Instanced drawing | One draw call for millions of shapes |
| VAOs (native) | Reduced attribute setup overhead |
| Multiple Render Targets | Write position + velocity + color in one pass |
| `RGBA32F` textures | Full float precision for GPGPU |
| 3D textures | Volumetric noise, 3D flow fields |
| Integer textures | Exact cell indices for spatial hashing |
| Uniform Buffer Objects | Shared uniforms across programs |
| `texelFetch` | Integer-indexed texture reads (no filtering overhead) |

---

## Debugging Motion Shaders

### When nothing moves

1. Confirm `u_dt` is nonzero and reasonable (0.016 at 60fps)
2. Confirm transform feedback buffers are swapping (not reading from same buffer being written)
3. Confirm `gl.RASTERIZER_DISCARD` is disabled before the render pass
4. Confirm output varyings match `transformFeedbackVaryings` declaration order
5. Set one particle's acceleration to a huge constant — does it explode?

### When everything explodes

1. Check for NaN — add `if (isnan(pos.x)) pos = vec2(0.0);` guards
2. Check `normalize()` of zero-length vectors — add epsilon: `normalize(v + 0.0001)`
3. Check division by zero in force calculations — add softening `1.0 / (d * d + 0.01)`
4. Clamp velocities: `vel = limit(vel, maxSpeed);`
5. Ensure `u_dt` is capped: `float dt = min(u_dt, 0.05);` (prevents spiral on tab-switch)

### When GPGPU textures are blank

1. Verify `EXT_color_buffer_float` extension is available
2. Verify framebuffer completeness: `gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE`
3. Verify texture format is `gl.RGBA32F` with `gl.FLOAT` type
4. Verify `gl.NEAREST` filtering on data textures (not `gl.LINEAR`)
5. Verify viewport matches texture dimensions during compute pass
6. Render the data texture directly to screen to visualize contents

### Visualize simulation state as color

```glsl
// Debug: show velocity as color
fragColor = vec4(vel * 0.5 + 0.5, 0.0, 1.0);

// Debug: show force magnitude as heat
float mag = length(force);
fragColor = vec4(mag, 0.0, 1.0 - mag, 1.0);

// Debug: show age as gradient
fragColor = vec4(vec3(age / maxAge), 1.0);

// Debug: show NaN as red
if (isnan(pos.x) || isnan(pos.y)) fragColor = vec4(1.0, 0.0, 0.0, 1.0);
```

---

## File Architecture

Follow the established repository pattern. For motion/simulation effects, extend the base structure:

```
lib/webgl/
├── shaders/
│   └── <effect>/
│       ├── update-vertex.glsl       ← transform feedback simulation
│       ├── update-fragment.glsl     ← minimal (or GPGPU compute)
│       ├── render-vertex.glsl       ← visual output positions
│       ├── render-fragment.glsl     ← visual output colors/shapes
│       ├── trail-fragment.glsl      ← optional: trail composite
│       └── post-fragment.glsl       ← optional: bloom, aberration
├── noise/
│   ├── simplex2d.glsl               ← reusable noise snippets
│   ├── simplex3d.glsl
│   ├── curl2d.glsl
│   └── fbm.glsl
├── sdf/
│   ├── primitives-2d.glsl           ← reusable SDF shapes
│   └── operations.glsl              ← union, subtract, smooth min
├── color/
│   └── palettes.glsl                ← Inigo Quilez palettes, HSV
├── shaderUtils.ts                    ← compile, link, transform feedback helpers
├── gpgpuUtils.ts                     ← FBO creation, ping-pong management
├── <effect>Mesh.ts                   ← initial particle/geometry data
├── <effect>Sim.ts                    ← simulation state (buffers, FBOs, swap logic)
└── <effect>Scene.ts                  ← orchestration: loop, input, cleanup
```

### Shader include strategy

WebGL has no `#include`. Two approaches:

**1. String concatenation at build time (recommended):**
```javascript
import noiseSnippet from './noise/simplex2d.glsl?raw';
import mainShader from './shaders/particles/update-vertex.glsl?raw';
const fullSource = noiseSnippet + '\n' + mainShader;
```

**2. Vite plugin for `#pragma include`:**
If the project uses a build tool, a custom plugin can resolve includes. But string concatenation is simpler and more portable.

---

## Uniform Conventions

Standardize uniform names across all motion shaders:

### Time and frame

| Uniform | Type | Description |
|---|---|---|
| `u_time` | `float` | Elapsed seconds since animation start |
| `u_dt` | `float` | Delta time this frame (seconds) |

### Canvas and viewport

| Uniform | Type | Description |
|---|---|---|
| `u_resolution` | `vec2` | Canvas width, height in pixels |
| `u_aspect` | `float` | Width / height |

### Input

| Uniform | Type | Description |
|---|---|---|
| `u_mouse` | `vec2` | Mouse position in clip space (-1 to 1) |
| `u_mouseVel` | `vec2` | Mouse velocity this frame |
| `u_mouseDown` | `float` | 1.0 if mouse pressed, 0.0 otherwise |

### Simulation

| Uniform | Type | Description |
|---|---|---|
| `u_particleCount` | `int` | Total particles |
| `u_texSize` | `float` | Side length of data texture (ceil(sqrt(count))) |
| `u_gravity` | `vec2` | Gravity vector |
| `u_drag` | `float` | Velocity damping (0.98 = light drag) |
| `u_maxSpeed` | `float` | Velocity clamp |
| `u_maxForce` | `float` | Steering force clamp |

### Visual

| Uniform | Type | Description |
|---|---|---|
| `u_pointSize` | `float` | Base point size in pixels |
| `u_decay` | `float` | Trail fade factor (0.0–1.0) |
| `u_colorOffset` | `float` | Palette animation offset |

---

## Rules

- Always validate shader compile and program link status before debugging simulation logic.
- Keep simulation shaders (update) separate from rendering shaders (display).
- Use transform feedback for particle-like entities; use GPGPU ping-pong for grid-like simulations.
- Never read GPU data back to CPU in the render loop (`gl.readPixels` for debugging only).
- Cap `u_dt` to prevent simulation explosions after tab switches: `min(dt, 0.05)`.
- Guard against NaN in force calculations — add softening constants to divisions.
- Always swap ping-pong buffers/textures — never write to the buffer you're reading from.
- Start with one particle, one force, one frame — validate, then scale up.
- Keep GLSL noise, SDF, and color utilities in shared snippet files for reuse.
- Profile before optimizing — know whether you're vertex-bound or fragment-bound.

## Response style

When generating motion/simulation code:

- State which GPU pipeline is being used and why.
- Include the minimal working version first, then show how to extend.
- Explain the data layout (what lives in which buffer channel or texture channel).
- Note any required WebGL2 extensions (especially `EXT_color_buffer_float`).
- Include comments at force accumulation points so the user can add/remove forces.
- Always show the buffer swap or FBO swap step explicitly.
```

Now let me create the agent file: