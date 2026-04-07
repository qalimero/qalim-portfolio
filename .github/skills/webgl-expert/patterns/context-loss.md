# Context Loss

Production-facing WebGL should tolerate context loss.

## Rules

- Listen for `webglcontextlost`.
- Call `event.preventDefault()` in the loss handler.
- Stop the render loop while the context is lost.
- Recreate programs, buffers, textures, and framebuffers on restore.

## Why it matters

Browsers and GPUs can reclaim graphics resources. If recovery is not implemented, the canvas can stay permanently blank.
