import { Level, Bottle } from "./types";

const CAP = 4;

function normal(id: string, layers: string[]): Bottle {
  return { id, type: "normal", capacity: CAP, layers };
}
function empty(id: string): Bottle {
  return { id, type: "empty", capacity: CAP, layers: [] };
}
function masked(id: string, layers: string[], threshold = 2): Bottle {
  return {
    id,
    type: "masked",
    capacity: CAP,
    layers,
    maskRevealed: false,
    unlockTargetCompletedBottles: threshold,
    countsTowardObjective: true,
  };
}
function hidden(id: string, layers: string[], bottomLayers: number): Bottle {
  return { id, type: "hidden", capacity: CAP, layers, hiddenBottomLayers: bottomLayers };
}
function leak(id: string, layers: string[], targetId: string): Bottle {
  return { id, type: "bottom_leak", capacity: CAP, layers, leakTargetBottleId: targetId };
}

// 统一颜色映射：红→red 蓝→blue 黄→yellow 绿→green 紫→purple 橙→orange 青→cyan 粉→pink
// 瓶内颜色数组顺序严格按【底部 → 顶部】排列
export const CURATED_LEVELS: Level[] = [
  // 第 1 关
  {
    id: 1,
    title: "认识同色倒水",
    optimalSteps: 4,
    difficulty: "easy",
    bottles: [
      normal("b1", ["red", "red", "blue", "red"]),
      normal("b2", ["blue", "red", "blue", "blue"]),
      empty("b3"),
      empty("b4"),
    ],
  },
  // 第 2 关
  {
    id: 2,
    title: "首次整理两种颜色",
    optimalSteps: 5,
    difficulty: "easy",
    bottles: [
      normal("b1", ["blue", "red", "red", "red"]),
      normal("b2", ["blue", "red", "blue", "blue"]),
      empty("b3"),
      empty("b4"),
    ],
  },
  // 第 3 关
  {
    id: 3,
    title: "限制倒水顺序",
    optimalSteps: 5,
    difficulty: "easy",
    bottles: [
      normal("b1", ["red", "red", "blue", "blue"]),
      normal("b2", ["red", "blue", "blue", "red"]),
      empty("b3"),
      empty("b4"),
    ],
  },
  // 第 4 关
  {
    id: 4,
    title: "练习利用空瓶",
    optimalSteps: 6,
    difficulty: "easy",
    bottles: [
      normal("b1", ["yellow", "blue", "red", "yellow"]),
      normal("b2", ["red", "red", "yellow", "blue"]),
      normal("b3", ["red", "yellow", "blue", "blue"]),
      empty("b4"),
      empty("b5"),
    ],
  },
  // 第 5 关
  {
    id: 5,
    title: "三色基础整理",
    optimalSteps: 6,
    difficulty: "easy",
    bottles: [
      normal("b1", ["blue", "blue", "yellow", "red"]),
      normal("b2", ["blue", "red", "yellow", "blue"]),
      normal("b3", ["yellow", "red", "yellow", "red"]),
      empty("b4"),
      empty("b5"),
    ],
  },
  // 第 6 关
  {
    id: 6,
    title: "三色混合",
    optimalSteps: 7,
    difficulty: "easy",
    bottles: [
      normal("b1", ["blue", "red", "red", "blue"]),
      normal("b2", ["blue", "blue", "yellow", "yellow"]),
      normal("b3", ["red", "yellow", "yellow", "red"]),
      empty("b4"),
      empty("b5"),
    ],
  },
  // 第 7 关
  {
    id: 7,
    title: "四瓶空间规划",
    optimalSteps: 7,
    difficulty: "easy",
    bottles: [
      normal("b1", ["blue", "yellow", "blue", "red"]),
      normal("b2", ["blue", "red", "red", "yellow"]),
      normal("b3", ["yellow", "yellow", "blue", "red"]),
      empty("b4"),
      empty("b5"),
    ],
  },
  // 第 8 关
  {
    id: 8,
    title: "减少空瓶",
    optimalSteps: 8,
    difficulty: "easy",
    bottles: [
      normal("b1", ["yellow", "blue", "yellow", "green"]),
      normal("b2", ["green", "red", "green", "blue"]),
      normal("b3", ["green", "blue", "red", "blue"]),
      normal("b4", ["yellow", "red", "yellow", "red"]),
      empty("b5"),
      empty("b6"),
    ],
  },
  // 第 9 关
  {
    id: 9,
    title: "四种颜色初步规划",
    optimalSteps: 8,
    difficulty: "easy",
    bottles: [
      normal("b1", ["green", "blue", "red", "blue"]),
      normal("b2", ["red", "yellow", "red", "blue"]),
      normal("b3", ["green", "blue", "green", "yellow"]),
      normal("b4", ["green", "red", "yellow", "yellow"]),
      empty("b5"),
    ],
  },
  // 第 10 关
  {
    id: 10,
    title: "观察连续同色层",
    optimalSteps: 9,
    difficulty: "easy",
    bottles: [
      normal("b1", ["red", "purple", "purple", "red"]),
      normal("b2", ["blue", "yellow", "purple", "green"]),
      normal("b3", ["purple", "green", "yellow", "red"]),
      normal("b4", ["green", "blue", "yellow", "blue"]),
      normal("b5", ["blue", "green", "red", "yellow"]),
      empty("b6"),
    ],
  },
  // 第 11 关
  {
    id: 11,
    title: "五色分拣",
    optimalSteps: 9,
    difficulty: "medium",
    bottles: [
      normal("b1", ["blue", "yellow", "yellow", "green"]),
      normal("b2", ["blue", "green", "red", "red"]),
      normal("b3", ["blue", "green", "red", "green"]),
      normal("b4", ["red", "yellow", "yellow", "blue"]),
      empty("b5"),
      empty("b6"),
    ],
  },
  // 第 12 关
  {
    id: 12,
    title: "避免堵死颜色",
    optimalSteps: 10,
    difficulty: "medium",
    bottles: [
      normal("b1", ["red", "green", "green", "yellow"]),
      normal("b2", ["blue", "blue", "blue", "green"]),
      normal("b3", ["red", "yellow", "yellow", "blue"]),
      normal("b4", ["red", "green", "yellow", "red"]),
      empty("b5"),
      empty("b6"),
    ],
  },
  // 第 13 关
  {
    id: 13,
    title: "五色交错",
    optimalSteps: 10,
    difficulty: "medium",
    bottles: [
      normal("b1", ["yellow", "red", "green", "yellow"]),
      normal("b2", ["red", "purple", "blue", "red"]),
      normal("b3", ["red", "yellow", "blue", "purple"]),
      normal("b4", ["blue", "blue", "purple", "green"]),
      normal("b5", ["green", "green", "purple", "yellow"]),
      empty("b6"),
      empty("b7"),
    ],
  },
  // 第 14 关
  {
    id: 14,
    title: "单空瓶规划",
    optimalSteps: 11,
    difficulty: "medium",
    bottles: [
      normal("b1", ["red", "green", "yellow", "red"]),
      normal("b2", ["yellow", "yellow", "purple", "purple"]),
      normal("b3", ["green", "green", "red", "red"]),
      normal("b4", ["blue", "purple", "purple", "blue"]),
      normal("b5", ["yellow", "green", "blue", "blue"]),
      empty("b6"),
    ],
  },
  // 第 15 关
  {
    id: 15,
    title: "基础进阶综合",
    optimalSteps: 11,
    difficulty: "medium",
    bottles: [
      normal("b1", ["orange", "green", "purple", "blue"]),
      normal("b2", ["green", "red", "blue", "blue"]),
      normal("b3", ["purple", "blue", "purple", "orange"]),
      normal("b4", ["yellow", "purple", "yellow", "yellow"]),
      normal("b5", ["orange", "red", "orange", "red"]),
      normal("b6", ["green", "red", "green", "yellow"]),
      empty("b7"),
    ],
  },
  // 第 16 关
  {
    id: 16,
    title: "五色多层交错",
    optimalSteps: 12,
    difficulty: "medium",
    bottles: [
      normal("b1", ["blue", "yellow", "red", "green"]),
      normal("b2", ["red", "green", "purple", "green"]),
      normal("b3", ["green", "blue", "purple", "red"]),
      normal("b4", ["red", "blue", "yellow", "yellow"]),
      normal("b5", ["yellow", "purple", "blue", "purple"]),
      empty("b6"),
    ],
  },
  // 第 17 关
  {
    id: 17,
    title: "少空瓶挑战",
    optimalSteps: 12,
    difficulty: "medium",
    bottles: [
      normal("b1", ["yellow", "blue", "red", "yellow"]),
      normal("b2", ["yellow", "purple", "green", "purple"]),
      normal("b3", ["purple", "blue", "green", "red"]),
      normal("b4", ["red", "green", "blue", "green"]),
      normal("b5", ["red", "blue", "yellow", "purple"]),
      empty("b6"),
    ],
  },
  // 第 18 关
  {
    id: 18,
    title: "回合顺序规划",
    optimalSteps: 13,
    difficulty: "medium",
    bottles: [
      normal("b1", ["yellow", "purple", "yellow", "blue"]),
      normal("b2", ["blue", "blue", "purple", "green"]),
      normal("b3", ["purple", "green", "red", "red"]),
      normal("b4", ["green", "yellow", "green", "red"]),
      normal("b5", ["purple", "yellow", "blue", "red"]),
      empty("b6"),
      empty("b7"),
    ],
  },
  // 第 19 关
  {
    id: 19,
    title: "复盘与撤销教学",
    optimalSteps: 13,
    difficulty: "medium",
    bottles: [
      normal("b1", ["blue", "red", "red", "blue"]),
      normal("b2", ["blue", "red", "purple", "purple"]),
      normal("b3", ["purple", "green", "yellow", "yellow"]),
      normal("b4", ["green", "yellow", "yellow", "green"]),
      normal("b5", ["green", "red", "purple", "blue"]),
      empty("b6"),
      empty("b7"),
    ],
  },
  // 第 20 关
  {
    id: 20,
    title: "普通机制阶段考核",
    optimalSteps: 14,
    difficulty: "medium",
    bottles: [
      normal("b1", ["green", "purple", "blue", "red"]),
      normal("b2", ["blue", "blue", "green", "yellow"]),
      normal("b3", ["yellow", "blue", "red", "yellow"]),
      normal("b4", ["purple", "green", "red", "red"]),
      normal("b5", ["yellow", "purple", "purple", "green"]),
      empty("b6"),
      empty("b7"),
    ],
  },
  // 第 21 关
  {
    id: 21,
    title: "六色混合",
    optimalSteps: 14,
    difficulty: "medium",
    bottles: [
      normal("b1", ["purple", "yellow", "blue", "green"]),
      normal("b2", ["red", "purple", "yellow", "red"]),
      normal("b3", ["green", "green", "yellow", "blue"]),
      normal("b4", ["green", "red", "blue", "blue"]),
      normal("b5", ["red", "yellow", "purple", "purple"]),
      empty("b6"),
      empty("b7"),
    ],
  },
  // 第 22 关
  {
    id: 22,
    title: "长同色段利用",
    optimalSteps: 15,
    difficulty: "medium",
    bottles: [
      normal("b1", ["blue", "green", "blue", "green"]),
      normal("b2", ["green", "red", "green", "purple"]),
      normal("b3", ["yellow", "purple", "red", "blue"]),
      normal("b4", ["yellow", "purple", "red", "yellow"]),
      normal("b5", ["red", "yellow", "blue", "purple"]),
      empty("b6"),
      empty("b7"),
    ],
  },
  // 第 23 关
  {
    id: 23,
    title: "遮罩瓶教学",
    optimalSteps: 15,
    difficulty: "medium",
    bottles: [
      normal("b1", ["red", "green", "green", "red"]),
      masked("b2", ["red", "red", "purple", "yellow"], 2),
      normal("b3", ["blue", "blue", "purple", "purple"]),
      normal("b4", ["blue", "yellow", "blue", "yellow"]),
      normal("b5", ["green", "purple", "yellow", "green"]),
      empty("b6"),
      empty("b7"),
    ],
  },
  // 第 24 关
  {
    id: 24,
    title: "遮罩阈值提高",
    optimalSteps: 16,
    difficulty: "medium",
    bottles: [
      normal("b1", ["purple", "yellow", "orange", "yellow"]),
      masked("b2", ["orange", "red", "yellow", "green"], 2),
      normal("b3", ["orange", "blue", "purple", "purple"]),
      normal("b4", ["blue", "blue", "red", "orange"]),
      normal("b5", ["blue", "purple", "yellow", "red"]),
      normal("b6", ["red", "green", "green", "green"]),
      empty("b7"),
      empty("b8"),
    ],
  },
  // 第 25 关
  {
    id: 25,
    title: "遮罩与普通瓶配合",
    optimalSteps: 16,
    difficulty: "medium",
    bottles: [
      normal("b1", ["purple", "yellow", "orange", "purple"]),
      masked("b2", ["yellow", "red", "green", "blue"], 2),
      normal("b3", ["blue", "purple", "yellow", "orange"]),
      normal("b4", ["green", "blue", "green", "orange"]),
      normal("b5", ["red", "purple", "orange", "red"]),
      normal("b6", ["blue", "green", "red", "yellow"]),
      empty("b7"),
      empty("b8"),
    ],
  },
  // 第 26 关
  {
    id: 26,
    title: "遮罩瓶基础",
    optimalSteps: 17,
    difficulty: "hard",
    bottles: [
      normal("b1", ["blue", "blue", "green", "yellow"]),
      masked("b2", ["red", "orange", "yellow", "purple"], 2),
      normal("b3", ["green", "green", "red", "yellow"]),
      normal("b4", ["red", "orange", "blue", "red"]),
      normal("b5", ["purple", "green", "yellow", "orange"]),
      normal("b6", ["purple", "blue", "purple", "orange"]),
      empty("b7"),
      empty("b8"),
    ],
  },
  // 第 27 关
  {
    id: 27,
    title: "先解锁还是先整理",
    optimalSteps: 17,
    difficulty: "hard",
    bottles: [
      normal("b1", ["purple", "blue", "yellow", "green"]),
      masked("b2", ["yellow", "purple", "blue", "purple"], 2),
      normal("b3", ["red", "orange", "orange", "green"]),
      normal("b4", ["blue", "red", "red", "orange"]),
      normal("b5", ["green", "green", "orange", "purple"]),
      normal("b6", ["red", "yellow", "yellow", "blue"]),
      empty("b7"),
      empty("b8"),
    ],
  },
  // 第 28 关
  {
    id: 28,
    title: "遮罩瓶双目标",
    optimalSteps: 18,
    difficulty: "hard",
    bottles: [
      normal("b1", ["orange", "red", "red", "green"]),
      masked("b2", ["green", "purple", "yellow", "yellow"], 2),
      normal("b3", ["orange", "blue", "blue", "green"]),
      normal("b4", ["red", "yellow", "orange", "green"]),
      normal("b5", ["purple", "purple", "purple", "blue"]),
      normal("b6", ["orange", "blue", "yellow", "red"]),
      empty("b7"),
    ],
  },
  // 第 29 关
  {
    id: 29,
    title: "遮罩瓶较晚解锁",
    optimalSteps: 18,
    difficulty: "hard",
    bottles: [
      normal("b1", ["green", "yellow", "orange", "purple"]),
      masked("b2", ["red", "blue", "red", "yellow"], 2),
      normal("b3", ["yellow", "red", "blue", "green"]),
      normal("b4", ["purple", "red", "purple", "purple"]),
      normal("b5", ["orange", "orange", "blue", "green"]),
      normal("b6", ["yellow", "orange", "green", "blue"]),
      empty("b7"),
    ],
  },
  // 第 30 关
  {
    id: 30,
    title: "遮罩瓶综合",
    optimalSteps: 19,
    difficulty: "hard",
    bottles: [
      normal("b1", ["green", "green", "yellow", "orange"]),
      masked("b2", ["red", "orange", "blue", "blue"], 2),
      normal("b3", ["purple", "blue", "yellow", "green"]),
      normal("b4", ["orange", "yellow", "red", "orange"]),
      normal("b5", ["red", "purple", "red", "green"]),
      normal("b6", ["blue", "purple", "purple", "yellow"]),
      empty("b7"),
      empty("b8"),
    ],
  },
  // 第 31 关
  {
    id: 31,
    title: "隐藏底部1层",
    optimalSteps: 19,
    difficulty: "hard",
    bottles: [
      normal("b1", ["green", "orange", "green", "yellow"]),
      normal("b2", ["purple", "yellow", "blue", "yellow"]),
      hidden("b3", ["red", "purple", "blue", "red"], 1),
      normal("b4", ["blue", "purple", "orange", "purple"]),
      normal("b5", ["red", "blue", "orange", "green"]),
      normal("b6", ["yellow", "red", "green", "orange"]),
      empty("b7"),
      empty("b8"),
    ],
  },
  // 第 32 关
  {
    id: 32,
    title: "揭晓后再规划",
    optimalSteps: 20,
    difficulty: "hard",
    bottles: [
      normal("b1", ["blue", "green", "blue", "orange"]),
      normal("b2", ["green", "red", "green", "blue"]),
      hidden("b3", ["yellow", "orange", "orange", "orange"], 1),
      normal("b4", ["yellow", "red", "yellow", "purple"]),
      normal("b5", ["red", "red", "purple", "purple"]),
      normal("b6", ["yellow", "purple", "green", "blue"]),
      empty("b7"),
      empty("b8"),
    ],
  },
  // 第 33 关
  {
    id: 33,
    title: "隐藏底部2层",
    optimalSteps: 20,
    difficulty: "hard",
    bottles: [
      normal("b1", ["green", "blue", "green", "yellow"]),
      normal("b2", ["orange", "blue", "yellow", "purple"]),
      hidden("b3", ["green", "red", "blue", "red"], 2),
      normal("b4", ["orange", "green", "red", "red"]),
      normal("b5", ["orange", "blue", "orange", "purple"]),
      normal("b6", ["purple", "yellow", "yellow", "purple"]),
      empty("b7"),
      empty("b8"),
    ],
  },
  // 第 34 关
  {
    id: 34,
    title: "两只隐藏瓶",
    optimalSteps: 21,
    difficulty: "hard",
    bottles: [
      normal("b1", ["green", "purple", "yellow", "orange"]),
      normal("b2", ["red", "blue", "purple", "orange"]),
      hidden("b3", ["cyan", "orange", "orange", "blue"], 2),
      normal("b4", ["purple", "green", "yellow", "green"]),
      normal("b5", ["blue", "red", "blue", "purple"]),
      normal("b6", ["red", "yellow", "yellow", "cyan"]),
      normal("b7", ["red", "cyan", "green", "cyan"]),
      empty("b8"),
      empty("b9"),
    ],
  },
  // 第 35 关
  {
    id: 35,
    title: "隐藏与普通瓶配合",
    optimalSteps: 21,
    difficulty: "hard",
    bottles: [
      normal("b1", ["purple", "blue", "cyan", "red"]),
      normal("b2", ["blue", "orange", "yellow", "purple"]),
      hidden("b3", ["cyan", "red", "orange", "green"], 2),
      normal("b4", ["cyan", "orange", "blue", "cyan"]),
      normal("b5", ["purple", "yellow", "purple", "green"]),
      normal("b6", ["orange", "green", "yellow", "blue"]),
      normal("b7", ["green", "red", "yellow", "red"]),
      empty("b8"),
      empty("b9"),
    ],
  },
  // 第 36 关
  {
    id: 36,
    title: "两种特殊瓶组合",
    optimalSteps: 22,
    difficulty: "hard",
    bottles: [
      normal("b1", ["yellow", "purple", "cyan", "cyan"]),
      masked("b2", ["orange", "green", "purple", "green"], 2),
      hidden("b3", ["cyan", "purple", "blue", "green"], 1),
      normal("b4", ["orange", "red", "yellow", "green"]),
      normal("b5", ["orange", "yellow", "blue", "yellow"]),
      normal("b6", ["purple", "red", "cyan", "blue"]),
      normal("b7", ["red", "blue", "red", "orange"]),
      empty("b8"),
      empty("b9"),
    ],
  },
  // 第 37 关
  {
    id: 37,
    title: "隐藏层连续揭晓",
    optimalSteps: 22,
    difficulty: "hard",
    bottles: [
      normal("b1", ["yellow", "blue", "blue", "green"]),
      masked("b2", ["green", "purple", "red", "orange"], 2),
      hidden("b3", ["purple", "red", "yellow", "yellow"], 1),
      normal("b4", ["orange", "cyan", "yellow", "red"]),
      normal("b5", ["cyan", "red", "purple", "cyan"]),
      normal("b6", ["cyan", "orange", "green", "purple"]),
      normal("b7", ["blue", "green", "blue", "orange"]),
      empty("b8"),
    ],
  },
  // 第 38 关
  {
    id: 38,
    title: "遮罩解锁路线",
    optimalSteps: 23,
    difficulty: "hard",
    bottles: [
      normal("b1", ["purple", "red", "yellow", "purple"]),
      masked("b2", ["blue", "cyan", "orange", "blue"], 2),
      hidden("b3", ["red", "red", "purple", "yellow"], 2),
      normal("b4", ["orange", "orange", "green", "yellow"]),
      normal("b5", ["cyan", "blue", "green", "yellow"]),
      normal("b6", ["blue", "green", "green", "red"]),
      normal("b7", ["purple", "cyan", "orange", "cyan"]),
      empty("b8"),
      empty("b9"),
    ],
  },
  // 第 39 关
  {
    id: 39,
    title: "有限空瓶综合",
    optimalSteps: 23,
    difficulty: "hard",
    bottles: [
      normal("b1", ["cyan", "yellow", "green", "orange"]),
      masked("b2", ["purple", "orange", "cyan", "blue"], 2),
      hidden("b3", ["purple", "yellow", "green", "orange"], 2),
      normal("b4", ["blue", "cyan", "green", "green"]),
      normal("b5", ["blue", "orange", "purple", "red"]),
      normal("b6", ["purple", "blue", "yellow", "yellow"]),
      normal("b7", ["red", "red", "cyan", "red"]),
      empty("b8"),
    ],
  },
  // 第 40 关
  {
    id: 40,
    title: "特殊瓶阶段考核",
    optimalSteps: 24,
    difficulty: "hard",
    bottles: [
      normal("b1", ["yellow", "cyan", "green", "cyan"]),
      masked("b2", ["red", "yellow", "orange", "yellow"], 2),
      hidden("b3", ["cyan", "green", "blue", "green"], 2),
      normal("b4", ["purple", "blue", "orange", "blue"]),
      normal("b5", ["cyan", "red", "purple", "purple"]),
      normal("b6", ["blue", "purple", "yellow", "red"]),
      normal("b7", ["green", "red", "orange", "orange"]),
      empty("b8"),
    ],
  },
  // 第 41 关
  {
    id: 41,
    title: "底部漏水教学",
    optimalSteps: 24,
    difficulty: "master",
    bottles: [
      leak("b1", ["red", "red", "blue", "red"], "b6"),
      normal("b2", ["yellow", "green", "yellow", "orange"]),
      normal("b3", ["purple", "blue", "red", "purple"]),
      normal("b4", ["orange", "green", "cyan", "green"]),
      normal("b5", ["blue", "orange", "blue", "yellow"]),
      normal("b6", ["purple", "cyan", "green", "yellow"]),
      normal("b7", ["cyan", "purple", "cyan", "orange"]),
      empty("b8"),
      empty("b9"),
    ],
  },
  // 第 42 关
  {
    id: 42,
    title: "匹配底色与目标顶色",
    optimalSteps: 25,
    difficulty: "master",
    bottles: [
      leak("b1", ["yellow", "purple", "red", "purple"], "b6"),
      normal("b2", ["purple", "green", "green", "orange"]),
      normal("b3", ["blue", "orange", "blue", "yellow"]),
      normal("b4", ["green", "cyan", "orange", "cyan"]),
      normal("b5", ["cyan", "yellow", "yellow", "red"]),
      normal("b6", ["green", "red", "blue", "red"]),
      normal("b7", ["purple", "orange", "cyan", "blue"]),
      empty("b8"),
      empty("b9"),
    ],
  },
  // 第 43 关
  {
    id: 43,
    title: "主动触发漏水",
    optimalSteps: 25,
    difficulty: "master",
    bottles: [
      leak("b1", ["green", "orange", "orange", "cyan"], "b6"),
      normal("b2", ["cyan", "red", "blue", "purple"]),
      normal("b3", ["red", "purple", "orange", "yellow"]),
      normal("b4", ["blue", "orange", "blue", "cyan"]),
      normal("b5", ["yellow", "purple", "green", "yellow"]),
      normal("b6", ["cyan", "green", "red", "blue"]),
      normal("b7", ["red", "purple", "green", "yellow"]),
      empty("b8"),
      empty("b9"),
    ],
  },
  // 第 44 关
  {
    id: 44,
    title: "漏水与普通倒水组合",
    optimalSteps: 26,
    difficulty: "master",
    bottles: [
      leak("b1", ["cyan", "cyan", "purple", "red"], "b6"),
      normal("b2", ["green", "purple", "orange", "green"]),
      normal("b3", ["orange", "cyan", "red", "green"]),
      normal("b4", ["yellow", "yellow", "red", "blue"]),
      normal("b5", ["yellow", "purple", "red", "blue"]),
      normal("b6", ["purple", "blue", "yellow", "green"]),
      normal("b7", ["orange", "orange", "cyan", "blue"]),
      empty("b8"),
      empty("b9"),
    ],
  },
  // 第 45 关
  {
    id: 45,
    title: "漏水瓶路径规划",
    optimalSteps: 26,
    difficulty: "master",
    bottles: [
      leak("b1", ["yellow", "yellow", "green", "blue"], "b6"),
      normal("b2", ["purple", "purple", "orange", "orange"]),
      normal("b3", ["orange", "green", "blue", "purple"]),
      normal("b4", ["red", "yellow", "green", "yellow"]),
      normal("b5", ["cyan", "red", "cyan", "cyan"]),
      normal("b6", ["purple", "orange", "red", "green"]),
      normal("b7", ["blue", "cyan", "red", "blue"]),
      empty("b8"),
      empty("b9"),
    ],
  },
  // 第 46 关
  {
    id: 46,
    title: "特殊机制综合入门",
    optimalSteps: 27,
    difficulty: "master",
    bottles: [
      leak("b1", ["red", "blue", "cyan", "orange"], "b6"),
      normal("b2", ["green", "purple", "purple", "yellow"]),
      hidden("b3", ["red", "yellow", "yellow", "red"], 1),
      normal("b4", ["orange", "yellow", "purple", "orange"]),
      normal("b5", ["orange", "green", "blue", "green"]),
      normal("b6", ["cyan", "purple", "cyan", "blue"]),
      normal("b7", ["green", "blue", "cyan", "red"]),
      empty("b8"),
      empty("b9"),
    ],
  },
  // 第 47 关
  {
    id: 47,
    title: "多机制顺序规划",
    optimalSteps: 27,
    difficulty: "master",
    bottles: [
      leak("b1", ["cyan", "orange", "red", "yellow"], "b5"),
      normal("b2", ["orange", "green", "green", "blue"]),
      hidden("b3", ["cyan", "purple", "red", "yellow"], 2),
      normal("b4", ["red", "green", "cyan", "blue"]),
      normal("b5", ["blue", "purple", "red", "green"]),
      normal("b6", ["orange", "yellow", "orange", "yellow"]),
      normal("b7", ["purple", "blue", "purple", "cyan"]),
      empty("b8"),
    ],
  },
  // 第 48 关
  {
    id: 48,
    title: "有限空瓶与隐藏层",
    optimalSteps: 28,
    difficulty: "master",
    bottles: [
      leak("b1", ["purple", "cyan", "orange", "red"], "b6"),
      normal("b2", ["blue", "green", "yellow", "green"]),
      hidden("b3", ["orange", "green", "orange", "blue"], 2),
      normal("b4", ["purple", "cyan", "cyan", "blue"]),
      normal("b5", ["orange", "purple", "red", "yellow"]),
      normal("b6", ["blue", "red", "green", "yellow"]),
      normal("b7", ["cyan", "red", "purple", "yellow"]),
      empty("b8"),
      empty("b9"),
    ],
  },
  // 第 49 关
  {
    id: 49,
    title: "多目标遮罩解锁",
    optimalSteps: 28,
    difficulty: "master",
    bottles: [
      leak("b1", ["green", "purple", "blue", "purple"], "b6"),
      masked("b2", ["orange", "cyan", "pink", "green"], 2),
      hidden("b3", ["red", "yellow", "orange", "yellow"], 2),
      normal("b4", ["orange", "cyan", "cyan", "purple"]),
      normal("b5", ["pink", "pink", "cyan", "red"]),
      normal("b6", ["orange", "purple", "yellow", "green"]),
      normal("b7", ["red", "blue", "pink", "blue"]),
      normal("b8", ["blue", "green", "yellow", "red"]),
      empty("b9"),
    ],
  },
  // 第 50 关
  {
    id: 50,
    title: "首版最终挑战",
    optimalSteps: 29,
    difficulty: "master",
    bottles: [
      leak("b1", ["pink", "red", "pink", "green"], "b6"),
      masked("b2", ["red", "green", "blue", "pink"], 2),
      hidden("b3", ["yellow", "cyan", "cyan", "pink"], 2),
      normal("b4", ["purple", "cyan", "blue", "purple"]),
      normal("b5", ["yellow", "orange", "red", "yellow"]),
      normal("b6", ["orange", "orange", "yellow", "orange"]),
      normal("b7", ["purple", "blue", "green", "purple"]),
      normal("b8", ["cyan", "green", "red", "blue"]),
      empty("b9"),
      empty("b10"),
    ],
  },
];
