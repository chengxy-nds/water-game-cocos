import { _decorator, Component, Node, director, Director, UITransform } from 'cc';
import { Bottle, Move } from '../core/types';
import { canPour, applyMove, isLevelWon, isDeadlocked, TUBE_CAPACITY } from '../core/waterSortSolver';
import { GameBoard } from './GameBoard';
import { WaterStream } from './WaterStream';

const { ccclass, property } = _decorator;

const DEFAULT_LEVEL_BOTTLES: Bottle[] = [
    { id: 'b0', type: 'normal', capacity: 4, layers: ['yellow', 'green'] },
    { id: 'b1', type: 'normal', capacity: 4, layers: ['green', 'blue'] },
    { id: 'b2', type: 'normal', capacity: 4, layers: ['blue', 'purple'] },
    { id: 'b3', type: 'normal', capacity: 4, layers: ['green'] },
    { id: 'b4', type: 'normal', capacity: 4, layers: ['red', 'purple'] },
    { id: 'b5', type: 'empty', capacity: 4, layers: [], videoLocked: true } as any,
    { id: 'b6', type: 'normal', capacity: 4, layers: ['red', 'yellow'] },
    { id: 'b7', type: 'normal', capacity: 4, layers: ['red', 'purple'] },
    { id: 'b8', type: 'normal', capacity: 4, layers: ['red', 'blue'] },
    { id: 'b9', type: 'normal', capacity: 4, layers: ['purple', 'blue'] },
    { id: 'b10', type: 'empty', capacity: 4, layers: [], videoLocked: true } as any
];

@ccclass('GameManager')
export class GameManager extends Component {
    @property(GameBoard)
    public gameBoard: GameBoard = null!;

    @property(WaterStream)
    public waterStream: WaterStream = null!;

    private _bottles: Bottle[] = [];
    private _selectedIndex: number | null = null;
    private _isBusy: boolean = false;
    private _history: Bottle[][] = [];

    onLoad() {
        this.autoBindDependencies();
    }

    start() {
        console.log('[GameManager] Starting game loop...');
        this.autoBindDependencies();
        this.setupButtons();
        this.loadLevelData(DEFAULT_LEVEL_BOTTLES);
    }

    private autoBindDependencies() {
        if (!this.gameBoard) {
            const gbNode = this.node.getChildByName('GameBoard');
            if (gbNode) {
                this.gameBoard = gbNode.getComponent(GameBoard) || gbNode.addComponent(GameBoard);
            }
        }
        if (!this.waterStream) {
            const wsNode = this.node.getChildByName('WaterStream');
            if (wsNode) {
                this.waterStream = wsNode.getComponent(WaterStream) || wsNode.addComponent(WaterStream);
            }
        }
    }

    private setupButtons() {
        const footer = this.node.getChildByName('Footer');
        if (!footer) return;

        const undoBtn = footer.getChildByName('BtnUndo');
        if (undoBtn) {
            const trans = undoBtn.getComponent(UITransform);
            if (trans) trans.setContentSize(120, 60);
            undoBtn.off(Node.EventType.TOUCH_END);
            undoBtn.on(Node.EventType.TOUCH_END, () => {
                console.log('[GameManager] Undo clicked!');
                this.handleUndo();
            });
        }

        const shuffleBtn = footer.getChildByName('BtnShuffle');
        if (shuffleBtn) {
            const trans = shuffleBtn.getComponent(UITransform);
            if (trans) trans.setContentSize(120, 60);
            shuffleBtn.off(Node.EventType.TOUCH_END);
            shuffleBtn.on(Node.EventType.TOUCH_END, () => {
                console.log('[GameManager] Add extra tube clicked!');
                this.handleAddExtraTube();
            });
        }
    }

    public loadLevelData(bottles: Bottle[]) {
        this._bottles = JSON.parse(JSON.stringify(bottles));
        this._history = [];
        this._selectedIndex = null;
        this._isBusy = false;

        if (this.gameBoard) {
            this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
        }
    }

