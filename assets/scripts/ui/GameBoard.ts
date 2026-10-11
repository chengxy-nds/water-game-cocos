import { _decorator, Component, Node, Prefab, instantiate, Vec3, UITransform } from 'cc';
import { Bottle } from '../core/types';
import { TubeView } from './TubeView';

const { ccclass, property } = _decorator;

@ccclass('GameBoard')
export class GameBoard extends Component {
    @property(Prefab)
    public tubePrefab: Prefab = null!;

    private _tubes: TubeView[] = [];
    private _onTubeClickedCallback: ((index: number) => void) | null = null;

    public init(bottles: Bottle[], onTubeClicked: (index: number) => void) {
        this._onTubeClickedCallback = onTubeClicked;
        this._tubes = [];

        const tubeNodes = this.node.children.filter(c => c.name.startsWith('Tube_'));
        tubeNodes.sort((a, b) => {
            const numA = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });

        const total = bottles.length;
        const isTwoRows = total > 6;
        const row1Count = isTwoRows ? Math.ceil(total / 2) : total;
        const row2Count = isTwoRows ? total - row1Count : 0;
        const spacingX = total <= 5 ? 100 : 85;

        tubeNodes.forEach((node, idx) => {
            const trans = node.getComponent(UITransform) || node.addComponent(UITransform);
            trans.setContentSize(70, 160);

            let view = node.getComponent(TubeView);
            if (!view) {
                view = node.addComponent(TubeView);
            }

            if (idx < bottles.length) {
                node.active = true;

                // 自适应双排/单排居中布局
                if (!isTwoRows) {
                    const startX = -((row1Count - 1) * spacingX) / 2;
                    node.setPosition(startX + idx * spacingX, 0, 0);
                } else {
                    if (idx < row1Count) {
                        const startX = -((row1Count - 1) * spacingX) / 2;
                        node.setPosition(startX + idx * spacingX, 110, 0);
                    } else {
                        const row2Idx = idx - row1Count;
                        const startX = -((row2Count - 1) * spacingX) / 2;
                        node.setPosition(startX + row2Idx * spacingX, -110, 0);
                    }
                }

                view.init(idx, bottles[idx]);
                this._tubes.push(view);

                node.off(Node.EventType.TOUCH_END);
                node.on(Node.EventType.TOUCH_END, () => {
                    console.log(`[GameBoard] Tube_${idx} clicked!`);
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
