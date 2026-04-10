# Training the WebGL Expert Skill

Use this prompt when asked to **learn**, **extend**, or **train** the `webgl-expert` skill with a new technique, example, shader, or pattern.

## When to use this file

- "Train the skill on X"
- "Add this technique to the skill"
- "Learn this new WebGL pattern"
- "Add a new example / shader snippet"
- A new technique has been proven working in the codebase and should be recorded

---

## Decision tree — where does new knowledge live?

| New knowledge type | Target file |
|---|---|
| Runnable, teaching-oriented scene (≥ one complete draw call) | `examples/<name>.md` |
| Reusable concept or API pattern (no full scene needed) | `patterns/<name>.md` |
| Reusable GLSL function (copy-pasteable snippet) | `shaders/<name>.glsl` |
| Minor clarification or lookup value | `reference.md` (inline) |

If the content spans more than one category, split it: keep the GLSL in `shaders/`, reference it from the relevant `patterns/` or `examples/` file.

---

## Format for a new example (`examples/<name>.md`)

```markdown
# <Title>

## What this demonstrates
One sentence.

## Assumptions
- WebGL 1 / 2 target
- Any dependencies (e.g. gl-matrix)

## Vertex shader
\`\`\`glsl
// ...
\`\`\`

## Fragment shader
\`\`\`glsl
// ...
\`\`\`

## JavaScript wiring
\`\`\`js
// initShaderProgram, initBuffers, drawScene …
\`\`\`

## Key points
- Bullet notes on what is non-obvious
```

---

## Format for a new pattern (`patterns/<name>.md`)

```markdown
# <Pattern Title>

## Use this file for
- Bullet list of when to reach for this pattern

## Concept
Short prose explaining the idea.

## GLSL snippet / JavaScript snippet
\`\`\`glsl / \`\`\`js

## Rules
- Bullet rules that must always be followed
```

---

## Format for a new shader snippet (`shaders/<name>.glsl`)

```glsl
// <Title>
// Brief description of what this file provides.

// --- <Section name> ---
// Comments explaining the math or usage.
<glsl code>
```

---

## After adding content — always update these two files

### 1. `SKILL.md` — add a bullet under "Read these files as needed"

```markdown
- `<path>` — one-line description.
```

### 2. `prompts/task-routing.md` — add a routing entry

```markdown
- <Short trigger phrase> → `<path>`
```

---

## Validation steps before committing

1. Open the new file and confirm the code compiles in your head (or in a local browser test).
2. Check that the file name is lowercase and hyphenated.
3. Confirm `SKILL.md` and `task-routing.md` reference the new file.
4. If a shader snippet is added, confirm it does not duplicate functions already in `shaders/`.
5. Run `npm run type-check` from `front/` to ensure no TypeScript regressions.

---

## Style rules

- Keep examples self-contained: one file should be enough to run the scene.
- Use comments only where they aid debugging or explain non-obvious math.
- Prefer readable code over clever abstractions.
- Do not add new npm dependencies for skill files — they are documentation.
