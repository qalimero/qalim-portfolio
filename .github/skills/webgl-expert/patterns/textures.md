# Textures

Texture bugs often come from upload timing, parameters, or NPOT rules.

## Rules

- Upload a 1x1 placeholder pixel before the image loads.
- Re-upload texture data inside `image.onload`.
- Generate mipmaps only for power-of-two textures in WebGL 1.
- For NPOT textures, use `CLAMP_TO_EDGE` and a non-mipmap min filter such as `LINEAR`.
- Activate the expected texture unit before binding the sampler.

## Validation

- Image loaded successfully.
- Texture bound to the expected unit.
- Sampler uniform points to the same unit.
- UV coordinates are present and correctly mapped.
