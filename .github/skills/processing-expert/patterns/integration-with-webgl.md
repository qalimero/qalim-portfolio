# Integration with WebGL

Bridging CPU-side simulation logic (JavaScript objects, vectors, forces) with GPU-side rendering (WebGL buffers, shaders, draw calls). This pattern keeps simulation readable while rendering at GPU speed.

---

## Data Flow Overview

```
Simulation (JS)  →  Typed Arrays  →  WebGL Buffers  →  Shaders  →  Screen
                                                                         
  Particles[]        Float32Array     gl.ARRAY_BUFFER   attribute vec3   Pixels
  .pos, .vel         [x,y,z,x,y,z…]  bufferSubData()   a_position       
  .color, .life      [r,g,b,a,…]     DYNAMIC_DRAW      a_color          
```

**Each frame:**

1. Simulation step updates JS objects (forces, steering, collisions).
2. Pack object properties into flat typed arrays.
3. Upload typed arrays to existing GPU buffers.
4. Issue draw call; shaders read attributes from buffers.
5. Screen shows the result.

---

## Flat Array Packing

Simulation objects are rich JS structures. The GPU needs flat, tightly packed numbers.

### Interleaved layout

Pack all attributes for one particle together, then the next particle:

```js
// Stride: 9 floats per particle → [x, y, z, vx, vy, vz, r, g, b]
const FLOATS_PER_PARTICLE = 9;
const data = new Float32Array(particles.length * FLOATS_PER_PARTICLE);

for (let i = 0; i < particles.length; i++) {
  const p = particles[i];
  const off = i * FLOATS_PER_PARTICLE;
  data[off]     = p.pos.x;
  data[off + 1] = p.pos.y;
  data[off + 2] = p.pos.z;
  data[off + 3] = p.vel.x;
  data[off + 4] = p.vel.y;
  data[off + 5] = p.vel.z;
  data[off + 6] = p.color.r;
  data[off + 7] = p.color.g;
  data[off + 8] = p.color.b;
}
```

Set up vertex attributes with stride and offset:

```js
const BYTES_PER_FLOAT = 4;
const stride = FLOATS_PER_PARTICLE * BYTES_PER_FLOAT; // 36 bytes

// position: offset 0
gl.vertexAttribPointer(a_position, 3, gl.FLOAT, false, stride, 0);
gl.enableVertexAttribArray(a_position);

// velocity: offset 12 bytes (3 floats × 4)
gl.vertexAttribPointer(a_velocity, 3, gl.FLOAT, false, stride, 12);
gl.enableVertexAttribArray(a_velocity);

// color: offset 24 bytes (6 floats × 4)
gl.vertexAttribPointer(a_color, 3, gl.FLOAT, false, stride, 24);
gl.enableVertexAttribArray(a_color);
```

### Separate buffers layout

Keep each attribute in its own buffer. Simpler to update partially:

```js
const positions = new Float32Array(count * 3);
const colors    = new Float32Array(count * 4);
const sizes     = new Float32Array(count);

// Each gets its own VBO
const posBuf   = gl.createBuffer();
const colorBuf = gl.createBuffer();
const sizeBuf  = gl.createBuffer();
```

**Trade-off:** Interleaved is more cache-friendly on the GPU. Separate is easier when only some attributes change each frame.

---

## Buffer Update Strategies

### Initial upload with `DYNAMIC_DRAW`

Signal to the driver that this buffer will be updated frequently:

```js
const buffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
gl.bufferData(gl.ARRAY_BUFFER, data, gl.DYNAMIC_DRAW);
```

Usage hints:

| Hint             | Meaning                                | Use case                         |
|------------------|----------------------------------------|----------------------------------|
| `STATIC_DRAW`    | Set once, used many times              | Static meshes, terrain           |
| `DYNAMIC_DRAW`   | Set frequently, used many times        | Particle positions, simulations  |
| `STREAM_DRAW`    | Set once, used at most a few times     | Immediate-mode style uploads     |

### Updating each frame with `bufferSubData`

Avoid reallocating the buffer every frame. Rewrite the existing data in place:

