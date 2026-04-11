# Evolutionary Computing

Patterns for genetic algorithms, ecosystem simulations, and neuroevolution.

---

## Three Darwinian Principles

Every evolutionary system rests on three pillars:

| Principle | Meaning | In code |
|-----------|---------|---------|
| **Heredity** | Offspring inherit traits from parents | Child genotype is derived from parent genotype(s) |
| **Variation** | Offspring are not perfect clones | Crossover combines parents; mutation adds noise |
| **Selection** | Some individuals are more fit than others | A fitness function scores each individual; higher-scoring individuals reproduce more |

If any one of these is missing, the system will not evolve.

---

## Genetic Algorithm — Step by Step

```
┌─────────────────────────────────────────────┐
│  1. INITIALIZATION                          │
│     Create a population of N random agents  │
├─────────────────────────────────────────────┤
│  2. FITNESS EVALUATION                      │
│     Score every individual                  │
├─────────────────────────────────────────────┤
│  3. SELECTION                               │
│     Choose parents weighted by fitness      │
├─────────────────────────────────────────────┤
│  4. REPRODUCTION                            │
│     Crossover + Mutation → new population   │
├─────────────────────────────────────────────┤
│  5. REPLACE                                 │
│     New generation replaces the old         │
│     → Go to step 2                          │
└─────────────────────────────────────────────┘
```

### 1. Initialization

```js
class DNA {
  constructor(length) {
    this.genes = [];
    for (let i = 0; i < length; i++) {
      this.genes[i] = randomGene(); // domain-specific
    }
  }
}

class Population {
  constructor(size, geneLength) {
    this.individuals = [];
    for (let i = 0; i < size; i++) {
      this.individuals.push(new DNA(geneLength));
    }
    this.generation = 0;
  }
}
```

### 2. Fitness Evaluation

```js
// Assign a fitness score to every individual
evaluate(fitnessFunction) {
  for (const individual of this.individuals) {
    individual.fitness = fitnessFunction(individual);
  }
}
```

### 3. Selection

Pick parents; better-fit individuals should be picked more often. See the **Selection Methods** section below.

### 4. Reproduction (Crossover + Mutation)

```js
reproduce(mutationRate) {
  const next = [];
  for (let i = 0; i < this.individuals.length; i++) {
    const parentA = this.select();
    const parentB = this.select();
    let child = parentA.crossover(parentB);
    child.mutate(mutationRate);
    next.push(child);
  }
  this.individuals = next;
  this.generation++;
}
```

---

## Fitness Functions

The fitness function is the most important design decision. It maps a genotype to a scalar score.

### Linear Scoring

```js
function fitness(individual) {
  let score = 0;
  for (let i = 0; i < target.length; i++) {
    if (individual.genes[i] === target[i]) {
      score++;
    }
  }
  return score / target.length; // 0.0 → 1.0
}
```

Simple and readable, but converges slowly because the selective pressure between a 90% match and a 95% match is small.

### Quadratic Scoring

```js
function fitness(individual) {
  let score = 0;
  for (let i = 0; i < target.length; i++) {
    if (individual.genes[i] === target[i]) score++;
  }
  const normalized = score / target.length;
  return normalized * normalized; // amplify differences
}
```

A 90% match scores 0.81; a 95% match scores 0.9025 — a wider gap makes selection more decisive.

### Exponential Scoring

```js
function fitness(individual) {
  let score = 0;
  for (let i = 0; i < target.length; i++) {
    if (individual.genes[i] === target[i]) score++;
  }
  const normalized = score / target.length;
  return Math.pow(2, 10 * normalized) / Math.pow(2, 10); // 0 → 1, exponential curve
}
```

Maximally aggressive — near-perfect individuals dominate the selection pool. Faster convergence but risks premature convergence if the landscape is deceptive.

### Choosing a Fitness Curve

| Curve | Selective Pressure | Convergence Speed | Risk |
|-------|--------------------|-------------------|------|
| Linear | Low | Slow | Stagnation |
| Quadratic | Medium | Moderate | Balanced |
| Exponential | High | Fast | Premature convergence |

---

## Selection Methods

### Roulette Wheel (Mating Pool)

Build a pool where each individual appears proportionally to its fitness. Then pick uniformly from the pool.

```js
buildMatingPool() {
  const pool = [];
  // Normalize fitness to 0–1
  const maxFit = Math.max(...this.individuals.map(ind => ind.fitness));

  for (const ind of this.individuals) {
    // Number of entries ∝ fitness
    const n = Math.floor((ind.fitness / maxFit) * 100);
    for (let i = 0; i < n; i++) {
      pool.push(ind);
    }
  }
  this.matingPool = pool;
}

select() {
  const index = Math.floor(Math.random() * this.matingPool.length);
  return this.matingPool[index];
}
```

