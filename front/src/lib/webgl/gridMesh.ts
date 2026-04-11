/**
 * gridMesh.ts
 *
 * Generates grid-line vertex data suitable for `gl.LINES`.
 * Every cell is a perfect square in clip space. Each line is subdivided
 * into many small segments so vertex-shader distortion looks smooth.
 */

/**
 * @param rows     Number of horizontal lines.
 * @param cols     Number of vertical lines.
 * @param segments Subdivision points per line.
 * @param extent   How far beyond [-1,1] clip space the grid extends.
 */
export function generateGridVertices(
  rows = 30,
  cols = 30,
  segments = 30,
  extent = 1.4,
): Float32Array {
  // Uniform spacing — every cell is the same size.
  const rowPositions: number[] = [];
  for (let i = 0; i < rows; i++) {
    const t = rows === 1 ? 0 : (i / (rows - 1)) * 2 - 1; // -1 … 1
    rowPositions.push(t * extent);
  }

  const colPositions: number[] = [];
  for (let j = 0; j < cols; j++) {
    const t = cols === 1 ? 0 : (j / (cols - 1)) * 2 - 1;
    colPositions.push(t * extent);
  }

  // Each line segment produces 2 vertices x 2 floats.
  const verticesPerLine = segments * 2 * 2;
  const totalFloats = (rows + cols) * verticesPerLine;
  const data = new Float32Array(totalFloats);

  let offset = 0;

  // Horizontal lines
  for (let i = 0; i < rows; i++) {
    const y = rowPositions[i];
    for (let s = 0; s < segments; s++) {
      const x0 = -extent + (s / segments) * (2 * extent);
      const x1 = -extent + ((s + 1) / segments) * (2 * extent);
      data[offset++] = x0;
      data[offset++] = y;
      data[offset++] = x1;
      data[offset++] = y;
    }
  }

  // Vertical lines
  for (let j = 0; j < cols; j++) {
    const x = colPositions[j];
    for (let s = 0; s < segments; s++) {
      const y0 = -extent + (s / segments) * (2 * extent);
      const y1 = -extent + ((s + 1) / segments) * (2 * extent);
      data[offset++] = x;
      data[offset++] = y0;
      data[offset++] = x;
      data[offset++] = y1;
    }
  }

  return data;
}

/**
 * Generates a unit-circle ring as `gl.LINES` pairs.
 * Centered at origin, radius 1.0 — the vertex shader scales
 * and positions it using uniforms.
 *
 * @param segments Number of line segments forming the ring.
 */
export function generateCircleVertices(segments = 128): Float32Array {
  // Each segment = 2 vertices x 2 floats
  const data = new Float32Array(segments * 2 * 2);
  let offset = 0;

  for (let i = 0; i < segments; i++) {
    const a0 = (i / segments) * Math.PI * 2;
    const a1 = ((i + 1) / segments) * Math.PI * 2;
    data[offset++] = Math.cos(a0);
    data[offset++] = Math.sin(a0);
    data[offset++] = Math.cos(a1);
    data[offset++] = Math.sin(a1);
  }

  return data;
}
