# Task Routing

> **Purpose:** Use this decision tree to determine which skill files to consult based on the user's task. Start from the top and follow the first matching section.

---

## If the task involves…

### Motion, velocity, acceleration, or basic physics
→ Read `patterns/vectors-and-forces.md`
→ Example: `examples/vectors-and-motion.md`

**Indicators:** objects moving across a canvas, gravity, friction, drag, springs, pendulums, projectiles, bouncing, orbital motion, mass-based acceleration.

---

### Steering, flocking, path-following, or autonomous agents
→ Read `patterns/steering-behaviors.md`
→ Example: `examples/autonomous-agents.md`

**Indicators:** seek, flee, arrive, wander, pursue, evade, flow fields, group behaviors (separation, alignment, cohesion), obstacle avoidance, path-following, leader-following.

---

### Particles, smoke, fire, confetti, trails, or explosions
→ Read `patterns/particle-systems.md`
→ Example: `examples/particle-system.md`

**Indicators:** emitters, particle lifespan, fade-out, spawn rate, texture particles, additive blending, burst effects, wind, turbulence, attractors acting on swarms.

---

### Fractals, recursion, L-systems, or self-similar structures
→ Read `patterns/fractals.md`

**Indicators:** Koch curve, Cantor set, Sierpiński triangle, fractal trees, branching structures, L-system grammars, turtle graphics, recursive subdivision, Mandelbrot, Julia sets.

---

### Genetic algorithms, evolution, fitness, or neuroevolution
→ Read `patterns/evolutionary-computing.md`

**Indicators:** population, genes, genotype/phenotype, fitness function, selection, crossover, mutation, mating pool, smart rockets, evolving neural networks, Flappy Bird AI, interactive selection, ecosystem simulation.

---

### Responsive layout, canvas sizing, or mobile adaptation
→ Read `patterns/responsive-canvas.md`

**Indicators:** full-window canvas, device pixel ratio, resize handling, relative units, scaling simulation to viewport, mobile performance, touch events, font scaling, camera/projection updates on resize.

---

### Bridging a CPU simulation with WebGL rendering
→ Read `patterns/integration-with-webgl.md`
→ Also consult: `../webgl-expert/` for shader and buffer details

**Indicators:** typed arrays, Float32Array packing, buffer uploads, DYNAMIC_DRAW, instanced rendering, transform feedback, GPGPU, simulation uniforms, hybrid CPU-steering + GPU-rendering pipeline.

---

### Oscillation, waves, or trigonometric motion
→ Read `patterns/vectors-and-forces.md` (oscillation section)
→ Example: `examples/vectors-and-motion.md`

**Indicators:** sine/cosine movement, amplitude, frequency, phase, wave propagation, Lissajous curves, harmonic motion, pendulums, springs.

---

### Noise, randomness, or organic motion
→ Read `patterns/vectors-and-forces.md` (noise section)
→ Combine with: `patterns/particle-systems.md` for noise-driven particles

**Indicators:** Perlin noise, simplex noise, random walk, organic feel, terrain generation, noise fields, flow fields driven by noise.

---

## Combining multiple topics

Many tasks span more than one area. Here are common combinations:

| Task | Primary | Secondary |
|---|---|---|
| Flocking with WebGL rendering | `steering-behaviors.md` | `integration-with-webgl.md` |
| Particle system on GPU | `particle-systems.md` | `integration-with-webgl.md` |
| Evolving steering agents | `evolutionary-computing.md` | `steering-behaviors.md` |
| Responsive fractal viewer | `fractals.md` | `responsive-canvas.md` |
| Physics sim rendered in WebGL | `vectors-and-forces.md` | `integration-with-webgl.md` |
| Neuroevolution game | `evolutionary-computing.md` | `steering-behaviors.md`, `responsive-canvas.md` |
| L-system tree with particles | `fractals.md` | `particle-systems.md` |

---

## When debugging

→ Read `prompts/debugging-checklist.md`

Use this whenever the simulation compiles but behaves incorrectly: objects don't move, values explode to Infinity/NaN, performance is poor, canvas is blank, or particles don't die.

---

## When performance is a concern

1. First check `prompts/debugging-checklist.md` (step 10).
2. Then read `patterns/integration-with-webgl.md` for GPU offloading strategies.
3. Consult `../webgl-expert/patterns/performance.md` for rendering-specific optimizations.

---

## Default fallback

If the task does not clearly match any section above:

1. Start with `patterns/vectors-and-forces.md` — most motion tasks build on vectors.
2. Check `patterns/responsive-canvas.md` — all visual output should be adaptive.
3. Ask the user to clarify the domain before generating code.