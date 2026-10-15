import { Bag, Bottle, ColorKey, LevelConfig, MechanicIntro } from './types';
import { COLOR_KEYS } from './colors';

export function mulberry32(seed: number) {
  let state = seed >>> 0;
  return function () {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296.0;
  };
}

export function buildVerifiedColorTubes(
  palette: readonly ColorKey[] | ColorKey[],
  cap: number,
  rng: () => number
): ColorKey[][] {
  const n = palette.length;
  if (n <= 1) return [Array(cap).fill(palette[0])];

  const pool: ColorKey[] = [];
  palette.forEach((c) => {
    for (let k = 0; k < cap; k++) pool.push(c);
  });

  let bestCandidate: ColorKey[][] | null = null;
  let bestScore = -1;

  for (let attempt = 0; attempt < 90; attempt++) {
    const arr = pool.slice();
    for (let i = arr.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      const tmp = arr[i];
      arr[i] = arr[j];
      arr[j] = tmp;
    }
    const tubes: ColorKey[][] = [];
    let valid = true;
    let totalTransitions = 0;
    const distinctBottoms = new Set<ColorKey>();
    const distinctTops = new Set<ColorKey>();

    for (let i = 0; i < n; i++) {
      const t = arr.slice(i * cap, (i + 1) * cap);
      if (t.every((c) => c === t[0])) {
        valid = false;
        break;
      }
      let trans = 0;
      let maxRun = 1,
        curRun = 1;
      for (let k = 1; k < cap; k++) {
        if (t[k] !== t[k - 1]) {
          trans++;
          curRun = 1;
        } else {
          curRun++;
          if (curRun > maxRun) maxRun = curRun;
        }
      }
      const allowedRun = cap >= 8 ? 2 : 1;
      if (maxRun > allowedRun && attempt < 65) {
        valid = false;
        break;
      }
      if (cap >= 4 && t[cap - 1] === t[cap - 2] && attempt < 75) {
        valid = false;
        break;
      }

      distinctBottoms.add(t[0]);
      distinctTops.add(t[cap - 1]);
      totalTransitions += trans;
      tubes.push(t);
    }
    if (!valid) continue;

    const score = totalTransitions * 10 + distinctBottoms.size * 6 + distinctTops.size * 8;
    if (score > bestScore) {
      bestScore = score;
      bestCandidate = tubes;
    }
    if (totalTransitions >= n * (cap - 1) * 0.94 && distinctTops.size >= Math.min(n, 4)) {
      return tubes;
    }
  }

  if (bestCandidate) return bestCandidate;

  const fallback: ColorKey[][] = [];
  for (let i = 0; i < n; i++) {
    const t: ColorKey[] = [];
    for (let k = 0; k < cap; k++) {
      t.push(palette[(i + k * 2 + 1) % n]);
    }
    fallback.push(t);
  }
  return fallback;
}

