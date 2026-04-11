# Shader Compilation

Always validate shaders first.

## Rules

- Compile each shader separately.
- Check `gl.COMPILE_STATUS` immediately.
- Link the program only after both shaders compile.
- Check `gl.LINK_STATUS` immediately.
- Print `gl.getShaderInfoLog` and `gl.getProgramInfoLog` on failure.

## Debug order

1. Vertex shader source.
2. Fragment shader source.
3. Precision declarations.
4. Attribute and varying name alignment.
5. Uniform type alignment.
6. Program linking.

## Common failures

- Missing precision in fragment shader.
- Varying mismatch between vertex and fragment shader.
- Typo in uniform or attribute names.
- Using GLSL ES 3.00 syntax in a WebGL 1 context.