**Pros:** Simple, intuitive.
**Cons:** Memory-heavy for large populations; resolution limited by pool granularity.

### Relay Race (Weighted Random Selection)

Also called stochastic acceptance. No explicit pool is built.

```js
select() {
  let index = 0;
  let r = Math.random();

  // Walk through the normalized fitness distribution
  while (r > 0) {
    r -= this.normalizedFitness[index];
    index++;
  }
  index--;
  return this.individuals[index];
}

// Pre-compute normalized fitness so it sums to 1
normalizeFitness() {
  const sum = this.individuals.reduce((s, ind) => s + ind.fitness, 0);
  this.normalizedFitness = this.individuals.map(ind => ind.fitness / sum);
}
```

**Pros:** Memory-efficient, works for any population size.
**Cons:** Slightly more complex; requires pre-normalization.

### Elitist Selection

Guarantee the top N individuals survive unchanged into the next generation.

```js
reproduce(mutationRate, eliteCount = 1) {
  // Sort by fitness descending
  const sorted = [...this.individuals].sort((a, b) => b.fitness - a.fitness);
  const next = [];

  // Carry elites forward without mutation
  for (let i = 0; i < eliteCount; i++) {
    next.push(sorted[i].copy());
  }

  // Fill the rest via crossover + mutation
  while (next.length < this.individuals.length) {
    const parentA = this.select();
    const parentB = this.select();
    let child = parentA.crossover(parentB);
    child.mutate(mutationRate);
    next.push(child);
  }

  this.individuals = next;
  this.generation++;
}
```

**Pros:** The best solution found so far is never lost.
**Cons:** Can reduce diversity if elite count is too high.

### Tournament Selection

Pick `k` individuals at random; the fittest wins.

```js
selectTournament(k = 3) {
  let best = null;
  for (let i = 0; i < k; i++) {
    const candidate = this.individuals[Math.floor(Math.random() * this.individuals.length)];
    if (!best || candidate.fitness > best.fitness) {
      best = candidate;
    }
  }
  return best;
}
```

**Pros:** Simple, adjustable pressure via `k`. No normalization needed.

---

## Crossover

### Random Midpoint

Split the gene array at a random point; take the first chunk from parent A, the rest from parent B.

```js
crossover(partner) {
  const child = new DNA(this.genes.length);
  const midpoint = Math.floor(Math.random() * this.genes.length);

  for (let i = 0; i < this.genes.length; i++) {
    child.genes[i] = i < midpoint ? this.genes[i] : partner.genes[i];
  }
  return child;
}
```

### Coin Flip (Uniform Crossover)

For each gene, flip a coin to decide which parent it comes from.

```js
crossover(partner) {
  const child = new DNA(this.genes.length);

  for (let i = 0; i < this.genes.length; i++) {
    child.genes[i] = Math.random() < 0.5 ? this.genes[i] : partner.genes[i];
  }
  return child;
}
```

**Coin flip** preserves more diversity; **midpoint** preserves positional structure (useful when gene order matters, like rocket thrust sequences).

---

## Mutation

Mutation introduces random variation to prevent the population from converging to a local optimum.

```js
mutate(rate) {
  for (let i = 0; i < this.genes.length; i++) {
    if (Math.random() < rate) {
      this.genes[i] = randomGene();
    }
  }
}
```

### Mutation Rate Guidelines

| Rate | Effect |
|------|--------|
| 0% | No variation — population stagnates at whatever crossover produces |
| 0.1% – 1% | Gentle exploration — good default for most problems |
| 1% – 5% | Aggressive exploration — useful for rough fitness landscapes |
| > 10% | Essentially random search — evolution breaks down |

**Adaptive mutation:** Start high (5%) and decrease over generations, or increase when fitness stagnates.

```js
mutate(rate) {
  for (let i = 0; i < this.genes.length; i++) {
    if (Math.random() < rate) {
      // Option A: full replacement
      // this.genes[i] = randomGene();

      // Option B: nudge (for continuous values)
      this.genes[i] += (Math.random() - 0.5) * 0.1;
    }
  }
}
```

---

## Genotype vs Phenotype

| Term | Definition | Example |
|------|-----------|---------|
| **Genotype** | The raw genetic data | `[0.3, 1.2, -0.8, 45, 0.01]` |
| **Phenotype** | The expressed trait the fitness function evaluates | A rocket's flight path, a creature's body shape, a string of text |

