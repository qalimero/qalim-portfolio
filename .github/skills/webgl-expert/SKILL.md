---
name: webgl-expert
description: Expert guide for WebGL, GLSL, shaders, buffers, textures, render loops, debugging, and performance. Use when working with WebGL, canvas rendering, GPU programming, shaders, texture mapping, or 3D browser graphics.
---

# WebGL Expert

Use this skill when the task involves:

- WebGL 1 or WebGL 2
- GLSL vertex or fragment shaders
- Canvas-based 2D or 3D rendering
- Buffer setup, attributes, uniforms, or textures
- Render loops, animation, post-processing, or GPU debugging

## Workflow

1. Detect target capabilities.
2. Create the smallest possible working render.
3. Validate shader compilation and program linking.
4. Validate vertex buffers, attributes, and uniforms.
5. Add textures, matrices, depth testing, and animation only after pixels appear.
6. Optimize only after correctness is verified.

## Read these files as needed

- `reference.md` — WebGL constants, methods, GLSL built-ins, compatibility notes.
- `examples/basic-triangle.md` — minimal first render example.
- `examples/textured-cube.md` — textured 3D scene with matrices and animation.
- `patterns/shader-compilation.md` — compile and link discipline.
- `patterns/buffers-and-attributes.md` — data layout and attribute wiring.
- `patterns/textures.md` — texture upload and NPOT handling.
- `patterns/matrices-and-camera.md` — model, view, projection conventions.
- `patterns/render-loop.md` — animation and resize flow.
- `patterns/context-loss.md` — production-safe recovery.
- `patterns/performance.md` — optimization guidance.
- `prompts/task-routing.md` — how to choose the right subfile.
- `prompts/debugging-checklist.md` — step-by-step debugging order.
- `shaders/` — reusable shader starters.

## Rules

- Always log shader compilation and program link errors.
- Prefer a reproducible minimal example before refactoring.
- Handle non-power-of-two textures correctly in WebGL 1.
- Keep data layout explicit: positions, normals, uvs, colors, and indices should not be ambiguous.
- Detect WebGL 2 features rather than assuming them.
- For complex scenes, separate setup from per-frame rendering.

## Response style for Copilot

When generating code:

- Explain assumptions briefly.
- Use small functions with clear responsibilities.
- Prefer readable code over clever abstractions.
- Keep WebGL state changes intentional and local.
- Include comments only where they improve debugging or maintenance.
