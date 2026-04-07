# Debugging Checklist

Debug in this order.

1. Confirm the canvas exists and has size.
2. Confirm `gl` context creation succeeded.
3. Check vertex shader compile log.
4. Check fragment shader compile log.
5. Check program link log.
6. Verify viewport size.
7. Verify clear color and clear call.
8. Verify bound buffers and attribute pointers.
9. Verify uniforms are found and uploaded.
10. Verify texture load and sampler binding.
11. Verify draw count and primitive type.
12. Check `gl.getError()` after suspicious steps.

If a complex scene fails, reduce it to a triangle, then add features back one at a time.
