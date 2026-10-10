import { Bottle, Move, SolverResult } from './types';

export const TUBE_CAPACITY = 4;

/**
 * Deep-clone a bottle array so rule functions never mutate their input.
 */
export function cloneBottles(bottles: Bottle[]): Bottle[] {
  return bottles.map((b) => ({ ...b, layers: [...b.layers] }));
}

/**
 * Checks if a bottle is completely solved (full and monochromatic).
 */
export function isBottleComplete(bottle: Bottle, capacity: number = TUBE_CAPACITY): boolean {
  if (bottle.layers.length !== capacity) return false;
  const first = bottle.layers[0];
  return bottle.layers.every((c) => c === first);
}

/**
 * Checks if a bottle is monochromatic (all present layers share one color).
 */
export function isBottleMonochromatic(bottle: Bottle): boolean {
  if (bottle.layers.length === 0) return true;
  const first = bottle.layers[0];
  return bottle.layers.every((c) => c === first);
}

/**
 * Number of bottles that count as "completed" toward the masked-bottle unlock.
 */
export function countCompletedBottles(bottles: Bottle[], capacity: number = TUBE_CAPACITY): number {
  let count = 0;
  for (const b of bottles) {
    if (b.countsTowardObjective !== false && isBottleComplete(b, capacity)) count++;
  }
  return count;
}

/**
 * Re-evaluates masked bottles and unlocks (drops cloth) any whose threshold is met.
 */
export function applyMaskUnlock(bottles: Bottle[], capacity: number = TUBE_CAPACITY): void {
  const completed = countCompletedBottles(bottles, capacity);
  for (const b of bottles) {
    if (b.type === 'masked' && !b.maskRevealed && (b.unlockTargetCompletedBottles ?? 0) <= completed) {
      b.maskRevealed = true;
    }
  }
}

/**
 * Checks if the whole puzzle is solved.
 * A board is solved only when every non-empty bottle is full and monochromatic,
 * and each color appears in exactly one bottle. This prevents a state with
 * multiple identical complete bottles from being accepted as a win.
 */
export function isPuzzleSolved(bottles: Bottle[], capacity: number = TUBE_CAPACITY): boolean {
  const nonEmptyBottles = bottles.filter((b) => b.layers.length > 0);
  if (nonEmptyBottles.length === 0) return true;

  for (const b of nonEmptyBottles) {
    if (!isBottleComplete(b, capacity)) return false;
  }

  const seenColors = new Set<string>();
  for (const b of nonEmptyBottles) {
    const color = b.layers[0];
    if (seenColors.has(color)) return false;
    seenColors.add(color);
  }

  return true;
}

/**
 * Top contiguous same-color run (real colors, top = last element).
 */
export function getTopColorInfo(bottle: Bottle): { color: string | null; count: number } {
  const layers = bottle.layers;
  if (layers.length === 0) return { color: null, count: 0 };
  const color = layers[layers.length - 1];
  let count = 0;
  for (let i = layers.length - 1; i >= 0; i--) {
    if (layers[i] === color) count++;
    else break;
  }
  return { color, count };
}

/**
 * How many layers can be poured OUT of a source bottle in one move.
 * For hidden bottles, only the known (visible) run above the fogged bottom
 * layers can be poured — the pour never reaches into the hidden region.
 */
export function getPourOutCount(bottle: Bottle): number {
  const layers = bottle.layers;
  if (layers.length === 0) return 0;
  const top = layers[layers.length - 1];
  const lowestVisible =
    bottle.type === 'hidden'
      ? Math.min(layers.length - 1, bottle.hiddenBottomLayers ?? 0)
      : 0;
  let count = 0;
  for (let i = layers.length - 1; i >= lowestVisible; i--) {
    if (layers[i] === top) count++;
    else break;
  }
  return count;
}

/**
 * Checks if a pour from `from` to `to` is valid.
 */
