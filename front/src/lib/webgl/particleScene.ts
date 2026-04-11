/**
 * particleScene.ts
 *
 * WebGL2 pixel-style particle system using transform feedback.
 *
 * Renders two types of particles on a transparent canvas overlay:
 *   type 0 — Mouse: spawns around the cursor, drifts with light gravity.
 *   type 1 — CTA:   spawns on the CTA button edge only while it is hovered.
 *
 * Pixel aesthetic:
 *   gl.POINTS without circular discard → natural square pixel look.
 *   Colors: white (~60%) and brand blue (#3200f2, ~40%), per-particle stable.
 *
 * GPU Pipeline:
 *   Transform feedback (INTERLEAVED_ATTRIBS) with ping-pong buffers.
 *   Particle state layout (8 floats / 32 bytes per particle):
 *     [px, py, vx, vy, age, maxAge, type, seed]
 *   Attribute mapping:
 *     a_state0 (location 0): vec4 → px, py, vx, vy
 *     a_state1 (location 1): vec4 → age, maxAge, type, seed
 */

import { compileShader } from "./shaderUtils";

// ---------------------------------------------------------------------------
// Inline shader sources
// ---------------------------------------------------------------------------

const UPDATE_VERT = /* glsl */`#version 300 es
precision highp float;
layout(location = 0) in vec4 a_state0;
layout(location = 1) in vec4 a_state1;
uniform float u_dt;
uniform float u_time;
uniform vec2  u_mouse;
uniform vec2  u_cta;
uniform float u_ctaRadius;
uniform float u_ctaActive;
out vec4 v_state0;
out vec4 v_state1;
float hash(float n) { return fract(sin(n) * 43758.5453123); }
void main() {
    vec2  pos    = a_state0.xy;
    vec2  vel    = a_state0.zw;
    float age    = a_state1.x;
    float maxAge = a_state1.y;
    float type   = a_state1.z;
    float seed   = a_state1.w;
    float dt = min(u_dt, 0.05);
    float newAge = age + dt;
    if (newAge >= maxAge) {
        float s = fract(seed + u_time * 0.0031 + float(gl_VertexID) * 0.001);
        float angle     = hash(s)        * 6.28318;
        float speed     = 0.12 + hash(s * 2.3) * 0.28;
        float newMaxAge = 0.45 + hash(s * 3.7) * 0.75;
        float newSeed   = hash(s * 13.7);
        if (type < 0.5) {
            float r = hash(s * 5.1) * 0.025;
            pos = u_mouse + vec2(cos(angle) * r, sin(angle) * r);
            vel = vec2(cos(angle) * speed * 0.22, sin(angle) * speed * 0.22 + 0.04);
        } else {
            if (u_ctaActive < 0.5) {
                v_state0 = vec4(pos, 0.0, 0.0);
                v_state1 = vec4(0.0, maxAge, type, seed);
                return;
            }
            float edgeR = u_ctaRadius + hash(s * 4.3) * 0.015;
            pos = u_cta + vec2(cos(angle) * edgeR, sin(angle) * edgeR);
            vel = vec2(cos(angle) * speed * 0.18, sin(angle) * speed * 0.18);
        }
        v_state0 = vec4(pos, vel);
        v_state1 = vec4(0.0, newMaxAge, type, newSeed);
        return;
    }
    vel.y -= 0.04 * dt;
    vel   *= (1.0 - 1.2 * dt);
    pos   += vel * dt;
    v_state0 = vec4(pos, vel);
    v_state1 = vec4(newAge, maxAge, type, seed);
}`;

const UPDATE_FRAG = /* glsl */`#version 300 es
precision mediump float;
out vec4 fragColor;
void main() { fragColor = vec4(0.0); }`;

const RENDER_VERT = /* glsl */`#version 300 es
precision highp float;
layout(location = 0) in vec4 a_state0;
layout(location = 1) in vec4 a_state1;
uniform float u_dpr;
out float v_life;
out float v_type;
out float v_seed;
void main() {
    float age    = a_state1.x;
    float maxAge = a_state1.y;
    if (maxAge < 0.001 || age >= maxAge) {
        gl_Position  = vec4(2.0, 2.0, 0.0, 1.0);
        gl_PointSize = 0.0;
        v_life = 1.0; v_type = a_state1.z; v_seed = a_state1.w;
        return;
    }
    gl_Position  = vec4(a_state0.xy, 0.0, 1.0);
    float life   = age / maxAge;
    v_life       = life;
    v_type       = a_state1.z;
    v_seed       = a_state1.w;
    gl_PointSize = max(1.0, mix(3.0, 1.0, life) * u_dpr);
}`;

