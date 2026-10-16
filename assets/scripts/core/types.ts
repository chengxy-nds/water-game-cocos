export type ColorKey =
  | 'green'
  | 'orange'
  | 'cyan'
  | 'yellow'
  | 'blue'
  | 'purple'
  | 'red'
  | 'pink'
  | 'mystery_dark';

export interface ColorDef {
  name: string;
  left: string;
  mid: string;
  highlight: string;
  right: string;
  topMid: string;
  topRim: string;
  topLight: string;
  bagMain: string;
  bagDark: string;
}

export type BottleSpecial =
  | 'none'
  | 'silk_drape'
  | 'ice_base'
  | 'full_ice'
  | 'stone_base'
  | 'paper_bag'
  | 'ad_cam'
  | 'ad_cam_blue'
  | 'color_lock'
  | 'one_way_in'
  | 'one_way_out';

export interface Bottle {
  id: number;
  maxCap: number;
  layers: ColorKey[];
  special: BottleSpecial;
  mysteryCount?: number;
  isGiantCat?: boolean;
  catTargetColor?: ColorKey;
  unlockOrder?: number;
  poursToBreak?: number;
  poursRemaining?: number;
  requiredColor?: ColorKey | null;
  countdownMoves?: number | null;
  frozenTurns?: number;
  removed?: boolean;
  corked?: boolean;
  corkAnimProgress?: number;
}

export interface Bag {
  slot?: number;
  color: ColorKey | null;
  needed?: number;
  current?: number;
  locked?: boolean;
  packedBottle?: ColorKey | null;
  justPacked?: boolean;
}

export interface MechanicIntro {
  key?: string;
  badge: string;
  title: string;
  sub?: string;
  desc: string;
  sampleBottle?: () => Bottle;
  previewBottle?: Bottle;
}

export interface LevelConfig {
  id?: number;
  levelNum?: number;
  chapter?: number;
  pos?: number;
  waveStars?: number;
  title: string;
  shortName?: string;
  shortTag?: string;
  tag?: string;
  desc?: string;
  hasBags?: boolean;
  isVariedHeight?: boolean;
  isCatBossLevel?: boolean;
  gridClass?: string;
  moveLimit: number | null;
  optimalMoves?: number;
  introMechanicKey?: string | null;
  mechanicIntro?: MechanicIntro | null;
  bags: Bag[];
  bottles: () => Bottle[];
}

export interface MoveHistoryItem {
  bottles: Bottle[];
  bags: Bag[];
  packedTotal: number;
  pourCountTotal: number;
  remainingMoves: number | null;
  shuffleUses: number;
}
