/**
 * ctaRevealScene.ts
 *
 * WebGL2 pixel-creation overlay for the TextMaintenance link.
 *
 * Creates a canvas overlay inside the target element that starts fully
 * transparent and progressively materialises pixel blocks of the fill
 * colour (center-outward). When complete, the `.is-revealed` class is
 * added and the canvas overlay is removed.
 *
 * Usage:
 *   const reveal = initCtaReveal(linkEl);
 *   reveal?.trigger();
 *   // canvas auto-removes on completion
 */

import { compileShader, createProgram } from "./shaderUtils";

// ---------------------------------------------------------------------------
// Inline shaders
// ---------------------------------------------------------------------------

const REVEAL_VERT = /* glsl */ `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const REVEAL_FRAG = /* glsl */ `#version 300 es
precision mediump float;
uniform float u_progress;
uniform vec2  u_resolution;
uniform vec3  u_fillColor;
in  vec2 v_uv;
out vec4 fragColor;

float easeOutQuart(float t) {
    float t1 = 1.0 - t;
    return 1.0 - t1 * t1 * t1 * t1;
}

float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}

void main() {
    float blockPx  = 4.0;
    vec2  pxCell   = floor(v_uv * u_resolution / blockPx);
    vec2  pxCentre = (pxCell + 0.5) * blockPx / u_resolution;

    // Oval mask: discard pixels outside the ellipse
    vec2 d = (pxCentre - 0.5) * 2.0;
    if (d.x * d.x + d.y * d.y > 1.0) discard;

    // Center-outward: blocks near the center appear first
    float dist = length(pxCentre - 0.5) * 1.6;
    float jitter = hash(pxCell) * 0.15;
    float delay = dist + jitter;
    float t = clamp((u_progress * 1.3 - delay) / 0.3, 0.0, 1.0);

    // Starts transparent, builds to opaque
    float alpha = easeOutQuart(t);
    if (alpha <= 0.0) discard;
    fragColor = vec4(u_fillColor, alpha);
}`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Total creation duration in seconds */
const REVEAL_DURATION = 0.9;

/** Border color — matches --color-brand-secondary (#ff602f) */
const FILL_COLOR = { r: 1.0, g: 96 / 255, b: 47 / 255 };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface CtaRevealScene {
	/** Play the center-outward pixel creation. Canvas auto-removes on completion. */
	trigger: () => void;
	/** Remove the overlay canvas and release GPU resources immediately. */
	cleanup: () => void;
}

/**
 * Mount a pixel-creation overlay inside `targetEl` (the `.text-maintenance` link).
 *
 * The overlay builds up the fill colour pixel-by-pixel in an oval mask,
 * then hands off to CSS (`.is-revealed` class).
 *
 * Returns `null` if WebGL2 is unavailable.
 */
export function initCtaReveal(targetEl: HTMLElement): CtaRevealScene | null {
	const canvas = document.createElement("canvas");
	canvas.style.cssText = [
		"position:absolute",
		"inset:0",
		"width:100%",
		"height:100%",
		"pointer-events:none",
		"z-index:10",
		"border-radius:50%",
	].join(";");

	const maybeGl = canvas.getContext("webgl2", {
		alpha: true,
		antialias: false,
	});
	if (!maybeGl) return null;

	const gl = maybeGl as WebGL2RenderingContext;

	targetEl.appendChild(canvas);

	// ---- Shader program ------------------------------------------------------

	const vs = compileShader(gl, gl.VERTEX_SHADER, REVEAL_VERT);
	const fs = compileShader(gl, gl.FRAGMENT_SHADER, REVEAL_FRAG);
	if (!vs || !fs) {
		canvas.remove();
		return null;
	}

	const prog = createProgram(gl, vs, fs);
	if (!prog) {
		canvas.remove();
		return null;
	}

	gl.deleteShader(vs);
	gl.deleteShader(fs);

	const uProgress = gl.getUniformLocation(prog, "u_progress");
	const uResolution = gl.getUniformLocation(prog, "u_resolution");
	const uFillColor = gl.getUniformLocation(prog, "u_fillColor");
	const aPosition = gl.getAttribLocation(prog, "a_position");

	// ---- Fullscreen quad -----------------------------------------------------

	const quadBuf = gl.createBuffer()!;
	gl.bindBuffer(gl.ARRAY_BUFFER, quadBuf);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		gl.STATIC_DRAW,
	);

	const vao = gl.createVertexArray()!;
	gl.bindVertexArray(vao);
	gl.enableVertexAttribArray(aPosition);
	gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
	gl.bindVertexArray(null);

	// ---- State ---------------------------------------------------------------

	const dpr = Math.min(window.devicePixelRatio, 2);
	let animId = 0;
	let running = false;
	const setProgram = gl.useProgram.bind(gl);

	function syncSize(): void {
		const w = targetEl.clientWidth;
		const h = targetEl.clientHeight;
		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		gl.viewport(0, 0, canvas.width, canvas.height);
	}

	/** Draw a single frame at the given progress (0 = clear, 1 = filled). */
	function drawFrame(progress: number): void {
		syncSize();
		gl.clearColor(0, 0, 0, 0);
		gl.clear(gl.COLOR_BUFFER_BIT);
		gl.enable(gl.BLEND);
		gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

		setProgram(prog);
		gl.uniform1f(uProgress, progress);
		gl.uniform2f(uResolution, targetEl.clientWidth, targetEl.clientHeight);
		gl.uniform3f(uFillColor, FILL_COLOR.r, FILL_COLOR.g, FILL_COLOR.b);

		gl.bindVertexArray(vao);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.bindVertexArray(null);
	}

	// Start transparent — no initial frame needed

	// ---- Trigger -------------------------------------------------------------

	function trigger(): void {
		if (running) return;
		running = true;

		const startMs = performance.now();

		function frame(now: number): void {
			const elapsed = (now - startMs) / 1000;
			const progress = Math.min(elapsed / REVEAL_DURATION, 1.0);

			drawFrame(progress);

			if (progress < 1.0) {
				animId = requestAnimationFrame(frame);
			} else {
				// Hand off to CSS: show children, remove overlay
				targetEl.classList.add("is-revealed");
				cleanup();
			}
		}

		animId = requestAnimationFrame(frame);
	}

	// ---- Cleanup -------------------------------------------------------------

	function cleanup(): void {
		cancelAnimationFrame(animId);
		gl.deleteVertexArray(vao);
		gl.deleteBuffer(quadBuf);
		gl.deleteProgram(prog);
		canvas.remove();
	}

	return { trigger, cleanup };
}