```js
function updateParticleBuffer(gl, buffer, particles, packedArray) {
  // Pack simulation state into the typed array
  for (let i = 0; i < particles.length; i++) {
    const p = particles[i];
    const off = i * 3;
    packedArray[off]     = p.pos.x;
    packedArray[off + 1] = p.pos.y;
    packedArray[off + 2] = p.pos.z;
  }

  gl.bindBuffer(gl.ARRAY_BUFFER, buffer);

  // Overwrite from byte offset 0
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, packedArray);
}
```

### When to use `bufferData` vs `bufferSubData`

- **`bufferData`**: Reallocates the buffer. Use when particle count changes.
- **`bufferSubData`**: Writes into existing allocation. Use when count is stable and only values change.

### Double buffering pattern

Avoid stalls by alternating between two buffers:

```js
const buffers = [gl.createBuffer(), gl.createBuffer()];
let currentBuffer = 0;

function uploadAndSwap(data) {
  currentBuffer = 1 - currentBuffer;
  gl.bindBuffer(gl.ARRAY_BUFFER, buffers[currentBuffer]);
  gl.bufferData(gl.ARRAY_BUFFER, data, gl.STREAM_DRAW);
  return buffers[currentBuffer];
}
```

---

## CPU vs GPU Simulation: When to Move Work

### Keep simulation on CPU when:

- Particle count is < 10,000.
- Logic involves complex branching (steering behaviors, flocking rules, GA fitness).
- Objects interact with DOM, game logic, or non-GPU systems.
- Debugging ease matters more than throughput.
- You need per-particle behavioral state (health, age, goals).

### Move simulation to GPU when:

- Particle count exceeds 50,000–100,000+.
- Physics is simple and uniform (gravity, wind, noise).
- Particles don't need individual JS-accessible state.
- The bottleneck is clearly CPU→GPU upload bandwidth.

### GPGPU ping-pong pattern (WebGL 2)

Use two textures: one as current state, one as next state. A fragment shader reads the current texture and writes the next. Swap each frame.

```
Frame N:                        Frame N+1:
┌─────────────┐                 ┌─────────────┐
│ Texture A    │──read──→       │ Texture B    │──read──→
│ (current)    │        shader  │ (current)    │        shader
│              │──write─→       │              │──write─→
└─────────────┘  Texture B      └─────────────┘  Texture A
                 (next)                           (next)
```

```js
// Encode particle state as RGBA pixels in a floating-point texture
const stateA = createFloatTexture(gl, width, height);  // positions
const stateB = createFloatTexture(gl, width, height);  // scratch

const fboA = createFramebuffer(gl, stateA);
const fboB = createFramebuffer(gl, stateB);

function simulateStep() {
  // Read from A, write to B
  gl.bindFramebuffer(gl.FRAMEBUFFER, fboB);
  gl.activeTexture(gl.TEXTURE0);
  gl.bindTexture(gl.TEXTURE_2D, stateA);
  gl.useProgram(physicsProgram);
  gl.uniform1i(u_stateTex, 0);
  drawFullscreenQuad();

  // Swap references
  [stateA, stateB] = [stateB, stateA];
  [fboA, fboB] = [fboB, fboA];
}
```

Requires `EXT_color_buffer_float` for rendering to float textures.

---

## Instanced Rendering for Large Particle Counts

Instead of uploading per-particle vertex data for a full mesh, draw one template mesh (a quad, a circle, a sprite) and provide per-instance attributes (position, scale, color).

### Setup (WebGL 2)

```js
// Template quad geometry (shared by all instances)
const quadVerts = new Float32Array([
  -0.5, -0.5,
   0.5, -0.5,
  -0.5,  0.5,
   0.5,  0.5,
]);

const quadBuf = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.bufferData(gl.ARRAY_BUFFER, quadVerts, gl.STATIC_DRAW);

// Per-instance data (updated each frame)
const instancePositions = new Float32Array(count * 2);
const instanceColors    = new Float32Array(count * 4);
const instanceSizes     = new Float32Array(count);

const instPosBuf   = gl.createBuffer();
const instColorBuf = gl.createBuffer();
const instSizeBuf  = gl.createBuffer();
```