export const MECHANIC_INTROS: Record<string, MechanicIntro> = {
  mystery: {
    key: 'mystery',
    badge: '✨ 第 4 关 · 星光工坊新典藏',
    title: '❓ 星雾盲盒琉璃瓶',
    sub: '星雾遮蔽 · 倾注破雾显色',
    desc: '💡 <b>工坊秘籍：</b>瓶身下半部分笼罩于深邃星雾中并浮现 <b>?</b> 印记。唯有先将最顶层的明牌秘药倾倒而出，下方星雾方会伴随金芒消散并显露真彩。',
    sampleBottle: () => ({ id: 99, maxCap: 4, layers: ['blue', 'red', 'green'], special: 'none', mysteryCount: 2 }),
  },
  giant_cat: {
    key: 'giant_cat',
    badge: '🐱 第 5 关 · 镇店典藏器皿',
    title: '🐱 皇家灵猫水晶瓶',
    sub: '凝萃大典 · 八层秘药归宗',
    desc: '💡 <b>工坊秘籍：</b>本关为工坊直通凝萃模式！正中央矗立着容量 <b>8 层</b> 的高定灵猫水晶大瓶，请巧妙腾挪外围药水瓶，将目标秘药尽数汇入灵猫瓶中即可封存通关。',
    sampleBottle: () => ({
      id: 99,
      maxCap: 8,
      isGiantCat: true,
      catTargetColor: 'pink',
      layers: ['pink', 'pink', 'pink', 'pink'],
      special: 'none',
    }),
  },
  ice_base: {
    key: 'ice_base',
    badge: '❄️ 第 6 关 · 极光冰晶机关',
    title: '❄️ 极地霜晶底座瓶',
    sub: '霜晶凝结 · 共振破冰解封',
    desc: '💡 <b>工坊秘籍：</b>瓶底被极地霜晶凝结固定，暂时无法提起倾倒（但瓶口敞开<b>仍可承接秘药</b>）。在场上任意完成指定次数的倾倒共振，即可震碎霜晶！',
    sampleBottle: () => ({ id: 99, maxCap: 4, layers: ['yellow', 'blue', 'blue'], special: 'ice_base', poursToBreak: 2 }),
  },
  silk_drape: {
    key: 'silk_drape',
    badge: '🧣 第 7 关 · 高定礼盒契约',
    title: '🧣 星缎礼袍封印瓶',
    sub: '礼盒联动 · 满瓶自动揭幕',
    desc: '💡 <b>工坊秘籍：</b>整只琉璃瓶被冰蓝星缎礼袍优雅覆面。只需先利用场上的明牌秘药<b>完成 1 份高定礼盒封存</b>，星缎礼袍便会伴随流光自动掀开！',
    sampleBottle: () => ({
      id: 99,
      maxCap: 4,
      layers: ['red', 'orange', 'yellow', 'blue'],
      special: 'silk_drape',
      unlockOrder: 1,
    }),
  },
  varied_height: {
    key: 'varied_height',
    badge: '🏺 第 8 关 · 声学异形器皿',
    title: '🏺 高低错落声学瓶',
    sub: '三阶容量 · 腔体共鸣交响',
    desc: '💡 <b>工坊秘籍：</b>工坊桌面同时陈列 <b>2层玲珑瓶、4层标准瓶、6层修长瓶</b>！不同容积的玻璃腔体拥有截然不同的水位共鸣音色，装满各自容量上限即可落塞封存。',
    sampleBottle: () => ({ id: 99, maxCap: 2, layers: ['green', 'green'], special: 'none' }),
  },
  tall_8: {
    key: 'tall_8',
    badge: '👑 第 9 关 · 皇家通天器型',
    title: '👑 八色皇冠长管瓶',
    sub: '八层刻度 · 深腔低音共鸣',
    desc: '💡 <b>工坊秘籍：</b>镌刻黄金刻度的 <b>8 层皇冠修长琉璃管</b>！单瓶需凝萃全部 8 层同色秘药方可落塞封存，极其考验中转空瓶的布局功底。',
    sampleBottle: () => ({
      id: 99,
      maxCap: 8,
      layers: ['red', 'orange', 'yellow', 'green', 'cyan', 'blue'],
      special: 'none',
    }),
  },
  grand_obstacles: {
    key: 'grand_obstacles',
    badge: '🧊 第 10 关 · 宗师多重试炼',
    title: '🧊 冰封王座宗师局',
    sub: '多重封印 · 破冰拆袋交响',
    desc: '💡 <b>工坊秘籍：</b>宗师大阵汇集<b>极地全冰雕瓶</b>、<b>复古羊皮礼袋瓶</b>（封存礼盒即可破冰/解袋）与<b>曜石琥珀岩座</b>（倾倒共振即可碎石），展现真正的炼金大师技艺！',
    sampleBottle: () => ({
      id: 99,
      maxCap: 4,
      layers: ['cyan', 'yellow', 'purple', 'red'],
      special: 'full_ice',
      unlockOrder: 2,
    }),
  },
};

const LEVEL_CACHE: Record<number, LevelConfig> = {};

