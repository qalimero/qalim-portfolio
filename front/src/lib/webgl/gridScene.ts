/**
 * gridScene.ts
 *
 * Pure WebGL2 distortion-grid background scene.
 * Orchestrates shader compilation, mesh creation, and the render loop.
 *
 * Features:
 * - Stretched grid (non-uniform line spacing — denser at edges, wider at center)
 * - Mouse-following distortion with gaussian falloff
 * - Subtle breathing animation (slow sine oscillation)
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
  const uRadius = gl.getUniformLocation(program, "u_radius");
  const uTime = gl.getUniformLocation(program, "u_time");
  const aPosition = gl.getAttribLocation(program, "a_position");

  // ---- Grid mesh -----------------------------------------------------------

  const gridData = generateGridVertices(80, 80, 80, 1.5);
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

  /** Default cursor-circle radius in clip-space NDC Y units */
  const DEFAULT_RADIUS = 0.25;
  let currentRadius = DEFAULT_RADIUS;
  let targetRadius = DEFAULT_RADIUS;

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

    // ---- Magnetize: pull circle toward CTA when mouse is near -----

    // biome-ignore lint/suspicious/noExplicitAny: cross-module bridge via window globals
    const ctaBounds = (window as any).__ctaScreenBounds as
      | {
          x: number;
          y: number;
          width: number;
          height: number;
          radius: number;
        }
      | null
      | undefined;

    let effectiveTargetX = targetMouseX;
    let effectiveTargetY = targetMouseY;
    targetRadius = DEFAULT_RADIUS;

    if (ctaBounds) {
      const ctaCx = ctaBounds.x + ctaBounds.radius;
      const ctaCy = ctaBounds.y + ctaBounds.radius;

      // Convert mouse NDC to screen pixels for distance check
      const mouseScreenX = ((targetMouseX + 1) / 2) * window.innerWidth;
      const mouseScreenY = ((1 - targetMouseY) / 2) * window.innerHeight;

      const dxPx = mouseScreenX - ctaCx;
      const dyPx = mouseScreenY - ctaCy;
      const distPx = Math.sqrt(dxPx * dxPx + dyPx * dyPx);

      // Magnetize threshold: 2.5× the CTA radius in pixels
      const threshold = ctaBounds.radius * 2.5;

      if (distPx < threshold) {
        const t = 1 - distPx / threshold; // 0→1 as mouse approaches CTA centre

        // Blend mouse target toward CTA centre (NDC)
        const ctaNDCX = (ctaCx / window.innerWidth) * 2 - 1;
        const ctaNDCY = -((ctaCy / window.innerHeight) * 2 - 1);
        effectiveTargetX = targetMouseX + (ctaNDCX - targetMouseX) * t;
        effectiveTargetY = targetMouseY + (ctaNDCY - targetMouseY) * t;

        // Blend circle radius to wrap the CTA (1.15× CTA radius, in NDC Y units)
        const ctaRadiusNDC =
          (ctaBounds.radius / (window.innerHeight / 2)) * 1.15;
        targetRadius = DEFAULT_RADIUS + (ctaRadiusNDC - DEFAULT_RADIUS) * t;
      }
    }

    // Smooth lerps
    mouseX += (effectiveTargetX - mouseX) * 0.08;
    mouseY += (effectiveTargetY - mouseY) * 0.08;
    currentRadius += (targetRadius - currentRadius) * 0.08;

    const aspect = canvas.width / canvas.height;

    // Clear to black
    gl.clearColor(0.0, 0.0, 0.0, 1.0);
    gl.clear(gl.COLOR_BUFFER_BIT);

    gl.useProgram(program);

    // Shared uniforms
    gl.uniform2f(uMouse, mouseX, mouseY);
    gl.uniform1f(uTime, time);
    gl.uniform1f(uAspect, aspect);
    gl.uniform1f(uRadius, currentRadius);

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
