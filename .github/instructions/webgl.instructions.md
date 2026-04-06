---
applyTo: "front/src/lib/webgl/**,front/src/components/scenes/WebGL*"
---

# WebGL — Project Conventions

> These instructions apply to all WebGL-related files in this repository.
> The project uses **WebGL2 only** (no WebGL 1 fallback) with **GLSL 300 ES** shaders and **TypeScript**.

---

## Stack & Constraints

- **API**: `WebGL2RenderingContext` — never use `getContext('webgl')`, always `getContext('webgl2')`
- **Shaders**: GLSL 300 ES (`#version 300 es`) — never use legacy `attribute`, `varying`, `gl_FragColor`
- **Language**: TypeScript (`.ts`) — all WebGL logic lives in `src/lib/webgl/`
- **Islands**: React (`.jsx`) wrappers in `src/components/scenes/` with `client:load`
- **No libraries**: Pure WebGL2 API calls — no Three.js, no regl, no twgl for WebGL scenes in `lib/webgl/`
- **Three.js** exists in `src/lib/three/` for the Spline 3D card scene — that is a separate concern

---

## File Structure

```
src/
├── lib/webgl/           # Pure WebGL2 scene logic (TypeScript)
│   └── gridScene.ts     # Distortion grid — reference implementation
├── components/scenes/   # React island wrappers
│   ├── WebGLGrid.jsx    # Grid background island
│   └── ThreeScene.jsx   # Spline card island (Three.js — separate)
```

---

## GLSL 300 ES — Required Syntax

Every shader MUST start with `#version 300 es` and use modern syntax:

| Legacy (GLSL 100 — NEVER use) | Modern (GLSL 300 ES — ALWAYS use) |
|---|---|
| `attribute vec2 a_pos;` | `in vec2 a_pos;` |
| `varying vec2 v_uv;` (vertex) | `out vec2 v_uv;` (vertex) |
| `varying vec2 v_uv;` (fragment) | `in vec2 v_uv;` (fragment) |
| `gl_FragColor = color;` | `out vec4 fragColor;` then `fragColor = color;` |
| `texture2D(sampler, uv)` | `texture(sampler, uv)` |

### Shader string convention

Use tagged template literals with `/* glsl */` for editor syntax highlighting:

```ts
const VERTEX_SHADER_SOURCE = /* glsl */ `#version 300 es
precision highp float;

in vec2 a_position;

uniform vec2 u_mouse;
uniform float u_time;
uniform float u_aspect;

void main() {
  // ...
  gl_Position = vec4(pos, 0.0, 1.0);
}
`;
```

### Naming conventions in GLSL

| Prefix | Meaning | Example |
|---|---|---|
| `a_` | Attribute (vertex input) | `a_position`, `a_texCoord` |
| `u_` | Uniform | `u_mouse`, `u_time`, `u_aspect` |
| `v_` | Varying (vertex→fragment) | `v_uv`, `v_color` |

---

## Scene Module Pattern

Every WebGL scene in `src/lib/webgl/` exports a single `init*` function that:

1. Creates a `<canvas>` and gets a `WebGL2RenderingContext`
2. Compiles shaders and links a program
3. Generates geometry and uploads it to GPU buffers (VAO + VBO)
4. Runs a `requestAnimationFrame` render loop
5. Returns `{ cleanup: () => void }` or `null` if WebGL2 is unavailable

### Signature

```ts
export function initGridScene(
  container: HTMLElement,
): { cleanup: () => void } | null
```

### Lifecycle contract

| Concern | How it's handled |
|---|---|
| **Sizing** | Read `container.clientWidth/Height`, scale by `devicePixelRatio` (capped at 2), call `gl.viewport` |
| **Resize** | `window.addEventListener('resize', resize)` |
| **Mouse** | Track on `window` (not canvas) — works with `pointer-events: none` on container |
| **Visibility** | Pause `requestAnimationFrame` when `document.hidden`, resume with corrected `startTime` |
| **Cleanup** | Cancel rAF, remove all event listeners, delete VAO/VBO/program/shaders, remove canvas from DOM |

### Cleanup checklist

Every resource created MUST be released in `cleanup()`:

```ts
function cleanup(): void {
  cancelAnimationFrame(animationId);

  window.removeEventListener('mousemove', onMouseMove);
  window.removeEventListener('resize', resize);
  document.removeEventListener('visibilitychange', onVisibilityChange);

  gl.deleteVertexArray(vao);
  gl.deleteBuffer(vbo);
  gl.deleteProgram(program);
  gl.deleteShader(vs);
  gl.deleteShader(fs);

  canvas.remove();
}
```

---

## Shader Compilation Helpers

Reuse this pattern — always check `COMPILE_STATUS` and `LINK_STATUS`:

