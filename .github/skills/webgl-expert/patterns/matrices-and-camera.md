# Matrices and Camera

Most 3D issues are transform issues.

## Core order

- Model transforms object space to world space.
- View transforms world space to camera space.
- Projection transforms camera space to clip space.

## Rules

- Keep model, view, and projection matrices separate until composition is needed.
- Recompute projection when aspect ratio changes.
- Use a matrix library for anything beyond trivial transforms.
- Document whether your code passes separate matrices or a combined MVP matrix.

## Common symptoms

- Nothing visible: object may be behind the camera or clipped.
- Distortion: aspect ratio not updated.
- Wrong rotation: matrix order confusion.
- Inverted scene: handedness or camera setup mismatch.
