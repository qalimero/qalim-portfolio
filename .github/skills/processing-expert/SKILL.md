---
name: processing-expert
description: Expert guide for motion, animation, transitions, interactivity, physics simulation, particle systems, autonomous agents, oscillation, fractals, cellular automata, and evolutionary computing. Use when building lifelike movement, force-driven animations, procedural patterns, or interactive simulations on the web — especially alongside WebGL rendering.
---

# Processing Expert — Motion, Animation & Interactivity

Use this skill when the task involves:

- Vector-based motion (velocity, acceleration, forces)
- Steering behaviors and autonomous agents
- Particle systems and emitters
- Oscillation, springs, pendulums, and wave patterns
- Flow fields, path following, and flocking
- Cellular automata and rule-based pattern generation
- Fractal and recursive geometry (L-systems, Koch, trees)
- Physics simulation (gravity, friction, drag, springs, attraction)
- Neuroevolution and genetic algorithms for animated creatures
- Easing, transitions, and procedural animation
- Responsive / adaptive canvas layouts (always adapting to window size)

## Core Philosophy

All simulations must be **resolution-independent** and **adaptive to viewport size**. Never hard-code pixel dimensions. Always derive layout, force magnitudes, particle counts, and visual scales from `window.innerWidth`, `window.innerHeight`, or the current canvas/GL viewport. The system should look and feel correct on a phone, a laptop, and a 4K display.

Prefer small, working iterations. Start from a minimal simulation, validate each behavior, then layer complexity.

## Workflow

1. **Define the behavior** — what should move, how, and why.
2. **Choose the math model** — vectors, forces, noise, rules, neural nets.
3. **Implement the minimal simulation** — one object, one force, one frame.
4. **Make it adaptive** — all positions, sizes, forces scaled to viewport.
5. **Add complexity** — more objects, interactions, visual polish.
6. **Integrate with rendering** — output positions/states to WebGL or Canvas2D.
7. **Optimize** — spatial subdivision, instancing, GPU offload when needed.

## Read these files as needed

- `reference.md` — core math formulas, vector operations, force equations, noise, easing.
- `examples/vectors-and-motion.md` — basic mover with velocity and acceleration.
- `examples/particle-system.md` — emitters, life span, forces on particles.
- `examples/autonomous-agents.md` — seek, arrive, wander, flee, flow-field following.
- `examples/flocking.md` — separation, alignment, cohesion (boids).
- `examples/oscillation-and-springs.md` — sine/cosine motion, pendulums, Hooke's law.
- `examples/fractals-and-lsystems.md` — recursive trees, Koch curve, L-system turtle.
- `patterns/vectors-and-forces.md` — Newton's laws, gravity, friction, drag, attraction.
- `patterns/steering-behaviors.md` — Reynolds's formulas, combining behaviors, weights.
- `patterns/particle-systems.md` — emitters, inheritance, polymorphism, force accumulation.
- `patterns/oscillation.md` — angular motion, SHM, waves, spring forces, pendulums.
- `patterns/cellular-automata.md` — 1D Wolfram CA, 2D Game of Life, continuous CA.
- `patterns/fractals.md` — recursion, Cantor set, Koch, trees, L-systems, stochastic fractals.
- `patterns/evolutionary-computing.md` — GA steps, fitness, selection, crossover, mutation.
- `patterns/responsive-canvas.md` — adaptive sizing, DPR, resize handling, relative units.
- `patterns/integration-with-webgl.md` — bridging simulation state into GPU rendering.
- `prompts/task-routing.md` — how to choose the right subfile for a given task.
- `prompts/debugging-checklist.md` — step-by-step debugging for motion/animation issues.

## Rules

- **Never hard-code pixel values.** All positions, sizes, and forces must be relative to canvas dimensions or viewport.
- Use `requestAnimationFrame` or the host render loop — never `setInterval`.
- Separate simulation (update) from rendering (draw). The simulation should be renderable by Canvas2D, SVG, or WebGL.
- Keep classes small: `Vector`, `Mover`, `Particle`, `Vehicle`, `Emitter`, `FlowField`, etc.
- Prefer composition over deep inheritance.
- Accumulate forces per frame, then clear acceleration after each update.
- Always provide a deltaTime or fixed timestep mechanism.
- Handle window resize by recalculating all derived dimensions.
- For large populations (>500), consider spatial subdivision (grid binning or quadtree).
- When integrating with WebGL, output flat typed arrays (Float32Array) for buffer upload.

## Response Style

When generating code:

- Explain the physics/math briefly before writing code.
- Use small, testable functions: `applyForce()`, `update()`, `edges()`, `show()`.
- Normalize and map values explicitly — show the math.
- Include comments that reference the underlying formula or concept.
- Provide both a standalone JS version and a WebGL integration hint.