### Attribute divisors

```js
// Quad vertex (per-vertex, divisor = 0)
gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
gl.vertexAttribPointer(a_quadVertex, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(a_quadVertex);

// Instance position (per-instance, divisor = 1)
gl.bindBuffer(gl.ARRAY_BUFFER, instPosBuf);
gl.vertexAttribPointer(a_instancePos, 2, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(a_instancePos);
gl.vertexAttribDivisor(a_instancePos, 1);  // advance once per instance

// Instance color (per-instance, divisor = 1)
gl.bindBuffer(gl.ARRAY_BUFFER, instColorBuf);
gl.vertexAttribPointer(a_instanceColor, 4, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(a_instanceColor);
gl.vertexAttribDivisor(a_instanceColor, 1);

// Instance size (per-instance, divisor = 1)
gl.bindBuffer(gl.ARRAY_BUFFER, instSizeBuf);
gl.vertexAttribPointer(a_instanceSize, 1, gl.FLOAT, false, 0, 0);
gl.enableVertexAttribArray(a_instanceSize);
gl.vertexAttribDivisor(a_instanceSize, 1);
```

### Draw call

```js
// 4 vertices per quad, `count` instances
gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, count);
```

### Vertex shader for instanced particles

```glsl
#version 300 es
in vec2 a_quadVertex;
in vec2 a_instancePos;
in vec4 a_instanceColor;
in float a_instanceSize;

uniform mat4 u_projection;

out vec4 v_color;
out vec2 v_uv;

void main() {
  vec2 worldPos = a_instancePos + a_quadVertex * a_instanceSize;
  gl_Position = u_projection * vec4(worldPos, 0.0, 1.0);
  v_color = a_instanceColor;
  v_uv = a_quadVertex + 0.5;  // [0, 1] range for texturing
}
```

---

## Transform Feedback for GPU-Side Physics (WebGL 2)

Transform feedback captures vertex shader outputs into buffers, enabling GPU-side simulation without fragment shaders or textures.

### Concept

```
Input Buffer A  →  Vertex Shader (physics)  →  Output Buffer B
                   (no rasterization needed)
                   
Next frame: swap A and B.
```

### Setup

```js
// Create two buffers for ping-pong
const bufA = gl.createBuffer();
const bufB = gl.createBuffer();

// Initial particle data: [x, y, vx, vy] per particle
const initialData = new Float32Array(count * 4);
for (let i = 0; i < count; i++) {
  const off = i * 4;
  initialData[off]     = Math.random() * 2 - 1;  // x
  initialData[off + 1] = Math.random() * 2 - 1;  // y
  initialData[off + 2] = (Math.random() - 0.5) * 0.01;  // vx
  initialData[off + 3] = (Math.random() - 0.5) * 0.01;  // vy
}

gl.bindBuffer(gl.ARRAY_BUFFER, bufA);
gl.bufferData(gl.ARRAY_BUFFER, initialData, gl.DYNAMIC_COPY);
gl.bindBuffer(gl.ARRAY_BUFFER, bufB);
gl.bufferData(gl.ARRAY_BUFFER, initialData.byteLength, gl.DYNAMIC_COPY);
```

### Specify transform feedback varyings before linking

```js
const physicsProg = createProgram(gl, physicsVS, minimalFS);

// Must be called BEFORE linking
gl.transformFeedbackVaryings(
  physicsProg,
  ['v_posVel'],  // output varying name(s)
  gl.INTERLEAVED_ATTRIBS
);
gl.linkProgram(physicsProg);
```

### Physics vertex shader

