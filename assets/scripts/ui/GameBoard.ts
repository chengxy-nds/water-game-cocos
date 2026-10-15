import { _decorator, Component, Node, instantiate, Vec3, UITransform } from 'cc';
import { Bottle } from '../core/types';
import { TubeView } from './TubeView';

const { ccclass, property } = _decorator;

@ccclass('GameBoard')
export class GameBoard extends Component {
  private _tubes: TubeView[] = [];
  private _onTubeClickedCallback: ((index: number) => void) | null = null;

  public init(bottles: Bottle[], onTubeClicked: (index: number) => void) {
    this._onTubeClickedCallback = onTubeClicked;
    this._tubes = [];

    // 获取当前已有的 Tube 节点
    let tubeNodes = this.node.children.filter((c) => c.name.startsWith('Tube_'));
    tubeNodes.sort((a, b) => {
      const numA = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
      const numB = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
      return numA - numB;
    });

    // 节点数量不足时自动克隆
    if (tubeNodes.length < bottles.length && tubeNodes.length > 0) {
      const template = tubeNodes[0];
      const needed = bottles.length - tubeNodes.length;
      for (let i = 0; i < needed; i++) {
        const newIdx = tubeNodes.length;
        const newNode = instantiate(template);
        newNode.name = `Tube_${newIdx}`;
        newNode.setParent(this.node);
        tubeNodes.push(newNode);
      }
    }

    const total = bottles.length;
    const isCatBoss = bottles.some((b) => b.isGiantCat);
    const isVariedHeight = !isCatBoss && bottles.some((b) => b.maxCap && b.maxCap !== 4);

    // ========================================================
    // A. 皇家灵猫 BOSS 关 (第 5 关等)：中央矗立灵猫大瓶，外围 8 瓶环绕
    // ========================================================
    if (isCatBoss) {
      // 找到灵猫大瓶下标（通常为 id 2）
      const catIdx = bottles.findIndex((b) => b.isGiantCat);
      const otherIndices = bottles.map((_, i) => i).filter((i) => i !== catIdx);

      // 外围 8 个普通瓶的精确环绕坐标 (给中央大猫留出完整的黄金舞台，杜绝切脸和重叠遮挡)
      const outerLayout: { x: number; y: number }[] = [
        { x: -200, y: 115 }, // 左上 1 (外)
        { x: -126, y: 115 }, // 左上 2 (内，距大猫左边缘有 35px 留白！)
        { x: 126,  y: 115 }, // 右上 1 (内，距大猫右边缘有 35px 留白！)
        { x: 200,  y: 115 }, // 右上 2 (外)
        { x: -200, y: -115 }, // 左下 1 (外)
        { x: -126, y: -115 }, // 左下 2 (内)
        { x: 126,  y: -115 }, // 右下 1 (内)
        { x: 200,  y: -115 }, // 右下 2 (外)
      ];

      tubeNodes.forEach((node, idx) => {
        if (idx < bottles.length) {
          node.active = !bottles[idx].removed;

          let view = node.getComponent(TubeView);
          if (!view) view = node.addComponent(TubeView);

          if (idx === catIdx) {
            // 灵猫大瓶居中：(0, 0)，比例 1.0 完美展现
            node.setPosition(0, 0, 0);
            node.setScale(new Vec3(1.0, 1.0, 1));
          } else {
            // 外围环绕普通瓶
            const ringPosIdx = otherIndices.indexOf(idx);
            const pos = outerLayout[ringPosIdx] || { x: 0, y: 0 };
            node.setPosition(pos.x, pos.y, 0);
            node.setScale(new Vec3(0.82, 0.82, 1));
          }

          view.init(idx, bottles[idx], isVariedHeight);
          this._tubes[idx] = view;

          node.off(Node.EventType.TOUCH_END);
          node.on(Node.EventType.TOUCH_END, () => {
            if (this._onTubeClickedCallback) {
              this._onTubeClickedCallback(idx);
            }
          });
        } else {
          node.active = false;
        }
      });
      return;
    }

    // ========================================================
    // B. 普通关卡双排/三排优雅布局：充足间距，绝无重叠穿插！
    // ========================================================
    let numRows = 1;
    if (total > 14) numRows = 3;
    else if (total > 5) numRows = 2;

    const itemsPerRow = Math.ceil(total / numRows);
    const spacingX = total > 12 ? 66 : total > 7 ? 74 : 84;
    // 双排中心间距拉大至 230，试管缩放 0.84，留出 55px 纯净呼吸间隔！
    const rowYOffsets =
      numRows === 3 ? [132, 0, -132] : numRows === 2 ? [115, -115] : [0];
    const tubeScale = numRows === 3 ? 0.76 : numRows === 2 ? 0.84 : 1.0;

    tubeNodes.forEach((node, idx) => {
      if (idx < bottles.length) {
        node.active = !bottles[idx].removed;

        const rowIndex = Math.floor(idx / itemsPerRow);
        const colIndex = idx % itemsPerRow;
        const countInThisRow = Math.min(itemsPerRow, total - rowIndex * itemsPerRow);
        const startX = -((countInThisRow - 1) * spacingX) / 2;
        const posX = startX + colIndex * spacingX;
        const posY = rowYOffsets[rowIndex] || 0;

        node.setPosition(posX, posY, 0);
        node.setScale(new Vec3(tubeScale, tubeScale, 1));

        let view = node.getComponent(TubeView);
        if (!view) {
          view = node.addComponent(TubeView);
        }

        view.init(idx, bottles[idx], isVariedHeight);
        this._tubes[idx] = view;

        node.off(Node.EventType.TOUCH_END);
        node.on(Node.EventType.TOUCH_END, () => {
          if (this._onTubeClickedCallback) {
            this._onTubeClickedCallback(idx);
          }
        });
      } else {
        node.active = false;
      }
    });
  }

  public getTube(index: number): TubeView | undefined {
    return this._tubes[index];
  }

  public getAllTubes(): TubeView[] {
    return this._tubes;
  }
}