const RENDER_FRAG = /* glsl */`#version 300 es
precision mediump float;
in float v_life;
in float v_type;
in float v_seed;
out vec4 fragColor;
void main() {
    float alpha  = (1.0 - v_life) * (1.0 - v_life);
    vec3  white  = vec3(1.0);
    vec3  blue   = vec3(50.0 / 255.0, 0.0, 242.0 / 255.0);
    float isBlue = step(0.6, v_seed);
    vec3  color  = mix(white, blue, isBlue);
    fragColor    = vec4(color, alpha * 0.88);
}`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const PARTICLE_COUNT = 500;
const MOUSE_COUNT    = 300;
const FLOATS_PER     = 8;   // [px, py, vx, vy, age, maxAge, type, seed]
const BYTES_PER      = FLOATS_PER * 4;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function createUpdateProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER,   UPDATE_VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, UPDATE_FRAG);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  if (!prog) return null;

  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.transformFeedbackVaryings(prog, ["v_state0", "v_state1"], gl.INTERLEAVED_ATTRIBS);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("Particle update link error:", gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }

  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

function createRenderProgram(gl: WebGL2RenderingContext): WebGLProgram | null {
  const vs = compileShader(gl, gl.VERTEX_SHADER,   RENDER_VERT);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, RENDER_FRAG);
  if (!vs || !fs) return null;

  const prog = gl.createProgram();
  if (!prog) return null;

  gl.attachShader(prog, vs);
  gl.attachShader(prog, fs);
  gl.linkProgram(prog);

  if (!gl.getProgramParameter(prog, gl.LINK_STATUS)) {
    console.error("Particle render link error:", gl.getProgramInfoLog(prog));
    gl.deleteProgram(prog);
    return null;
  }

  gl.deleteShader(vs);
  gl.deleteShader(fs);
  return prog;
}

function createParticleVao(
  gl: WebGL2RenderingContext,
  buf: WebGLBuffer,
): WebGLVertexArrayObject | null {
  const vao = gl.createVertexArray();
  if (!vao) return null;

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, buf);

  // a_state0 — location 0 — 4 floats at offset 0
  gl.enableVertexAttribArray(0);
  gl.vertexAttribPointer(0, 4, gl.FLOAT, false, BYTES_PER, 0);

  // a_state1 — location 1 — 4 floats at offset 16
  gl.enableVertexAttribArray(1);
  gl.vertexAttribPointer(1, 4, gl.FLOAT, false, BYTES_PER, 16);

  gl.bindVertexArray(null);
  return vao;
}