```glsl
#version 300 es
in vec4 a_posVel;  // xy = position, zw = velocity

uniform float u_dt;
uniform vec2 u_gravity;
uniform vec2 u_mouse;
uniform float u_mouseForce;

out vec4 v_posVel;  // captured by transform feedback

void main() {
  vec2 pos = a_posVel.xy;
  vec2 vel = a_posVel.zw;

  // Apply gravity
  vel += u_gravity * u_dt;

  // Mouse attraction
  vec2 toMouse = u_mouse - pos;
  float dist = length(toMouse) + 0.001;
  vel += normalize(toMouse) * u_mouseForce / (dist * dist) * u_dt;

  // Speed limit
  float speed = length(vel);
  if (speed > 0.02) vel = vel / speed * 0.02;

  // Integrate
  pos += vel * u_dt;

  // Wrap edges
  pos = fract(pos * 0.5 + 0.5) * 2.0 - 1.0;

  v_posVel = vec4(pos, vel);

  gl_Position = vec4(0.0);  // not used for rasterization
}
```

### Simulation loop

```js
const tf = gl.createTransformFeedback();
let readBuf = bufA;
let writeBuf = bufB;

function simulate() {
  gl.useProgram(physicsProg);
  gl.uniform1f(u_dt, dt);
  gl.uniform2f(u_gravity, 0.0, -0.001);

  // Bind input
  gl.bindBuffer(gl.ARRAY_BUFFER, readBuf);
  gl.vertexAttribPointer(a_posVel, 4, gl.FLOAT, false, 0, 0);
  gl.enableVertexAttribArray(a_posVel);

  // Bind output
  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
  gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, writeBuf);

  // Run simulation (disable rasterization)
  gl.enable(gl.RASTERIZER_DISCARD);
  gl.beginTransformFeedback(gl.POINTS);
  gl.drawArrays(gl.POINTS, 0, count);
  gl.endTransformFeedback();
  gl.disable(gl.RASTERIZER_DISCARD);

  gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

  // Swap
  [readBuf, writeBuf] = [writeBuf, readBuf];
}
```

### Rendering the result

After the simulation pass, bind the output buffer and draw:

```js
function render() {
  gl.useProgram(renderProg);

  gl.bindBuffer(gl.ARRAY_BUFFER, readBuf);
  // Only need xy for position
  gl.vertexAttribPointer(a_renderPos, 2, gl.FLOAT, false, 16, 0);
  gl.enableVertexAttribArray(a_renderPos);

  gl.drawArrays(gl.POINTS, 0, count);
}
```

---

## Passing Simulation Uniforms to Shaders

Common uniforms to pipe from the simulation layer:

```js
// Time
gl.uniform1f(u_time, performance.now() * 0.001);
gl.uniform1f(u_dt, deltaTime);

// Mouse / pointer (normalized to [-1, 1] or [0, 1])
const mx = (mouseX / canvas.width)  * 2 - 1;
const my = (mouseY / canvas.height) * -2 + 1;  // flip Y
gl.uniform2f(u_mouse, mx, my);

// Global forces
gl.uniform2f(u_wind, windX, windY);
gl.uniform1f(u_gravity, -9.81);

// Simulation parameters
gl.uniform1f(u_particleCount, particles.length);
gl.uniform1f(u_maxSpeed, maxSpeed);

// Canvas dimensions (for aspect ratio correction)
gl.uniform2f(u_resolution, canvas.width, canvas.height);
```

---

## Hybrid Approach: CPU Steering + GPU Rendering

The most practical pattern for interactive simulations. Keep rich behavior on the CPU; let the GPU handle drawing thousands of sprites.

### Architecture

```
┌──────────────────────────────────┐
│           CPU (JavaScript)       │
│                                  │
│  for each agent:                 │
│    accumulate steering forces    │
│    apply physics (vel, pos)      │
│    check edges, lifespan         │
│    pack into Float32Array        │
│                                  │
│  agents[] → packedPositions      │
│           → packedColors         │
│           → packedSizes          │
└──────────┬───────────────────────┘
           │ bufferSubData()
           ▼
┌──────────────────────────────────┐
│           GPU (WebGL)            │
│                                  │
│  instanced draw call             │
│  vertex shader: billboard quad   │
│  fragment shader: soft circle    │
│    or texture sprite             │
│                                  │
│  output → framebuffer → screen   │
└──────────────────────────────────┘
```

### Full loop skeleton

