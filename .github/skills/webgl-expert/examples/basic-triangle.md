# Basic Triangle

Minimal example for first-pixel validation.

## Teaches

- WebGL context creation
- Vertex and fragment shader compilation
- Program linking
- Position and color attributes
- `gl.drawArrays(gl.TRIANGLES, ...)`

## When to use

Use this as the first fallback when nothing renders. If a complex scene fails, reduce it back to this pattern first.

## Checklist

- Canvas exists and has non-zero size.
- `gl` is not null.
- Shaders compile.
- Program links.
- Attribute pointers match uploaded buffer layout.
- Viewport matches canvas size.

## Starter pattern

Use a single position buffer, a single color buffer, and one draw call. Avoid textures, matrices, and indices until this works.