export function canPour(
  from: Bottle,
  to: Bottle,
  capacity: number = TUBE_CAPACITY
): { valid: boolean; count: number; color: string | null } {
  if (from.type === 'bottom_leak') return { valid: false, count: 0, color: null };
  if (from.layers.length === 0) return { valid: false, count: 0, color: null };
  if (to.layers.length >= capacity) return { valid: false, count: 0, color: null };

  const fromCount = getPourOutCount(from);
  if (fromCount === 0) return { valid: false, count: 0, color: null };
  const fromColor = from.layers[from.layers.length - 1];

  if (to.layers.length > 0) {
    if (to.layers[to.layers.length - 1] !== fromColor) {
      return { valid: false, count: 0, color: null };
    }
  }

  const spaceAvailable = capacity - to.layers.length;
  const countToPour = Math.min(fromCount, spaceAvailable);

  return { valid: countToPour > 0, count: countToPour, color: fromColor };
}

/**
 * Checks whether a bottom-leak from `source` into `target` is legal.
 * Empty targets are allowed and simply receive the leaked bottom layer;
 * non-empty targets must match the topmost color of the receiving bottle.
 */
export function isDirectlyBelow(
  sourceIndex: number,
  targetIndex: number,
  bottles: Bottle[] = []
): boolean {
  if (sourceIndex < 0 || targetIndex < 0 || sourceIndex === targetIndex) return false;
  if (bottles.length === 0) return false;

  const rowCount = Math.min(3, Math.max(1, Math.ceil(bottles.length / 7)));
  const rowSize = Math.ceil(bottles.length / rowCount);

  const sourceRow = Math.floor(sourceIndex / rowSize);
  const targetRow = Math.floor(targetIndex / rowSize);
  const sourceCol = sourceIndex % rowSize;
  const targetCol = targetIndex % rowSize;

  return sourceRow + 1 === targetRow && sourceCol === targetCol && targetIndex > sourceIndex;
}

export function canLeak(
  source: Bottle,
  target: Bottle,
  capacity: number = TUBE_CAPACITY,
  sourceIndex?: number,
  targetIndex?: number,
  bottles: Bottle[] = []
): boolean {
  if (source.type !== 'bottom_leak') return false;
  if (!source.leakTargetBottleId) return false;
  if (source.leakTargetBottleId !== target.id) return false;
  if (sourceIndex !== undefined && targetIndex !== undefined && !isDirectlyBelow(sourceIndex, targetIndex, bottles)) {
    return false;
  }
  if (source.layers.length === 0) return false;
  if (source.id === target.id) return false;
  if (target.layers.length >= capacity) return false;
  if (target.layers.length === 0) return true;
  return source.layers[0] === target.layers[target.layers.length - 1];
}

/**
 * Checks if there exists ANY legal move (pour or leak) in the current state.
 */
export function hasAnyLegalMove(bottles: Bottle[], capacity: number = TUBE_CAPACITY): boolean {
  const n = bottles.length;
  for (let from = 0; from < n; from++) {
    const fromBottle = bottles[from];
    if (fromBottle.type === 'bottom_leak') continue;
    if (fromBottle.layers.length === 0) continue;
    if (isBottleComplete(fromBottle, capacity)) continue;

    for (let to = 0; to < n; to++) {
      if (from === to) continue;
      if (canPour(fromBottle, bottles[to], capacity).valid) return true;
    }
  }

  for (let i = 0; i < n; i++) {
    const src = bottles[i];
    if (src.type !== 'bottom_leak' || !src.leakTargetBottleId) continue;
    const tIdx = bottles.findIndex((b) => b.id === src.leakTargetBottleId);
    if (tIdx < 0 || tIdx === i) continue;
    if (canLeak(src, bottles[tIdx], capacity)) return true;
  }

  return false;
}

/**
 * Executes a pour move, returning the new bottle array.
 */
export function executePour(
  bottles: Bottle[],
  fromIdx: number,
  toIdx: number,
  capacity: number = TUBE_CAPACITY
): { newBottles: Bottle[]; count: number; color: string } | null {
  if (bottles[fromIdx].type === 'bottom_leak') return null;
  const check = canPour(bottles[fromIdx], bottles[toIdx], capacity);
  if (!check.valid || !check.color) return null;

  const newBottles = cloneBottles(bottles);
  for (let i = 0; i < check.count; i++) newBottles[fromIdx].layers.pop();
  for (let i = 0; i < check.count; i++) newBottles[toIdx].layers.push(check.color);

  const source = newBottles[fromIdx];
  if (source.type === 'hidden') {
    // A hidden layer is revealed only once every known layer above it has been
    // poured out — i.e. once it becomes the top of the bottle.
    source.hiddenBottomLayers = Math.max(
      0,
      Math.min(source.hiddenBottomLayers ?? 0, source.layers.length - 1)
    );
  }

  applyMaskUnlock(newBottles, capacity);
  return { newBottles, count: check.count, color: check.color };
}