export function getLevelConfig(lv: number): LevelConfig {
  const levelNum = Math.max(1, Math.min(200, Math.floor(lv || 1)));
  if (LEVEL_CACHE[levelNum]) return LEVEL_CACHE[levelNum];

  const rng = mulberry32(levelNum * 2654435761 + 1013904223);
  const chapter = Math.floor((levelNum - 1) / 10) + 1;
  const pos = ((levelNum - 1) % 10) + 1;

  const waveStarsMap: Record<number, number> = { 1: 3, 2: 4, 3: 4, 4: 5, 5: 5, 6: 4, 7: 4, 8: 5, 9: 5, 10: 5 };
  const waveStars = levelNum <= 2 ? 3 : waveStarsMap[pos];

  const cfg: LevelConfig = {
    id: levelNum,
    levelNum,
    chapter,
    pos,
    waveStars,
    title: '',
    shortTag: '',
    hasBags: false,
    isVariedHeight: false,
    isCatBossLevel: false,
    gridClass: '',
    moveLimit: null,
    optimalMoves: 17,
    introMechanicKey: null,
    bags: [],
    bottles: () => [],
  };

  // 前 3 关：无特殊障碍瓶，但提升色彩数与深层互锁难度
  if (levelNum === 1) {
    cfg.title = '第 1 关 · 初识琉璃';
    cfg.shortTag = '7色精粹';
    cfg.hasBags = false;
    cfg.gridClass = '';
    cfg.optimalMoves = 17;
    const pal = COLOR_KEYS.slice(0, 7);
    const filled = buildVerifiedColorTubes(pal, 4, rng);
    cfg.bottles = () => [
      { id: 0, maxCap: 4, layers: filled[0].slice(), special: 'none' },
      { id: 1, maxCap: 4, layers: filled[1].slice(), special: 'none' },
      { id: 2, maxCap: 4, layers: filled[2].slice(), special: 'none' },
      { id: 3, maxCap: 4, layers: filled[3].slice(), special: 'none' },
      { id: 4, maxCap: 4, layers: filled[4].slice(), special: 'none' },
      { id: 5, maxCap: 4, layers: filled[5].slice(), special: 'none' },
      { id: 6, maxCap: 4, layers: filled[6].slice(), special: 'none' },
      { id: 7, maxCap: 4, layers: [], special: 'none' },
      { id: 8, maxCap: 4, layers: [], special: 'none' },
      { id: 9, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
    ];
    LEVEL_CACHE[levelNum] = cfg;
    return cfg;
  }

  if (levelNum === 2) {
    cfg.title = '第 2 关 · 礼盒契约';
    cfg.shortTag = '8色礼盒';
    cfg.hasBags = true;
    cfg.gridClass = '';
    cfg.optimalMoves = 19;
    const pal = COLOR_KEYS.slice(0, 8);
    const filled = buildVerifiedColorTubes(pal, 4, rng);
    cfg.bags = [
      { slot: 0, color: 'green', locked: false, packedBottle: null },
      { slot: 1, color: 'blue', locked: false, packedBottle: null },
      { slot: 2, color: 'yellow', locked: false, packedBottle: null },
      { slot: 3, color: null, locked: true, packedBottle: null },
    ];
    cfg.bottles = () => [
      { id: 0, maxCap: 4, layers: filled[0].slice(), special: 'none' },
      { id: 1, maxCap: 4, layers: filled[1].slice(), special: 'none' },
      { id: 2, maxCap: 4, layers: filled[2].slice(), special: 'none' },
      { id: 3, maxCap: 4, layers: filled[3].slice(), special: 'none' },
      { id: 4, maxCap: 4, layers: filled[4].slice(), special: 'none' },
      { id: 5, maxCap: 4, layers: filled[5].slice(), special: 'none' },
      { id: 6, maxCap: 4, layers: filled[6].slice(), special: 'none' },
      { id: 7, maxCap: 4, layers: filled[7].slice(), special: 'none' },
      { id: 8, maxCap: 4, layers: [], special: 'none' },
      { id: 9, maxCap: 4, layers: [], special: 'none' },
      { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
    ];
    LEVEL_CACHE[levelNum] = cfg;
    return cfg;
  }

  if (levelNum === 3) {
    cfg.title = '第 3 关 · 深海秘药';
    cfg.shortTag = '深层交错';
    cfg.hasBags = true;
    cfg.gridClass = '';
    cfg.optimalMoves = 21;
    const pal = COLOR_KEYS.slice(0, 8);
    const filled = buildVerifiedColorTubes(pal, 4, rng);
    cfg.bags = [
      { slot: 0, color: 'purple', locked: false, packedBottle: null },
      { slot: 1, color: 'cyan', locked: false, packedBottle: null },
      { slot: 2, color: 'orange', locked: false, packedBottle: null },
      { slot: 3, color: null, locked: true, packedBottle: null },
    ];
    cfg.bottles = () => [
      { id: 0, maxCap: 4, layers: filled[0].slice(), special: 'none' },
      { id: 1, maxCap: 4, layers: filled[1].slice(), special: 'none' },
      { id: 2, maxCap: 4, layers: filled[2].slice(), special: 'none' },
      { id: 3, maxCap: 4, layers: filled[3].slice(), special: 'none' },
      { id: 4, maxCap: 4, layers: filled[4].slice(), special: 'none' },
      { id: 5, maxCap: 4, layers: filled[5].slice(), special: 'none' },
      { id: 6, maxCap: 4, layers: filled[6].slice(), special: 'none' },
      { id: 7, maxCap: 4, layers: filled[7].slice(), special: 'none' },
      { id: 8, maxCap: 4, layers: [], special: 'none' },
      { id: 9, maxCap: 4, layers: [], special: 'none' },
      { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
    ];
    LEVEL_CACHE[levelNum] = cfg;
    return cfg;
  }

  if (levelNum === 4) cfg.introMechanicKey = 'mystery';
  else if (levelNum === 5) cfg.introMechanicKey = 'giant_cat';
  else if (levelNum === 6) cfg.introMechanicKey = 'ice_base';
  else if (levelNum === 7) cfg.introMechanicKey = 'silk_drape';
  else if (levelNum === 8) cfg.introMechanicKey = 'varied_height';
  else if (levelNum === 9) cfg.introMechanicKey = 'tall_8';
  else if (levelNum === 10) cfg.introMechanicKey = 'grand_obstacles';

  // 每逢 X5 关 -> 皇家灵猫水晶瓶 BOSS 关
  if (pos === 5) {
    const catColorKey = COLOR_KEYS[(chapter + 6) % 8];
    const otherColors = COLOR_KEYS.filter((c) => c !== catColorKey).slice(0, 4);
    cfg.title = `第 ${levelNum} 关 · 皇家灵猫瓶`;
    cfg.shortTag = '🐱灵猫典藏';
    cfg.hasBags = false;
    cfg.isCatBossLevel = true;
    cfg.gridClass = 'layout-cat-boss';
    cfg.optimalMoves = 18 + Math.min(8, Math.floor(chapter / 2));

    const subTubes = buildVerifiedColorTubes(otherColors, 4, rng);
    const f0 = [catColorKey, subTubes[0][0], catColorKey, subTubes[0][1]];
    const f1 = [catColorKey, subTubes[1][0], subTubes[1][1], subTubes[1][2]];
    const f2 = [catColorKey, subTubes[2][0], subTubes[2][1], subTubes[2][2]];
    const f3 = [catColorKey, subTubes[3][0], subTubes[3][1], subTubes[0][2]];
    const f4 = [catColorKey, subTubes[3][2], subTubes[3][3], subTubes[1][3]];
    const f5 = [subTubes[2][3], subTubes[0][3]];

    const useMyst = chapter >= 2 ? 2 : 1;
    const useIce = chapter >= 2;

    cfg.bottles = () => [
      { id: 0, maxCap: 4, layers: f0.slice(), special: 'none', mysteryCount: useMyst },
      { id: 1, maxCap: 4, layers: f1.slice(), special: useIce ? 'ice_base' : 'none', poursToBreak: useIce ? 2 : 0 },
      { id: 2, maxCap: 8, isGiantCat: true, catTargetColor: catColorKey, layers: [catColorKey, catColorKey], special: 'none' },
      { id: 3, maxCap: 4, layers: f2.slice(), special: 'none', mysteryCount: useMyst },
      { id: 4, maxCap: 4, layers: f3.slice(), special: 'none' },
      { id: 5, maxCap: 4, layers: f4.slice(), special: chapter >= 2 ? 'stone_base' : 'none', poursToBreak: 2 },
      { id: 6, maxCap: 4, layers: f5.slice(), special: 'none' },
      { id: 7, maxCap: 4, layers: [], special: 'none' },
      { id: 8, maxCap: 4, layers: [], special: 'ad_cam' },
    ];
    LEVEL_CACHE[levelNum] = cfg;
    return cfg;
  }

  // 高低异形瓶声学局
  if (pos === 8 || (pos === 3 && chapter >= 2)) {
    cfg.title = `第 ${levelNum} 关 · ${pos === 8 ? '高低声学瓶' : '异形曜石局'}`;
    cfg.shortTag = pos === 8 ? '高低声学' : '异形曜石';
    cfg.hasBags = false;
    cfg.isVariedHeight = true;
    cfg.gridClass = 'layout-varied';
    cfg.optimalMoves = 20 + Math.min(8, Math.floor(chapter / 2));

    const tubes4 = buildVerifiedColorTubes(['red', 'yellow', 'cyan'], 4, rng);
    const tubes6 = buildVerifiedColorTubes(['blue', 'orange'], 6, rng);

    cfg.bottles = () => [
      { id: 0, maxCap: 2, layers: ['green', 'purple'], special: 'none' },
      { id: 1, maxCap: 6, layers: tubes6[0].slice(0, 5), special: 'ice_base', poursToBreak: 2 },
      { id: 2, maxCap: 4, layers: tubes4[0].slice(), special: 'none', mysteryCount: 2 },
      { id: 3, maxCap: 6, layers: tubes6[1].slice(0, 5), special: 'none', mysteryCount: 2 },
      { id: 4, maxCap: 2, layers: ['purple', 'green'], special: 'none' },
      { id: 5, maxCap: 4, layers: tubes4[1].slice(), special: 'stone_base', poursToBreak: 3 },
      { id: 6, maxCap: 2, layers: [], special: 'none' },
      { id: 7, maxCap: 4, layers: tubes4[2].slice(), special: 'none', mysteryCount: 2 },
      { id: 8, maxCap: 6, layers: [tubes6[0][5], tubes6[1][5]], special: 'none' },
      { id: 9, maxCap: 4, layers: [], special: 'none' },
      { id: 10, maxCap: 6, layers: [], special: 'ad_cam' },
      { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
    ];
    LEVEL_CACHE[levelNum] = cfg;
    return cfg;
  }

  // 八色超长皇冠管瓶关
  if (pos === 9) {
    cfg.title = `第 ${levelNum} 关 · 皇冠长管瓶`;
    cfg.shortTag = '8层皇冠管';
    cfg.hasBags = false;
    cfg.gridClass = 'layout-tall8';
    cfg.optimalMoves = 24 + Math.min(10, Math.floor(chapter / 2));

    const tallColors = COLOR_KEYS.slice(0, 5);
    const tallTubes = buildVerifiedColorTubes(tallColors, 8, rng);

    cfg.bottles = () => [
      { id: 0, maxCap: 8, layers: tallTubes[0].slice(), special: 'none', mysteryCount: 3 },
      { id: 1, maxCap: 8, layers: tallTubes[1].slice(), special: 'ice_base', poursToBreak: 2 },
      { id: 2, maxCap: 8, layers: tallTubes[2].slice(), special: 'none', mysteryCount: 2 },
      { id: 3, maxCap: 8, layers: tallTubes[3].slice(), special: 'stone_base', poursToBreak: 3 },
      { id: 4, maxCap: 8, layers: tallTubes[4].slice(), special: 'none', mysteryCount: 3 },
      { id: 5, maxCap: 8, layers: [], special: 'none' },
      { id: 6, maxCap: 8, layers: [], special: 'none' },
    ];
    LEVEL_CACHE[levelNum] = cfg;
    return cfg;
  }

  // 每章第10关 -> 21瓶冰封王座宗师局
  if (pos === 10) {
    cfg.title = `第 ${levelNum} 关 · 冰封王座局`;
    cfg.shortTag = '👑宗师试炼';
    cfg.hasBags = true;
    cfg.gridClass = 'layout-21';
    cfg.optimalMoves = 30 + Math.min(12, chapter);

    const openColors: ColorKey[] = ['orange', 'green', 'yellow', 'blue', 'red'];
    const lockedColors: ColorKey[] = ['cyan', 'purple', 'pink'];
    const openTubes = buildVerifiedColorTubes(openColors, 4, rng);
    const lockedTubes = buildVerifiedColorTubes(lockedColors, 4, rng);

    cfg.bags = [
      { slot: 0, color: 'orange', locked: false, packedBottle: null },
      { slot: 1, color: 'green', locked: false, packedBottle: null },
      { slot: 2, color: 'yellow', locked: false, packedBottle: null },
      { slot: 3, color: null, locked: true, packedBottle: null },
    ];

    cfg.bottles = () => [
      { id: 0, maxCap: 4, layers: openTubes[0].slice(0, 3), special: 'none' },
      { id: 1, maxCap: 4, layers: openTubes[1].slice(), special: 'none', mysteryCount: 2 },
      { id: 2, maxCap: 4, layers: openTubes[2].slice(), special: 'none' },
      { id: 3, maxCap: 4, layers: lockedTubes[0].slice(), special: 'silk_drape', unlockOrder: 1 },
      { id: 4, maxCap: 4, layers: openTubes[3].slice(), special: 'none', mysteryCount: 2 },
      { id: 5, maxCap: 4, layers: openTubes[4].slice(), special: 'ice_base', poursToBreak: 2 },
      { id: 6, maxCap: 4, layers: [openTubes[0][3]], special: 'none' },
      { id: 7, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 8, maxCap: 4, layers: ['cyan', 'purple'], special: 'none' },
      { id: 9, maxCap: 4, layers: ['purple', 'cyan', 'pink', 'cyan'], special: 'none', mysteryCount: 3 },
      { id: 10, maxCap: 4, layers: lockedTubes[1].slice(), special: 'full_ice', unlockOrder: 2 },
      { id: 11, maxCap: 4, layers: ['pink', 'purple', 'cyan'], special: 'none' },
      { id: 12, maxCap: 4, layers: ['pink', 'pink', 'purple'], special: 'none' },
      { id: 13, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 14, maxCap: 4, layers: [], special: 'none' },
      { id: 15, maxCap: 4, layers: ['red', 'blue', 'yellow', 'green'], special: 'none', mysteryCount: 2 },
      { id: 16, maxCap: 4, layers: ['green', 'yellow', 'blue', 'red'], special: 'stone_base', poursToBreak: 3 },
      { id: 17, maxCap: 4, layers: lockedTubes[2].slice(), special: 'paper_bag', unlockOrder: 3 },
      { id: 18, maxCap: 4, layers: [], special: 'none' },
      { id: 19, maxCap: 4, layers: [], special: 'none' },
      { id: 20, maxCap: 4, layers: [], special: 'ad_cam' },
    ];
    LEVEL_CACHE[levelNum] = cfg;
    return cfg;
  }

  const hasBagsHere = pos === 2 || pos === 6 || pos === 7;
  cfg.hasBags = hasBagsHere;
  cfg.gridClass = '';

  const activeColors = COLOR_KEYS.slice(0, 8);
  const groupAColors = activeColors.slice(0, 6);
  const groupBColors = activeColors.slice(6, 8);
  const tubesA = buildVerifiedColorTubes(groupAColors, 4, rng);
  const tubesB = buildVerifiedColorTubes(groupBColors, 4, rng);

  cfg.optimalMoves = 20 + pos + Math.min(8, Math.floor(chapter / 2));

  if (levelNum === 4) {
    cfg.title = '第 4 关 · 星雾盲盒局';
    cfg.shortTag = '❓星雾登场';
    cfg.hasBags = false;
  } else if (levelNum === 6) {
    cfg.title = '第 6 关 · 极地霜晶座';
    cfg.shortTag = '❄️霜晶登场';
    cfg.hasBags = true;
  } else if (levelNum === 7) {
    cfg.title = '第 7 关 · 星缎礼袍局';
    cfg.shortTag = '🧣星缎登场';
    cfg.hasBags = true;
  } else if (pos === 4) {
    cfg.moveLimit = cfg.optimalMoves + Math.max(2, 5 - Math.floor(chapter / 4));
    cfg.title = `第 ${levelNum} 关 · 星晷限步局`;
    cfg.shortTag = `✨限${cfg.moveLimit}步`;
  } else if (pos === 1) {
    cfg.title = `第 ${levelNum} 关 · 秘药凝萃`;
    cfg.shortTag = '深层星雾';
  } else if (pos === 2) {
    cfg.title = `第 ${levelNum} 关 · 星缎霜封`;
    cfg.shortTag = '星缎+霜晶';
  } else if (pos === 6) {
    cfg.title = `第 ${levelNum} 关 · 礼袋迷雾`;
    cfg.shortTag = '礼袋+星雾';
  } else {
    cfg.title = `第 ${levelNum} 关 · 极光冰雕`;
    cfg.shortTag = '冰雕复合';
  }

  if (cfg.hasBags) {
    cfg.bags = [
      { slot: 0, color: groupAColors[0], locked: false, packedBottle: null },
      { slot: 1, color: groupAColors[1], locked: false, packedBottle: null },
      { slot: 2, color: groupAColors[2], locked: false, packedBottle: null },
      { slot: 3, color: null, locked: true, packedBottle: null },
    ];
  }

  cfg.bottles = () => {
    if (levelNum === 4) {
      return [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', mysteryCount: 2 },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'none', mysteryCount: 3 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 2 },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'none', mysteryCount: 3 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none', mysteryCount: 2 },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: 'none', mysteryCount: 2 },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'none', mysteryCount: 2 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
        { id: 8, maxCap: 4, layers: [], special: 'none' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
      ];
    }
    if (levelNum === 6) {
      return [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', mysteryCount: 2 },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'ice_base', poursToBreak: 2 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 2 },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'ice_base', poursToBreak: 3 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none', mysteryCount: 2 },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: 'ice_base', poursToBreak: 2 },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'none' },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
        { id: 8, maxCap: 4, layers: [], special: 'none' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
      ];
    }
    if (levelNum === 7) {
      return [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', mysteryCount: 2 },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'ice_base', poursToBreak: 2 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 2 },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'none', mysteryCount: 3 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'ice_base', poursToBreak: 3 },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: 'none' },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'silk_drape', unlockOrder: 1 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'silk_drape', unlockOrder: 2 },
        { id: 8, maxCap: 4, layers: [], special: 'none' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
      ];
    }

    return [
      { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', mysteryCount: 3 },
      {
        id: 1,
        maxCap: 4,
        layers: tubesA[1].slice(),
        special: pos === 2 || pos === 7 ? 'ice_base' : 'none',
        poursToBreak: 2,
        mysteryCount: 2,
      },
      { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 3 },
      {
        id: 3,
        maxCap: 4,
        layers: tubesA[3].slice(),
        special: pos === 4 || pos === 7 ? 'stone_base' : 'ice_base',
        poursToBreak: 3,
      },
      { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none', mysteryCount: 2 },
      {
        id: 5,
        maxCap: 4,
        layers: tubesA[5].slice(),
        special: pos === 4 ? 'stone_base' : 'none',
        poursToBreak: 2,
        mysteryCount: 2,
      },
      {
        id: 6,
        maxCap: 4,
        layers: tubesB[0].slice(),
        special: pos === 2 ? 'silk_drape' : pos === 6 ? 'paper_bag' : pos === 7 ? 'full_ice' : 'none',
        unlockOrder: 1,
        mysteryCount: 2,
      },
      {
        id: 7,
        maxCap: 4,
        layers: tubesB[1].slice(),
        special: pos === 7 ? 'paper_bag' : pos === 2 ? 'full_ice' : 'stone_base',
        unlockOrder: 2,
        poursToBreak: 3,
      },
      { id: 8, maxCap: 4, layers: [], special: 'none' },
      { id: 9, maxCap: 4, layers: [], special: 'none' },
      { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
    ];
  };

  LEVEL_CACHE[levelNum] = cfg;
  return cfg;
}
