import { Bag, Bottle, ColorKey } from './types';

export function isCompleteBottle(b: Bottle): boolean {
  if (!b || b.removed) return false;
  const cap = b.maxCap || 4;
  return (
    b.special === 'none' &&
    (!b.mysteryCount || b.mysteryCount === 0) &&
    b.layers.length === cap &&
    b.layers.every((c) => c === b.layers[0])
  );
}

export function canSelectBottle(b: Bottle | undefined, showToast?: (msg: string) => void): boolean {
  if (!b || b.removed || b.corked) return false;
  if (b.frozenTurns && b.frozenTurns > 0) {
    showToast?.(`🧊 瓶口寒冰封印中！再完成 ${b.frozenTurns} 次倾倒解封`);
    return false;
  }
  if (b.isGiantCat) {
    showToast?.('🐱 正中央是超大小猫目标玻璃瓶！请将周围小瓶的樱花粉药水倒入猫瓶中灌满它！');
    return false;
  }
  if (b.special === 'one_way_in') {
    showToast?.('⏬ 单向漏斗瓶：仅可注入秘药，不可向外倾倒！');
    return false;
  }
  if (b.special === 'silk_drape') {
    showToast?.(`🧣 蓝白丝绸布幔锁住中！打包 ${b.unlockOrder || 1} 个礼盒即可掀开`);
    return false;
  }
  if (b.special === 'full_ice') {
    showToast?.(`🧊 全冰雕冻结中！累计打包 ${b.unlockOrder || 1} 个礼盒即可破冰融化`);
    return false;
  }
  if (b.special === 'paper_bag') {
    showToast?.(`🛍️ 牛皮纸袋包裹中！打包 ${b.unlockOrder || 1} 个礼盒即可拆开纸袋`);
    return false;
  }
  if (b.special === 'ice_base') {
    showToast?.(`❄️ 瓶底被寒冰冻结（还可接水）！再完成 ${b.poursToBreak || 1} 次倒水自动震碎寒冰`);
    return false;
  }
  if (b.special === 'stone_base') {
    showToast?.(`🪨 瓶底被岩石卡住（还可接水）！再完成 ${b.poursToBreak || 1} 次倒水自动震碎岩石`);
    return false;
  }
  if (b.special === 'ad_cam' || b.special === 'ad_cam_blue') return false;
  if (b.layers.length === 0 || isCompleteBottle(b)) return false;
  return true;
}

export function canSelectBottleNoToast(b: Bottle | undefined): boolean {
  if (!b || b.removed || b.corked) return false;
  if (b.frozenTurns && b.frozenTurns > 0) return false;
  if (b.isGiantCat) return false;
  if (
    [
      'silk_drape',
      'full_ice',
      'paper_bag',
      'ice_base',
      'stone_base',
      'one_way_in',
      'ad_cam',
      'ad_cam_blue',
    ].includes(b.special)
  ) {
    return false;
  }
  if (b.layers.length === 0 || isCompleteBottle(b)) return false;
  return true;
}

export function canPourInto(src: Bottle, dst: Bottle): boolean {
  if (!src || !dst || src.removed || dst.removed || src.corked || dst.corked) return false;
  if ((src.frozenTurns && src.frozenTurns > 0) || (dst.frozenTurns && dst.frozenTurns > 0)) return false;
  const openMouthSpecials = ['none', 'ice_base', 'stone_base', 'one_way_in', 'color_lock'];
  if (!openMouthSpecials.includes(dst.special)) return false;
  const dstCap = dst.maxCap || 4;
  if (dst.layers.length >= dstCap || src.layers.length === 0) return false;
  const pourColor = src.layers[src.layers.length - 1];
  if (dst.special === 'color_lock' && dst.requiredColor && pourColor !== dst.requiredColor) {
    return false;
  }
  if (dst.layers.length === 0) return true;
  return pourColor === dst.layers[dst.layers.length - 1];
}

/**
 * 当某种颜色的所有药水已集满封存后，自动解除场上剩余空色环瓶的限制，防止卡死
 */
export function releaseObsoleteColorLocks(bottles: Bottle[]): void {
  bottles.forEach((b) => {
    if (!b || b.removed || b.corked || b.special !== 'color_lock' || !b.requiredColor) return;
    const reqC = b.requiredColor;
    let remainingLayersOfReq = 0;
    bottles.forEach((other) => {
      if (!other || other.removed || other.corked) return;
      remainingLayersOfReq += other.layers.filter((c) => c === reqC).length;
    });
    if (remainingLayersOfReq === 0) {
      b.special = 'none';
      b.requiredColor = null;
    }
  });
}