```js
// --- Initialization ---
const agents = createAgents(count);      // JS objects with .pos, .vel, .acc, etc.
const posBuf = createDynamicBuffer(gl, count * 2 * 4);
const colBuf = createDynamicBuffer(gl, count * 4 * 4);
const posArr = new Float32Array(count * 2);
const colArr = new Float32Array(count * 4);

// --- Each frame ---
function frame(time) {
  const dt = clampDt(time - lastTime);
  lastTime = time;

  // 1. CPU simulation
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    a.applyBehaviors(agents, targets, obstacles);
    a.update(dt);
    a.edges(canvasWidth, canvasHeight);
  }

  // 2. Pack into typed arrays
  for (let i = 0; i < agents.length; i++) {
    const a = agents[i];
    posArr[i * 2]     = a.pos.x;
    posArr[i * 2 + 1] = a.pos.y;

    const life = a.lifespan / a.maxLife;
    colArr[i * 4]     = a.color.r;
    colArr[i * 4 + 1] = a.color.g;
    colArr[i * 4 + 2] = a.color.b;
    colArr[i * 4 + 3] = life;  // alpha fades with age
  }

  // 3. Upload to GPU
  gl.bindBuffer(gl.ARRAY_BUFFER, posBuf);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, posArr);

  gl.bindBuffer(gl.ARRAY_BUFFER, colBuf);
  gl.bufferSubData(gl.ARRAY_BUFFER, 0, colArr);

  // 4. Draw
  gl.clear(gl.COLOR_BUFFER_BIT);
  gl.useProgram(renderProgram);
  gl.uniform2f(u_resolution, canvas.width, canvas.height);
  gl.drawArraysInstanced(gl.TRIANGLE_STRIP, 0, 4, agents.length);

  requestAnimationFrame(frame);
}
```

---

## Helper: Creating a Dynamic Buffer

```js
function createDynamicBuffer(gl, byteSize) {
  const buf = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, byteSize, gl.DYNAMIC_DRAW);
  return buf;
}
```

## Helper: Clamping Delta Time

Prevent simulation explosions after tab-away:

```js
function clampDt(rawMs) {
  const seconds = rawMs * 0.001;
  return Math.min(seconds, 1 / 30);  // cap at ~33ms
}
```

---

## Performance Guidelines

| Particle count | Recommended approach                        |
|----------------|---------------------------------------------|
| < 1,000        | Canvas 2D or simple `gl.POINTS`             |
| 1,000–10,000   | CPU sim + `bufferSubData` + `gl.POINTS`     |
| 10,000–100,000 | CPU sim + instanced rendering               |
| 100,000+       | GPU sim (transform feedback or GPGPU)       |

### Reducing upload cost

- Only upload attributes that changed (separate buffers help).
- Use `gl.bufferSubData` with byte offset to update a sub-range.
- Pre-allocate buffers larger than current count; track active count separately.
- Avoid creating new `Float32Array` each frame; reuse a pre-allocated array.

### Reducing draw cost

- Use `gl.POINTS` with `gl_PointSize` for simple circles (no quad geometry needed).
- Batch by texture/material when sprites differ.
- Use additive blending (`gl.blendFunc(gl.SRC_ALPHA, gl.ONE)`) for fire/glow effects—avoids costly depth sorting.

---

## Checklist: Integrating a New Simulation with WebGL

1. **Simulation works standalone.** Test it with `console.log` or Canvas 2D before touching WebGL.
2. **Define the data contract.** Decide which attributes the GPU needs (position, color, size, life, …).
3. **Choose buffer layout.** Interleaved for one-buffer simplicity; separate for selective updates.
4. **Allocate buffers once** with `DYNAMIC_DRAW` and a fixed max count.
5. **Pack each frame** into pre-allocated typed arrays.
6. **Upload with `bufferSubData`** (not `bufferData`) when count is stable.
7. **Set attribute pointers once** (inside a VAO in WebGL 2).
8. **Pass global state as uniforms** (time, mouse, resolution, forces).
9. **Draw instanced** if each particle is more than a point.
10. **Profile.** Check if the bottleneck is CPU sim, packing, upload, or draw. Optimize accordingly.