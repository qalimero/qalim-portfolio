# Textured Cube

Intermediate example for moving from a flat triangle to a real 3D scene.

## Teaches

- Indexed geometry
- Texture coordinates
- Texture loading with placeholder pixel
- Perspective projection
- Model-view matrix updates
- Depth testing
- `requestAnimationFrame` render loop

## When to use

Use this when the task requires a textured object, camera perspective, or rotation. It is the right next step after a basic triangle renders correctly.

## Checklist

- Position, UV, and index buffers are all initialized.
- Texture upload succeeds and sampler uniform is bound.
- Projection and model-view matrices are updated every frame.
- Depth testing is enabled.
- The canvas is resized correctly before drawing.

## Notes

For WebGL 1, remember the NPOT texture rules. For math, prefer `gl-matrix` over writing matrix code manually.
