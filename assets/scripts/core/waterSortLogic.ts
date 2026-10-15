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

export function canSelectBottle(b: Bottle | undefined, onToast?: (msg: string) => void): boolean {
  if (!b || b.removed || b.corked) return false;
  if (b.isGiantCat) {
    onToast?.('🐱 正中央是超大小猫目标玻璃瓶！请将周围小瓶的樱花粉药水倒入猫瓶中灌满它！');
    return false;
  }
  if (b.special === 'silk_drape') {
    onToast?.(`🧣 蓝白丝绸布幔锁住中！打包 ${b.unlockOrder || 1} 个礼盒即可掀开`);
    return false;
  }
  if (b.special === 'full_ice') {
    onToast?.(`🧊 全冰雕冻结中！累计打包 ${b.unlockOrder || 1} 个礼盒即可破冰融化`);
    return false;
  }
  if (b.special === 'paper_bag') {
    onToast?.(`🛍️ 羊皮礼袋包裹中！打包 ${b.unlockOrder || 1} 个礼盒即可拆开礼袋`);
    return false;
  }
  if (b.special === 'ice_base') {
    onToast?.(`❄️ 瓶底被极地霜晶冻结（还可接水）！再完成 ${b.poursToBreak || 1} 次倒水自动震碎霜晶`);
    return false;
  }
  if (b.special === 'stone_base') {
    onToast?.(`🪨 瓶底被曜石卡住（还可接水）！再完成 ${b.poursToBreak || 1} 次倒水自动震碎曜石`);
    return false;
  }
  if (b.special === 'ad_cam' || b.special === 'ad_cam_blue') return false;
  if (b.layers.length === 0 || isCompleteBottle(b)) return false;
  return true;
}

export function canSelectBottleNoToast(b: Bottle | undefined): boolean {
  if (!b || b.removed || b.corked) return false;
  if (b.isGiantCat) return false;
  if (
    ['silk_drape', 'full_ice', 'paper_bag', 'ice_base', 'stone_base', 'ad_cam', 'ad_cam_blue'].includes(
      b.special
    )
  ) {
    return false;
  }
  if (b.layers.length === 0 || isCompleteBottle(b)) return false;
  return true;
}

export function canPourInto(src: Bottle, dst: Bottle): boolean {
  if (!src || !dst || src.removed || dst.removed || dst.corked) return false;
  const openMouthSpecials = ['none', 'ice_base', 'stone_base'];
  if (!openMouthSpecials.includes(dst.special)) return false;
  const dstCap = dst.maxCap || 4;
  if (dst.layers.length >= dstCap || src.layers.length === 0) return false;
  if (dst.layers.length === 0) return true;
  return src.layers[src.layers.length - 1] === dst.layers[dst.layers.length - 1];
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
    if (b.removed || b.corked) return;
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
