# GitHub Copilot — Repository Instructions

These instructions apply to every Copilot chat and code-generation request in this repository.

## Purpose

This repository contains WebGL and graphics-related code, examples, and reusable shader patterns. Prefer small, working iterations over large rewrites. Start from a minimal render path, validate each stage, then add complexity.

## Architecture

- Keep repository-wide conventions in this file.
- Keep reusable domain knowledge in `.github/skills/webgl-expert/`.
- Keep runnable or teaching-oriented examples in `examples/`.
- Keep reusable shader snippets in `shaders/`.
- Keep deep-dive implementation guidance in `patterns/`.

## Engineering rules

- Prefer WebGL 2 when the project requires it, but provide a WebGL 1 fallback when practical.
- Always check shader compile status and program link status before debugging anything else.
- Start with the smallest working scene before adding textures, lighting, animation, or abstractions.
- Separate rendering setup, buffer creation, shader compilation, texture loading, and animation loop into small functions.
- Use clear names such as `initShaderProgram`, `initBuffers`, `loadTexture`, and `drawScene`.
- Avoid introducing frameworks unless the repository already uses them.
- For math, prefer `gl-matrix` when matrix operations become non-trivial.
- Do not hide WebGL errors; surface them with actionable logs.

## Repository conventions

- Use plain JavaScript unless TypeScript is already established in the target folder.
- Keep docs in Markdown.
- Keep shader files in `.glsl`.
- Use lowercase hyphenated filenames.
- Do not mix unrelated examples in one file.
- Keep examples self-contained and educational.

## Copilot behavior

When asked to generate or edit WebGL code:

1. Determine whether the task is WebGL 1 or WebGL 2.
2. Start from the nearest example in `.github/skills/webgl-expert/examples/`.
3. Reuse shader snippets from `.github/skills/webgl-expert/shaders/` when possible.
4. Validate the render path in this order: context, shaders, buffers, uniforms, textures, draw call.
5. If debugging, use the checklist in `.github/skills/webgl-expert/prompts/debugging-checklist.md`.
6. If performance is mentioned, consult `.github/skills/webgl-expert/patterns/performance.md`.

## Output quality

Good output should be:

- Minimal but complete.
- Explicit about assumptions.
- Safe for incremental testing.
- Structured so a human can debug it quickly.
- Consistent with the repository file layout.
