/**
 * 物理流体数学核心函数库
 * 对齐 demo/index.html 的物理重力水面与水少倾角大定律
 */

export function getBottleLayerMetrics(maxCap = 4, isGiantCat = false) {
  if (isGiantCat) {
    return {
      bottomY: 193,
      layerH: 19.5,
      rx: 40.5,
      mouthLipY: 12.0,
      vbMinX: 0,
      vbMinY: 0,
      vbW: 100,
      vbH: 215,
    };
  }

  if (maxCap === 2) {
    return {
      bottomY: 193,
      layerH: 28.0,
      rx: 38.0,
      mouthLipY: 124.0,
      vbMinX: 0,
      vbMinY: 110,
      vbW: 100,
      vbH: 105,
    };
  }

  if (maxCap === 6) {
    return {
      bottomY: 193,
      layerH: 26.5,
      rx: 38.0,
      mouthLipY: 11.5,
      vbMinX: 0,
      vbMinY: -35,
      vbW: 100,
      vbH: 250,
    };
  }

  if (maxCap === 8) {
    return {
      bottomY: 193,
      layerH: 20.2,
      rx: 38.0,
      mouthLipY: 11.5,
      vbMinX: 0,
      vbMinY: -45,
      vbW: 100,
      vbH: 260,
    };
  }

  // 标准 4 层瓶
  return {
    bottomY: 193,
    layerH: 37.8,
    rx: 38.0,
    mouthLipY: 11.5,
    vbMinX: 0,
    vbMinY: 0,
    vbW: 100,
    vbH: 215,
  };
}

export function getNeckOffsetY(maxCap = 4, isGiantCat = false): number {
  if (isGiantCat) return 0;
  if (maxCap === 2) return 112;
  if (maxCap === 6) return -35;
  if (maxCap === 8) return -45;
  return 0;
}

/**
 * 倾角公式：水越少倾角越大，水越多倾角越小
 */
export function getPhysicalSpillAngleDeg(remainingUnits: number, maxCap = 4): number {
  const norm = Math.max(0, Math.min(maxCap, remainingUnits)) / Math.max(1, maxCap);
  if (norm >= 0.99) return 55;
  if (norm <= 0.05) return 86;
  return 55 + (1 - norm) * 31;
}
