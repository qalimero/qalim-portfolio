# Buffers and Attributes

Incorrect buffer wiring is one of the most common WebGL problems.

## Rules

- Keep one documented layout per buffer.
- Match `vertexAttribPointer` exactly to the uploaded data.
- Use separate buffers when clarity matters more than packing density.
- Bind the correct `ARRAY_BUFFER` before each attribute pointer setup.
- Bind `ELEMENT_ARRAY_BUFFER` only for indexed drawing.

## Validation

- Component count is correct.
- Data type is correct.
- Stride and offset match the real layout.
- Attribute index is enabled.
- Draw count matches available vertices or indices.
