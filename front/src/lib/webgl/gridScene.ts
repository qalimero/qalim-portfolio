/**
 * gridScene.ts
 *
 * Pure WebGL2 minimal grid background scene.
 * Renders a procedural grid of white lines using a fullscreen quad and
 * fragment-shader distance field.  Always produces perfectly square cells
 * with a fixed cell size shared via `gridConfig.ts`.
 *
 * Shaders:  `./shaders/grid/vertex.glsl` & `./shaders/grid/fragment.glsl`
 * GPU util: `./shaderUtils.ts`
 *
 * @example
 * ```ts
 * import { initGridScene } from '@/lib/webgl/gridScene';
 * const scene = initGridScene(containerEl);
 * // later…
 * scene?.cleanup();
 * ```
 */

import { GRID_CELL_SIZE_CSS, GRID_LINE_WIDTH_CSS } from "./gridConfig";
import fragmentSource from "./shaders/grid/fragment.glsl?raw";
import vertexSource from "./shaders/grid/vertex.glsl?raw";
import { compileShader, createProgram } from "./shaderUtils";

const GRID_COLOR = { r: 1.0, g: 1.0, b: 1.0, a: 0.12 };

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Initialise the WebGL2 minimal grid and mount it inside `container`.
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
		antialias: false,
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

	const uColor = gl.getUniformLocation(program, "u_color");
	const uResolution = gl.getUniformLocation(program, "u_resolution");
	const uCellSize = gl.getUniformLocation(program, "u_cellSize");
	const uLineWidth = gl.getUniformLocation(program, "u_lineWidth");
	const aPosition = gl.getAttribLocation(program, "a_position");

	// ---- Fullscreen quad -----------------------------------------------------

	const quadVao = gl.createVertexArray();
	const quadVbo = gl.createBuffer();

	gl.bindVertexArray(quadVao);
	gl.bindBuffer(gl.ARRAY_BUFFER, quadVbo);
	gl.bufferData(
		gl.ARRAY_BUFFER,
		new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
		gl.STATIC_DRAW,
	);
	gl.enableVertexAttribArray(aPosition);
	gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
	gl.bindVertexArray(null);

	// ---- Blending for alpha lines --------------------------------------------

	gl.enable(gl.BLEND);
	gl.blendFunc(gl.SRC_ALPHA, gl.ONE_MINUS_SRC_ALPHA);
	const setProgram = gl.useProgram.bind(gl);

	// ---- Sizing --------------------------------------------------------------

	let dpr = 1;
	let cellSizeCanvas = 0;

	function resize(): void {
		dpr = Math.min(window.devicePixelRatio, 2);
		const w = container.clientWidth;
		const h = container.clientHeight;

		canvas.width = Math.round(w * dpr);
		canvas.height = Math.round(h * dpr);
		canvas.style.width = "100%";
		canvas.style.height = "100%";

		gl.viewport(0, 0, canvas.width, canvas.height);
		cellSizeCanvas = GRID_CELL_SIZE_CSS * dpr;
	}

	resize();

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

		gl.clearColor(0.0, 0.0, 0.0, 1.0);
		gl.clear(gl.COLOR_BUFFER_BIT);

		setProgram(program);

		gl.uniform4f(
			uColor,
			GRID_COLOR.r,
			GRID_COLOR.g,
			GRID_COLOR.b,
			GRID_COLOR.a,
		);
		gl.uniform2f(uResolution, canvas.width, canvas.height);
		gl.uniform1f(uCellSize, cellSizeCanvas);
		gl.uniform1f(uLineWidth, GRID_LINE_WIDTH_CSS * dpr);

		gl.bindVertexArray(quadVao);
		gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
		gl.bindVertexArray(null);

		animationId = requestAnimationFrame(render);
	}

	animationId = requestAnimationFrame(render);

	// ---- Cleanup -------------------------------------------------------------

	function cleanup(): void {
		cancelAnimationFrame(animationId);

		window.removeEventListener("resize", resize);
		document.removeEventListener("visibilitychange", onVisibilityChange);

		gl.deleteVertexArray(quadVao);
		gl.deleteBuffer(quadVbo);
		gl.deleteProgram(program);
		gl.deleteShader(vs);
		gl.deleteShader(fs);

		canvas.remove();
	}

	return { cleanup };
}