The mapping from genotype to phenotype can be:

- **Direct:** gene[0] = x position, gene[1] = y position
- **Indirect:** genes encode rules (L-system, neural net weights) that produce a complex phenotype

Keep the genotype representation as simple as possible. The fitness function should handle the interpretation.

---

## Interactive Selection

Replace the algorithmic fitness function with human judgment.

```js
// Each individual is displayed on screen.
// The user clicks on the ones they prefer.
// Clicked individuals get high fitness; others get low.

handleClick(x, y) {
  for (const ind of this.individuals) {
    if (ind.containsPoint(x, y)) {
      ind.fitness = 1.0; // selected
    }
  }
}

// After user selects, breed the next generation as normal
nextGeneration() {
  this.buildMatingPool();
  this.reproduce(0.01);
}
```

Use cases: evolving art, evolving music, evolving UI layouts, evolving creature morphology.

---

## Ecosystem Simulation

Instead of discrete generations, model a continuous environment where agents live, eat, reproduce, and die.

```js
class Creature {
  constructor(x, y, dna) {
    this.pos = { x, y };
    this.vel = { x: 0, y: 0 };
    this.dna = dna;          // genes control behavior
    this.health = 100;       // decreases over time
    this.maxSpeed = dna.genes[0];
    this.foodAttraction = dna.genes[1];
    this.size = dna.genes[2];
  }

  update(dt) {
    // Movement costs energy proportional to speed and size
    this.health -= (0.1 + this.maxSpeed * 0.05) * dt;
  }

  eat(food) {
    this.health += food.nutrition;
    this.health = Math.min(this.health, 200); // cap
  }

  isDead() {
    return this.health <= 0;
  }

  // Probability of reproduction increases with health
  canReproduce() {
    return this.health > 150 && Math.random() < 0.002;
  }

  reproduce() {
    const childDNA = this.dna.copy();
    childDNA.mutate(0.01);
    this.health *= 0.5; // reproduction costs energy
    return new Creature(this.pos.x, this.pos.y, childDNA);
  }
}
```

### Ecosystem Loop

```js
function updateEcosystem(creatures, foods, dt) {
  // Remove dead creatures
  for (let i = creatures.length - 1; i >= 0; i--) {
    if (creatures[i].isDead()) {
      creatures.splice(i, 1);
    }
  }

  // Update living creatures
  for (const c of creatures) {
    c.seek(foods);   // steer toward food based on dna
    c.update(dt);
    c.edges();       // wrap or bounce

    // Check food consumption
    for (let j = foods.length - 1; j >= 0; j--) {
      if (dist(c.pos, foods[j].pos) < c.size) {
        c.eat(foods[j]);
        foods.splice(j, 1);
      }
    }

    // Asexual reproduction
    if (c.canReproduce()) {
      creatures.push(c.reproduce());
    }
  }

  // Replenish food
  while (foods.length < maxFood) {
    foods.push(new Food(Math.random() * w, Math.random() * h));
  }
}
```

Key differences from generational GA:

| Generational GA | Ecosystem |
|-----------------|-----------|
| Discrete generations | Continuous time |
| Explicit selection step | Implicit: survive → reproduce |
| Whole population replaced at once | Individuals born and die asynchronously |
| Fixed population size | Population fluctuates |

---

## Neuroevolution

Use a neural network as the phenotype. The genotype is the set of network weights (and optionally the topology).

### Neural Network Weights as Genes

```js
class NNCreature {
  constructor(brain) {
    if (brain) {
      this.brain = brain.copy(); // inherit
    } else {
      this.brain = ml5.neuralNetwork({
        inputs: 5,
        outputs: 2,
        layers: [{ units: 8, activation: 'sigmoid' }],
        task: 'regression',
        noTraining: true // weights are evolved, not trained
      });
    }
    this.fitness = 0;
  }

  think(inputs) {
    const outputs = this.brain.classifySync(inputs);
    return outputs;
  }

  // Crossover: blend weights of two parent networks
  crossover(partner) {
    const childBrain = this.brain.crossover(partner.brain);
    return new NNCreature(childBrain);
  }

  // Mutation: randomly perturb weights
  mutate(rate) {
    this.brain.mutate(rate);
  }
}
```

### ml5.js Crossover and Mutate

ml5.js provides built-in methods for neuroevolution:

