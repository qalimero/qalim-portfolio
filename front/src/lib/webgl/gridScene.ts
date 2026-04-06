/**
 * gridScene.ts
 *
 * Pure WebGL2 implementation of a distortion grid background.
 * No Three.js — only raw WebGL2 API calls, custom GLSL 300 ES shaders,
 * and typed Float32Array buffers.
 *
 * Features:
 * - Thin black lines on a white background
 * - Stretched grid (non-uniform line spacing — denser at edges, wider at center)
 * - Mouse-following distortion with gaussian falloff
 * - Subtle breathing animation (slow sine oscillation)
 *
 * @example
 * ```ts
 * import { initGridScene } from '@/lib/webgl/gridScene';
 * const scene = initGridScene(containerEl);
 * // later…
 * scene?.cleanup();
 * ```
 */

// ---------------------------------------------------------------------------
// Shaders
// ---------------------------------------------------------------------------

const VERTEX_SHADER_SOURCE = /* glsl */ `#version 300 es
precision highp float;

in vec2 a_position;

uniform vec2 u_mouse;
uniform float u_time;
uniform float u_aspect;

void main() {
  vec2 pos = a_position;

  // --- Mouse distortion (aspect-corrected for circular falloff) ---
  vec2 corrected = vec2(pos.x * u_aspect, pos.y);
  vec2 mouseCorr = vec2(u_mouse.x * u_aspect, u_mouse.y);
  float dist = distance(corrected, mouseCorr);

  float radius = 0.70;
  float strength = 0.12;
  float falloff = exp(-(dist * dist) / (radius * radius));

  vec2 dir = corrected - mouseCorr;
  if (dist > 0.001) dir = normalize(dir);

  corrected += dir * falloff * strength;
  pos = vec2(corrected.x / u_aspect, corrected.y);

  gl_Position = vec4(pos, 0.0, 1.0);
}
`;

const FRAGMENT_SHADER_SOURCE = /* glsl */ `#version 300 es
precision highp float;

out vec4 fragColor;

void main() {
  fragColor = vec4(0.0, 0.0, 0.0, 1.0);
}
`;

// ---------------------------------------------------------------------------
// Shader helpers
// ---------------------------------------------------------------------------

function compileShader(
  gl: WebGL2RenderingContext,
  type: number,
  source: string,
): WebGLShader | null {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    console.error("Shader compile error:", gl.getShaderInfoLog(shader));
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function createProgram(
  gl: WebGL2RenderingContext,
  vs: WebGLShader,
  fs: WebGLShader,
): WebGLProgram | null {
  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);

  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    console.error("Program link error:", gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }

  return program;
}

// ---------------------------------------------------------------------------
// Grid mesh generation
// ---------------------------------------------------------------------------

/**
 * Generates grid line vertices suitable for `gl.LINES`.
 *
 * Lines are uniformly distributed so every cell is a perfect square in
 * clip space. Each individual line is subdivided into `segments` uniform
 * steps so vertex-shader mouse distortion looks smooth.
 *
 * @param rows     Number of horizontal lines.
 * @param cols     Number of vertical lines.
 * @param segments Subdivision points per line.
 * @param extent   How far beyond [-1,1] clip space the grid extends.
 */
