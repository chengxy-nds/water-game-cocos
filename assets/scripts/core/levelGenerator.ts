import { Bag, Bottle, ColorKey, LevelConfig, MechanicIntro } from './types';
import { COLOR_KEYS } from './colors';

// 确定性伪随机数生成器 (PRNG)，保证每位玩家同一关卡牌型一致
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

export function ensureOpeningPairs(tubes: ColorKey[][], minPairs: number = 2): ColorKey[][] {
  if (!tubes || tubes.length < 4) return tubes;
  const countTopPairs = () => {
    const freq: Record<string, number> = {};
    tubes.forEach((t) => {
      if (t && t.length > 0) {
        const top = t[t.length - 1];
        freq[top] = (freq[top] || 0) + 1;
      }
    });
    return Object.values(freq).filter((c) => c >= 2).length;
  };

  for (let step = 0; step < 2 && countTopPairs() < minPairs; step++) {
    const targetBottleIdx = step * 2;
    const partnerBottleIdx = step * 2 + 1;
    if (partnerBottleIdx >= tubes.length) break;
    const desiredColor = tubes[targetBottleIdx][tubes[targetBottleIdx].length - 1];
    if (tubes[partnerBottleIdx][tubes[partnerBottleIdx].length - 1] !== desiredColor) {
      let swapped = false;
      for (let m = partnerBottleIdx; m < tubes.length && !swapped; m++) {
        for (let k = 0; k < tubes[m].length - 1; k++) {
          if (
            tubes[m][k] === desiredColor &&
            tubes[m][k] !== tubes[partnerBottleIdx][tubes[partnerBottleIdx].length - 1]
          ) {
            const tmp = tubes[partnerBottleIdx][tubes[partnerBottleIdx].length - 1];
            tubes[partnerBottleIdx][tubes[partnerBottleIdx].length - 1] = desiredColor;
            tubes[m][k] = tmp;
            swapped = true;
            break;
          }
        }
      }
    }
  }
  return tubes;
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
  color_lock: {
    key: 'color_lock',
    badge: '🔒 第 12 关 · 专属色环契约',
    title: '🔒 专属色环瓶',
    sub: '只能倒入与色环相同颜色的水',
    desc: '💡 <b>玩法说明：</b>瓶口带有颜色宝石环，<b>只能倒入与色环相同颜色的水</b>（瓶里原有的水可以正常往外倒）。',
    sampleBottle: () => ({ id: 99, maxCap: 4, layers: ['blue', 'blue'], special: 'color_lock', requiredColor: 'blue' }),
  },
  one_way_in: {
    key: 'one_way_in',
    badge: '⏬ 第 16 关 · 单向漏斗机关',
    title: '⏬ 单向漏斗瓶',
    sub: '只能进不能出 · 看准再倒',
    desc: '💡 <b>玩法说明：</b>瓶口装有漏斗，<b>只能往里倒水，不能向外倒出</b>。看准目标颜色后再倒进去哦！',
    sampleBottle: () => ({ id: 99, maxCap: 4, layers: ['green', 'green'], special: 'one_way_in' }),
  },
  one_way_out: {
    key: 'one_way_out',
    badge: '⏫ 第 22 关 · 远古源泉古瓶',
    title: '⏫ 单向古瓶',
    sub: '只能出不能进 · 倒空后消失',
    desc: '💡 <b>玩法说明：</b>该瓶<b>只能向外倒水，不能往里接水</b>；里面的水全部倒空后会自动消失，腾出桌面空间！',
    sampleBottle: () => ({ id: 99, maxCap: 4, layers: ['orange', 'purple', 'cyan'], special: 'one_way_out' }),
  },
  hourglass_bomb: {
    key: 'hourglass_bomb',
    badge: '⏳ 第 26 关 · 星砂流沙挑战',
    title: '⏳ 倒计时沙漏瓶',
    sub: '归零前倒空或装满整瓶',
    desc: '💡 <b>玩法说明：</b>瓶身挂有倒计时，每次倒水数字减 1！请在数字变成 0 之前<b>将水倒空或装满整瓶</b>，否则瓶口会被冰冻！',
    sampleBottle: () => ({ id: 99, maxCap: 4, layers: ['red', 'yellow', 'pink'], special: 'none', countdownMoves: 6 }),
  },
};

