import { _decorator, Component, Node, Prefab, instantiate, Vec3 } from 'cc';
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

        if (this.tubePrefab && this.node.children.length === 0) {
            this.buildFromPrefab(bottles);
            return;
        }

        this._tubes = [];
        const tubeNodes = this.node.children.filter(c => c.name.startsWith('Tube_'));
        
        tubeNodes.sort((a, b) => {
            const numA = parseInt(a.name.replace(/\D/g, ''), 10) || 0;
            const numB = parseInt(b.name.replace(/\D/g, ''), 10) || 0;
            return numA - numB;
        });

        tubeNodes.forEach((node, idx) => {
            let view = node.getComponent(TubeView);
            if (!view) {
                view = node.addComponent(TubeView);
            }
            if (idx < bottles.length) {
                view.init(idx, bottles[idx]);
            }
            this._tubes.push(view);

            node.off(Node.EventType.TOUCH_END);
            node.on(Node.EventType.TOUCH_END, () => {
                if (this._onTubeClickedCallback) {
                    this._onTubeClickedCallback(idx);
                }
            });
        });
    }

    private buildFromPrefab(bottles: Bottle[]) {
        this.node.removeAllChildren();
        this._tubes = [];
        const total = bottles.length;
        const rowCount = total > 7 ? 2 : 1;
        const topCount = rowCount === 2 ? 5 : total;
        const bottomCount = total - topCount;

        const spacingX = 115;
        const rowSpacingY = 240;

        const topStartX = -((topCount - 1) * spacingX) / 2;
        const topY = rowCount === 2 ? rowSpacingY / 2 : 0;

        for (let i = 0; i < topCount; i++) {
            const posX = topStartX + i * spacingX;
            this.createTubeInstance(i, bottles[i], new Vec3(posX, topY, 0));
        }

        if (bottomCount > 0) {
            const bottomStartX = -((bottomCount - 1) * spacingX) / 2;
            const bottomY = -rowSpacingY / 2;

            for (let j = 0; j < bottomCount; j++) {
                const globalIdx = topCount + j;
                const posX = bottomStartX + j * spacingX;
                this.createTubeInstance(globalIdx, bottles[globalIdx], new Vec3(posX, bottomY, 0));
            }
        }
    }

    private createTubeInstance(index: number, bottle: Bottle, pos: Vec3) {
        if (!this.tubePrefab) return;
        const tubeNode = instantiate(this.tubePrefab);
        tubeNode.setParent(this.node);
        tubeNode.setPosition(pos);

        const tubeView = tubeNode.getComponent(TubeView) || tubeNode.addComponent(TubeView);
        tubeView.init(index, bottle);
        this._tubes.push(tubeView);

        tubeNode.on(Node.EventType.TOUCH_END, () => {
            if (this._onTubeClickedCallback) {
                this._onTubeClickedCallback(index);
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