```js
// Copy a neural network
const childBrain = parentBrain.copy();

// Mutate weights in place
// Each weight has `rate` probability of being perturbed
childBrain.mutate(0.1);

// Manual crossover (not built-in, implement yourself)
function crossoverBrains(brainA, brainB) {
  const child = brainA.copy();
  const weightsA = brainA.getWeights();
  const weightsB = brainB.getWeights();

  for (let i = 0; i < weightsA.length; i++) {
    const shape = weightsA[i].shape;
    const valuesA = weightsA[i].dataSync();
    const valuesB = weightsB[i].dataSync();
    const mixed = new Float32Array(valuesA.length);

    for (let j = 0; j < valuesA.length; j++) {
      mixed[j] = Math.random() < 0.5 ? valuesA[j] : valuesB[j];
    }

    weightsA[i] = tf.tensor(mixed, shape);
  }

  child.setWeights(weightsA);
  return child;
}
```

---

## Smart Rockets — Example Pattern

Rockets try to reach a target. Each rocket's DNA is an array of thrust vectors applied frame-by-frame.

### Genotype

```js
class RocketDNA {
  constructor(lifespan) {
    this.genes = [];
    for (let i = 0; i < lifespan; i++) {
      // Random 2D thrust vector
      const angle = Math.random() * Math.PI * 2;
      const mag = Math.random() * 0.2;
      this.genes[i] = { x: Math.cos(angle) * mag, y: Math.sin(angle) * mag };
    }
  }
}
```

### Phenotype & Fitness

```js
class Rocket {
  constructor(dna, startX, startY) {
    this.dna = dna;
    this.pos = { x: startX, y: startY };
    this.vel = { x: 0, y: 0 };
    this.frame = 0;
    this.completed = false;
    this.crashed = false;
  }

  update() {
    if (this.completed || this.crashed) return;

    // Apply thrust from DNA for this frame
    const force = this.dna.genes[this.frame];
    this.vel.x += force.x;
    this.vel.y += force.y;
    this.pos.x += this.vel.x;
    this.pos.y += this.vel.y;
    this.frame++;

    // Check target / obstacle collisions ...
  }

  calcFitness(target) {
    const d = dist(this.pos, target);

    if (this.completed) {
      // Reward reaching the target; bonus for speed
      this.fitness = 1.0 / (1 + this.frame * 0.001);
      this.fitness *= 10;
    } else if (this.crashed) {
      this.fitness = 0.001;
    } else {
      // Inversely proportional to distance
      this.fitness = 1.0 / (1 + d);
    }
  }
}
```

### GA Loop

```js
const LIFESPAN = 300;
const POP_SIZE = 200;
const MUTATION_RATE = 0.01;
let population = [];

// 1. Initialize
for (let i = 0; i < POP_SIZE; i++) {
  population.push(new Rocket(new RocketDNA(LIFESPAN), startX, startY));
}

function generation() {
  // 2. Evaluate fitness
  for (const r of population) r.calcFitness(target);

  // 3. Selection (mating pool)
  const maxFit = Math.max(...population.map(r => r.fitness));
  const pool = [];
  for (const r of population) {
    const n = Math.floor((r.fitness / maxFit) * 100);
    for (let i = 0; i < n; i++) pool.push(r);
  }

  // 4. Reproduction
  const next = [];
  for (let i = 0; i < POP_SIZE; i++) {
    const a = pool[Math.floor(Math.random() * pool.length)].dna;
    const b = pool[Math.floor(Math.random() * pool.length)].dna;
    const childDNA = a.crossover(b);
    childDNA.mutate(MUTATION_RATE);
    next.push(new Rocket(childDNA, startX, startY));
  }

  population = next;
}
```

---

## Flappy Bird Neuroevolution — Example Pattern

Birds learn to navigate pipes. Each bird has a small neural network brain; no explicit fitness function — survival time *is* the fitness.

### Bird Brain

```js
class Bird {
  constructor(brain) {
    this.y = canvasH / 2;
    this.vel = 0;
    this.gravity = 0.5;
    this.alive = true;
    this.score = 0; // frames survived = fitness

    if (brain) {
      this.brain = brain.copy();
    } else {
      this.brain = new NeuralNetwork(5, 8, 2); // inputs, hidden, outputs
    }
  }

  think(pipes) {
    // Gather inputs relative to canvas size
    const closest = this.closestPipe(pipes);
    const inputs = [
      this.y / canvasH,                         // bird y (normalized)
      this.vel / 10,                             // bird velocity
      closest.topY / canvasH,                    // top pipe edge
      closest.bottomY / canvasH,                 // bottom pipe edge
      (closest.x - this.x) / canvasW             // horizontal distance
    ];

    const output = this.brain.predict(inputs);
    if (output[0] > output[1]) {
      this.flap();
    }
  }

  flap() {
    this.vel = -8;
  }

  update() {
    this.vel += this.gravity;
    this.y += this.vel;
    this.score++;
  }
}
```

