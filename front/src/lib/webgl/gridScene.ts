/**
 * gridScene.ts
 *
 * Pure WebGL2 distortion-grid background scene.
 * Orchestrates shader compilation, mesh creation, and the render loop.
 *
 * Two draw calls per frame:
 * 1. Grid lines — white, with magnification inside the mouse circle.
 * 2. Circle border — brand blue (#3200f2), follows the mouse.
 *
 * All domain logic lives in dedicated modules:
 * - Shaders:  `./shaders/grid/vertex.glsl` & `./shaders/grid/fragment.glsl`
 * - GPU util: `./shaderUtils.ts`
 * - Geometry: `./gridMesh.ts`
 *
 * @example
 * ```ts
 * import { initGridScene } from '@/lib/webgl/gridScene';
 * const scene = initGridScene(containerEl);
 * // later…
 * scene?.cleanup();
 * ```
 */

import vertexSource from "./shaders/grid/vertex.glsl?raw";
import fragmentSource from "./shaders/grid/fragment.glsl?raw";
import { compileShader, createProgram } from "./shaderUtils";
import { generateGridVertices, generateCircleVertices } from "./gridMesh";

// Brand blue: #3200f2 → normalized RGBA
const BRAND_BLUE = { r: 50 / 255, g: 0 / 255, b: 242 / 255, a: 1.0 };
const GRID_WHITE = { r: 1.0, g: 1.0, b: 1.0, a: 1 };

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

  const vs = compileShader(gl, gl.VERTEX_SHADER, vertexSource);
  const fs = compileShader(gl, gl.FRAGMENT_SHADER, fragmentSource);

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
  const uAspect = gl.getUniformLocation(program, "u_aspect");
  const uMode = gl.getUniformLocation(program, "u_mode");
  const uColor = gl.getUniformLocation(program, "u_color");
  const aPosition = gl.getAttribLocation(program, "a_position");

  // ---- Grid mesh -----------------------------------------------------------

  const gridData = generateGridVertices(20, 20, 64, 1.3);
  const gridVertexCount = gridData.length / 2;

  const gridVao = gl.createVertexArray();
  const gridVbo = gl.createBuffer();

  gl.bindVertexArray(gridVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, gridVbo);
  gl.bufferData(gl.ARRAY_BUFFER, gridData, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // ---- Circle border mesh --------------------------------------------------

  const circleData = generateCircleVertices(128);
  const circleVertexCount = circleData.length / 2;

  const circleVao = gl.createVertexArray();
  const circleVbo = gl.createBuffer();

  gl.bindVertexArray(circleVao);
  gl.bindBuffer(gl.ARRAY_BUFFER, circleVbo);
  gl.bufferData(gl.ARRAY_BUFFER, circleData, gl.STATIC_DRAW);
  gl.enableVertexAttribArray(aPosition);
  gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
  gl.bindVertexArray(null);

  // ---- Blending for alpha lines --------------------------------------------

  gl.enable(gl.BLEND);
  gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

  // ---- Line width ----------------------------------------------------------

  gl.lineWidth(1.5);

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

    // Smooth mouse lerp
    mouseX += (targetMouseX - mouseX) * 0.08;
    mouseY += (targetMouseY - mouseY) * 0.08;

    const aspect = canvas.width / canvas.height;

    // Clear to black
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Shared uniforms
    gl.uniform2f(uMouse, mouseX, mouseY);
    gl.uniform1f(uAspect, aspect);

    // ---- Draw 1: Grid (white, magnified inside circle) ---------------------

    gl.uniform1f(uMode, 0.0);
    gl.uniform4f(
      uColor,
      GRID_WHITE.r,
      GRID_WHITE.g,
      GRID_WHITE.b,
      GRID_WHITE.a,
    );

    gl.bindVertexArray(gridVao);
    gl.drawArrays(gl.LINES, 0, gridVertexCount);
    gl.bindVertexArray(null);

    // ---- Draw 2: Circle border (brand blue) --------------------------------

    gl.uniform1f(uMode, 1.0);
    gl.uniform4f(
      uColor,
      BRAND_BLUE.r,
      BRAND_BLUE.g,
      BRAND_BLUE.b,
      BRAND_BLUE.a,
    );

    gl.bindVertexArray(circleVao);
    gl.drawArrays(gl.LINES, 0, circleVertexCount);
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

    gl.deleteVertexArray(gridVao);
    gl.deleteBuffer(gridVbo);
    gl.deleteVertexArray(circleVao);
    gl.deleteBuffer(circleVbo);
    gl.deleteProgram(program);
    gl.deleteShader(vs);
    gl.deleteShader(fs);

    canvas.remove();
  }

  return { cleanup };
}
