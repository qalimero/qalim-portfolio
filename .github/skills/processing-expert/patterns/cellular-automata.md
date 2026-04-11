# Cellular Automata — Pattern Reference

Cellular automata (CA) are discrete computational systems where simple local rules produce emergent global behavior. This reference covers 1D elementary CA, 2D Game of Life, and advanced variations — all in plain JavaScript with `class` syntax.

---

## Table of Contents

1. [Core Concepts](#core-concepts)
2. [1D Wolfram Elementary CA](#1d-wolfram-elementary-ca)
3. [Binary-to-Decimal Rule Naming](#binary-to-decimal-rule-naming)
4. [Wolfram Classification](#wolfram-classification)
5. [2D Game of Life](#2d-game-of-life)
6. [Object-Oriented Cells](#object-oriented-cells)
7. [Two-Array Swap Pattern](#two-array-swap-pattern)
8. [Edge Handling Strategies](#edge-handling-strategies)
9. [Variations and Extensions](#variations-and-extensions)
10. [Moving Cells and Nested CA](#moving-cells-and-nested-ca)
11. [Performance Considerations](#performance-considerations)

---

## Core Concepts

A cellular automaton consists of:

| Component       | Description                                                  |
| --------------- | ------------------------------------------------------------ |
| **Cell**        | A discrete unit holding a state (e.g. 0 or 1)               |
| **Grid**        | A lattice of cells (1D array, 2D array, hex grid, etc.)     |
| **Neighborhood** | The set of cells that influence a given cell's next state   |
| **Rule**        | A function mapping current neighborhood → next state         |
| **Generation**  | One synchronous application of the rule to every cell        |

**Key invariant:** all cells read from the *current* generation and write to the *next* generation simultaneously. Never update cells in-place while iterating — this breaks synchronous update semantics.

---

## 1D Wolfram Elementary CA

### Model

- A row of cells, each either `0` or `1`.
- Each cell's next state depends on itself and its two immediate neighbors (a 3-cell neighborhood).
- 2^3 = 8 possible neighborhood patterns → an 8-bit ruleset defines the automaton.
- Each generation is drawn as a new row beneath the previous one, producing a 2D image over time.

### Full Implementation

```js
class ElementaryCA {
  constructor(ruleset, width) {
    this.ruleset = ruleset;    // Array of 8 values (0 or 1), index = neighborhood decimal
    this.width = width;
    this.cells = new Array(width).fill(0);
    this.cells[Math.floor(width / 2)] = 1; // seed center cell
    this.generation = 0;
    this.history = [this.cells.slice()];    // store all generations for rendering
  }

  /**
   * Look up the ruleset for a 3-cell neighborhood.
   * Left, center, right are each 0 or 1.
   * The neighborhood forms a 3-bit binary number (left is MSB).
   */
  applyRule(left, center, right) {
    const index = (left << 2) | (center << 1) | right; // 0..7
    return this.ruleset[index];
  }

  /**
   * Compute the next generation.
   * Uses wrap-around edges by default.
   */
  step() {
    const next = new Array(this.width);
    for (let i = 0; i < this.width; i++) {
      const left   = this.cells[(i - 1 + this.width) % this.width];
      const center = this.cells[i];
      const right  = this.cells[(i + 1) % this.width];
      next[i] = this.applyRule(left, center, right);
    }
    this.cells = next;
    this.generation++;
    this.history.push(this.cells.slice());
  }

  /**
   * Run multiple generations at once.
   */
  run(steps) {
    for (let i = 0; i < steps; i++) {
      this.step();
    }
  }

  /**
   * Draw all generations onto a canvas.
   * Each cell is a square of the given size.
   */
  draw(ctx, cellSize = 4) {
    for (let gen = 0; gen < this.history.length; gen++) {
      const row = this.history[gen];
      for (let i = 0; i < row.length; i++) {
        if (row[i] === 1) {
          ctx.fillStyle = '#000';
          ctx.fillRect(i * cellSize, gen * cellSize, cellSize, cellSize);
        }
      }
    }
  }
}
```

### Usage

```js
// Rule 30 — chaotic, used for pseudorandom number generation
const rule30 = rulesetFromNumber(30);
const ca = new ElementaryCA(rule30, 201);
ca.run(100);
ca.draw(ctx, 3);
```

---

## Binary-to-Decimal Rule Naming

Stephen Wolfram names each elementary CA by treating the 8-bit ruleset as a binary number.

### Formula

Given a ruleset array `[r0, r1, r2, r3, r4, r5, r6, r7]`:

```
ruleNumber = r7·2^7 + r6·2^6 + r5·2^5 + r4·2^4 + r3·2^3 + r2·2^2 + r1·2^1 + r0·2^0
```

There are 2^8 = **256 possible elementary CAs** (Rule 0 through Rule 255).

### Conversion Functions

```js
/**
 * Convert a rule number (0–255) to an 8-element ruleset array.
 * Index 0 corresponds to neighborhood 000 (decimal 0),
 * index 7 corresponds to neighborhood 111 (decimal 7).
 */
function rulesetFromNumber(ruleNumber) {
  const ruleset = new Array(8);
  for (let i = 0; i < 8; i++) {
    ruleset[i] = (ruleNumber >> i) & 1;
  }
  return ruleset;
}

/**
 * Convert an 8-element ruleset array back to a rule number.
 */
function numberFromRuleset(ruleset) {
  let n = 0;
  for (let i = 0; i < 8; i++) {
    n += ruleset[i] * (1 << i);
  }
  return n;
}
```

### Notable Rules

| Rule | Behavior                                        |
| ---- | ----------------------------------------------- |
| 30   | Chaotic, aperiodic — used in Mathematica's RNG  |
| 90   | Sierpiński triangle (fractal)                   |
| 110  | Proven Turing-complete                          |
| 184  | Traffic flow model                              |
| 0    | All cells die (trivial)                         |
| 255  | All cells alive (trivial)                       |

---

## Wolfram Classification

Wolfram categorized all 256 elementary CAs into four behavioral classes:

| Class | Behavior                  | Example Rules | Visual Pattern                     |
| ----- | ------------------------- | ------------- | ---------------------------------- |
| 1     | Homogeneity               | 0, 32, 160    | Converges to uniform state         |
| 2     | Periodicity / stable      | 4, 108, 218   | Repeating or static structures     |
| 3     | Chaos / randomness        | 30, 45, 73    | Aperiodic, pseudo-random           |
| 4     | Complexity (edge of chaos)| 110, 54       | Localized structures + interaction |

**Class 4** is the most interesting — it lives at the boundary between order and chaos. Rule 110 was proven capable of universal computation by Matthew Cook in 2004.

### Detecting the Class Programmatically

While formal classification is undecidable in general, heuristics include:

```js
class CAClassifier {
  /**
   * Measure entropy of a generation as a rough complexity indicator.
   * Returns a value between 0 (uniform) and 1 (maximum disorder).
   */
  static shannonEntropy(cells) {
    const n = cells.length;
    if (n === 0) return 0;

    const counts = {};
    for (const c of cells) {
      counts[c] = (counts[c] || 0) + 1;
    }

    let entropy = 0;
    for (const state in counts) {
      const p = counts[state] / n;
      if (p > 0) {
        entropy -= p * Math.log2(p);
      }
    }
    return entropy; // 0 = uniform, 1 = maximum for binary states
  }

  /**
   * Compute entropy over many generations and analyze the trend.
   * - Drops to 0 quickly           → Class 1
   * - Stabilizes at a low value    → Class 2
   * - Stays near 1 (max)           → Class 3
   * - Fluctuates in a middle range → Class 4
   */
  static analyzeCA(ca, generations = 200) {
    const entropies = [];
    for (let i = 0; i < generations; i++) {
      ca.step();
      entropies.push(CAClassifier.shannonEntropy(ca.cells));
    }
    return entropies;
  }
}
```

---

## 2D Game of Life

### Rules (Conway, 1970)

Given a cell and its **8 Moore neighbors** (cardinal + diagonal):

| Current State | Live Neighbors | Next State | Rule Name        |
| ------------- | -------------- | ---------- | ---------------- |
| Alive         | < 2            | Dead       | Underpopulation  |
| Alive         | 2 or 3         | Alive      | Stasis           |
| Alive         | > 3            | Dead       | Overpopulation   |
| Dead          | exactly 3      | Alive      | Reproduction     |

Shorthand notation: **B3/S23** (Born with 3 neighbors, Survives with 2 or 3).

### Full Implementation

```js
class GameOfLife {
  /**
   * @param {number} cols - Number of columns.
   * @param {number} rows - Number of rows.
   * @param {string} edgeMode - 'wrap' or 'constant' (dead boundary).
   */
  constructor(cols, rows, edgeMode = 'wrap') {
    this.cols = cols;
    this.rows = rows;
    this.edgeMode = edgeMode;

    // Two grids for double-buffering (current and next generation)
    this.current = this.createGrid();
    this.next    = this.createGrid();
    this.generation = 0;
  }

  createGrid() {
    const grid = new Array(this.cols);
    for (let x = 0; x < this.cols; x++) {
      grid[x] = new Array(this.rows).fill(0);
    }
    return grid;
  }

  /**
   * Randomize the grid with a given probability of a cell being alive.
   */
  randomize(probability = 0.3) {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        this.current[x][y] = Math.random() < probability ? 1 : 0;
      }
    }
  }

  /**
   * Set a specific cell state.
   */
  setCell(x, y, state) {
    if (x >= 0 && x < this.cols && y >= 0 && y < this.rows) {
      this.current[x][y] = state;
    }
  }

  /**
   * Safely read a cell value, handling edges per edgeMode.
   */
  getCell(x, y) {
    if (this.edgeMode === 'wrap') {
      const wx = ((x % this.cols) + this.cols) % this.cols;
      const wy = ((y % this.rows) + this.rows) % this.rows;
      return this.current[wx][wy];
    }
    // Constant boundary — treat out-of-bounds as dead
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
      return 0;
    }
    return this.current[x][y];
  }

  /**
   * Count the 8 Moore neighbors of a cell.
   */
  countNeighbors(x, y) {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue; // skip self
        count += this.getCell(x + dx, y + dy);
      }
    }
    return count;
  }

  /**
   * Apply B3/S23 rules and advance one generation.
   * Reads from this.current, writes to this.next, then swaps.
   */
  step() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const state = this.current[x][y];
        const neighbors = this.countNeighbors(x, y);

        if (state === 1) {
          // Survival: alive cells with 2 or 3 neighbors survive
          this.next[x][y] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
        } else {
          // Birth: dead cells with exactly 3 neighbors come alive
          this.next[x][y] = (neighbors === 3) ? 1 : 0;
        }
      }
    }

    // Swap buffers — the old "next" becomes "current"
    [this.current, this.next] = [this.next, this.current];
    this.generation++;
  }

  /**
   * Draw onto a canvas context.
   */
  draw(ctx, cellSize = 8) {
    ctx.clearRect(0, 0, this.cols * cellSize, this.rows * cellSize);
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (this.current[x][y] === 1) {
          ctx.fillStyle = '#000';
          ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
        }
      }
    }
  }

  /**
   * Load a pattern (array of [x, y] offsets) at a given position.
   */
  loadPattern(pattern, offsetX = 0, offsetY = 0) {
    for (const [px, py] of pattern) {
      this.setCell(offsetX + px, offsetY + py, 1);
    }
  }
}
```

### Common Patterns

```js
// Glider — moves diagonally
const GLIDER = [[1,0], [2,1], [0,2], [1,2], [2,2]];

// Blinker — period-2 oscillator
const BLINKER = [[0,0], [1,0], [2,0]];

// R-pentomino — evolves for 1103 generations before stabilizing
const R_PENTOMINO = [[1,0], [2,0], [0,1], [1,1], [1,2]];

// Gosper glider gun — produces gliders indefinitely
const GOSPER_GUN = [
  [24,0],[22,1],[24,1],[12,2],[13,2],[20,2],[21,2],[34,2],[35,2],
  [11,3],[15,3],[20,3],[21,3],[34,3],[35,3],[0,4],[1,4],[10,4],
  [16,4],[20,4],[21,4],[0,5],[1,5],[10,5],[14,5],[16,5],[17,5],
  [22,5],[24,5],[10,6],[16,6],[24,6],[11,7],[15,7],[12,8],[13,8]
];
```

### Usage

```js
const canvas = document.getElementById('life');
const ctx = canvas.getContext('2d');
const cellSize = 6;
const cols = Math.floor(canvas.width / cellSize);
const rows = Math.floor(canvas.height / cellSize);

const life = new GameOfLife(cols, rows, 'wrap');
life.loadPattern(GOSPER_GUN, 10, 10);

function animate() {
  life.step();
  life.draw(ctx, cellSize);
  requestAnimationFrame(animate);
}
animate();
```

---

## Object-Oriented Cells

For richer simulations, encapsulate each cell as an object that tracks state history, color, or custom properties.

```js
class Cell {
  /**
   * @param {number} x - Grid column.
   * @param {number} y - Grid row.
   * @param {number} state - Initial state (0 = dead, 1 = alive).
   */
  constructor(x, y, state = 0) {
    this.x = x;
    this.y = y;
    this.state = state;
    this.nextState = state;
    this.age = 0;                   // how many consecutive generations alive
    this.history = [state];         // full state history
  }

  /**
   * Prepare the next state (does not apply it yet).
   */
  computeNext(neighbors) {
    if (this.state === 1) {
      this.nextState = (neighbors === 2 || neighbors === 3) ? 1 : 0;
    } else {
      this.nextState = (neighbors === 3) ? 1 : 0;
    }
  }

  /**
   * Apply the prepared next state. Call this only after ALL cells
   * have computed their next state.
   */
  advance() {
    this.state = this.nextState;
    if (this.state === 1) {
      this.age++;
    } else {
      this.age = 0;
    }
    this.history.push(this.state);
  }

  /**
   * Get a color based on age for visual richness.
   */
  getColor() {
    if (this.state === 0) return '#fff';
    // Fade from bright green to dark green as cell ages
    const brightness = Math.max(40, 255 - this.age * 10);
    return `rgb(0, ${brightness}, 0)`;
  }

  /**
   * Draw this cell.
   */
  draw(ctx, cellSize) {
    ctx.fillStyle = this.getColor();
    ctx.fillRect(this.x * cellSize, this.y * cellSize, cellSize, cellSize);
  }
}
```

### OO Grid Manager

```js
class CellGrid {
  constructor(cols, rows, edgeMode = 'wrap') {
    this.cols = cols;
    this.rows = rows;
    this.edgeMode = edgeMode;
    this.generation = 0;

    // Build the 2D array of Cell objects
    this.grid = new Array(cols);
    for (let x = 0; x < cols; x++) {
      this.grid[x] = new Array(rows);
      for (let y = 0; y < rows; y++) {
        this.grid[x][y] = new Cell(x, y, 0);
      }
    }
  }

  getCell(x, y) {
    if (this.edgeMode === 'wrap') {
      x = ((x % this.cols) + this.cols) % this.cols;
      y = ((y % this.rows) + this.rows) % this.rows;
      return this.grid[x][y];
    }
    if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
      return null;
    }
    return this.grid[x][y];
  }

  countNeighbors(x, y) {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const neighbor = this.getCell(x + dx, y + dy);
        if (neighbor) count += neighbor.state;
      }
    }
    return count;
  }

  step() {
    // Phase 1: compute all next states
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const neighbors = this.countNeighbors(x, y);
        this.grid[x][y].computeNext(neighbors);
      }
    }

    // Phase 2: apply all next states simultaneously
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        this.grid[x][y].advance();
      }
    }

    this.generation++;
  }

  draw(ctx, cellSize) {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        this.grid[x][y].draw(ctx, cellSize);
      }
    }
  }
}
```

---

## Two-Array Swap Pattern

The double-buffering (swap) pattern is the canonical approach for synchronous CA update. It ensures no cell reads a partially-updated grid.

### Principle

```
Generation t:   [current] ← all cells read from here
                [next]    ← all cells write to here

After step:     swap current ↔ next
```

### Array-Based Swap

```js
class DoubleBufferGrid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.bufferA = this.createBuffer();
    this.bufferB = this.createBuffer();
    this.current = this.bufferA;
    this.next = this.bufferB;
  }

  createBuffer() {
    const buf = new Array(this.cols);
    for (let x = 0; x < this.cols; x++) {
      buf[x] = new Array(this.rows).fill(0);
    }
    return buf;
  }

  step(ruleFunction) {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        // ruleFunction reads from this.current, writes result to this.next
        this.next[x][y] = ruleFunction(this.current, x, y, this.cols, this.rows);
      }
    }
    // Swap references — O(1), no copying
    [this.current, this.next] = [this.next, this.current];
  }
}
```

### Why Not Copy?

| Approach               | Cost per step       | Notes                          |
| ---------------------- | ------------------- | ------------------------------ |
| Reference swap         | O(1)                | Best — just swap two pointers  |
| Deep copy then mutate  | O(cols × rows)      | Wasteful allocation each frame |
| In-place update        | **Incorrect**       | Breaks synchronous semantics   |

Always prefer reference swapping over copying.

### Flat Array Variant (Better Cache Performance)

```js
class FlatDoubleBuffer {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.size = cols * rows;
    this.bufferA = new Uint8Array(this.size);
    this.bufferB = new Uint8Array(this.size);
    this.current = this.bufferA;
    this.next = this.bufferB;
  }

  index(x, y) {
    return y * this.cols + x;
  }

  get(x, y) {
    // Wrap-around
    x = ((x % this.cols) + this.cols) % this.cols;
    y = ((y % this.rows) + this.rows) % this.rows;
    return this.current[this.index(x, y)];
  }

  step() {
    for (let y = 0; y < this.rows; y++) {
      for (let x = 0; x < this.cols; x++) {
        let neighbors = 0;
        for (let dy = -1; dy <= 1; dy++) {
          for (let dx = -1; dx <= 1; dx++) {
            if (dx === 0 && dy === 0) continue;
            neighbors += this.get(x + dx, y + dy);
          }
        }
        const idx = this.index(x, y);
        const alive = this.current[idx];
        if (alive) {
          this.next[idx] = (neighbors === 2 || neighbors === 3) ? 1 : 0;
        } else {
          this.next[idx] = (neighbors === 3) ? 1 : 0;
        }
      }
    }
    [this.current, this.next] = [this.next, this.current];
  }

  /**
   * Render directly to an ImageData for maximum speed.
   */
  drawToImageData(imageData) {
    const data = imageData.data;
    for (let i = 0; i < this.size; i++) {
      const offset = i * 4;
      const val = this.current[i] === 1 ? 0 : 255;
      data[offset]     = val; // R
      data[offset + 1] = val; // G
      data[offset + 2] = val; // B
      data[offset + 3] = 255; // A
    }
  }
}
```

---

## Edge Handling Strategies

### 1. Constant Boundary (Dead Border)

Cells outside the grid are treated as a fixed value (typically 0/dead).

```js
getCell(x, y) {
  if (x < 0 || x >= this.cols || y < 0 || y >= this.rows) {
    return 0; // Dead boundary
  }
  return this.current[x][y];
}
```

**Pros:** Simple, no modular arithmetic.
**Cons:** Edge cells behave differently — patterns get "absorbed" at boundaries.

### 2. Wrap-Around (Toroidal Topology)

The grid wraps so that the top connects to the bottom and left connects to the right, forming a torus.

```js
getCell(x, y) {
  const wx = ((x % this.cols) + this.cols) % this.cols;
  const wy = ((y % this.rows) + this.rows) % this.rows;
  return this.current[wx][wy];
}
```

**Pros:** No edge artifacts. Patterns can travel indefinitely.
**Cons:** Small grids can cause self-interference. Slightly more expensive per lookup.

### 3. Mirror (Reflective) Boundary

Cells beyond the edge reflect back into the grid.

```js
getCell(x, y) {
  // Clamp to valid range by reflecting
  if (x < 0) x = -x;
  if (x >= this.cols) x = 2 * (this.cols - 1) - x;
  if (y < 0) y = -y;
  if (y >= this.rows) y = 2 * (this.rows - 1) - y;
  return this.current[x][y];
}
```

### 4. Custom Boundary Function

For maximum flexibility, parameterize the boundary strategy.

```js
class FlexibleGrid {
  constructor(cols, rows, boundaryFn) {
    this.cols = cols;
    this.rows = rows;
    this.boundaryFn = boundaryFn || FlexibleGrid.wrapBoundary;
    // ... grid init
  }

  static deadBoundary(x, y, cols, rows) {
    if (x < 0 || x >= cols || y < 0 || y >= rows) return { x: -1, y: -1, value: 0 };
    return { x, y, value: null }; // null = read from grid
  }

  static wrapBoundary(x, y, cols, rows) {
    return {
      x: ((x % cols) + cols) % cols,
      y: ((y % rows) + rows) % rows,
      value: null,
    };
  }

  getCell(x, y) {
    const result = this.boundaryFn(x, y, this.cols, this.rows);
    if (result.value !== null) return result.value;
    return this.current[result.x][result.y];
  }
}
```

---

## Variations and Extensions

### Hexagonal Grid CA

Hexagonal grids give each cell 6 neighbors instead of 8, producing rounder, more organic patterns.

```js
class HexCA {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.current = this.createGrid();
    this.next = this.createGrid();
  }

  createGrid() {
    const grid = new Array(this.cols);
    for (let x = 0; x < this.cols; x++) {
      grid[x] = new Array(this.rows).fill(0);
    }
    return grid;
  }

  /**
   * Hex neighbors differ depending on whether the row is even or odd
   * (offset coordinates / "even-r" layout).
   */
  getNeighborOffsets(y) {
    if (y % 2 === 0) {
      // Even row
      return [[-1, 0], [1, 0], [0, -1], [0, 1], [-1, -1], [-1, 1]];
    } else {
      // Odd row
      return [[-1, 0], [1, 0], [0, -1], [0, 1], [1, -1], [1, 1]];
    }
  }

  countNeighbors(x, y) {
    let count = 0;
    const offsets = this.getNeighborOffsets(y);
    for (const [dx, dy] of offsets) {
      const nx = ((x + dx) + this.cols) % this.cols;
      const ny = ((y + dy) + this.rows) % this.rows;
      count += this.current[nx][ny];
    }
    return count;
  }

  step(birthSet, survivalSet) {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const neighbors = this.countNeighbors(x, y);
        if (this.current[x][y] === 1) {
          this.next[x][y] = survivalSet.has(neighbors) ? 1 : 0;
        } else {
          this.next[x][y] = birthSet.has(neighbors) ? 1 : 0;
        }
      }
    }
    [this.current, this.next] = [this.next, this.current];
  }

  /**
   * Draw hexagonal cells onto a canvas.
   */
  draw(ctx, hexSize = 8) {
    const w = hexSize * Math.sqrt(3);
    const h = hexSize * 2;
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        if (this.current[x][y] === 0) continue;

        // Compute pixel position for offset hex layout
        const px = x * w + (y % 2 === 1 ? w / 2 : 0);
        const py = y * h * 0.75;

        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
          const angle = (Math.PI / 3) * i - Math.PI / 6;
          const hx = px + hexSize * Math.cos(angle);
          const hy = py + hexSize * Math.sin(angle);
          if (i === 0) ctx.moveTo(hx, hy);
          else ctx.lineTo(hx, hy);
        }
        ctx.closePath();
        ctx.fillStyle = '#333';
        ctx.fill();
      }
    }
  }
}
```

### Probabilistic / Stochastic CA

Rules apply with a probability rather than deterministically.

```js
class StochasticLife {
  constructor(cols, rows, noise = 0.01) {
    this.cols = cols;
    this.rows = rows;
    this.noise = noise; // probability of random state flip
    this.current = this.createGrid();
    this.next = this.createGrid();
  }

  createGrid() {
    const g = new Array(this.cols);
    for (let x = 0; x < this.cols; x++) {
      g[x] = new Array(this.rows).fill(0);
    }
    return g;
  }

  step() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const neighbors = this.countNeighbors(x, y);
        let nextState;

        // Standard Conway rules
        if (this.current[x][y] === 1) {
          nextState = (neighbors === 2 || neighbors === 3) ? 1 : 0;
        } else {
          nextState = (neighbors === 3) ? 1 : 0;
        }

        // Stochastic flip
        if (Math.random() < this.noise) {
          nextState = 1 - nextState;
        }

        this.next[x][y] = nextState;
      }
    }
    [this.current, this.next] = [this.next, this.current];
  }

  countNeighbors(x, y) {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = ((x + dx) + this.cols) % this.cols;
        const ny = ((y + dy) + this.rows) % this.rows;
        count += this.current[nx][ny];
      }
    }
    return count;
  }
}
```

### Continuous-State CA

Instead of binary 0/1, cells hold a floating-point value in [0, 1].

```js
class ContinuousCA {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.current = this.createGrid();
    this.next = this.createGrid();
  }

  createGrid() {
    const grid = new Array(this.cols);
    for (let x = 0; x < this.cols; x++) {
      grid[x] = new Float32Array(this.rows); // 0.0 to 1.0
    }
    return grid;
  }

  randomize() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        this.current[x][y] = Math.random();
      }
    }
  }

  /**
   * Average of Moore neighborhood with a nonlinear activation function.
   * Produces smooth, organic, coral-like growth.
   */
  step() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        let sum = 0;
        let count = 0;
        for (let dx = -1; dx <= 1; dx++) {
          for (let dy = -1; dy <= 1; dy++) {
            const nx = ((x + dx) + this.cols) % this.cols;
            const ny = ((y + dy) + this.rows) % this.rows;
            sum += this.current[nx][ny];
            count++;
          }
        }
        const avg = sum / count;

        // Nonlinear activation: push toward 0 or 1 based on threshold
        // with some smoothing to keep it continuous
        const threshold = 0.5;
        const rate = 0.1;
        const delta = (avg > threshold ? 1 : 0) - this.current[x][y];
        this.next[x][y] = Math.max(0, Math.min(1, this.current[x][y] + delta * rate));
      }
    }
    [this.current, this.next] = [this.next, this.current];
  }

  draw(ctx, cellSize) {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const val = this.current[x][y];
        const brightness = Math.floor(val * 255);
        ctx.fillStyle = `rgb(${brightness}, ${brightness}, ${brightness})`;
        ctx.fillRect(x * cellSize, y * cellSize, cellSize, cellSize);
      }
    }
  }
}
```

### Generalized Rule Notation

Many 2D CA can be expressed in **B/S notation** (also called "Life-like" rules):

```js
class LifeLikeCA {
  /**
   * @param {number[]} birth - Array of neighbor counts that cause birth.
   * @param {number[]} survival - Array of neighbor counts that allow survival.
   */
  constructor(cols, rows, birth, survival) {
    this.cols = cols;
    this.rows = rows;
    this.birthSet = new Set(birth);
    this.survivalSet = new Set(survival);
    this.current = this.createGrid();
    this.next = this.createGrid();
  }

  createGrid() {
    const g = new Array(this.cols);
    for (let x = 0; x < this.cols; x++) {
      g[x] = new Uint8Array(this.rows);
    }
    return g;
  }

  step() {
    for (let x = 0; x < this.cols; x++) {
      for (let y = 0; y < this.rows; y++) {
        const n = this.countNeighbors(x, y);
        if (this.current[x][y] === 1) {
          this.next[x][y] = this.survivalSet.has(n) ? 1 : 0;
        } else {
          this.next[x][y] = this.birthSet.has(n) ? 1 : 0;
        }
      }
    }
    [this.current, this.next] = [this.next, this.current];
  }

  countNeighbors(x, y) {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = ((x + dx) + this.cols) % this.cols;
        const ny = ((y + dy) + this.rows) % this.rows;
        count += this.current[nx][ny];
      }
    }
    return count;
  }
}

// Famous Life-like rules:
// Conway's Life:    B3/S23
const life    = new LifeLikeCA(100, 100, [3],       [2, 3]);

// HighLife:         B36/S23 — has a replicator
const highLife = new LifeLikeCA(100, 100, [3, 6],   [2, 3]);

// Day & Night:      B3678/S34678
const dayNight = new LifeLikeCA(100, 100, [3,6,7,8], [3,4,6,7,8]);

// Seeds:            B2/S (no survival — all alive cells die)
const seeds   = new LifeLikeCA(100, 100, [2],       []);

// Diamoeba:         B35678/S5678 — organic, diamond-like shapes
const diamoeba = new LifeLikeCA(100, 100, [3,5,6,7,8], [5,6,7,8]);
```

---

## Moving Cells and Nested CA

### Moving Cells

Combine cellular automata with particle-like motion. Each cell can move within the grid based on local rules.

```js
class MovingCell {
  constructor(x, y, state = 1) {
    this.x = x;
    this.y = y;
    this.state = state;
    this.vx = 0;
    this.vy = 0;
  }
}

class MovingCellCA {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.cells = [];
    this.grid = this.createGrid(); // occupancy grid
  }

  createGrid() {
    const g = new Array(this.cols);
    for (let x = 0; x < this.cols; x++) {
      g[x] = new Array(this.rows).fill(null);
    }
    return g;
  }

  addCell(x, y) {
    if (this.grid[x][y] === null) {
      const cell = new MovingCell(x, y);
      this.cells.push(cell);
      this.grid[x][y] = cell;
    }
  }

  /**
   * Each cell moves toward regions of moderate density.
   * Avoids empty space (lonely) and overcrowded areas.
   */
  step() {
    // Phase 1: Compute desired movements
    for (const cell of this.cells) {
      const { x, y } = cell;
      let bestDir = null;
      let bestScore = -Infinity;

      // Check all 8 neighbors plus staying put
      for (let dx = -1; dx <= 1; dx++) {
        for (let dy = -1; dy <= 1; dy++) {
          const nx = ((x + dx) + this.cols) % this.cols;
          const ny = ((y + dy) + this.rows) % this.rows;
          if (this.grid[nx][ny] !== null && !(dx === 0 && dy === 0)) continue;

          const neighbors = this.countNeighborsAt(nx, ny);
          // Prefer moderate density (ideal = 3 neighbors)
          const score = -Math.abs(neighbors - 3);
          if (score > bestScore) {
            bestScore = score;
            bestDir = { dx, dy };
          }
        }
      }

      if (bestDir) {
        cell.vx = bestDir.dx;
        cell.vy = bestDir.dy;
      }
    }

    // Phase 2: Apply movements (with collision avoidance)
    const newGrid = this.createGrid();
    for (const cell of this.cells) {
      const nx = ((cell.x + cell.vx) + this.cols) % this.cols;
      const ny = ((cell.y + cell.vy) + this.rows) % this.rows;

      if (newGrid[nx][ny] === null) {
        cell.x = nx;
        cell.y = ny;
        newGrid[nx][ny] = cell;
      } else {
        // Collision — stay in place if possible
        if (newGrid[cell.x][cell.y] === null) {
          newGrid[cell.x][cell.y] = cell;
        }
      }
    }
    this.grid = newGrid;
  }

  countNeighborsAt(x, y) {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = ((x + dx) + this.cols) % this.cols;
        const ny = ((y + dy) + this.rows) % this.rows;
        if (this.grid[nx][ny] !== null) count++;
      }
    }
    return count;
  }
}
```

### Nested CA (CA within CA)

Each "cell" in the outer CA is itself a CA. The outer state aggregates the inner CA's state.

```js
class NestedCA {
  constructor(outerCols, outerRows, innerCols, innerRows) {
    this.outerCols = outerCols;
    this.outerRows = outerRows;

    // Each outer cell contains its own Game of Life
    this.innerGrids = new Array(outerCols);
    for (let x = 0; x < outerCols; x++) {
      this.innerGrids[x] = new Array(outerRows);
      for (let y = 0; y < outerRows; y++) {
        this.innerGrids[x][y] = new GameOfLife(innerCols, innerRows, 'wrap');
        this.innerGrids[x][y].randomize(0.3);
      }
    }

    this.outerCurrent = this.createOuterGrid();
    this.outerNext = this.createOuterGrid();
    this.updateOuterStates();
  }

  createOuterGrid() {
    const g = new Array(this.outerCols);
    for (let x = 0; x < this.outerCols; x++) {
      g[x] = new Array(this.outerRows).fill(0);
    }
    return g;
  }

  /**
   * Determine outer cell state from inner CA population.
   * Alive if more than 40% of inner cells are alive.
   */
  getOuterState(innerLife) {
    let alive = 0;
    for (let x = 0; x < innerLife.cols; x++) {
      for (let y = 0; y < innerLife.rows; y++) {
        alive += innerLife.current[x][y];
      }
    }
    const density = alive / (innerLife.cols * innerLife.rows);
    return density > 0.4 ? 1 : 0;
  }

  updateOuterStates() {
    for (let x = 0; x < this.outerCols; x++) {
      for (let y = 0; y < this.outerRows; y++) {
        this.outerCurrent[x][y] = this.getOuterState(this.innerGrids[x][y]);
      }
    }
  }

  step() {
    // Step all inner CAs
    for (let x = 0; x < this.outerCols; x++) {
      for (let y = 0; y < this.outerRows; y++) {
        this.innerGrids[x][y].step();
      }
    }

    // Recompute outer states from inner CAs
    this.updateOuterStates();

    // Optionally apply outer-level CA rules that feed back into inner CAs
    // For example, inject energy into inner CAs based on outer neighbors
    for (let x = 0; x < this.outerCols; x++) {
      for (let y = 0; y < this.outerRows; y++) {
        const outerNeighbors = this.countOuterNeighbors(x, y);
        // If outer cell is dead but has exactly 3 outer neighbors, reseed inner CA
        if (this.outerCurrent[x][y] === 0 && outerNeighbors === 3) {
          this.innerGrids[x][y].randomize(0.5);
        }
      }
    }
  }

  countOuterNeighbors(x, y) {
    let count = 0;
    for (let dx = -1; dx <= 1; dx++) {
      for (let dy = -1; dy <= 1; dy++) {
        if (dx === 0 && dy === 0) continue;
        const nx = ((x + dx) + this.outerCols) % this.outerCols;
        const ny = ((y + dy) + this.outerRows) % this.outerRows;
        count += this.outerCurrent[nx][ny];
      }
    }
    return count;
  }
}
```

---

## Performance Considerations

### Optimization Techniques by Grid Size

| Grid Size          | Approach                                               |
| ------------------ | ------------------------------------------------------ |
| < 100×100          | Naive 2D array, OO cells fine                          |
| 100×100 – 500×500  | Flat `Uint8Array`, `ImageData` rendering               |
| 500×500 – 2000×2000| WebWorker for simulation, `OffscreenCanvas`            |
| > 2000×2000        | GPU compute (WebGL fragment shader or WebGPU compute)  |

### Typed Array Grid

```js
// Use Uint8Array for compact, cache-friendly storage
const grid = new Uint8Array(cols * rows);

// Index math: (x, y) → y * cols + x
function idx(x, y) { return y * cols + x; }
```

### Render Directly to ImageData

```js
function renderToCanvas(grid, cols, rows, ctx) {
  const imageData = ctx.createImageData(cols, rows);
  const data = imageData.data;
  for (let i = 0; i < cols * rows; i++) {
    const offset = i * 4;
    const alive = grid[i];
    data[offset]     = alive ? 0 : 255;
    data[offset + 1] = alive ? 0 : 255;
    data[offset + 2] = alive ? 0 : 255;
    data[offset + 3] = 255;
  }
  ctx.putImageData(imageData, 0, 0);
}
```

### WebWorker Offloading

```js
// main.js
const worker = new Worker('ca-worker.js');
worker.onmessage = (e) => {
  const { grid, cols, rows } = e.data;
  renderToCanvas(new Uint8Array(grid), cols, rows, ctx);
};
worker.postMessage({ command: 'init', cols: 500, rows: 500 });
worker.postMessage({ command: 'step' });

// ca-worker.js
let current, next, cols, rows;
self.onmessage = (e) => {
  if (e.data.command === 'init') {
    cols = e.data.cols;
    rows = e.data.rows;
    current = new Uint8Array(cols * rows);
    next = new Uint8Array(cols * rows);
    // Randomize...
  }
  if (e.data.command === 'step') {
    stepSimulation();
    // Transfer the buffer (zero-copy)
    self.postMessage(
      { grid: current.buffer, cols, rows },
      [current.buffer]
    );
    // After transfer, current.buffer is detached — reallocate
    current = new Uint8Array(cols * rows);
  }
};
```

### HashLife (Advanced)

For very large or long-running Game of Life simulations, Bill Gosper's **HashLife** algorithm uses memoization of quadtree nodes to skip exponentially many generations:

```js
/**
 * Simplified HashLife concept (full implementation is complex).
 * The key idea: cache the result of evolving any 2^n × 2^n block.
 */
class HashLifeNode {
  constructor(nw, ne, sw, se, level) {
    this.nw = nw;
    this.ne = ne;
    this.sw = sw;
    this.se = se;
    this.level = level;       // 2^level cells on each side
    this.result = null;       // memoized: the center 2^(level-1) block after 2^(level-2) steps
    this.population = null;   // memoized population count
  }
}

// The memo table maps (nw, ne, sw, se) → node, ensuring structural sharing.
// This allows exponential time-skipping for repetitive patterns.
```

---

## Best Practices Summary

1. **Always double-buffer.** Never update cells in-place during the same generation scan.
2. **Use `Uint8Array` for large binary grids** — much better cache performance than nested JS arrays.
3. **Separate simulation from rendering.** The CA logic should not depend on canvas or pixel sizes.
4. **Parameterize rules.** Use B/S notation or rule functions so you can explore many CAs with one codebase.
5. **Handle edges explicitly.** Choose wrap, constant, or mirror and document the choice.
6. **Render via `ImageData`** for grids larger than ~200×200 — avoid per-cell `fillRect` calls.
7. **Move heavy computation to a WebWorker** when frame rate drops below 30fps.
8. **Start simple.** Get Conway's Life working perfectly before adding continuous states, hex grids, or nesting.
9. **Profile before optimizing.** Use `performance.now()` to measure step time vs. render time separately.
10. **Consider HashLife** for simulations that need to jump millions of generations ahead.