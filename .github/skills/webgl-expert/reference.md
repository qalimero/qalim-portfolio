# WebGL API Reference

This file is a quick lookup for commonly used WebGL constants, methods, GLSL helpers, and compatibility notes.

## Use this file for

- Constant lookup during implementation
- Quick recall of method names and signatures
- Feature and extension checks
- Lightweight debugging support

## Rendering essentials

- Clear with `gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT)` when depth is active.
- Use `gl.viewport(0, 0, canvas.width, canvas.height)` after resize.
- Enable depth with `gl.enable(gl.DEPTH_TEST)` and commonly `gl.depthFunc(gl.LEQUAL)`.
- Draw indexed geometry with `gl.drawElements(...)` and non-indexed geometry with `gl.drawArrays(...)`.

## Common constants

### Buffers
- `gl.ARRAY_BUFFER`
- `gl.ELEMENT_ARRAY_BUFFER`
- `gl.STATIC_DRAW`
- `gl.DYNAMIC_DRAW`
- `gl.STREAM_DRAW`

### Data types
- `gl.FLOAT`
- `gl.UNSIGNED_SHORT`
- `gl.UNSIGNED_INT` (WebGL 2 or extension-dependent)
- `gl.UNSIGNED_BYTE`

### Primitives
- `gl.TRIANGLES`
- `gl.TRIANGLE_STRIP`
- `gl.LINES`
- `gl.POINTS`

### Texture basics
- `gl.TEXTURE_2D`
- `gl.TEXTURE_MIN_FILTER`
- `gl.TEXTURE_MAG_FILTER`
- `gl.TEXTURE_WRAP_S`
- `gl.TEXTURE_WRAP_T`
- `gl.LINEAR`
- `gl.NEAREST`
- `gl.CLAMP_TO_EDGE`
- `gl.REPEAT`

### Frame control
- `gl.COLOR_BUFFER_BIT`
- `gl.DEPTH_BUFFER_BIT`
- `gl.STENCIL_BUFFER_BIT`
- `gl.DEPTH_TEST`
- `gl.CULL_FACE`
- `gl.BLEND`

## Common methods

### Context and extensions
- `canvas.getContext('webgl')`
- `canvas.getContext('webgl2')`
- `gl.getExtension(name)`
- `gl.getSupportedExtensions()`

### Shader pipeline
- `gl.createShader(type)`
- `gl.shaderSource(shader, source)`
- `gl.compileShader(shader)`
- `gl.getShaderParameter(shader, gl.COMPILE_STATUS)`
- `gl.getShaderInfoLog(shader)`
- `gl.createProgram()`
- `gl.attachShader(program, shader)`
- `gl.linkProgram(program)`
- `gl.getProgramParameter(program, gl.LINK_STATUS)`
- `gl.getProgramInfoLog(program)`
- `gl.useProgram(program)`

### Attributes and uniforms
- `gl.getAttribLocation(program, name)`
- `gl.enableVertexAttribArray(index)`
- `gl.vertexAttribPointer(index, size, type, normalized, stride, offset)`
- `gl.getUniformLocation(program, name)`
- `gl.uniform1i(...)`
- `gl.uniform1f(...)`
- `gl.uniformMatrix4fv(...)`

### Buffers and textures
- `gl.createBuffer()`
- `gl.bindBuffer(target, buffer)`
- `gl.bufferData(target, data, usage)`
- `gl.createTexture()`
- `gl.bindTexture(target, texture)`
- `gl.texImage2D(...)`
- `gl.texParameteri(target, pname, param)`
- `gl.generateMipmap(target)`
- `gl.activeTexture(unit)`

## GLSL built-ins to remember

- `normalize`, `dot`, `cross`, `length`
- `mix`, `clamp`, `smoothstep`, `step`
- `fract`, `floor`, `ceil`, `mod`
- `sin`, `cos`, `pow`, `sqrt`
- `texture2D` for GLSL ES 1.00
- `texture` for GLSL ES 3.00

## Compatibility notes

- Prefer feature detection over assumptions.
- WebGL 2 includes VAO support, instancing, multiple render targets, and broader texture support.
- In WebGL 1, non-power-of-two textures require `CLAMP_TO_EDGE` wrapping and a non-mipmap min filter.
- Handle context loss in production-facing code.