export function getPourableCount(src: Bottle, dst: Bottle): number {
  if (!canPourInto(src, dst)) return 0;
  const color = src.layers[src.layers.length - 1];
  const srcRevealedStart = src.mysteryCount || 0;
  let sameColorCount = 0;
  const dstCap = dst.maxCap || 4;

  for (let i = src.layers.length - 1; i >= srcRevealedStart; i--) {
    if (src.layers[i] === color && dst.layers.length + sameColorCount < dstCap) {
      sameColorCount++;
    } else {
      break;
    }
  }
  return sameColorCount;
}

export function pickNextNeededBagColor(bottles: Bottle[], bags: Bag[]): ColorKey {
  const activeBagColors = bags.filter((b) => !b.locked && b.color).map((b) => b.color);
  const remainingColors: ColorKey[] = [];
  bottles.forEach((b) => {
    if (b.removed) return;
    b.layers.forEach((c) => {
      if (c && c !== 'mystery_dark' && !remainingColors.includes(c)) {
        remainingColors.push(c);
      }
    });
  });
  return remainingColors.find((c) => !activeBagColors.includes(c)) || remainingColors[0] || 'red';
}

export function checkGameWon(bottles: Bottle[], wasGiantCat?: boolean): boolean {
  if (wasGiantCat) return true;
  return bottles.every((b) => b.corked || b.removed || b.layers.length === 0);
}

/**
 * 启发式智能寻路算法：快速找出当前盘面最具有推进价值的倒水方案
 */
export function findBestPourMove(bottles: Bottle[]): { srcIdx: number; dstIdx: number } | null {
  let bestMove: { srcIdx: number; dstIdx: number } | null = null;
  let bestScore = -1e9;

  for (let i = 0; i < bottles.length; i++) {
    const src = bottles[i];
    if (!canSelectBottleNoToast(src)) continue;
    const pourCol = src.layers[src.layers.length - 1];
    const srcRevealedStart = src.mysteryCount || 0;
    let srcTopSame = 0;
    for (let k = src.layers.length - 1; k >= srcRevealedStart; k--) {
      if (src.layers[k] === pourCol) srcTopSame++;
      else break;
    }
    const isSrcPure = srcRevealedStart === 0 && srcTopSame === src.layers.length;

    for (let j = 0; j < bottles.length; j++) {
      if (i === j) continue;
      const dst = bottles[j];
      if (!canPourInto(src, dst)) continue;

      const dstCap = dst.maxCap || 4;
      const freeSpace = dstCap - dst.layers.length;

      // 避免纯色瓶倒入普通空瓶无意义搬家
      if (dst.layers.length === 0 && isSrcPure && dst.special !== 'color_lock' && dstCap <= (src.maxCap || 4)) {
        continue;
      }
      // 避免杂色倒入单向漏斗瓶
      if (dst.special === 'one_way_in' && dst.layers.length === 0 && srcTopSame < dstCap) {
        continue;
      }

      let score = 0;
      if (dst.layers.length > 0) {
        score += 100;
        // 一次性转移全部同色
        if (freeSpace >= srcTopSame) score += 50;
        // 凑满封瓶
        if (dst.layers.length + Math.min(freeSpace, srcTopSame) === dstCap) score += 80;
        // 揭开盲盒
        if (src.mysteryCount && src.mysteryCount > 0 && src.layers.length - Math.min(freeSpace, srcTopSame) <= src.mysteryCount) {
          score += 70;
        }
        // 排空单向古瓶或解除流沙
        if (src.special === 'one_way_out' && srcTopSame <= freeSpace && src.layers.length === srcTopSame) {
          score += 90;
        }
      } else {
        // 目标为空瓶
        score += 25;
        if (src.mysteryCount && src.mysteryCount > 0 && src.layers.length - srcTopSame <= src.mysteryCount) score += 45;
        if (new Set(src.layers).size > 1) score += 20;
      }

      if (score > bestScore) {
        bestScore = score;
        bestMove = { srcIdx: i, dstIdx: j };
      }
    }
  }
  return bestMove;
}