/**
 * Executes a single-layer bottom leak, returning the new bottle array.
 */
export function executeLeak(
  bottles: Bottle[],
  sourceIdx: number,
  targetIdx: number,
  capacity: number = TUBE_CAPACITY
): { newBottles: Bottle[]; color: string } | null {
  const source = bottles[sourceIdx];
  const target = bottles[targetIdx];
  if (!canLeak(source, target, capacity)) return null;

  const color = source.layers[0];
  const newBottles = cloneBottles(bottles);
  newBottles[sourceIdx].layers.shift();
  newBottles[targetIdx].layers.push(color);

  applyMaskUnlock(newBottles, capacity);
  return { newBottles, color };
}

/**
 * Canonical state key. Normal/empty bottles are sorted (interchangeable);
 * special bottles (masked/hidden/bottom_leak) stay in their fixed positions.
 */
function bottleSignature(b: Bottle): string {
  if (b.layers.length === 0) return 'E';
  // Hidden bottles carry their fog depth; all other bottle types are solver-equivalent
  // (masked ≡ normal since the cloth never gates a move), so their signature omits type.
  const h = b.type === 'hidden' ? `:h${b.hiddenBottomLayers ?? 0}` : '';
  return `${b.layers.join(',')}${h}`;
}

const NORMAL_PLACEHOLDER = ''; // printable sentinel marking a sortable normal/empty/masked slot

function getCanonicalKey(bottles: Bottle[]): string {
  const sortableSigs: string[] = [];
  const parts: string[] = [];
  for (const b of bottles) {
    if (b.type === 'normal' || b.type === 'empty' || b.type === 'masked') {
      sortableSigs.push(bottleSignature(b));
      parts.push(NORMAL_PLACEHOLDER);
    } else {
      parts.push(bottleSignature(b));
    }
  }
  sortableSigs.sort();
  let ni = 0;
  for (let i = 0; i < parts.length; i++) {
    if (parts[i] === NORMAL_PLACEHOLDER) parts[i] = sortableSigs[ni++];
  }
  return parts.join('|');
}

/**
 * BFS Solver. Guarantees the minimal-step solution if one exists within budget.
 */