    public async handleTubeClick(index: number) {
        if (this._isBusy) return;

        const bottle = this._bottles[index];
        if (bottle && (bottle as any).videoLocked) {
            console.log(`[GameManager] 解锁视频空瓶 Tube_${index}`);
            (bottle as any).videoLocked = false;
            const tube = this.gameBoard.getTube(index);
            if (tube) tube.updateBadgeState();
            return;
        }

        if (this._selectedIndex === null) {
            if (!bottle || bottle.layers.length === 0) return;

            this._selectedIndex = index;
            const tube = this.gameBoard.getTube(index);
            if (tube) tube.setSelected(true);
            return;
        }

        if (this._selectedIndex === index) {
            const tube = this.gameBoard.getTube(index);
            if (tube) tube.setSelected(false);
            this._selectedIndex = null;
            return;
        }

        const sourceIdx = this._selectedIndex;
        const targetIdx = index;
        const sourceBottle = this._bottles[sourceIdx];
        const targetBottle = this._bottles[targetIdx];

        if (canPour(sourceBottle, targetBottle, TUBE_CAPACITY)) {
            await this.performPour(sourceIdx, targetIdx);
        } else {
            const prevTube = this.gameBoard.getTube(sourceIdx);
            if (prevTube) prevTube.setSelected(false);

            if (targetBottle && targetBottle.layers.length > 0) {
                this._selectedIndex = targetIdx;
                const nextTube = this.gameBoard.getTube(targetIdx);
                if (nextTube) nextTube.setSelected(true);
            } else {
                this._selectedIndex = null;
            }
        }
    }

    private async performPour(sourceIdx: number, targetIdx: number) {
        this._isBusy = true;
        this._history.push(JSON.parse(JSON.stringify(this._bottles)));

        const sourceTube = this.gameBoard.getTube(sourceIdx)!;
        const targetTube = this.gameBoard.getTube(targetIdx)!;

        const sourceBottle = this._bottles[sourceIdx];
        const pourColor = sourceBottle.layers[sourceBottle.layers.length - 1];

        const targetWorldPos = targetTube.node.worldPosition;
        await sourceTube.playPourTo(targetWorldPos);

        if (this.waterStream) {
            const spoutPos = sourceTube.node.worldPosition;
            const mouthPos = targetTube.node.worldPosition;
            this.waterStream.startPour(spoutPos, mouthPos, pourColor);
        }

        const move: Move = {
            kind: 'pour',
            from: sourceIdx,
            to: targetIdx,
            colorId: pourColor,
            count: 1
        };
        applyMove(this._bottles, move, TUBE_CAPACITY);

        await new Promise(r => setTimeout(r, 380));

        sourceTube.renderLayers();
        targetTube.renderLayers();
        targetTube.updateCorkState();

        if (this.waterStream) {
            this.waterStream.stopPour();
        }
        await sourceTube.playReturn();

        this._selectedIndex = null;
        this._isBusy = false;

        if (isLevelWon(this._bottles, TUBE_CAPACITY)) {
            console.log('🎉 恭喜通关！所有颜色分类完成！');
        } else if (isDeadlocked(this._bottles, TUBE_CAPACITY)) {
            console.log('⚠️ 当前已无可用倒水步数（死局），可使用撤销或解锁空瓶！');
        }
    }

    public handleUndo() {
        if (this._isBusy || this._history.length === 0) return;
        this._bottles = this._history.pop()!;
        this._selectedIndex = null;
        if (this.gameBoard) {
            this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
        }
    }

    public handleAddExtraTube() {
        if (this._isBusy) return;
        const locked = this._bottles.find(b => (b as any).videoLocked);
        if (locked) {
            (locked as any).videoLocked = false;
            const idx = this._bottles.indexOf(locked);
            const tube = this.gameBoard.getTube(idx);
            if (tube) tube.updateBadgeState();
            return;
        }

        if (this._bottles.length < 15) {
            this._bottles.push({
                id: `extra_${Date.now()}`,
                type: 'empty',
                capacity: TUBE_CAPACITY,
                layers: []
            });
            if (this.gameBoard) {
                this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
            }
        }
    }
}

// 自动自启动引导器：在场景渲染启动后自动挂载 GameManager 启动交互
function bootstrapGame() {
    const scene = director.getScene();
    if (!scene) return;
    const canvas = scene.getChildByName('Canvas');
    if (canvas && !canvas.getComponent(GameManager)) {
        console.log('[AutoBootstrap] Adding GameManager to Canvas...');
        canvas.addComponent(GameManager);
    }
}

director.on(Director.EVENT_AFTER_SCENE_LAUNCH, bootstrapGame);

// 延时兜底检测（防止事件错过）
setTimeout(() => {
    bootstrapGame();
}, 200);
setTimeout(() => {
    bootstrapGame();
}, 800);
