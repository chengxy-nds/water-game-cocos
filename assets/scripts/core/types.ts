export interface ColorDef {
  id: string;
  name: string;
  hex: string;
  topHex?: string; // lighter shade for 3D top meniscus disk
  shadeHex?: string; // darker shade for cylindrical 3D edge shading
  gradient: string;
  shadow: string;
  symbol: string; // for colorblind mode
  textColor: string;
}

export type BottleType = 'normal' | 'empty' | 'masked' | 'hidden' | 'bottom_leak';

/**
 * A bottle in the puzzle. `layers` is the single source of truth for liquid,
 * always stored bottom → top (index 0 = bottom-most layer).
 */
export interface Bottle {
  id: string; // unique within a level, e.g. 'b1'
  type: BottleType;
  capacity: number; // default 4
  layers: string[]; // color ids, bottom → top
  // masked (遮罩瓶)
  maskRevealed?: boolean;
  unlockTargetCompletedBottles?: number;
  countsTowardObjective?: boolean;
  // hidden (隐藏瓶): number of bottom contiguous hidden layers (max 3),
  // hidden beneath the known top color; each top-layer pour reveals one.
  hiddenBottomLayers?: number;
  // bottom_leak (底部漏水瓶): fixed target bottle below
  leakTargetBottleId?: string;
  locked?: boolean;
}

// Legacy alias for liquid-only contexts; game state now uses Bottle[].
export type Tube = string[];

export interface Move {
  kind: 'pour' | 'leak';
  from: number; // bottle index
  to: number; // bottle index (for leak, resolved from leakTargetBottleId)
  colorId: string;
  count: number; // pour = layer count; leak = 1
}

export type Difficulty = 'easy' | 'medium' | 'hard' | 'master';

export interface Level {
  id: number | string;
  title: string;
  difficulty: Difficulty;
  bottles: Bottle[]; // initial configuration
  optimalSteps?: number;
  description?: string;
  isCustom?: boolean;
}

export interface SolverResult {
  solvable: boolean;
  optimalSteps: number;
  moves: Move[];
  visitedNodes: number;
  timeMs: number;
  reason?: string;
}

export interface PlayerStats {
  completedLevels: Record<string, { stars: number; bestSteps: number; completedAt: string }>;
  dailyChallengeCompleted: Record<string, { stars: number; steps: number }>;
  hintsUsedTotal: number;
  totalPours: number;
}