export function solveWaterSort(
  initialBottles: Bottle[],
  capacity: number = TUBE_CAPACITY,
  maxIterations: number = 60000
): SolverResult {
  const startTime = performance.now();

  const initialState = cloneBottles(initialBottles);

  if (isPuzzleSolved(initialState, capacity)) {
    return {
      solvable: true,
      optimalSteps: 0,
      moves: [],
      visitedNodes: 1,
      timeMs: performance.now() - startTime,
    };
  }

  // Pre-check color balance
  const colorCounts: Record<string, number> = {};
  for (const b of initialState) {
    for (const color of b.layers) {
      colorCounts[color] = (colorCounts[color] || 0) + 1;
    }
  }
  for (const [c, count] of Object.entries(colorCounts)) {
    if (count % capacity !== 0) {
      return {
        solvable: false,
        optimalSteps: 0,
        moves: [],
        visitedNodes: 0,
        timeMs: performance.now() - startTime,
        reason: `颜色 [${c}] 总格数 (${count}) 不是容量 (${capacity}) 的倍数，无法完全归位！`,
      };
    }
  }

  interface QueueNode {
    bottles: Bottle[];
    moves: Move[];
  }

  const queue: QueueNode[] = [{ bottles: initialState, moves: [] }];
  let head = 0;
  const visited = new Set<string>();
  visited.add(getCanonicalKey(initialState));

  let iterations = 0;

  while (head < queue.length) {
    iterations++;
    if (iterations > maxIterations) {
      return {
        solvable: false,
        optimalSteps: 0,
        moves: [],
        visitedNodes: iterations,
        timeMs: performance.now() - startTime,
        reason: `已搜索超过 ${maxIterations} 个分支节点，搜索深度超限。`,
      };
    }

    const { bottles, moves } = queue[head++];

    if (isPuzzleSolved(bottles, capacity)) {
      return {
        solvable: true,
        optimalSteps: moves.length,
        moves,
        visitedNodes: iterations,
        timeMs: performance.now() - startTime,
      };
    }

    const n = bottles.length;
    let firstEmptyIdx = -1;
    for (let i = 0; i < n; i++) {
      if (bottles[i].layers.length === 0) {
        firstEmptyIdx = i;
        break;
      }
    }

    // Pour moves
    for (let from = 0; from < n; from++) {
      const fromBottle = bottles[from];
      if (fromBottle.layers.length === 0) continue;
      if (isBottleComplete(fromBottle, capacity)) continue;

      const fromColor = fromBottle.layers[fromBottle.layers.length - 1];
      const fromCount = getPourOutCount(fromBottle);
      if (fromCount === 0) continue;
      const fromIsMono = isBottleMonochromatic(fromBottle);

      let pouredToEmpty = false;

      for (let to = 0; to < n; to++) {
        if (from === to) continue;
        const toBottle = bottles[to];

        if (toBottle.layers.length >= capacity) continue;

        if (toBottle.layers.length === 0) {
          if (fromIsMono) continue;
          if (pouredToEmpty) continue;
          if (to !== firstEmptyIdx && firstEmptyIdx !== -1) continue;
          pouredToEmpty = true;
        } else {
          if (toBottle.layers[toBottle.layers.length - 1] !== fromColor) continue;
        }

        if (moves.length > 0) {
          const lastMove = moves[moves.length - 1];
          if (lastMove.kind === 'pour' && lastMove.from === to && lastMove.to === from) continue;
        }

        const space = capacity - toBottle.layers.length;
        const count = Math.min(fromCount, space);
        if (count === 0) continue;

        const nextResult = executePour(bottles, from, to, capacity);
        if (!nextResult) continue;
        const key = getCanonicalKey(nextResult.newBottles);
        if (!visited.has(key)) {
          visited.add(key);
          queue.push({
            bottles: nextResult.newBottles,
            moves: [...moves, { kind: 'pour', from, to, colorId: fromColor, count }],
          });
        }
      }
    }

    // Leak moves
    for (let i = 0; i < n; i++) {
      const src = bottles[i];
      if (src.type !== 'bottom_leak' || !src.leakTargetBottleId) continue;
      const tIdx = bottles.findIndex((b) => b.id === src.leakTargetBottleId);
      if (tIdx < 0 || tIdx === i) continue;
      if (!canLeak(src, bottles[tIdx], capacity, i, tIdx, bottles)) continue;

      const leakColor = src.layers[0];
      const nextResult = executeLeak(bottles, i, tIdx, capacity);
      if (!nextResult) continue;
      const key = getCanonicalKey(nextResult.newBottles);
      if (!visited.has(key)) {
        visited.add(key);
        queue.push({
          bottles: nextResult.newBottles,
          moves: [...moves, { kind: 'leak', from: i, to: tIdx, colorId: leakColor, count: 1 }],
        });
      }
    }
  }

  return {
    solvable: false,
    optimalSteps: 0,
    moves: [],
    visitedNodes: iterations,
    timeMs: performance.now() - startTime,
    reason: '无解：所有可能操作均已穷举，无法完成分色。',
  };
}

/**
 * Evaluates level difficulty from step count.
 */
export function evaluateDifficulty(optimalSteps: number, visitedNodes: number): {
  stars: number;
  label: string;
  tagColor: string;
} {
  if (optimalSteps <= 10) {
    return { stars: 1, label: '简单', tagColor: 'text-emerald-400 bg-emerald-950/60 border-emerald-500/30' };
  } else if (optimalSteps <= 18) {
    return { stars: 2, label: '普通', tagColor: 'text-sky-400 bg-sky-950/60 border-sky-500/30' };
  } else if (optimalSteps <= 28) {
    return { stars: 3, label: '困难', tagColor: 'text-amber-400 bg-amber-950/60 border-amber-500/30' };
  } else if (optimalSteps <= 38) {
    return { stars: 4, label: '大师', tagColor: 'text-rose-400 bg-rose-950/60 border-rose-500/30' };
  } else {
    return { stars: 5, label: '极限', tagColor: 'text-purple-400 bg-purple-950/60 border-purple-500/30' };
  }
}