const LEVEL_CACHE: Record<number, LevelConfig> = {};

export function getLevelConfig(lv: number): LevelConfig {
  const levelNum = Math.max(1, Math.min(200, Math.floor(lv || 1)));
  if (LEVEL_CACHE[levelNum]) return LEVEL_CACHE[levelNum];

  const rng = mulberry32(levelNum * 2654435761 + 1013904223);
  const chapter = Math.floor((levelNum - 1) / 10) + 1;
  const pos = ((levelNum - 1) % 10) + 1;

  const waveStarsMap: Record<number, number> = { 1: 3, 2: 4, 3: 4, 4: 5, 5: 5, 6: 3, 7: 4, 8: 5, 9: 5, 10: 5 };
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

  // 特殊机关首次引入弹窗标记
  if (levelNum === 4) cfg.introMechanicKey = 'mystery';
  else if (levelNum === 5) cfg.introMechanicKey = 'giant_cat';
  else if (levelNum === 6) cfg.introMechanicKey = 'ice_base';
  else if (levelNum === 7) cfg.introMechanicKey = 'silk_drape';
  else if (levelNum === 8) cfg.introMechanicKey = 'varied_height';
  else if (levelNum === 9) cfg.introMechanicKey = 'tall_8';
  else if (levelNum === 10) cfg.introMechanicKey = 'grand_obstacles';
  else if (levelNum === 12) cfg.introMechanicKey = 'color_lock';
  else if (levelNum === 16) cfg.introMechanicKey = 'one_way_in';
  else if (levelNum === 22) cfg.introMechanicKey = 'one_way_out';
  else if (levelNum === 26) cfg.introMechanicKey = 'hourglass_bomb';

  // ==================== Pos 5：章中 BOSS · 皇家灵猫瓶 ====================
  if (pos === 5) {
    const shuffledAll = COLOR_KEYS.slice().sort(() => rng() - 0.5);
    const catColorKey = shuffledAll[0];
    const otherColors = shuffledAll.slice(1, 5);
    cfg.title = `第 ${levelNum} 关 · 皇家灵猫瓶`;
    cfg.shortTag = '🐱灵猫典藏';
    cfg.hasBags = false;
    cfg.isCatBossLevel = true;
    cfg.gridClass = 'layout-cat-boss';
    cfg.optimalMoves = 18 + Math.min(8, Math.floor(chapter / 2));

    const subTubes = ensureOpeningPairs(buildVerifiedColorTubes(otherColors, 4, rng), 2);
    const f0 = [catColorKey, subTubes[0][0], catColorKey, subTubes[0][1]];
    const f1 = [catColorKey, subTubes[1][0], subTubes[1][1], subTubes[1][2]];
    const f2 = [catColorKey, subTubes[2][0], subTubes[2][1], subTubes[2][2]];
    const f3 = [catColorKey, subTubes[3][0], subTubes[3][1], subTubes[0][2]];
    const f4 = [catColorKey, subTubes[3][2], subTubes[3][3], subTubes[1][3]];
    const f5 = [subTubes[2][3], subTubes[0][3]];

    const useMyst = chapter >= 2 ? 2 : 1;
    const useIce = chapter >= 2;
    const useOutAncient = chapter >= 3;

    cfg.bottles = () => [
      { id: 0, maxCap: 4, layers: f0.slice(), special: 'none', mysteryCount: useMyst },
      { id: 1, maxCap: 4, layers: f1.slice(), special: useIce ? 'ice_base' : 'none', poursToBreak: useIce ? 2 : 0 },
      { id: 2, maxCap: 8, isGiantCat: true, catTargetColor: catColorKey, layers: [catColorKey, catColorKey], special: 'none' },
      { id: 3, maxCap: 4, layers: f2.slice(), special: 'none', mysteryCount: useMyst },
      { id: 4, maxCap: 4, layers: f3.slice(), special: 'none', countdownMoves: chapter >= 4 ? 7 : null },
      { id: 5, maxCap: 4, layers: f4.slice(), special: chapter >= 2 ? 'stone_base' : 'none', poursToBreak: 2 },
      { id: 6, maxCap: 4, layers: f5.slice(), special: useOutAncient ? 'one_way_out' : 'none' },
      { id: 7, maxCap: 4, layers: [], special: 'none' },
      { id: 8, maxCap: 4, layers: [], special: useOutAncient ? 'none' : 'ad_cam' },
    ];
    LEVEL_CACHE[levelNum] = cfg;
    return cfg;
  }

  // ==================== Pos 3 & Pos 8：高低异形声学瓶 ====================
  if (pos === 8 || (pos === 3 && chapter >= 2)) {
    cfg.title = `第 ${levelNum} 关 · ${pos === 8 ? '高低声学瓶' : '异形色环局'}`;
    cfg.shortTag = pos === 8 ? (levelNum >= 28 ? '异形+流沙' : '高低声学') : '异形+色环';
    cfg.hasBags = false;
    cfg.isVariedHeight = true;
    cfg.gridClass = 'layout-varied';
    cfg.optimalMoves = 20 + Math.min(8, Math.floor(chapter / 2));

    const shuffledAll = COLOR_KEYS.slice().sort(() => rng() - 0.5);
    const c2A = shuffledAll[0],
      c2B = shuffledAll[1];
    const c4A = shuffledAll[2],
      c4B = shuffledAll[3],
      c4C = shuffledAll[4];
    const c6A = shuffledAll[5],
      c6B = shuffledAll[6];
    const tubes4 = ensureOpeningPairs(buildVerifiedColorTubes([c4A, c4B, c4C], 4, rng), 1);
    const tubes6 = buildVerifiedColorTubes([c6A, c6B], 6, rng);
    const lockCol4 = tubes4[0][3] || c4A;
    const useColorLockHere = pos === 3 && chapter >= 2;
    const useFunnelAndBombHere = pos === 8 && levelNum >= 28;

    cfg.bottles = () => [
      { id: 0, maxCap: 2, layers: [c2A, c2B], special: 'none' },
      { id: 1, maxCap: 6, layers: tubes6[0].slice(0, 5), special: 'ice_base', poursToBreak: 2 },
      { id: 2, maxCap: 4, layers: tubes4[0].slice(), special: 'none', mysteryCount: 1, countdownMoves: useFunnelAndBombHere ? 7 : null },
      { id: 3, maxCap: 6, layers: tubes6[1].slice(0, 5), special: 'none', mysteryCount: 2 },
      { id: 4, maxCap: 2, layers: [c2B, c2A], special: 'none' },
      { id: 5, maxCap: 4, layers: tubes4[1].slice(), special: 'stone_base', poursToBreak: 2 },
      { id: 6, maxCap: 2, layers: [], special: 'none' },
      { id: 7, maxCap: 4, layers: tubes4[2].slice(), special: 'none', mysteryCount: 1 },
      { id: 8, maxCap: 6, layers: [tubes6[0][5], tubes6[1][5]], special: 'none' },
      { id: 9, maxCap: 4, layers: [], special: useColorLockHere ? 'color_lock' : 'none', requiredColor: useColorLockHere ? lockCol4 : null },
      { id: 10, maxCap: 6, layers: [], special: 'none' },
      { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
    ];
    LEVEL_CACHE[levelNum] = cfg;
    return cfg;
  }

  // ==================== Pos 9：第二波峰 · 八色皇冠长管瓶 ====================
  if (pos === 9) {
    cfg.title = `第 ${levelNum} 关 · 皇冠长管瓶`;
    cfg.shortTag = chapter >= 2 ? '8层+色环' : '8层皇冠管';
    cfg.hasBags = false;
    cfg.gridClass = 'layout-tall8';
    cfg.optimalMoves = 24 + Math.min(10, Math.floor(chapter / 2));
    const shuffledAll = COLOR_KEYS.slice().sort(() => rng() - 0.5);
    const tallColors = shuffledAll.slice(0, 5);
    const tallTubes = ensureOpeningPairs(buildVerifiedColorTubes(tallColors, 8, rng), 2);
    const lockCol8 = tallTubes[0][7] || tallColors[0];

    cfg.bottles = () => [
      { id: 0, maxCap: 8, layers: tallTubes[0].slice(), special: 'none', mysteryCount: 2 },
      { id: 1, maxCap: 8, layers: tallTubes[1].slice(), special: 'ice_base', poursToBreak: 2 },
      { id: 2, maxCap: 8, layers: tallTubes[2].slice(), special: 'none', mysteryCount: 2, countdownMoves: chapter >= 3 ? 8 : null },
      { id: 3, maxCap: 8, layers: tallTubes[3].slice(), special: 'stone_base', poursToBreak: 3 },
      { id: 4, maxCap: 8, layers: tallTubes[4].slice(), special: 'none', mysteryCount: 2 },
      { id: 5, maxCap: 8, layers: [], special: chapter >= 2 ? 'color_lock' : 'none', requiredColor: chapter >= 2 ? lockCol8 : null },
      { id: 6, maxCap: 8, layers: [], special: 'none' },
    ];
    LEVEL_CACHE[levelNum] = cfg;
    return cfg;
  }

  // ==================== Pos 10：关底大魔王 · 21瓶王座局 ====================
  if (pos === 10) {
    cfg.title = `第 ${levelNum} 关 · 冰封王座局`;
    cfg.shortTag = '👑宗师试炼';
    cfg.hasBags = true;
    cfg.gridClass = 'layout-21';
    cfg.optimalMoves = 30 + Math.min(12, chapter);
    const shuffledAll = COLOR_KEYS.slice().sort(() => rng() - 0.5);
    const openPalette = shuffledAll.slice(0, 5);
    const lockedPalette = shuffledAll.slice(5, 8);
    const openTubes = ensureOpeningPairs(buildVerifiedColorTubes(openPalette, 4, rng), 2);
    const lockedTubes = buildVerifiedColorTubes(lockedPalette, 4, rng);
    cfg.bags = [
      { slot: 0, color: openPalette[0], locked: false, packedBottle: null },
      { slot: 1, color: openPalette[1], locked: false, packedBottle: null },
      { slot: 2, color: openPalette[2], locked: false, packedBottle: null },
      { slot: 3, color: null, locked: true, packedBottle: null },
    ];
    const useAdv = chapter >= 2;
    const useAdv3 = chapter >= 3;
    const cRed = openPalette[4];
    const cBlue = openPalette[3];
    const cCyan = lockedPalette[0];
    const cPurple = lockedPalette[1];
    const cPink = lockedPalette[2];

    cfg.bottles = () => [
      { id: 0, maxCap: 4, layers: openTubes[0].slice(0, 3), special: 'none' },
      { id: 1, maxCap: 4, layers: openTubes[1].slice(), special: 'none', mysteryCount: 2, countdownMoves: useAdv3 ? 8 : null },
      { id: 2, maxCap: 4, layers: openTubes[2].slice(), special: 'none' },
      { id: 3, maxCap: 4, layers: lockedTubes[0].slice(), special: 'silk_drape', unlockOrder: 1 },
      { id: 4, maxCap: 4, layers: openTubes[3].slice(), special: 'none', mysteryCount: 2 },
      { id: 5, maxCap: 4, layers: openTubes[4].slice(), special: 'ice_base', poursToBreak: 2 },
      { id: 6, maxCap: 4, layers: [openTubes[0][3]], special: useAdv3 ? 'one_way_out' : 'none' },
      { id: 7, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 8, maxCap: 4, layers: [cCyan, cPurple], special: 'none' },
      { id: 9, maxCap: 4, layers: [cPurple, cCyan, cPink, cCyan], special: 'none', mysteryCount: 2 },
      { id: 10, maxCap: 4, layers: lockedTubes[1].slice(), special: 'full_ice', unlockOrder: 2 },
      { id: 11, maxCap: 4, layers: [cPink, cPurple, cCyan], special: 'none' },
      { id: 12, maxCap: 4, layers: [cPink, cPink, cPurple], special: 'none' },
      { id: 13, maxCap: 4, layers: [], special: useAdv ? 'color_lock' : 'ad_cam', requiredColor: useAdv ? cRed : null },
      { id: 14, maxCap: 4, layers: [], special: 'none' },
      { id: 15, maxCap: 4, layers: [cRed, cBlue, cRed, cBlue], special: 'none', mysteryCount: 2 },
      { id: 16, maxCap: 4, layers: [cBlue, cRed, cBlue, cRed], special: 'stone_base', poursToBreak: 3 },
      { id: 17, maxCap: 4, layers: lockedTubes[2].slice(), special: 'paper_bag', unlockOrder: 3 },
      { id: 18, maxCap: 4, layers: [], special: 'none' },
      { id: 19, maxCap: 4, layers: [], special: 'none' },
      { id: 20, maxCap: 4, layers: [], special: 'none' },
    ];
    LEVEL_CACHE[levelNum] = cfg;
    return cfg;
  }

  // ==================== 常规与特色波浪关卡 ====================
  cfg.hasBags = pos === 2 || pos === 6 || pos === 7 || levelNum === 4;
  const shuffledAll = COLOR_KEYS.slice().sort(() => rng() - 0.5);
  const groupAColors = shuffledAll.slice(0, 6);
  const groupBColors = shuffledAll.slice(6, 8);
  const tubesA = ensureOpeningPairs(buildVerifiedColorTubes(groupAColors, 4, rng), 2);
  const tubesB = buildVerifiedColorTubes(groupBColors, 4, rng);
  const topExposedColor = tubesA[0][3] || groupAColors[0];

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
  } else if (levelNum === 12) {
    cfg.title = '第 12 关 · 宝石色环契约';
    cfg.shortTag = '🔒色环登场';
    cfg.hasBags = true;
  } else if (levelNum === 16) {
    cfg.title = '第 16 关 · 单向琉璃漏斗';
    cfg.shortTag = '⏬漏斗登场';
    cfg.hasBags = true;
  } else if (levelNum === 22) {
    cfg.title = '第 22 关 · 远古源泉古瓶';
    cfg.shortTag = '⏫古瓶登场';
    cfg.hasBags = true;
  } else if (levelNum === 26) {
    cfg.title = '第 26 关 · 星砂流沙怀表';
    cfg.shortTag = '⏳流沙登场';
    cfg.hasBags = true;
  } else if (pos === 4) {
    cfg.moveLimit = cfg.optimalMoves + Math.max(4, 7 - Math.floor(chapter / 4));
    cfg.title = `第 ${levelNum} 关 · ${levelNum >= 24 ? '星晷流沙双限' : '星晷限步局'}`;
    cfg.shortTag = levelNum >= 24 ? `⏳限${cfg.moveLimit}步+流沙` : `✨限${cfg.moveLimit}步`;
  } else if (pos === 2) {
    cfg.title = `第 ${levelNum} 关 · 色环契约局`;
    cfg.shortTag = '🔒色环+星缎';
  } else if (pos === 6) {
    cfg.title = `第 ${levelNum} 关 · 漏斗缓冲谷`;
    cfg.shortTag = '⏬单向漏斗';
  } else if (pos === 7) {
    cfg.title = `第 ${levelNum} 关 · 古瓶冰雕阵`;
    cfg.shortTag = levelNum >= 17 ? '⏫古瓶+冰雕' : '🧊极光冰雕';
  } else {
    cfg.title = `第 ${levelNum} 关 · 水色交错`;
    cfg.shortTag = chapter >= 3 ? '⏫古瓶+星雾' : '深层星雾';
  }

  if (cfg.hasBags) {
    cfg.bags = [
      { slot: 0, color: tubesA[0][3], locked: false, packedBottle: null },
      { slot: 1, color: tubesA[2][3], locked: false, packedBottle: null },
      { slot: 2, color: tubesA[4][3], locked: false, packedBottle: null },
      { slot: 3, color: null, locked: true, packedBottle: null },
    ];
  }

  cfg.bottles = () => {
    if (levelNum === 4) {
      return [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', mysteryCount: 2 },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'none', mysteryCount: 2 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 2 },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'none', mysteryCount: 2 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none', mysteryCount: 2 },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: 'none', mysteryCount: 1 },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'none', mysteryCount: 1 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
        { id: 8, maxCap: 4, layers: [], special: 'none' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
      ];
    }

    if (levelNum === 6) {
      return [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', mysteryCount: 1 },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'ice_base', poursToBreak: 2 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 1 },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'ice_base', poursToBreak: 3 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none', mysteryCount: 1 },
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
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', mysteryCount: 1 },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'ice_base', poursToBreak: 2 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 2 },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'none', mysteryCount: 2 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'ice_base', poursToBreak: 2 },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: 'none' },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'silk_drape', unlockOrder: 1 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'silk_drape', unlockOrder: 2 },
        { id: 8, maxCap: 4, layers: [], special: 'none' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
      ];
    }

    // 第 12 关 & Pos 2（除第 22 关外）：🔒 专属色环契约局
    if (pos === 2 && levelNum !== 22) {
      return [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', mysteryCount: 1 },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'ice_base', poursToBreak: 2 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 2 },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'none', mysteryCount: 1 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none' },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: 'none' },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'silk_drape', unlockOrder: 1 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
        { id: 8, maxCap: 4, layers: [], special: 'color_lock', requiredColor: topExposedColor },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'none' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
      ];
    }

    // 第 16 关 & Pos 6：⏬ 单向接水漏斗缓冲谷（第 26 关同步解锁 ⏳ 流沙怀表）
    if (pos === 6 && levelNum >= 16) {
      const hasBombHere = levelNum >= 26;
      return [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'none', countdownMoves: hasBombHere ? 7 : null },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'none', mysteryCount: 1 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'none', mysteryCount: 1, countdownMoves: levelNum >= 36 ? 8 : null },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'none', mysteryCount: 1 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none' },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(1), special: 'none' },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'paper_bag', unlockOrder: 1 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
        { id: 8, maxCap: 4, layers: [tubesA[5][0]], special: 'one_way_in' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'none' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
      ];
    }

    // 第 22 关 & Pos 7（levelNum >= 17）：⏫ 单向出水古瓶局
    if (levelNum === 22 || (pos === 7 && levelNum >= 17)) {
      return [
        { id: 0, maxCap: 4, layers: tubesA[0].slice(), special: 'one_way_out' },
        { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'ice_base', poursToBreak: 2 },
        { id: 2, maxCap: 4, layers: tubesA[2].slice(), special: 'one_way_out' },
        { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: 'none', mysteryCount: 2 },
        { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none', mysteryCount: 1 },
        { id: 5, maxCap: 4, layers: tubesA[5].slice(), special: 'none' },
        { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'full_ice', unlockOrder: 1 },
        { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
        { id: 8, maxCap: 4, layers: [], special: 'none' },
        { id: 9, maxCap: 4, layers: [], special: 'none' },
        { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
        { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
      ];
    }

    // Pos 4 & Pos 1
    const useBombInPos4 = pos === 4 && levelNum >= 24;
    const useAncientInPos1 = pos === 1 && chapter >= 3;
    return [
      {
        id: 0,
        maxCap: 4,
        layers: tubesA[0].slice(),
        special: useAncientInPos1 ? 'one_way_out' : 'none',
        mysteryCount: useAncientInPos1 ? 0 : 2,
        countdownMoves: useBombInPos4 ? 6 : null,
      },
      { id: 1, maxCap: 4, layers: tubesA[1].slice(), special: 'none', mysteryCount: 2 },
      {
        id: 2,
        maxCap: 4,
        layers: tubesA[2].slice(),
        special: 'none',
        mysteryCount: 2,
        countdownMoves: useBombInPos4 && chapter >= 4 ? 8 : null,
      },
      { id: 3, maxCap: 4, layers: tubesA[3].slice(), special: pos === 4 ? 'stone_base' : 'ice_base', poursToBreak: 2 },
      { id: 4, maxCap: 4, layers: tubesA[4].slice(), special: 'none', mysteryCount: 1 },
      {
        id: 5,
        maxCap: 4,
        layers: tubesA[5].slice(),
        special: pos === 4 ? 'stone_base' : 'none',
        poursToBreak: 2,
        mysteryCount: 1,
      },
      { id: 6, maxCap: 4, layers: tubesB[0].slice(), special: 'none', mysteryCount: 1 },
      { id: 7, maxCap: 4, layers: tubesB[1].slice(), special: 'none' },
      { id: 8, maxCap: 4, layers: [], special: 'none' },
      { id: 9, maxCap: 4, layers: [], special: 'none' },
      { id: 10, maxCap: 4, layers: [], special: 'ad_cam' },
      { id: 11, maxCap: 4, layers: [], special: 'ad_cam' },
    ];
  };

  LEVEL_CACHE[levelNum] = cfg;
  return cfg;
}
