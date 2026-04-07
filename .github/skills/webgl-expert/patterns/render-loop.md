# Render Loop

A stable render loop keeps state updates predictable.

## Rules

- Use `requestAnimationFrame`.
- Convert frame time to seconds before applying rates.
- Separate update logic from draw logic when scenes become complex.
- Resize the canvas and viewport before drawing.
- Avoid recreating buffers, textures, or programs every frame.

## Recommended flow

1. Resize canvas if needed.
2. Compute delta time.
3. Update animation state.
4. Clear buffers.
5. Bind program and resources.
6. Upload uniforms.
7. Draw.