```ts
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
    console.error('Shader compile error:', gl.getShaderInfoLog(shader));
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
    console.error('Program link error:', gl.getProgramInfoLog(program));
    gl.deleteProgram(program);
    return null;
  }
  return program;
}
```

---

## Geometry Generation

- Use `Float32Array` for vertex data — never plain arrays in `bufferData`
- Pre-allocate the typed array at the expected size, fill with an offset counter
- Use `gl.LINES` for line-based scenes, `gl.TRIANGLES` for filled geometry
- Upload with `gl.STATIC_DRAW` for geometry that doesn't change per frame
- Always use VAO (`gl.createVertexArray`) to encapsulate attribute state

```ts
const vao = gl.createVertexArray();
const vbo = gl.createBuffer();

gl.bindVertexArray(vao);
gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
gl.bufferData(gl.ARRAY_BUFFER, vertexData, gl.STATIC_DRAW);
gl.enableVertexAttribArray(aPosition);
gl.vertexAttribPointer(aPosition, 2, gl.FLOAT, false, 0, 0);
gl.bindVertexArray(null);
```

---

## Mouse Distortion Pattern

The standard mouse interaction pattern for this project:

1. **Track on `window`** (not canvas) — the canvas may have `pointer-events: none`
2. **Convert to clip space**: `x = (clientX / innerWidth) * 2 - 1`, `y = -((clientY / innerHeight) * 2 - 1)`
3. **Lerp per frame** for smoothness: `mouseX += (targetX - mouseX) * 0.08`
4. **Aspect-correct in the vertex shader** so distortion is circular:

```glsl
vec2 corrected = vec2(pos.x * u_aspect, pos.y);
vec2 mouseCorr = vec2(u_mouse.x * u_aspect, u_mouse.y);
float dist = distance(corrected, mouseCorr);
```

---

## Context Creation

```ts
const gl = canvas.getContext('webgl2', {
  antialias: true,
  alpha: false,         // opaque background — better perf
  powerPreference: 'high-performance',
});
```

- `alpha: false` when the scene has a solid background (white, black…)
- `alpha: true` when the scene must composite over other DOM content
- Always check for `null` — WebGL2 may be unavailable on old devices

---

## React Island Wrapper

The wrapper in `src/components/scenes/` follows this exact pattern:

```jsx
import { useEffect, useRef } from "react";
import { initGridScene } from "../../lib/webgl/gridScene";

export default function WebGLGrid() {
  const sceneRef = useRef(null);
  const initRef = useRef(false);

  useEffect(() => {
    const container = document.getElementById("grid-background");
    if (!container || initRef.current) return;

    const instance = initGridScene(container);
    if (instance) {
      sceneRef.current = instance;
      initRef.current = true;
    }

    return () => {
      if (sceneRef.current) {
        sceneRef.current.cleanup();
        sceneRef.current = null;
        initRef.current = false;
      }
    };
  }, []);

  return <div id="grid-background" style={{ position: "fixed", inset: 0, zIndex: -1, pointerEvents: "none" }} />;
}
```

Key rules:
- **`useRef` for instance** — not `useState` (avoid re-renders)
- **Guard against double init** — `isInitializedRef` prevents React StrictMode double-mount issues
- **Cleanup returns the cleanup function** — always call `instance.cleanup()` on unmount
- **No loading/error UI** for lightweight scenes (grid) — only for heavy scenes (Spline card)

---

## Performance Rules

1. **Minimize state changes** — batch by program, then by VAO, then by texture
2. **Cap `devicePixelRatio` at 2** — retina screens don't need 3x
3. **Pause on tab hidden** — stop `requestAnimationFrame`, correct `startTime` on resume
4. **`gl.lineWidth(1.0)`** — the only reliable value across browsers; for thicker lines, expand to triangles
5. **Static geometry → `STATIC_DRAW`** — only use `DYNAMIC_DRAW` if updating the buffer every frame
6. **Don't read back from GPU** — avoid `gl.readPixels()` in the render loop

---

## Common Pitfalls

| Mistake | Correction |
|---|---|
| Using `attribute` / `varying` | Use `in` / `out` — this is GLSL 300 ES |
| Forgetting `#version 300 es` | First line of EVERY shader, no blank lines before it |
| Missing `out vec4` in fragment shader | GLSL 300 ES requires an explicit `out` variable |
| Not unbinding VAO after setup | Always `gl.bindVertexArray(null)` after setup |
| Using `Math.pow` for negative bases | Use `Math.sign(t) * Math.abs(t) ** power` |
| Forgetting to delete shaders after linking | Shaders can be deleted after `linkProgram` succeeds |
| Not handling visibility change | The grid keeps burning GPU in a hidden tab |
| Hardcoding canvas size | Always read from `container.clientWidth/Height` × `devicePixelRatio` |
