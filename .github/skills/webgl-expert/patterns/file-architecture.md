# File Architecture

Separate concerns so each file has one job. This keeps scenes readable, shaders editable, and utilities reusable.

## Directory layout

```
lib/webgl/
├── shaders/
│   └── <effect>/              ← one folder per visual effect
│       ├── vertex.glsl        ← vertex shader (pure GLSL)
│       └── fragment.glsl      ← fragment shader (pure GLSL)
├── shaderUtils.ts              ← compileShader, createProgram
├── <effect>Mesh.ts             ← geometry generation (Float32Array)
└── <effect>Scene.ts            ← orchestration: canvas, context, loop, cleanup
```

## Rules

- Keep shaders in `.glsl` files, never inline in JS/TS template literals.
- Import `.glsl` files with Vite's `?raw` suffix (`import src from './x.glsl?raw'`).
- Declare the `*.glsl?raw` module type in `env.d.ts` so TypeScript resolves the import.
- Each visual effect gets its own subfolder inside `shaders/` containing `vertex.glsl` and `fragment.glsl`.
- GPU helpers (`compileShader`, `createProgram`) go in a shared `shaderUtils.ts` — reuse across scenes.
- Geometry generators go in dedicated `<name>Mesh.ts` files — they return typed arrays, nothing else.
- Scene files handle only orchestration: canvas setup, uniform wiring, resize, mouse/input, render loop, and cleanup.
- Scene files import shaders, utils, and meshes — they never define them.

## Naming conventions

| File type | Pattern | Example |
|---|---|---|
| Shader folder | `shaders/<effect>/` | `shaders/grid/` |
| Vertex shader | `shaders/<effect>/vertex.glsl` | `shaders/grid/vertex.glsl` |
| Fragment shader | `shaders/<effect>/fragment.glsl` | `shaders/grid/fragment.glsl` |
| Mesh generator | `<effect>Mesh.ts` | `gridMesh.ts` |
| Scene orchestrator | `<effect>Scene.ts` | `gridScene.ts` |
| Shared GPU utils | `shaderUtils.ts` | `shaderUtils.ts` |

## Vite raw import setup

Add this to `env.d.ts` once per project:

```ts
declare module "*.glsl?raw" {
  const src: string;
  export default src;
}
```

Then import in any scene file:

```ts
import vertexSource from "./shaders/grid/vertex.glsl?raw";
import fragmentSource from "./shaders/grid/fragment.glsl?raw";
```

## Benefits

- Shaders get proper syntax highlighting and linting in editors.
- Mesh logic is testable in isolation (pure functions returning Float32Array).
- Adding a new effect means adding a shader pair + mesh + scene — no edits to existing files.
- `shaderUtils.ts` is written once and shared by every scene.

## Anti-patterns

- Inline GLSL inside template literals — breaks syntax highlighting, mixes concerns.
- One mega-file with shaders + geometry + render loop — hard to navigate and reuse.
- Flat shader files like `grid.vert.glsl` instead of `grid/vertex.glsl` — always use folder-per-effect.
- Shader files that also export JS — keep `.glsl` files pure GLSL.
- Duplicating `compileShader` / `createProgram` per scene — use the shared module.