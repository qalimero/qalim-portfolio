# Debugging Checklist — Motion & Animation Issues

Use this checklist top-to-bottom when a simulation misbehaves. Each step includes what to look for and a quick fix.

---

## 1. Is the simulation updating at all?

- **Check:** Add `console.log(frameCount)` or `console.log(Date.now())` inside your main loop.
- **Common causes:**
  - `requestAnimationFrame` is never called or is called once without recursion.
  - The animation loop function name is misspelled in the recursive call.
  - A blocking operation (synchronous fetch, infinite `while`) freezes the thread.
- **Fix:**

```js
function animate() {
  // Always schedule the next frame FIRST so errors don't kill the loop
  requestAnimationFrame(animate);
  update();
  render();
}
animate();
```

---

## 2. Is delta time (dt) computed correctly?

- **Check:** Log `dt` every frame. It should be roughly `0.016` at 60 fps.
- **Common causes:**
  - `dt` is in milliseconds but the physics expects seconds (or vice-versa).
  - `dt` is `NaN` on the first frame because `lastTime` was never initialized.
  - `dt` spikes after a tab switch (browser pauses `requestAnimationFrame`).
- **Fix:**

```js
let lastTime = performance.now();

function animate(now) {
  requestAnimationFrame(animate);
  let dt = (now - lastTime) / 1000; // seconds
  dt = Math.min(dt, 0.05);          // clamp to avoid spiral-of-death
  lastTime = now;
  update(dt);
  render();
}
requestAnimationFrame(animate);
```

---

## 3. Are forces being accumulated and then cleared?

- **Check:** Log `acceleration` at the start and end of `applyForce` / `update`.
- **Common causes:**
  - Forces accumulate across frames because `acceleration` is never reset.
  - Forces are cleared *before* they are applied to velocity.
  - Multiple forces overwrite instead of adding (`this.acc = force` vs `this.acc.add(force)`).
- **Fix:**

```js
update(dt) {
  this.vel.add(Vec2.mult(this.acc, dt));
  this.pos.add(Vec2.mult(this.vel, dt));
  this.acc.set(0, 0); // reset AFTER applying to velocity
}
```

---

## 4. Is velocity being limited?

- **Check:** Log `this.vel.mag()` — if it grows every frame, there is no limit.
- **Common causes:**
  - `maxSpeed` is never enforced.
  - `limit()` is called on acceleration instead of velocity.
  - Velocity is limited before forces are applied, so the limit has no effect.
- **Fix:**

```js
update(dt) {
  this.vel.add(Vec2.mult(this.acc, dt));
  this.vel.limit(this.maxSpeed); // clamp AFTER adding forces
  this.pos.add(Vec2.mult(this.vel, dt));
  this.acc.set(0, 0);
}
```

---

## 5. Are positions wrapping or bouncing correctly?

- **Check:** Log positions. Do objects disappear off-screen and never return?
- **Common causes:**
  - Boundary check uses hardcoded pixel values instead of `canvas.width` / `canvas.height`.
  - Edge bounce reverses velocity but does not clamp position back inside, causing objects to get stuck.
  - Wrapping logic does not account for object radius (object disappears before fully leaving).
- **Fix — Bounce:**

```js
if (this.pos.x - this.r < 0) {
  this.pos.x = this.r;
  this.vel.x *= -1;
}
if (this.pos.x + this.r > width) {
  this.pos.x = width - this.r;
  this.vel.x *= -1;
}
// repeat for y
```

- **Fix — Wrap:**

```js
if (this.pos.x > width + this.r)  this.pos.x = -this.r;
if (this.pos.x < -this.r)         this.pos.x = width + this.r;
// repeat for y
```

---

## 6. Is the canvas resizing properly?

- **Check:** Resize the window. Does the drawing scale, clip, or break?
- **Common causes:**
  - Canvas CSS size and drawing-buffer size are out of sync.
  - DPR (devicePixelRatio) is not accounted for, causing blurry or misaligned output.
  - Simulation coordinates are tied to old canvas dimensions after a resize.
- **Fix:**

```js
function resizeCanvas() {
  const dpr = window.devicePixelRatio || 1;
  canvas.width  = canvas.clientWidth  * dpr;
  canvas.height = canvas.clientHeight * dpr;
  ctx.scale(dpr, dpr);
}
window.addEventListener('resize', resizeCanvas);
resizeCanvas();
```

- See `patterns/responsive-canvas.md` for the full pattern.

---

## 7. Are any values NaN or Infinity?

- **Check:** Add a guard that fires on the first `NaN`:

```js
function assertFinite(v, label) {
  if (!Number.isFinite(v.x) || !Number.isFinite(v.y)) {
    console.error(`${label} is not finite:`, v);
    debugger; // pause in DevTools
  }
}
```

- **Common causes:**
  - Division by zero when normalizing a zero-length vector.
  - `Math.atan2(0, 0)` is valid but nearby operations may not be.
  - A force formula divides by `dist` without clamping: `dist = max(dist, 0.01)`.
  - Accessing an undefined property (e.g., `particle.mass` is `undefined` → arithmetic yields `NaN`).