function generateGridVertices(
  rows = 80,
  cols = 80,
  segments = 80,
  extent = 1.1,
): Float32Array {
  // Uniform spacing — every cell is the same size.
  const rowPositions: number[] = [];
  for (let i = 0; i < rows; i++) {
    const t = rows === 1 ? 0 : (i / (rows - 1)) * 2 - 1; // -1 … 1
    rowPositions.push(t * extent);
  }

  const colPositions: number[] = [];
  for (let j = 0; j < cols; j++) {
    const t = cols === 1 ? 0 : (j / (cols - 1)) * 2 - 1;
    colPositions.push(t * extent);
  }

  // Each line segment produces 2 vertices × 2 floats.
  const verticesPerLine = segments * 2 * 2;
  const totalFloats = (rows + cols) * verticesPerLine;
  const data = new Float32Array(totalFloats);

  let offset = 0;

  // Horizontal lines
  for (let i = 0; i < rows; i++) {
    const y = rowPositions[i];
    for (let s = 0; s < segments; s++) {
      const x0 = -extent + (s / segments) * (2 * extent);
      const x1 = -extent + ((s + 1) / segments) * (2 * extent);
      data[offset++] = x0;
      data[offset++] = y;
      data[offset++] = x1;
      data[offset++] = y;
    }
  }

  // Vertical lines
  for (let j = 0; j < cols; j++) {
    const x = colPositions[j];
    for (let s = 0; s < segments; s++) {
      const y0 = -extent + (s / segments) * (2 * extent);
      const y1 = -extent + ((s + 1) / segments) * (2 * extent);
      data[offset++] = x;
      data[offset++] = y0;
      data[offset++] = x;
      data[offset++] = y1;
    }
  }

  return data;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise the WebGL2 distortion grid and mount it inside `container`.
 *
 * Returns an object with a `cleanup` method that removes the canvas and
 * releases all GPU resources, or `null` if WebGL2 is not available.
 */
export function initGridScene(
  container: HTMLElement,
): { cleanup: () => void } | null {
  // ---- Canvas & context ----------------------------------------------------

  const canvas = document.createElement("canvas");
  canvas.style.display = "block";
  canvas.style.width = "100%";
  canvas.style.height = "100%";

  const maybeGl = canvas.getContext("webgl2", {
    antialias: true,
    alpha: false,
  });

  if (!maybeGl) {
    console.error("WebGL2 is not supported.");
    return null;
  }

  const gl: WebGL2RenderingContext = maybeGl;

  container.appendChild(canvas);

  // ---- Shaders & program ---------------------------------------------------

  const vs = compileShader(gl, gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER_SOURCE);

  if (!vs || !fs) {
    canvas.remove();
    return null;
  }

  const program = createProgram(gl, vs, fs);
  if (!program) {
    gl.deleteShader(vs);
    gl.deleteShader(fs);
    canvas.remove();
    return null;
  }

  // ---- Uniform & attribute locations ---------------------------------------

  const uMouse = gl.getUniformLocation(program, "u_mouse");
  const uTime = gl.getUniformLocation(program, "u_time");
  const uAspect = gl.getUniformLocation(program, "u_aspect");
  const aPosition = gl.getAttribLocation(program, "a_position");

  // ---- Grid mesh -----------------------------------------------------------

  const gridData = generateGridVertices(80, 80, 80, 1.5);
  const vertexCount = gridData.length / 2;

  const vao = gl.createVertexArray();
  const vbo = gl.createBuffer();

  gl.bindVertexArray(vao);
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, gridData, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // ---- Line width ----------------------------------------------------------

  gl.lineWidth(1.0);

  // ---- Sizing --------------------------------------------------------------

  function resize(): void {
    const dpr = Math.min(window.devicePixelRatio, 2);
    const w = container.clientWidth;
    const h = container.clientHeight;

    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = "100%";
    canvas.style.height = "100%";

    gl.viewport(0, 0, canvas.width, canvas.height);
  }

  resize();

  // ---- Mouse tracking ------------------------------------------------------

  let mouseX = 0;
  let mouseY = 0;
  let targetMouseX = 0;
  let targetMouseY = 0;

  function onMouseMove(e: MouseEvent): void {
    targetMouseX = (e.clientX / window.innerWidth) * 2 - 1;
    targetMouseY = -((e.clientY / window.innerHeight) * 2 - 1);
  }

  window.addEventListener("mousemove", onMouseMove);

  // ---- Visibility ----------------------------------------------------------

  let isVisible = true;

  function onVisibilityChange(): void {
    isVisible = !document.hidden;
    if (isVisible) {
      startTime = performance.now() / 1000 - elapsedAtPause;
      animationId = requestAnimationFrame(render);
    }
  }

  document.addEventListener("visibilitychange", onVisibilityChange);

  // ---- Resize listener -----------------------------------------------------

  window.addEventListener("resize", resize);

  // ---- Render loop ---------------------------------------------------------

  let animationId = 0;
  let startTime = performance.now() / 1000;
  let elapsedAtPause = 0;

  function render(): void {
    if (!isVisible) {
      elapsedAtPause = performance.now() / 1000 - startTime;
      return;
    }

    const now = performance.now() / 1000;
    const time = now - startTime;

    // Smooth mouse lerp
    mouseX += (targetMouseX - mouseX) * 0.08;
    mouseY += (targetMouseY - mouseY) * 0.08;

    // Clear to white
    gl.clearColor(1.0, 1.0, 1.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    // Draw
    gl.useProgram(program);

    gl.uniform2f(uMouse, mouseX, mouseY);
    gl.uniform1f(uTime, time);
    gl.uniform1f(uAspect, canvas.width / canvas.height);

    gl.bindVertexArray(vao);
    gl.drawArrays(gl.LINES, 0, vertexCount);
    gl.bindVertexArray(null);

    animationId = requestAnimationFrame(render);
  }

  animationId = requestAnimationFrame(render);

  // ---- Cleanup -------------------------------------------------------------

  function cleanup(): void {
    cancelAnimationFrame(animationId);

    window.removeEventListener("mousemove", onMouseMove);
    window.removeEventListener("resize", resize);
    document.removeEventListener("visibilitychange", onVisibilityChange);

    gl.deleteVertexArray(vao);
    gl.deleteBuffer(vbo);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    canvas.remove();
  }

  return { cleanup };
}
