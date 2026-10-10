import { Level, Bottle, BottleType } from './types';

const CAP = 4;

function normal(id: string, layers: string[]): Bottle {
  return { id, type: 'normal', capacity: CAP, layers };
}
function empty(id: string): Bottle {
  return { id, type: 'empty', capacity: CAP, layers: [] };
}
function masked(id: string, layers: string[], threshold = 2): Bottle {
  return {
    id,
    type: 'masked',
    capacity: CAP,
    layers,
    maskRevealed: false,
    unlockTargetCompletedBottles: threshold,
    countsTowardObjective: true,
  };
}
function hidden(id: string, layers: string[], bottomLayers: number): Bottle {
  return { id, type: 'hidden', capacity: CAP, layers, hiddenBottomLayers: bottomLayers };
}
function leak(id: string, layers: string[], targetId: string): Bottle {
  return { id, type: 'bottom_leak', capacity: CAP, layers, leakTargetBottleId: targetId };
}

// Color mapping from design doc: 红→red 蓝→blue 黄→yellow 绿→green 紫→purple 橙→orange 青→cyan 粉→pink
// Every color appears exactly 4 times per level; layers are bottom → top.

export const CURATED_LEVELS: Level[] = [
  // 1
  {
    id: 1,
    title: '认识同色倒水',
    optimalSteps: 5,
    difficulty: 'easy',
    bottles: [
      normal('b1', ['red', 'red', 'blue', 'red']),
      normal('b2', ['blue', 'red', 'blue', 'blue']),
      empty('b3'),
      empty('b4'),
    ],
  },
  // 2
  {
    id: 2,
    title: '首次整理两种颜色',
    optimalSteps: 4,
    difficulty: 'easy',
    bottles: [
      normal('b1', ['blue', 'red', 'red', 'red']),
      normal('b2', ['blue', 'red', 'blue', 'blue']),
      empty('b3'),
      empty('b4'),
    ],
  },
  // 3
  {
    id: 3,
    title: '限制倒水顺序',
    optimalSteps: 4,
    difficulty: 'easy',
    bottles: [
      normal('b1', ['red', 'red', 'blue', 'blue']),
      normal('b2', ['red', 'blue', 'blue', 'red']),
      empty('b3'),
      empty('b4'),
    ],
  },
  // 4
  {
    id: 4,
    title: '练习利用空瓶',
    optimalSteps: 8,
    difficulty: 'easy',
    bottles: [
      normal('b1', ['yellow', 'blue', 'red', 'yellow']),
      normal('b2', ['red', 'red', 'yellow', 'blue']),
      normal('b3', ['red', 'yellow', 'blue', 'blue']),
      empty('b4'),
      empty('b5'),
    ],
  },
  // 5
  {
    id: 5,
    title: '三色基础整理',
    optimalSteps: 9,
    difficulty: 'easy',
    bottles: [
      normal('b1', ['blue', 'blue', 'yellow', 'red']),
      normal('b2', ['blue', 'red', 'yellow', 'blue']),
      normal('b3', ['yellow', 'red', 'yellow', 'red']),
      empty('b4'),
      empty('b5'),
    ],
  },
  // 6
  {
    id: 6,
    title: '三色混合',
    optimalSteps: 6,
    difficulty: 'easy',
    bottles: [
      normal('b1', ['blue', 'red', 'red', 'blue']),
      normal('b2', ['blue', 'blue', 'yellow', 'yellow']),
      normal('b3', ['red', 'yellow', 'yellow', 'red']),
      empty('b4'),
      empty('b5'),
    ],
  },
  // 7
  {
    id: 7,
    title: '四瓶空间规划',
    optimalSteps: 8,
    difficulty: 'easy',
    bottles: [
      normal('b1', ['blue', 'yellow', 'blue', 'red']),
      normal('b2', ['blue', 'red', 'red', 'yellow']),
      normal('b3', ['yellow', 'yellow', 'blue', 'red']),
      empty('b4'),
      empty('b5'),
    ],
  },
  // 8
  {
    id: 8,
    title: '减少空瓶',
    optimalSteps: 14,
    difficulty: 'easy',
    bottles: [
      normal('b1', ['yellow', 'blue', 'yellow', 'green']),
      normal('b2', ['green', 'red', 'green', 'blue']),
      normal('b3', ['green', 'blue', 'red', 'blue']),
      normal('b4', ['yellow', 'red', 'yellow', 'red']),
      empty('b5'),
      empty('b6'),
    ],
  },
  // 9
  {
    id: 9,
    title: '四种颜色初步规划',
    optimalSteps: 14,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['green', 'blue', 'red', 'blue']),
      normal('b2', ['red', 'yellow', 'red', 'blue']),
      normal('b3', ['green', 'blue', 'green', 'yellow']),
      normal('b4', ['green', 'red', 'yellow', 'yellow']),
      empty('b5'),
    ],
  },
  // 10
  {
    id: 10,
    title: '观察连续同色层',
    optimalSteps: 16,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['red', 'purple', 'purple', 'red']),
      normal('b2', ['blue', 'yellow', 'purple', 'green']),
      normal('b3', ['purple', 'green', 'yellow', 'red']),
      normal('b4', ['green', 'blue', 'yellow', 'blue']),
      normal('b5', ['blue', 'green', 'red', 'yellow']),
      empty('b6'),
    ],
  },
  // 11
  {
    id: 11,
    title: '五色分拣',
    optimalSteps: 11,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['blue', 'yellow', 'yellow', 'green']),
      normal('b2', ['blue', 'green', 'red', 'red']),
      normal('b3', ['blue', 'green', 'red', 'green']),
      normal('b4', ['red', 'yellow', 'yellow', 'blue']),
      empty('b5'),
      empty('b6'),
    ],
  },
  // 12
  {
    id: 12,
    title: '避免堵死颜色',
    optimalSteps: 10,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['red', 'green', 'green', 'yellow']),
      normal('b2', ['blue', 'blue', 'blue', 'green']),
      normal('b3', ['red', 'yellow', 'yellow', 'blue']),
      normal('b4', ['red', 'green', 'yellow', 'red']),
      empty('b5'),
      empty('b6'),
    ],
  },
  // 13
  {
    id: 13,
    title: '五色交错',
    optimalSteps: 15,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['yellow', 'red', 'green', 'yellow']),
      normal('b2', ['red', 'purple', 'blue', 'red']),
      normal('b3', ['red', 'yellow', 'blue', 'purple']),
      normal('b4', ['blue', 'blue', 'purple', 'green']),
      normal('b5', ['green', 'green', 'purple', 'yellow']),
      empty('b6'),
      empty('b7'),
    ],
  },
  // 14
  {
    id: 14,
    title: '单空瓶规划',
    optimalSteps: 12,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['red', 'green', 'yellow', 'red']),
      normal('b2', ['yellow', 'yellow', 'purple', 'purple']),
      normal('b3', ['green', 'green', 'red', 'red']),
      normal('b4', ['blue', 'purple', 'purple', 'blue']),
      normal('b5', ['yellow', 'green', 'blue', 'blue']),
      empty('b6'),
      empty('b7'),
    ],
  },
  // 15
  {
    id: 15,
    title: '基础进阶综合',
    optimalSteps: 19,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['orange', 'green', 'purple', 'blue']),
      normal('b2', ['green', 'red', 'blue', 'blue']),
      normal('b3', ['purple', 'blue', 'purple', 'orange']),
      normal('b4', ['yellow', 'purple', 'yellow', 'yellow']),
      normal('b5', ['orange', 'red', 'orange', 'red']),
      normal('b6', ['green', 'red', 'green', 'yellow']),
      empty('b7'),
      empty('b8'),
    ],
  },
  // 16
  {
    id: 16,
    title: '五色多层交错',
    optimalSteps: 16,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['blue', 'yellow', 'red', 'green']),
      normal('b2', ['red', 'green', 'purple', 'green']),
      normal('b3', ['green', 'blue', 'purple', 'red']),
      normal('b4', ['red', 'blue', 'yellow', 'yellow']),
      normal('b5', ['yellow', 'purple', 'blue', 'purple']),
      empty('b6'),
    ],
  },
  // 17
  {
    id: 17,
    title: '少空瓶挑战',
    optimalSteps: 17,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['yellow', 'blue', 'red', 'yellow']),
      normal('b2', ['yellow', 'purple', 'green', 'purple']),
      normal('b3', ['purple', 'blue', 'green', 'red']),
      normal('b4', ['red', 'green', 'blue', 'green']),
      normal('b5', ['red', 'blue', 'yellow', 'purple']),
      empty('b6'),
      empty('b7'),
    ],
  },
  // 18
  {
    id: 18,
    title: '回合顺序规划',
    optimalSteps: 14,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['yellow', 'purple', 'yellow', 'blue']),
      normal('b2', ['blue', 'blue', 'purple', 'green']),
      normal('b3', ['purple', 'green', 'red', 'red']),
      normal('b4', ['green', 'yellow', 'green', 'red']),
      normal('b5', ['purple', 'yellow', 'blue', 'red']),
      empty('b6'),
      empty('b7'),
    ],
  },
  // 19
  {
    id: 19,
    title: '复盘与撤销教学',
    optimalSteps: 13,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['blue', 'red', 'red', 'blue']),
      normal('b2', ['blue', 'red', 'purple', 'purple']),
      normal('b3', ['purple', 'green', 'yellow', 'yellow']),
      normal('b4', ['green', 'yellow', 'yellow', 'green']),
      normal('b5', ['green', 'red', 'purple', 'blue']),
      empty('b6'),
      empty('b7'),
    ],
  },
  // 20
  {
    id: 20,
    title: '普通机制阶段考核',
    optimalSteps: 14,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['green', 'purple', 'blue', 'red']),
      normal('b2', ['blue', 'blue', 'green', 'yellow']),
      normal('b3', ['yellow', 'blue', 'red', 'yellow']),
      normal('b4', ['purple', 'green', 'red', 'red']),
      normal('b5', ['yellow', 'purple', 'purple', 'green']),
      empty('b6'),
      empty('b7'),
    ],
  },
  // 21
  {
    id: 21,
    title: '六色混合',
    optimalSteps: 14,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['purple', 'yellow', 'blue', 'green']),
      normal('b2', ['red', 'purple', 'yellow', 'red']),
      normal('b3', ['green', 'green', 'yellow', 'blue']),
      normal('b4', ['green', 'red', 'blue', 'blue']),
      normal('b5', ['red', 'yellow', 'purple', 'purple']),
      empty('b6'),
      empty('b7'),
    ],
  },
  // 22
  {
    id: 22,
    title: '长同色段利用',
    optimalSteps: 17,
    difficulty: 'medium',
    bottles: [
      normal('b1', ['blue', 'green', 'blue', 'green']),
      normal('b2', ['green', 'red', 'green', 'purple']),
      normal('b3', ['yellow', 'purple', 'red', 'blue']),
      normal('b4', ['yellow', 'purple', 'red', 'yellow']),
      normal('b5', ['red', 'yellow', 'blue', 'purple']),
      empty('b6'),
      empty('b7'),
    ],
  },
  // 23 —— 遮罩瓶 (masked)
  {
    id: 23,
    title: '遮罩瓶教学',
    optimalSteps: 13,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['red', 'green', 'green', 'red']),
      masked('b2', ['red', 'red', 'purple', 'yellow']),
      normal('b3', ['blue', 'blue', 'purple', 'purple']),
      normal('b4', ['blue', 'yellow', 'blue', 'yellow']),
      normal('b5', ['green', 'purple', 'yellow', 'green']),
      empty('b6'),
      empty('b7'),
    ],
  },
  // 24
  {
    id: 24,
    title: '遮罩阈值提高',
    optimalSteps: 16,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['purple', 'yellow', 'orange', 'yellow']),
      masked('b2', ['orange', 'red', 'yellow', 'green']),
      normal('b3', ['orange', 'blue', 'purple', 'purple']),
      normal('b4', ['blue', 'blue', 'red', 'orange']),
      normal('b5', ['blue', 'purple', 'yellow', 'red']),
      normal('b6', ['red', 'green', 'green', 'green']),
      empty('b7'),
      empty('b8'),
    ],
  },
  // 25
  {
    id: 25,
    title: '遮罩与普通瓶配合',
    optimalSteps: 19,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['purple', 'yellow', 'orange', 'purple']),
      masked('b2', ['yellow', 'red', 'green', 'blue']),
      normal('b3', ['blue', 'purple', 'yellow', 'orange']),
      normal('b4', ['green', 'blue', 'green', 'orange']),
      normal('b5', ['red', 'purple', 'orange', 'red']),
      normal('b6', ['blue', 'green', 'red', 'yellow']),
      empty('b7'),
      empty('b8'),
    ],
  },
  // 26
  {
    id: 26,
    title: '遮罩瓶基础',
    optimalSteps: 18,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['blue', 'blue', 'green', 'yellow']),
      masked('b2', ['red', 'orange', 'yellow', 'purple']),
      normal('b3', ['green', 'green', 'red', 'yellow']),
      normal('b4', ['red', 'orange', 'blue', 'red']),
      normal('b5', ['purple', 'green', 'yellow', 'orange']),
      normal('b6', ['purple', 'blue', 'purple', 'orange']),
      empty('b7'),
      empty('b8'),
    ],
  },
  // 27
  {
    id: 27,
    title: '先解锁还是先整理',
    optimalSteps: 16,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['purple', 'blue', 'yellow', 'green']),
      masked('b2', ['yellow', 'purple', 'blue', 'purple']),
      normal('b3', ['red', 'orange', 'orange', 'green']),
      normal('b4', ['blue', 'red', 'red', 'orange']),
      normal('b5', ['green', 'green', 'orange', 'purple']),
      normal('b6', ['red', 'yellow', 'yellow', 'blue']),
      empty('b7'),
      empty('b8'),
    ],
  },
  // 28
  {
    id: 28,
    title: '遮罩瓶双目标',
    optimalSteps: 15,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['orange', 'red', 'red', 'green']),
      masked('b2', ['green', 'purple', 'yellow', 'yellow']),
      normal('b3', ['orange', 'blue', 'blue', 'green']),
      normal('b4', ['red', 'yellow', 'orange', 'green']),
      normal('b5', ['purple', 'purple', 'purple', 'blue']),
      normal('b6', ['orange', 'blue', 'yellow', 'red']),
      empty('b7'),
      empty('b8'),
    ],
  },
  // 29
  {
    id: 29,
    title: '遮罩瓶较晚解锁',
    optimalSteps: 19,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['green', 'yellow', 'orange', 'purple']),
      masked('b2', ['red', 'blue', 'red', 'yellow']),
      normal('b3', ['yellow', 'red', 'blue', 'green']),
      normal('b4', ['purple', 'red', 'purple', 'purple']),
      normal('b5', ['orange', 'orange', 'blue', 'green']),
      normal('b6', ['yellow', 'orange', 'green', 'blue']),
      empty('b7'),
      empty('b8'),
    ],
  },
  // 30
  {
    id: 30,
    title: '遮罩瓶综合',
    optimalSteps: 17,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['green', 'green', 'yellow', 'orange']),
      masked('b2', ['red', 'orange', 'blue', 'blue']),
      normal('b3', ['purple', 'blue', 'yellow', 'green']),
      normal('b4', ['orange', 'yellow', 'red', 'orange']),
      normal('b5', ['red', 'purple', 'red', 'green']),
      normal('b6', ['blue', 'purple', 'purple', 'yellow']),
      empty('b7'),
      empty('b8'),
    ],
  },
  // 31 —— 隐藏瓶 (hidden)
  {
    id: 31,
    title: '隐藏底部1层',
    optimalSteps: 20,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['green', 'orange', 'green', 'yellow']),
      normal('b2', ['purple', 'yellow', 'blue', 'yellow']),
      hidden('b3', ['red', 'purple', 'blue', 'red'], 1),
      normal('b4', ['blue', 'purple', 'orange', 'purple']),
      normal('b5', ['red', 'blue', 'orange', 'green']),
      normal('b6', ['yellow', 'red', 'green', 'orange']),
      empty('b7'),
      empty('b8'),
    ],
  },
  // 32
  {
    id: 32,
    title: '揭晓后再规划',
    optimalSteps: 18,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['blue', 'green', 'blue', 'orange']),
      normal('b2', ['green', 'red', 'green', 'blue']),
      hidden('b3', ['yellow', 'orange', 'orange', 'orange'], 1),
      normal('b4', ['yellow', 'red', 'yellow', 'purple']),
      normal('b5', ['red', 'red', 'purple', 'purple']),
      normal('b6', ['yellow', 'purple', 'green', 'blue']),
      empty('b7'),
      empty('b8'),
    ],
  },
  // 33
  {
    id: 33,
    title: '隐藏底部2层',
    optimalSteps: 20,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['green', 'blue', 'green', 'yellow']),
      normal('b2', ['orange', 'blue', 'yellow', 'purple']),
      hidden('b3', ['green', 'red', 'blue', 'red'], 2),
      normal('b4', ['orange', 'green', 'red', 'red']),
      normal('b5', ['orange', 'blue', 'orange', 'purple']),
      normal('b6', ['purple', 'yellow', 'yellow', 'purple']),
      empty('b7'),
      empty('b8'),
    ],
  },
  // 34
  {
    id: 34,
    title: '两只隐藏瓶',
    optimalSteps: 22,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['green', 'purple', 'yellow', 'orange']),
      normal('b2', ['red', 'blue', 'purple', 'orange']),
      hidden('b3', ['cyan', 'orange', 'orange', 'blue'], 2),
      normal('b4', ['purple', 'green', 'yellow', 'green']),
      normal('b5', ['blue', 'red', 'blue', 'purple']),
      normal('b6', ['red', 'yellow', 'yellow', 'cyan']),
      normal('b7', ['red', 'cyan', 'green', 'cyan']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 35
  {
    id: 35,
    title: '隐藏与普通瓶配合',
    optimalSteps: 23,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['purple', 'blue', 'cyan', 'red']),
      normal('b2', ['blue', 'orange', 'yellow', 'purple']),
      hidden('b3', ['cyan', 'red', 'orange', 'green'], 2),
      normal('b4', ['cyan', 'orange', 'blue', 'cyan']),
      normal('b5', ['purple', 'yellow', 'purple', 'green']),
      normal('b6', ['orange', 'green', 'yellow', 'blue']),
      normal('b7', ['green', 'red', 'yellow', 'red']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 36 —— 遮罩瓶 + 隐藏瓶
  {
    id: 36,
    title: '两种特殊瓶组合',
    optimalSteps: 22,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['yellow', 'purple', 'cyan', 'cyan']),
      masked('b2', ['orange', 'green', 'purple', 'green']),
      hidden('b3', ['cyan', 'purple', 'blue', 'green'], 1),
      normal('b4', ['orange', 'red', 'yellow', 'green']),
      normal('b5', ['orange', 'yellow', 'blue', 'yellow']),
      normal('b6', ['purple', 'red', 'cyan', 'blue']),
      normal('b7', ['red', 'blue', 'red', 'orange']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 37
  {
    id: 37,
    title: '隐藏层连续揭晓',
    optimalSteps: 22,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['yellow', 'blue', 'blue', 'green']),
      masked('b2', ['green', 'purple', 'red', 'orange']),
      hidden('b3', ['purple', 'red', 'yellow', 'yellow'], 1),
      normal('b4', ['orange', 'cyan', 'yellow', 'red']),
      normal('b5', ['cyan', 'red', 'purple', 'cyan']),
      normal('b6', ['cyan', 'orange', 'green', 'purple']),
      normal('b7', ['blue', 'green', 'blue', 'orange']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 38
  {
    id: 38,
    title: '遮罩解锁路线',
    optimalSteps: 20,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['purple', 'red', 'yellow', 'purple']),
      masked('b2', ['blue', 'cyan', 'orange', 'blue']),
      hidden('b3', ['red', 'red', 'purple', 'yellow'], 2),
      normal('b4', ['orange', 'orange', 'green', 'yellow']),
      normal('b5', ['cyan', 'blue', 'green', 'yellow']),
      normal('b6', ['blue', 'green', 'green', 'red']),
      normal('b7', ['purple', 'cyan', 'orange', 'cyan']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 39
  {
    id: 39,
    title: '有限空瓶综合',
    optimalSteps: 22,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['cyan', 'yellow', 'green', 'orange']),
      masked('b2', ['purple', 'orange', 'cyan', 'blue']),
      hidden('b3', ['purple', 'yellow', 'green', 'orange'], 2),
      normal('b4', ['blue', 'cyan', 'green', 'green']),
      normal('b5', ['blue', 'orange', 'purple', 'red']),
      normal('b6', ['purple', 'blue', 'yellow', 'yellow']),
      normal('b7', ['red', 'red', 'cyan', 'red']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 40
  {
    id: 40,
    title: '特殊瓶阶段考核',
    optimalSteps: 22,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['yellow', 'cyan', 'green', 'cyan']),
      masked('b2', ['red', 'yellow', 'orange', 'yellow']),
      hidden('b3', ['cyan', 'green', 'blue', 'green'], 2),
      normal('b4', ['purple', 'blue', 'orange', 'blue']),
      normal('b5', ['cyan', 'red', 'purple', 'purple']),
      normal('b6', ['blue', 'purple', 'yellow', 'red']),
      normal('b7', ['green', 'red', 'orange', 'orange']),
      empty('b8'),
    ],
  },
  // 41 —— 组合瓶阶段：遮罩 + 普通瓶
  {
    id: 41,
    title: '组合回归 41',
    optimalSteps: 22,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['yellow', 'purple', 'cyan', 'cyan']),
      masked('b2', ['orange', 'green', 'purple', 'green']),
      hidden('b3', ['cyan', 'purple', 'blue', 'green'], 1),
      normal('b4', ['orange', 'red', 'yellow', 'green']),
      normal('b5', ['orange', 'yellow', 'blue', 'yellow']),
      normal('b6', ['purple', 'red', 'cyan', 'blue']),
      normal('b7', ['red', 'blue', 'red', 'orange']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 42 —— 组合瓶阶段：隐藏 + 普通瓶
  {
    id: 42,
    title: '组合回归 42',
    optimalSteps: 22,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['yellow', 'blue', 'blue', 'green']),
      masked('b2', ['green', 'purple', 'red', 'orange']),
      hidden('b3', ['purple', 'red', 'yellow', 'yellow'], 1),
      normal('b4', ['orange', 'cyan', 'yellow', 'red']),
      normal('b5', ['cyan', 'red', 'purple', 'cyan']),
      normal('b6', ['cyan', 'orange', 'green', 'purple']),
      normal('b7', ['blue', 'green', 'blue', 'orange']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 43 —— 组合瓶阶段：遮罩 + 隐藏 + 普通瓶
  {
    id: 43,
    title: '组合回归 43',
    optimalSteps: 20,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['purple', 'red', 'yellow', 'purple']),
      masked('b2', ['blue', 'cyan', 'orange', 'blue']),
      hidden('b3', ['red', 'red', 'purple', 'yellow'], 2),
      normal('b4', ['orange', 'orange', 'green', 'yellow']),
      normal('b5', ['cyan', 'blue', 'green', 'yellow']),
      normal('b6', ['blue', 'green', 'green', 'red']),
      normal('b7', ['purple', 'cyan', 'orange', 'cyan']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 44 —— 组合瓶阶段：有限空瓶 + 隐藏 + 遮罩
  {
    id: 44,
    title: '组合回归 44',
    optimalSteps: 22,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['cyan', 'yellow', 'green', 'orange']),
      masked('b2', ['purple', 'orange', 'cyan', 'blue']),
      hidden('b3', ['purple', 'yellow', 'green', 'orange'], 2),
      normal('b4', ['blue', 'cyan', 'green', 'green']),
      normal('b5', ['blue', 'orange', 'purple', 'red']),
      normal('b6', ['purple', 'blue', 'yellow', 'yellow']),
      normal('b7', ['red', 'red', 'cyan', 'red']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 45 —— 组合瓶阶段：特殊瓶考核
  {
    id: 45,
    title: '组合回归 45',
    optimalSteps: 22,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['yellow', 'cyan', 'green', 'cyan']),
      masked('b2', ['red', 'yellow', 'orange', 'yellow']),
      hidden('b3', ['cyan', 'green', 'blue', 'green'], 2),
      normal('b4', ['purple', 'blue', 'orange', 'blue']),
      normal('b5', ['cyan', 'red', 'purple', 'purple']),
      normal('b6', ['blue', 'purple', 'yellow', 'red']),
      normal('b7', ['green', 'red', 'orange', 'orange']),
      empty('b8'),
    ],
  },
  // 46 —— 常规硬核回归：保持后段机制复杂度上升，不把底漏提前插进前期
  {
    id: 46,
    title: '组合回归 46',
    optimalSteps: 23,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['purple', 'blue', 'cyan', 'red']),
      masked('b2', ['blue', 'orange', 'yellow', 'purple']),
      hidden('b3', ['cyan', 'red', 'orange', 'green'], 2),
      normal('b4', ['cyan', 'orange', 'blue', 'cyan']),
      normal('b5', ['purple', 'yellow', 'purple', 'green']),
      normal('b6', ['orange', 'green', 'yellow', 'blue']),
      normal('b7', ['green', 'red', 'yellow', 'red']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 47 —— 遮罩 + 隐藏 + 普通瓶联合
  {
    id: 47,
    title: '联合回归 47',
    optimalSteps: 23,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['purple', 'blue', 'cyan', 'red']),
      masked('b2', ['blue', 'orange', 'yellow', 'purple']),
      hidden('b3', ['cyan', 'red', 'orange', 'green'], 2),
      normal('b4', ['cyan', 'orange', 'blue', 'cyan']),
      normal('b5', ['purple', 'yellow', 'purple', 'green']),
      normal('b6', ['orange', 'green', 'yellow', 'blue']),
      normal('b7', ['green', 'red', 'yellow', 'red']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 48 —— 组合瓶爆发：遮罩 + 隐藏 + 普通瓶并行
  {
    id: 48,
    title: '联合回归 48',
    optimalSteps: 22,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['yellow', 'purple', 'cyan', 'cyan']),
      masked('b2', ['orange', 'green', 'purple', 'green']),
      hidden('b3', ['cyan', 'purple', 'blue', 'green'], 1),
      normal('b4', ['orange', 'red', 'yellow', 'green']),
      normal('b5', ['orange', 'yellow', 'blue', 'yellow']),
      normal('b6', ['purple', 'red', 'cyan', 'blue']),
      normal('b7', ['red', 'blue', 'red', 'orange']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 49 —— 强制关闭空瓶，考验隐藏信息利用
  {
    id: 49,
    title: '融合回归 49',
    optimalSteps: 22,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['cyan', 'yellow', 'green', 'orange']),
      masked('b2', ['purple', 'orange', 'cyan', 'blue']),
      hidden('b3', ['purple', 'yellow', 'green', 'orange'], 2),
      normal('b4', ['blue', 'cyan', 'green', 'green']),
      normal('b5', ['blue', 'orange', 'purple', 'red']),
      normal('b6', ['purple', 'blue', 'yellow', 'yellow']),
      normal('b7', ['red', 'red', 'cyan', 'red']),
      empty('b8'),
      empty('b9'),
    ],
  },
  // 50 —— 高压阶段：遮罩 + 隐藏 + 普通瓶同时存在
  {
    id: 50,
    title: '高压回归 50',
    optimalSteps: 22,
    difficulty: 'hard',
    bottles: [
      normal('b1', ['yellow', 'cyan', 'green', 'cyan']),
      masked('b2', ['red', 'yellow', 'orange', 'yellow']),
      hidden('b3', ['cyan', 'green', 'blue', 'green'], 2),
      normal('b4', ['purple', 'blue', 'orange', 'blue']),
      normal('b5', ['cyan', 'red', 'purple', 'purple']),
      normal('b6', ['blue', 'purple', 'yellow', 'red']),
      normal('b7', ['green', 'red', 'orange', 'orange']),
      empty('b8'),
    ],
  },
  // 51 —— 终局底漏教学：目标瓶必须在下方，不能左右并列；同时保留多类特殊瓶，保证递进合理
  {
    id: 51,
    title: '终局底漏教学 51',
    optimalSteps: 5,
    difficulty: 'hard',
    bottles: [
      leak('b1', ['red', 'red', 'blue', 'red'], 'b5'),
      normal('b2', ['blue', 'red', 'blue', 'blue']),
      masked('b3', [], 2),
      empty('b4'),
      empty('b5'),
      hidden('b6', [], 1),
      empty('b7'),
      empty('b8'),
    ],
  },
];