- **Fix — Safe normalize:**

```js
normalize() {
  const m = this.mag();
  if (m > 0) {
    this.x /= m;
    this.y /= m;
  }
  return this;
}
```

- **Fix — Clamped distance in force calculations:**

```js
let dist = Vec2.dist(a.pos, b.pos);
dist = Math.max(dist, 5); // prevent extreme values
const forceMag = (G * a.mass * b.mass) / (dist * dist);
```

---

## 8. Is the render loop actually drawing the updated state?

- **Check:** Confirm the draw function references the *same* objects the update function mutates.
- **Common causes:**
  - Drawing from a stale copy of the array (spread or `slice` made on init).
  - Canvas is never cleared, so old frames paint on top and the scene looks frozen.
  - WebGL buffers are filled once at init but never re-uploaded after update.
  - Draw call happens before update, showing state one frame behind.
- **Fix:**

```js
function animate(now) {
  requestAnimationFrame(animate);
  update(dt);         // 1. compute new state
  ctx.clearRect(0, 0, canvas.width, canvas.height); // 2. clear
  render();           // 3. draw new state
}
```

For WebGL, remember to re-upload dynamic data:

```js
gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
gl.bufferSubData(gl.ARRAY_BUFFER, 0, positionArray); // update every frame
```

---

## 9. Are dead particles being removed?

- **Check:** Log `particles.length` — does it grow without bound?
- **Common causes:**
  - Particles have a `lifespan` that decreases but are never spliced from the array.
  - Splicing during a forward `for` loop skips the next element.
  - Dead particles are removed but new ones are added faster.
- **Fix — Filter (simplest):**

```js
particles = particles.filter(p => p.isAlive());
```

- **Fix — Backward loop (avoids index skipping):**

```js
for (let i = particles.length - 1; i >= 0; i--) {
  if (!particles[i].isAlive()) {
    particles.splice(i, 1);
  }
}
```

- **Fix — Pool (best for high-throughput systems):**

```js
// Instead of splice, swap with last and pop
function remove(arr, i) {
  arr[i] = arr[arr.length - 1];
  arr.pop();
}
```

---

## 10. Is the coordinate system correct?

- **Check:** Apply a known force like `(1, 0)` — does the object move right? Apply `(0, 1)` — does it move down (Canvas 2D) or up (math / WebGL)?
- **Common causes:**
  - Canvas 2D y-axis points **down**; physics formulas from textbooks assume y points **up**.
  - Angles from `Math.atan2` are measured counter-clockwise from the positive x-axis; rotating a sprite may need negation.
  - `translate` / `rotate` order matters — translating then rotating gives different results than rotating then translating.
- **Fix — Flip y for physics-style rendering:**

```js
ctx.save();
ctx.translate(0, canvas.height);
ctx.scale(1, -1);
// now y points up — draw everything here
ctx.restore();
```

- **Fix — Correct rotation for a velocity-facing sprite:**

```js
const angle = Math.atan2(this.vel.y, this.vel.x);
ctx.save();
ctx.translate(this.pos.x, this.pos.y);
ctx.rotate(angle);
// draw shape pointing to the RIGHT at origin
ctx.restore();
```

---

## 11. Performance — too many objects?

- **Check:** Open DevTools → Performance tab. Is `update()` or `render()` the bottleneck?
- **Symptoms:**
  - Frame rate drops below 30 fps.
  - Garbage collection spikes from allocating vectors every frame.
  - Quadratic neighbor checks (every particle vs every particle).
- **Fixes:**

| Problem | Solution |
|---|---|
| O(n²) neighbor search | Spatial hash grid or quadtree (`patterns/spatial-subdivision.md`) |
| Too many draw calls | Batch into a single path or use WebGL instanced rendering |
| GC pressure from `new Vec2` | Pre-allocate and reuse scratch vectors |
| Physics too expensive | Reduce particle count, simplify force model, increase `dt` step |
| Canvas 2D too slow | Switch to WebGL (`patterns/integration-with-webgl.md`) |

---

## Quick-Reference Logging Snippet

Paste this at the top of your update loop during debugging:

```js
if (frameCount % 60 === 0) { // log once per second
  const p = particles[0];
  if (p) {
    console.table({
      pos:  { x: p.pos.x.toFixed(2), y: p.pos.y.toFixed(2) },
      vel:  { x: p.vel.x.toFixed(2), y: p.vel.y.toFixed(2) },
      acc:  { x: p.acc.x.toFixed(2), y: p.acc.y.toFixed(2) },
      alive: p.isAlive(),
      count: particles.length,
    });
  }
}
```

---

## Still stuck?

1. Isolate: reduce to **one** object with **one** force and verify it moves correctly.
2. Visualize: draw velocity as a line, acceleration as a different-colored line.
3. Freeze time: step one frame at a time with a button instead of `requestAnimationFrame`.
4. Compare: open a known-working example from `examples/` side-by-side.