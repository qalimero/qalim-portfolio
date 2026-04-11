# Processing Reference — Math, Physics & Animation Formulas

Quick-lookup for vectors, forces, noise, oscillation, steering, and all core simulation formulas.

## Use this file for

- Formula recall during implementation
- Quick vector math reference
- Force and physics equation lookup
- Noise and randomness patterns
- Easing and interpolation functions

---

## 1. Vectors

### Creation and basics
```
v = { x, y }                          // 2D vector
magnitude = sqrt(x² + y²)             // length
normalized = { x/mag, y/mag }         // unit vector (length 1)
heading = atan2(y, x)                 // angle in radians
fromAngle(θ) = { cos(θ), sin(θ) }    // unit vector from angle
```

### Operations
```
add:       { a.x + b.x, a.y + b.y }
subtract:  { a.x - b.x, a.y - b.y }
multiply:  { v.x * n, v.y * n }            // scalar multiplication
divide:    { v.x / n, v.y / n }
dot:       a.x * b.x + a.y * b.y           // scalar result
cross 2D:  a.x * b.y - a.y * b.x           // scalar (z-component)
lerp:      { a.x + (b.x - a.x) * t, a.y + (b.y - a.y) * t }
limit:     if (mag > max) { normalize then scale to max }
setMag:    normalize then multiply by desired magnitude
dist:      magnitude of (a - b)
angleBetween: acos(dot(a,b) / (|a| * |b|))
```

### Scalar projection
```
scalar_proj(A onto B) = |A| * cos(θ) = dot(A, normalize(B))
```

---

## 2. Motion (Euler Integration)

```
acceleration += force / mass
velocity += acceleration
position += velocity
acceleration = 0  // clear each frame
```

### With deltaTime
```
velocity += acceleration * dt
position += velocity * dt
```

### Velocity limit
```
if (velocity.magnitude > maxSpeed) velocity.setMagnitude(maxSpeed)
```

---

## 3. Forces

### Newton's second law
```
F = m × a  →  a = F / m
```

### Gravity (simplified)
```
F_gravity = { 0, mass * g }     // g ≈ 0.1 to 1.0 in pixel-world
```

### Gravitational attraction
```
F = (G * m1 * m2) / d²
direction = normalize(target.pos - this.pos)
force = direction * F
// Constrain d to [5, 25] to avoid extreme values
```

### Friction
```
friction = -1 * μ * N * v̂
// μ = coefficient, N = normal force (often 1), v̂ = velocity unit vector
```

### Drag (air/fluid resistance)
```
F_drag = -½ * ρ * |v|² * A * C_d * v̂
// Simplified: F_drag = -C_d * |v|² * v̂
```

### Spring (Hooke's Law)
```
F_spring = -k * x
// k = spring constant, x = current_length - rest_length
// direction = normalize(bob - anchor)
```

---

## 4. Oscillation

### Simple harmonic motion
```
x = amplitude * sin(TWO_PI * frameCount / period)
// or: x = amplitude * sin(angle), angle += angularVelocity
```

### Angular motion
```
angularAcceleration += torque
angularVelocity += angularAcceleration
angle += angularVelocity
```

### Pendulum
```
angularAcceleration = (-gravity * sin(angle)) / armLength
// Apply damping: angularVelocity *= 0.99
```

### Polar to Cartesian
```
x = r * cos(θ)
y = r * sin(θ)
```

### Wave pattern
```
for each x:
  y = amplitude * sin(angle)
  angle += deltaAngle
startAngle += startAngleVelocity  // animate the wave
```

---

## 5. Steering Behaviors (Reynolds)

### Core formula
```
steering = desired - velocity
steering.limit(maxForce)
```

### Seek
```
desired = normalize(target - position) * maxSpeed
steering = desired - velocity
```

### Flee
```
desired = normalize(position - target) * maxSpeed
```

### Arrive
```
d = dist(position, target)
if (d < slowRadius):
  desiredSpeed = map(d, 0, slowRadius, 0, maxSpeed)
else:
  desiredSpeed = maxSpeed
desired = normalize(target - position) * desiredSpeed
```

### Wander
```
futurePos = position + velocity.normalized * lookAhead
target = futurePos + randomPointOnCircle(wanderRadius)
seek(target)
```

### Flow field following
```
column = floor(position.x / resolution)
row = floor(position.y / resolution)
desired = field[column][row]
desired.setMagnitude(maxSpeed)
steering = desired - velocity
```

### Separation
```
for each neighbor within desiredSeparation:
  diff = normalize(position - neighbor.position) / distance
  sum += diff
average = sum / count
desired = average.setMagnitude(maxSpeed)
steering = desired - velocity
```