function buildInitialData(): Float32Array {
  const data = new Float32Array(PARTICLE_COUNT * FLOATS_PER);

  for (let i = 0; i < PARTICLE_COUNT; i++) {
    const base   = i * FLOATS_PER;
    const type   = i < MOUSE_COUNT ? 0 : 1;
    const maxAge = 0.45 + Math.random() * 0.75;

    data[base + 0] = Math.random() * 2 - 1; // px
    data[base + 1] = Math.random() * 2 - 1; // py
    data[base + 2] = 0;                      // vx
    data[base + 3] = 0;                      // vy
    data[base + 4] = Math.random() * maxAge; // age (staggered)
    data[base + 5] = maxAge;                 // maxAge
    data[base + 6] = type;                   // type
    data[base + 7] = Math.random();          // seed
  }

  return data;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface ParticleScene {
  setCtaState: (active: boolean, screenX: number, screenY: number, screenRadius: number) => void;
  cleanup: () => void;
}

/**
 * Initialise the WebGL2 pixel particle system and append a transparent
 * canvas overlay to `document.body`.
 *
 * Returns `null` if WebGL2 is not available.
 */
export function initParticleScene(): ParticleScene | null {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;inset:0;width:100%;height:100%;pointer-events:none;z-index:11;";

  const maybeGl = canvas.getContext("webgl2", { alpha: true, antialias: false });
  if (!maybeGl) {
    console.warn("WebGL2 unavailable — pixel particles disabled.");
    return null;
  }

  const gl = maybeGl as WebGL2RenderingContext;
  document.body.appendChild(canvas);

  // ---- Programs ------------------------------------------------------------

  const updateProg = createUpdateProgram(gl);
  const renderProg = createRenderProgram(gl);
  if (!updateProg || !renderProg) {
    canvas.remove();
    return null;
  }

  // ---- Uniform locations — update ------------------------------------------

  const uUpdateDt        = gl.getUniformLocation(updateProg, "u_dt");
  const uUpdateTime      = gl.getUniformLocation(updateProg, "u_time");
  const uUpdateMouse     = gl.getUniformLocation(updateProg, "u_mouse");
  const uUpdateCta       = gl.getUniformLocation(updateProg, "u_cta");
  const uUpdateCtaRadius = gl.getUniformLocation(updateProg, "u_ctaRadius");
  const uUpdateCtaActive = gl.getUniformLocation(updateProg, "u_ctaActive");

  // ---- Uniform locations — render ------------------------------------------

  const uRenderDpr = gl.getUniformLocation(renderProg, "u_dpr");

  // ---- Ping-pong buffers & VAOs --------------------------------------------

  const initData = buildInitialData();
  const bufA = gl.createBuffer()!;
  const bufB = gl.createBuffer()!;

  gl.bindBuffer(gl.ARRAY_BUFFER, bufA);
  gl.bufferData(gl.ARRAY_BUFFER, initData, gl.DYNAMIC_COPY);

  gl.bindBuffer(gl.ARRAY_BUFFER, bufB);
  gl.bufferData(gl.ARRAY_BUFFER, PARTICLE_COUNT * BYTES_PER, gl.DYNAMIC_COPY);

  const vaoA = createParticleVao(gl, bufA)!;
  const vaoB = createParticleVao(gl, bufB)!;

  // ---- Transform feedback --------------------------------------------------

  const tf = gl.createTransformFeedback()!;

  // ---- State ---------------------------------------------------------------

  let current    = 0;
  let mouseNDC   = { x: 0.0, y: 0.0 };
  let ctaNDC     = { x: 0.0, y: 0.0, radius: 0.1, active: 0 };
  let lastTime   = 0;
  let startTime  = performance.now() / 1000;
  let animId     = 0;
  let isVisible  = true;

  // ---- Sizing --------------------------------------------------------------

  const dpr = Math.min(window.devicePixelRatio, 2);

  function resize(): void {
    canvas.width  = Math.round(window.innerWidth  * dpr);
    canvas.height = Math.round(window.innerHeight * dpr);
    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resize();

  // ---- Input ---------------------------------------------------------------

  function onMouseMove(e: MouseEvent): void {
    mouseNDC.x =  (e.clientX / window.innerWidth)  * 2 - 1;
    mouseNDC.y = -((e.clientY / window.innerHeight) * 2 - 1);
  }

  window.addEventListener("mousemove", onMouseMove);
  window.addEventListener("resize",    resize);

  function onVisibilityChange(): void {
    isVisible = !document.hidden;
    if (isVisible) {
      lastTime = 0;
      startTime = performance.now() / 1000;
      animId = requestAnimationFrame(render);
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange);

  // ---- Render loop ---------------------------------------------------------

  function render(now: number): void {
    if (!isVisible) return;

    const dt = lastTime > 0 ? Math.min((now - lastTime) / 1000, 0.05) : 0.016;
    lastTime = now;
    const elapsed = now / 1000 - startTime;

    const readVao  = current === 0 ? vaoA : vaoB;
    const writeBuf = current === 0 ? bufB : bufA;
    const renderVao = current === 0 ? vaoB : vaoA; // rendered AFTER swap

    // ── Update pass (transform feedback) ──────────────────────────────────

    gl.useProgram(updateProg);
    gl.uniform1f(uUpdateDt,        dt);
    gl.uniform1f(uUpdateTime,      elapsed);
    gl.uniform2f(uUpdateMouse,     mouseNDC.x, mouseNDC.y);
    gl.uniform2f(uUpdateCta,       ctaNDC.x, ctaNDC.y);
    gl.uniform1f(uUpdateCtaRadius, ctaNDC.radius);
    gl.uniform1f(uUpdateCtaActive, ctaNDC.active);

    gl.bindVertexArray(readVao);
    gl.enable(gl.RASTERIZER_DISCARD);

    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, tf);
    gl.bindBufferBase(gl.TRANSFORM_FEEDBACK_BUFFER, 0, writeBuf);
    gl.beginTransformFeedback(gl.POINTS);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
    gl.endTransformFeedback();
    gl.bindTransformFeedback(gl.TRANSFORM_FEEDBACK, null);

    gl.disable(gl.RASTERIZER_DISCARD);
    gl.bindVertexArray(null);

    // ── Swap ──────────────────────────────────────────────────────────────
    current = 1 - current;

    // ── Render pass ───────────────────────────────────────────────────────

    gl.clearColor(0, 0, 0, 0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.enable(gl.BLEND);
    gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

    gl.useProgram(renderProg);
    gl.uniform1f(uRenderDpr, dpr);

    gl.bindVertexArray(renderVao);
    gl.drawArrays(gl.POINTS, 0, PARTICLE_COUNT);
    gl.bindVertexArray(null);

    animId = requestAnimationFrame(render);
  }

  animId = requestAnimationFrame(render);

  // ---- Public methods -------------------------------------------------------

  function setCtaState(
    active: boolean,
    screenX: number,
    screenY: number,
    screenRadius: number,
  ): void {
    ctaNDC.x      =  (screenX / window.innerWidth)  * 2 - 1;
    ctaNDC.y      = -((screenY / window.innerHeight) * 2 - 1);
    ctaNDC.radius = screenRadius / window.innerHeight;
    ctaNDC.active = active ? 1 : 0;
  }

  function cleanup(): void {
    cancelAnimationFrame(animId);
    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("resize",    resize);
    document.removeEventListener("visibilitychange", onVisibilityChange);

    gl.deleteVertexArray(vaoA);
    gl.deleteVertexArray(vaoB);
    gl.deleteBuffer(bufA);
    gl.deleteBuffer(bufB);
    gl.deleteTransformFeedback(tf);
    gl.deleteProgram(updateProg);
    gl.deleteProgram(renderProg);
    canvas.remove();
  }

  return { setCtaState, cleanup };
}
