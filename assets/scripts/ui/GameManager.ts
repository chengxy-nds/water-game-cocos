import { _decorator, Component, Node, UITransform, Label, tween, Vec3 } from 'cc';
import { Bottle } from '../core/types';
import {
    canPour,
    executePour,
    canLeak,
    executeLeak,
    isPuzzleSolved,
    hasAnyLegalMove,
    isBottleComplete,
    TUBE_CAPACITY
} from '../core/waterSortSolver';
import { CURATED_LEVELS } from '../core/curatedLevels';
import { GameBoard } from './GameBoard';
import { WaterStream } from './WaterStream';

const { ccclass, property } = _decorator;

@ccclass('GameManager')
export class GameManager extends Component {
    @property(GameBoard)
    public gameBoard: GameBoard = null!;

    @property(WaterStream)
    public waterStream: WaterStream = null!;

    private _currentLevelIdx: number = 0;
    private _bottles: Bottle[] = [];
    private _selectedIndex: number | null = null;
    private _isBusy: boolean = false;
    private _history: Bottle[][] = [];
    private _shoppingBagsNode: Node | null = null;
    private _levelLabel: Label | null = null;

    onLoad() {
        this.autoBindDependencies();
    }

    start() {
        console.log('[GameManager] Starting game loop...');
        this.autoBindDependencies();
        this.setupButtons();
        this.loadLevel(0);
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
        if (!this._shoppingBagsNode) {
            this._shoppingBagsNode = this.node.getChildByName('ShoppingBags');
        }
        if (!this._levelLabel) {
            const header = this.node.getChildByName('Header');
            const lblNode = header?.getChildByName('LevelLabel');
            this._levelLabel = lblNode?.getComponent(Label) || null;
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
                this.bounceButton(undoBtn);
                this.handleUndo();
            });
        }

        const shuffleBtn = footer.getChildByName('BtnShuffle');
        if (shuffleBtn) {
            const trans = shuffleBtn.getComponent(UITransform);
            if (trans) trans.setContentSize(120, 60);
            shuffleBtn.off(Node.EventType.TOUCH_END);
            shuffleBtn.on(Node.EventType.TOUCH_END, () => {
                this.bounceButton(shuffleBtn);
                this.handleAddExtraTube();
            });
        }
    }

    private bounceButton(btnNode: Node) {
        tween(btnNode)
            .to(0.08, { scale: new Vec3(0.88, 0.88, 1) })
            .to(0.12, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
            .start();
    }

    public loadLevel(levelIndex: number) {
        this._currentLevelIdx = Math.max(0, Math.min(CURATED_LEVELS.length - 1, levelIndex));
        const levelData = CURATED_LEVELS[this._currentLevelIdx];
        console.log(`[GameManager] Loading Level ${this._currentLevelIdx + 1}: ${levelData.title}`);

        if (this._levelLabel) {
            this._levelLabel.string = `第 ${this._currentLevelIdx + 1} 关`;
        }

        this._bottles = JSON.parse(JSON.stringify(levelData.bottles));
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

        // 1. 底部漏水瓶 (bottom_leak): 直接触发漏水到指定下方目标
        if (bottle && bottle.type === 'bottom_leak') {
            const targetIdx = this._bottles.findIndex(b => b.id === bottle.leakTargetBottleId);
            if (targetIdx >= 0) {
                const targetB = this._bottles[targetIdx];
                if (canLeak(bottle, targetB, TUBE_CAPACITY, index, targetIdx, this._bottles)) {
                    await this.performLeak(index, targetIdx);
                    return;
                }
            }
        }

        // 2. 普通倒水交互
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

        if (canPour(sourceBottle, targetBottle, TUBE_CAPACITY).valid) {
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
        const targetBottle = this._bottles[targetIdx];

        const pourCheck = canPour(sourceBottle, targetBottle, TUBE_CAPACITY);
        const pourCount = pourCheck.count;
        const pourColor = pourCheck.color!;

        // 1. 物理顺滑抬升：严格按水少角度大计算倾斜角，水面在此期间严格保持真实体积
        const targetWorldPos = targetTube.node.worldPosition.clone();
        await sourceTube.playPourTo(targetWorldPos);

        // 2. 水柱发射：从倾斜瓶口的真实世界坐标射出，垂直直落进入接收瓶口液面
        const isTargetRight = targetWorldPos.x >= sourceTube.node.worldPosition.x;
        const spoutPos = sourceTube.node.getComponent(UITransform)!.convertToWorldSpaceAR(
            new Vec3(isTargetRight ? 21 : -21, 46, 0)
        );

        const targetSurfaceY = -54 + (targetBottle.layers.length * 25);
        const mouthPos = targetTube.node.getComponent(UITransform)!.convertToWorldSpaceAR(
            new Vec3(0, targetSurfaceY, 0)
        );

        if (this.waterStream) {
            this.waterStream.startPour(spoutPos, mouthPos, pourColor);
        }

        // 3. 伴随倒水：源管顶层逐渐排空，目标管新层逐渐向上长出
        const animDuration = 0.40 + (pourCount * 0.15);
        await Promise.all([
            sourceTube.animateDrainTopLayer(pourCount, animDuration),
            targetTube.animateRiseNewLayer(pourColor, pourCount, animDuration)
        ]);

        // 记录倒水前隐藏层数
        const oldHiddenCount = sourceBottle.type === 'hidden' ? (sourceBottle.hiddenBottomLayers || 0) : 0;

        // 4. 应用核心游戏数据更新
        const pourRes = executePour(this._bottles, sourceIdx, targetIdx, TUBE_CAPACITY);
        if (pourRes) {
            this._bottles = pourRes.newBottles;
        }

        // 5. 停水并复位源试管
        if (this.waterStream) {
            this.waterStream.stopPour();
        }
        await sourceTube.playReturn();

        sourceTube.renderLayers();
        targetTube.renderLayers();
        targetTube.updateCorkState();

        this._selectedIndex = null;

        // 6. 检查隐藏层揭晓动画
        const newSourceBottle = this._bottles[sourceIdx];
        if (newSourceBottle.type === 'hidden') {
            const newHiddenCount = newSourceBottle.hiddenBottomLayers || 0;
            if (newHiddenCount < oldHiddenCount) {
                // 播放刚刚揭晓层的雾气散开动画
                await sourceTube.playRevealHiddenLayer(newHiddenCount);
            }
        }

        // 7. 检查遮罩瓶解锁状态
        await this.checkMaskUnlocks();

        // 8. 检查目标管是否完成分类（触发木塞与购物袋动效）
        await this.checkCompletedBottle(targetIdx, pourColor);

        // 9. 结算通关或死局检测
        if (isPuzzleSolved(this._bottles, TUBE_CAPACITY)) {
            console.log('🎉 恭喜通关！所有试管分类完成！');
            setTimeout(() => {
                this.loadLevel(this._currentLevelIdx + 1);
            }, 1200);
        } else if (!hasAnyLegalMove(this._bottles, TUBE_CAPACITY)) {
            console.log('⚠️ 当前已无可用倒水步数（死局）！');
        }

        this._isBusy = false;
    }

    /**
     * 执行底部漏水操作
     */
    private async performLeak(sourceIdx: number, targetIdx: number) {
        this._isBusy = true;
        this._history.push(JSON.parse(JSON.stringify(this._bottles)));

        const sourceTube = this.gameBoard.getTube(sourceIdx)!;
        const targetTube = this.gameBoard.getTube(targetIdx)!;
        const leakColor = this._bottles[sourceIdx].layers[0];

        // 水流直接从源瓶底部喷嘴流向下方目标瓶液面
        const spoutPos = sourceTube.node.getComponent(UITransform)!.convertToWorldSpaceAR(
            new Vec3(0, -62, 0)
        );
        const targetSurfaceY = -54 + (this._bottles[targetIdx].layers.length * 25);
        const mouthPos = targetTube.node.getComponent(UITransform)!.convertToWorldSpaceAR(
            new Vec3(0, targetSurfaceY, 0)
        );

        if (this.waterStream) {
            this.waterStream.startPour(spoutPos, mouthPos, leakColor);
        }

        await targetTube.animateRiseNewLayer(leakColor, 1, 0.45);

        const leakRes = executeLeak(this._bottles, sourceIdx, targetIdx, TUBE_CAPACITY);
        if (leakRes) {
            this._bottles = leakRes.newBottles;
        }

        if (this.waterStream) {
            this.waterStream.stopPour();
        }

        sourceTube.renderLayers();
        targetTube.renderLayers();
        targetTube.updateCorkState();

        await this.checkMaskUnlocks();
        await this.checkCompletedBottle(targetIdx, leakColor);

        if (isPuzzleSolved(this._bottles, TUBE_CAPACITY)) {
            console.log('🎉 恭喜通关！');
            setTimeout(() => {
                this.loadLevel(this._currentLevelIdx + 1);
            }, 1200);
        }

        this._isBusy = false;
    }

    /**
     * 每次倒水提交后，重新计算完成瓶数量并检查遮罩瓶解锁
     */
    private async checkMaskUnlocks() {
        const completedCount = this._bottles.filter(b => isBottleComplete(b, TUBE_CAPACITY)).length;

        for (let i = 0; i < this._bottles.length; i++) {
            const b = this._bottles[i];
            if (b.type === 'masked' && !b.maskRevealed) {
                const threshold = b.unlockTargetCompletedBottles || 1;
                if (completedCount >= threshold) {
                    b.maskRevealed = true;
                    const tubeView = this.gameBoard.getTube(i);
                    if (tubeView) {
                        await tubeView.playUnmaskAnimation();
                    }
                }
            }
        }
    }

    /**
     * 试管完成分类后塞上木塞并飞入购物袋
     */
    private async checkCompletedBottle(targetIdx: number, colorId: string) {
        const targetBottle = this._bottles[targetIdx];
        if (!targetBottle || !isBottleComplete(targetBottle, TUBE_CAPACITY)) return;

        const tubeView = this.gameBoard.getTube(targetIdx);
        if (!tubeView) return;

        console.log(`[GameManager] Tube_${targetIdx} 完成分类！准备飞入对应购物袋...`);

        const bagNode = this.getMatchingShoppingBag(colorId);
        const targetPos = bagNode ? bagNode.worldPosition : new Vec3(0, 320, 0);

        await tubeView.playFlyToBag(targetPos);

        if (bagNode) {
            this.animateBagGulp(bagNode);
        }
    }

    private getMatchingShoppingBag(colorId: string): Node | null {
        if (!this._shoppingBagsNode) return null;

        const colorMap: Record<string, string> = {
            yellow: 'Bag_1_Yellow',
            purple: 'Bag_2_Purple',
            blue: 'Bag_3_Blue',
            cyan: 'Bag_3_Blue',
            red: 'Bag_4_Video',
            green: 'Bag_1_Yellow'
        };

        const bagName = colorMap[colorId] || 'Bag_1_Yellow';
        return this._shoppingBagsNode.getChildByName(bagName);
    }

    private animateBagGulp(bagNode: Node) {
        tween(bagNode)
            .to(0.12, { scale: new Vec3(1.28, 1.28, 1) }, { easing: 'quadOut' })
            .to(0.12, { scale: new Vec3(0.92, 0.92, 1) }, { easing: 'quadIn' })
            .to(0.10, { scale: new Vec3(1.06, 1.06, 1) }, { easing: 'quadOut' })
            .to(0.08, { scale: new Vec3(1.0, 1.0, 1) })
            .start();
    }

    private handleUndo() {
        if (this._isBusy || this._history.length === 0) return;
        const prevBottles = this._history.pop();
        if (prevBottles) {
            this._bottles = prevBottles;
            this._selectedIndex = null;
            if (this.gameBoard) {
                this.gameBoard.init(this._bottles, (idx) => this.handleTubeClick(idx));
            }
        }
    }

    private handleAddExtraTube() {
        if (this._isBusy) return;
        // 查找隐藏备用的空试管进行激活
        const hiddenIdx = this._bottles.findIndex(b => b.type === 'empty' && !(b as any).activeInGame);
        if (hiddenIdx >= 0) {
            (this._bottles[hiddenIdx] as any).activeInGame = true;
            const tube = this.gameBoard.getTube(hiddenIdx);
            if (tube) tube.node.active = true;
        }
    }
}
