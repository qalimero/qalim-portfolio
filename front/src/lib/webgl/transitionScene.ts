/**
 * transitionScene.ts
 *
 * WebGL2 pixel-wipe transition overlay.
 *
 * When triggered, a transparent fullscreen canvas fills with black pixel
 * blocks sweeping from right to left — evoking the current content being
 * "sucked into" the top-right corner of the browser window.
 *
 * Usage:
 *   const transition = initTransitionScene();
 *   transition?.trigger(() => { window.location.href = '/home'; });
 *
 * The callback fires when the fill animation completes (~1.3 s).
 */

import { compileShader, createProgram } from "./shaderUtils";

// ---------------------------------------------------------------------------
// Inline shader sources
// ---------------------------------------------------------------------------

const TRANS_VERT = /* glsl */ `#version 300 es
in vec2 a_position;
out vec2 v_uv;
void main() {
    v_uv = a_position * 0.5 + 0.5;
    gl_Position = vec4(a_position, 0.0, 1.0);
}`;

const TRANS_FRAG = /* glsl */ `#version 300 es
precision mediump float;
uniform float u_progress;
uniform vec2  u_resolution;
in  vec2 v_uv;
out vec4 fragColor;
float easeInOutCubic(float t) {
    return t < 0.5 ? 4.0 * t * t * t : 1.0 - pow(-2.0 * t + 2.0, 3.0) / 2.0;
}
float hash(vec2 p) {
    return fract(sin(dot(p, vec2(127.1, 311.7))) * 43758.5453);
}
void main() {
    float blockPx  = 6.0;
    vec2  pxCell   = floor(v_uv * u_resolution / blockPx);
    vec2  pxCentre = (pxCell + 0.5) * blockPx / u_resolution;
    float colDelay = (1.0 - pxCentre.x) * 0.75;
    float jitter   = hash(pxCell) * 0.07;
    float delay    = colDelay + jitter;
    float t        = clamp((u_progress - delay) / 0.25, 0.0, 1.0);
    if (t <= 0.0) discard;
    fragColor = vec4(0.0, 0.0, 0.0, easeInOutCubic(t));
}`;

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

/** Total fill duration in seconds (right column at t=0, left column at t≈1.05) */
const FILL_DURATION = 1.3;

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export interface TransitionScene {
	/**
	 * Play the pixel-wipe and call `onComplete` when the screen is fully covered.
	 * Subsequent calls while the animation is running are no-ops.
	 */
	trigger: (onComplete: () => void) => void;
	/** Remove the overlay canvas and release GPU resources. */
	cleanup: () => void;
}

/**
 * Initialise the transition overlay and append it to `document.body`.
 * Returns `null` if WebGL2 is not available.
 */
export function initTransitionScene(): TransitionScene | null {
	const canvas = document.createElement("canvas");
	canvas.style.cssText = [
		"position:fixed",
		"inset:0",
		"width:100%",
		"height:100%",
		"pointer-events:none",
		"z-index:1000",
		"opacity:0",
	].join(";");

	const maybeGl = canvas.getContext("webgl2", {
		alpha: true,
		antialias: false,
	});
	if (!maybeGl) {
		console.warn("WebGL2 unavailable — pixel transition disabled.");
		return null;
	}

	const gl = maybeGl as WebGL2RenderingContext;
	document.body.appendChild(canvas);

	// ---- Full-screen quad program --------------------------------------------

	const vs = compileShader(gl, gl.VERTEX_SHADER, TRANS_VERT);
	const fs = compileShader(gl, gl.FRAGMENT_SHADER, TRANS_FRAG);
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
	const aPosition = gl.getAttribLocation(prog, "a_position");

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

	let running = false;
	let animId = 0;
	const dpr = Math.min(window.devicePixelRatio, 2);

	function onResize(): void {
		canvas.width = Math.round(window.innerWidth * dpr);
		canvas.height = Math.round(window.innerHeight * dpr);
		gl.viewport(0, 0, canvas.width, canvas.height);
	}

	window.addEventListener("resize", onResize);

	// ---- Trigger -------------------------------------------------------------

	function trigger(onComplete: () => void): void {
		if (running) return;
		running = true;

		canvas.style.opacity = "1";
		canvas.style.pointerEvents = "all";

		const startMs = performance.now();

		function frame(now: number): void {
			const elapsed = (now - startMs) / 1000;
			const progress = Math.min(elapsed / FILL_DURATION, 1.0);

			// Re-sync size
			canvas.width = Math.round(window.innerWidth * dpr);
			canvas.height = Math.round(window.innerHeight * dpr);
			gl.viewport(0, 0, canvas.width, canvas.height);

			gl.clearColor(0, 0, 0, 0);
			gl.clear(gl.COLOR_BUFFER_BIT);
			gl.enable(gl.BLEND);
			gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);

			gl.useProgram(prog);
			gl.uniform1f(uProgress, progress);
			gl.uniform2f(uResolution, window.innerWidth, window.innerHeight);

			gl.bindVertexArray(vao);
			gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
			gl.bindVertexArray(null);

			if (progress < 1.0) {
				animId = requestAnimationFrame(frame);
			} else {
				onComplete();
			}
		}

		animId = requestAnimationFrame(frame);
	}

	function cleanup(): void {
		cancelAnimationFrame(animId);
		window.removeEventListener("resize", onResize);
		gl.deleteVertexArray(vao);
		gl.deleteBuffer(quadBuf);
		gl.deleteProgram(prog);
		canvas.remove();
	}

	return { trigger, cleanup };
}