### Generational Loop

```js
const TOTAL_BIRDS = 200;
const MUTATION_RATE = 0.1;
let birds = [];

function setup() {
  for (let i = 0; i < TOTAL_BIRDS; i++) {
    birds.push(new Bird());
  }
}

function nextGeneration() {
  // Fitness = score (frames survived)
  // Normalize fitness
  const maxScore = Math.max(...birds.map(b => b.score));
  for (const b of birds) {
    b.fitness = b.score / maxScore;
  }

  const newBirds = [];

  // Elitism: keep the best bird
  const best = birds.reduce((a, b) => a.score > b.score ? a : b);
  newBirds.push(new Bird(best.brain));

  // Fill the rest
  while (newBirds.length < TOTAL_BIRDS) {
    const parent = weightedSelection(birds);
    const child = new Bird(parent.brain);
    child.brain.mutate(MUTATION_RATE);
    newBirds.push(child);
  }

  birds = newBirds;
}

function weightedSelection(population) {
  let index = 0;
  let r = Math.random();
  while (r > 0 && index < population.length) {
    r -= population[index].fitness /
         population.reduce((s, b) => s + b.fitness, 0);
    index++;
  }
  return population[Math.max(0, index - 1)];
}
```

### Key Design Decisions

| Decision | Choice | Rationale |
|----------|--------|-----------|
| Inputs | 5 normalized values | Minimal but sufficient for the task |
| Hidden layer | 8 neurons | Small network evolves faster |
| Selection | Weighted + elitism | Prevents losing the best solution |
| Mutation rate | 10% | Higher than typical GA because the search space (weight space) is continuous |
| Crossover | None (single parent + mutation) | Simpler; crossover of neural weights often destructive |

---

## Complete GA Template

A reusable skeleton for any genetic algorithm:

```js
class GeneticAlgorithm {
  constructor(popSize, geneLength, fitnessFunction, options = {}) {
    this.popSize = popSize;
    this.geneLength = geneLength;
    this.fitnessFunction = fitnessFunction;
    this.mutationRate = options.mutationRate || 0.01;
    this.eliteCount = options.eliteCount || 1;
    this.generation = 0;
    this.bestFitness = 0;
    this.bestGenes = null;

    this.population = [];
    for (let i = 0; i < popSize; i++) {
      this.population.push(new DNA(geneLength));
    }
  }

  evolve() {
    // Evaluate
    for (const ind of this.population) {
      ind.fitness = this.fitnessFunction(ind);
    }

    // Track best
    const sorted = [...this.population].sort((a, b) => b.fitness - a.fitness);
    if (sorted[0].fitness > this.bestFitness) {
      this.bestFitness = sorted[0].fitness;
      this.bestGenes = [...sorted[0].genes];
    }

    // Selection + Reproduction
    const next = [];

    // Elitism
    for (let i = 0; i < this.eliteCount; i++) {
      next.push(sorted[i].copy());
    }

    // Breed
    this.normalizeFitness();
    while (next.length < this.popSize) {
      const a = this.select();
      const b = this.select();
      let child = a.crossover(b);
      child.mutate(this.mutationRate);
      next.push(child);
    }

    this.population = next;
    this.generation++;
  }

  normalizeFitness() {
    const sum = this.population.reduce((s, ind) => s + ind.fitness, 0);
    for (const ind of this.population) {
      ind.normalizedFitness = sum > 0 ? ind.fitness / sum : 1 / this.popSize;
    }
  }

  select() {
    let r = Math.random();
    for (const ind of this.population) {
      r -= ind.normalizedFitness;
      if (r <= 0) return ind;
    }
    return this.population[this.population.length - 1];
  }
}
```

---

## Checklist

Before coding an evolutionary system:

- [ ] Define the **genotype** representation (array of numbers? strings? vectors?)
- [ ] Define the **phenotype** mapping (how genes become behavior)
- [ ] Design the **fitness function** (what does "good" mean?)
- [ ] Choose a **selection method** (pool, weighted, tournament, elitist?)
- [ ] Choose a **crossover operator** (midpoint, uniform, or none?)
- [ ] Set an initial **mutation rate** and decide if it should adapt
- [ ] Decide **population size** (larger = more diversity, slower per generation)
- [ ] Decide **generation strategy** (discrete generations vs continuous ecosystem)
- [ ] Make all values **responsive to canvas size** — positions, speeds, and distances should be normalized or relative