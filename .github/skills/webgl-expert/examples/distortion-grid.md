# Distortion Grid

A full-screen WebGL2 grid background with a mouse-following circular void.

## Location

```
front/src/lib/webgl/
├── shaders/
│   └── grid/
│       ├── vertex.glsl      ← circular void vertex distortion
│       └── fragment.glsl    ← void discard + translucent white lines
├── shaderUtils.ts            ← compile & link helpers (shared)
├── gridMesh.ts               ← uniform grid geometry generator
└── gridScene.ts              ← scene orchestration
```

React wrapper: `front/src/components/scenes/WebGLGrid.jsx`

## Architecture

Follows the file-architecture pattern (`patterns/file-architecture.md`):

- **Shaders** live in `.glsl` files, imported via Vite `?raw`.
- **Mesh** is a pure function returning `Float32Array` for `gl.LINES`.
- **Scene** handles canvas, WebGL2 context, uniforms, resize, mouse, render loop, and cleanup.
- **Utils** (`compileShader`, `createProgram`) are shared across all scenes.

## Visual effect

- Black background, thin white grid lines (alpha 0.35).
- 40×40 uniform lines, each subdivided into 64 segments for smooth distortion.
- Mouse cursor creates a circular void — a clean empty circle with no lines inside.

## How the void works

### Vertex shader

Vertices inside the bubble radius (0.25 in aspect-corrected space) are snapped to the circle perimeter. Vertices outside are left untouched — the grid stays perfectly square.

```glsl
if (dist < radius) {
  if (dist > 0.001) {
    corrected = mouseCorr + normalize(delta) * radius;
  } else {
    corrected = mouseCorr + vec2(0.0, radius);
  }
}
```

### Fragment shader

Fragments inside the circle are discarded for a guaranteed clean void:

```glsl
if (dist < radius - 0.003) {
  discard;
}
```

The 0.003 inset keeps the edge crisp without aliasing artifacts.

## Key uniforms

| Uniform | Type | Purpose |
|---|---|---|
| `u_mouse` | `vec2` | Smoothed mouse position in clip space (-1 to 1) |
| `u_aspect` | `float` | Canvas aspect ratio for circular correction |
| `u_time` | `float` | Elapsed seconds (available for future animation) |

## Extending

- Adjust `radius` in both shaders to change void size.
- Change grid density by passing different `rows`/`cols` to `generateGridVertices()`.
- Add breathing animation using `u_time` in the vertex shader.
- Layer additional effects by adding more shader pairs and compositing.