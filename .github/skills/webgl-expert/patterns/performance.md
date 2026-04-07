# Performance

Optimize only after correctness is established.

## Priorities

- Reduce draw calls.
- Reduce expensive state changes.
- Reuse buffers and textures.
- Keep fragment shaders simple when fill rate is the bottleneck.
- Avoid CPU to GPU sync points unless necessary.

## Practical guidance

- Batch similar objects.
- Use indexed geometry where it reduces duplication.
- Use VAOs in WebGL 2 or via extension when helpful.
- Use instancing for many similar objects.
- Profile before introducing advanced optimization.

## Watch for

- Per-frame allocations.
- Recompiling shaders during interaction.
- Oversized textures.
- Excessive framebuffer passes.