### Alignment
```
for each neighbor within perceptionRadius:
  sum += neighbor.velocity
average = sum / count
desired = average.setMagnitude(maxSpeed)
steering = desired - velocity
```

### Cohesion
```
for each neighbor within perceptionRadius:
  sum += neighbor.position
center = sum / count
seek(center)
```

### Combining behaviors
```
separation.mult(separationWeight)
alignment.mult(alignmentWeight)
cohesion.mult(cohesionWeight)
applyForce(separation)
applyForce(alignment)
applyForce(cohesion)
```

---

## 6. Particle Systems

### Particle life cycle
```
lifespan starts at 255 (or 1.0), decreases each frame
if lifespan < 0 → remove particle
alpha = lifespan (for fade-out)
```

### Emitter pattern
```
each frame: emitter.addParticle()
for each particle (backward loop for deletion):
  particle.applyForce(gravity)
  particle.update()
  particle.show()
  if particle.isDead(): remove
```

---

## 7. Noise & Randomness

### Perlin noise (1D)
```
value = noise(xoff)           // returns 0..1
xoff += increment             // small increment (0.01) = smooth
```

### Perlin noise (2D)
```
value = noise(xoff, yoff)     // for textures, terrain
```

### Noise to range
```
mapped = map(noise(t), 0, 1, low, high)
```

### Gaussian random
```
value = randomGaussian(mean, standardDeviation)
```

### Lévy flight
```
if random < 0.01: largeStep
else: smallStep
```

---

## 8. Cellular Automata

### 1D Wolfram CA
```
for each cell (skip edges):
  left = cells[i-1], me = cells[i], right = cells[i+1]
  newState = ruleset[7 - parseInt(left+me+right, 2)]
```

### 2D Game of Life
```
for each cell:
  neighborSum = sum of 8 neighbors
  if alive && neighbors < 2: die (loneliness)
  if alive && neighbors > 3: die (overpopulation)
  if dead && neighbors === 3: born
  else: stasis
```

---

## 9. Fractals & Recursion

### Recursive pattern
```
function branch(length):
  draw line of length
  if length > threshold:
    translate to end
    push → rotate(+angle) → branch(length * shrink) → pop
    push → rotate(-angle) → branch(length * shrink) → pop
```

### Koch curve rule
```
Given segment A→E:
  B = A + (E-A)/3
  D = A + 2*(E-A)/3
  C = B + rotate((E-A)/3, -60°)
Produces 4 segments: A→B, B→C, C→D, D→E
```

### L-system
```
axiom + rules → iterate to produce sentence
F = draw forward, + = turn right, - = turn left
[ = push state, ] = pop state
```

---

## 10. Genetic Algorithms

```
1. Initialize: population of N random DNA
2. Fitness: score each member
3. Selection: weighted probability (roulette wheel / relay race)
4. Crossover: pick midpoint, child = parentA[:mid] + parentB[mid:]
5. Mutation: for each gene, if random < rate → randomize
6. Repeat from step 2
```

### Normalized fitness (for selection)
```
normalizedFitness[i] = fitness[i] / totalFitness
```

---

## 11. Easing Functions

```
linear(t)        = t
easeInQuad(t)    = t²
easeOutQuad(t)   = t * (2 - t)
easeInOutQuad(t) = t < 0.5 ? 2t² : -1 + (4 - 2t) * t
easeInCubic(t)   = t³
easeOutCubic(t)  = (t - 1)³ + 1
easeInOutCubic(t)= t < 0.5 ? 4t³ : (t - 1)(2t - 2)² + 1
easeInElastic(t) = sin(13 * π/2 * t) * pow(2, 10 * (t - 1))
easeOutBounce(t) = piecewise quadratic
```

---

## 12. Responsive / Adaptive Layout

### Always derive from viewport
```
canvasW = window.innerWidth
canvasH = window.innerHeight
centerX = canvasW / 2
centerY = canvasH / 2
scale = min(canvasW, canvasH) / referenceSize
```

### Force scaling
```
gravity = { 0, 0.1 * scale }
maxSpeed = 4 * scale
maxForce = 0.2 * scale
particleRadius = 4 * scale
```

### Resize handling
```
window.addEventListener('resize', () => {
  canvas.width = window.innerWidth
  canvas.height = window.innerHeight
  recalculateAllDerivedValues()
})
```

### Device Pixel Ratio (DPR)
```
const dpr = window.devicePixelRatio || 1
canvas.width = window.innerWidth * dpr
canvas.height = window.innerHeight * dpr
canvas.style.width = window.innerWidth + 'px'
canvas.style.height = window.innerHeight + 'px'
gl.viewport(0, 0, canvas.width, canvas.height)
```
