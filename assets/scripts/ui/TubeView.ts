import { _decorator, Component, Node, Sprite, Color, tween, Vec3, UITransform, Graphics, Label } from 'cc';
import { Bottle } from '../core/types';
import { getColor } from '../core/colors';

const { ccclass, property } = _decorator;

const TUBE_HALF_WIDTH = 21;  // 试管内壁半宽
const TUBE_BOTTOM_Y = -54;   // 试管内壁圆弧最低点
const TUBE_TOP_Y = 46;       // 试管瓶口上边缘
const LAYER_HEIGHT = 25;     // 每格额定高度 (4层总高度 100)

@ccclass('TubeView')
export class TubeView extends Component {
    @property(Node)
    public bottleBody: Node = null!;

    @property(Node)
    public corkNode: Node = null!;

    @property(Node)
    public videoBadgeNode: Node = null!;

    // 遮罩布节点与底部喷嘴
    private _clothMaskNode: Node | null = null;
    private _clothLabel: Label | null = null;
    private _leakNozzleNode: Node | null = null;

    // 动态流体 Graphics 绘制节点
    private _liquidGraphicsNode: Node | null = null;
    private _liquidGraphics: Graphics | null = null;

    private _bottleData: Bottle = null!;
    private _index: number = 0;
    private _isSelected: boolean = false;
    private _initialPos: Vec3 = new Vec3();

    // 动态倒水过程中的体积微调参数 (0~1)
    private _drainUnits: number = 0;
    private _risingUnits: number = 0;
    private _risingColorId: string | null = null;

    // 隐藏层揭晓动画控制
    private _revealingLayerIdx: number = -1;
    private _revealProgress: number = 1.0;

    onLoad() {
        this._initialPos.set(this.node.position);
        this.autoBindNodes();
        this.ensureSpecialNodes();
    }

    private autoBindNodes() {
        // 关键修复：禁用旧场景中预置的静态 4 层精灵节点，防止抬瓶时显示假满瓶！
        for (const child of this.node.children) {
            if (child.name.startsWith('Liquid_')) {
                child.active = false;
            }
        }

        if (!this.bottleBody) {
            this.bottleBody = this.node.getChildByName('GlassBody') || this.node;
        }
        if (!this.videoBadgeNode) {
            this.videoBadgeNode = this.node.getChildByName('VideoBadge')!;
        }
        if (!this.corkNode) {
            this.corkNode = this.node.getChildByName('Cork')!;
        }
    }

    private ensureSpecialNodes() {
        // 1. 创建流体绘制节点 (置于玻璃瓶身下方)
        if (!this._liquidGraphicsNode) {
            this._liquidGraphicsNode = this.node.getChildByName('LiquidGraphics');
            if (!this._liquidGraphicsNode) {
                this._liquidGraphicsNode = new Node('LiquidGraphics');
                this._liquidGraphicsNode.setParent(this.node);
                if (this.bottleBody) {
                    this._liquidGraphicsNode.setSiblingIndex(this.bottleBody.getSiblingIndex());
                }
            }
            this._liquidGraphics = this._liquidGraphicsNode.getComponent(Graphics) ||
                                   this._liquidGraphicsNode.addComponent(Graphics);
        }

        // 2. 创建遮罩布节点 (用于 masked 遮罩瓶)
        if (!this._clothMaskNode) {
            this._clothMaskNode = this.node.getChildByName('ClothMask');
            if (!this._clothMaskNode) {
                this._clothMaskNode = new Node('ClothMask');
                this._clothMaskNode.setParent(this.node);
                const sp = this._clothMaskNode.addComponent(Sprite);
                sp.color = new Color(245, 245, 250, 248);
                const trans = this._clothMaskNode.getComponent(UITransform)!;
                trans.setContentSize(52, 92);
                this._clothMaskNode.setPosition(0, 16, 0);

                // 布罩上的解锁阈值数字
                const lblNode = new Node('ThresholdLabel');
                lblNode.setParent(this._clothMaskNode);
                lblNode.setPosition(0, 0, 0);
                this._clothLabel = lblNode.addComponent(Label);
                this._clothLabel.fontSize = 24;
                this._clothLabel.color = new Color(75, 85, 105, 255);
            } else {
                const lblNode = this._clothMaskNode.getChildByName('ThresholdLabel');
                this._clothLabel = lblNode?.getComponent(Label) || null;
            }
        }

        // 3. 底部漏水喷嘴指示器 (用于 bottom_leak 瓶)
        if (!this._leakNozzleNode) {
            this._leakNozzleNode = this.node.getChildByName('LeakNozzle');
            if (!this._leakNozzleNode) {
                this._leakNozzleNode = new Node('LeakNozzle');
                this._leakNozzleNode.setParent(this.node);
                const sp = this._leakNozzleNode.addComponent(Sprite);
                sp.color = new Color(56, 189, 248, 220);
                const trans = this._leakNozzleNode.getComponent(UITransform)!;
                trans.setContentSize(24, 12);
                this._leakNozzleNode.setPosition(0, -62, 0);
            }
        }
    }

    public init(index: number, bottle: Bottle) {
        this.autoBindNodes();
        this.ensureSpecialNodes();
        this._initialPos.set(this.node.position);
        this._index = index;
        this._bottleData = bottle;
        this._drainUnits = 0;
        this._risingUnits = 0;
        this._risingColorId = null;
        this._revealingLayerIdx = -1;
        this._revealProgress = 1.0;

        this.node.angle = 0;
        this.node.setScale(Vec3.ONE);
        this.node.active = true;

        this.renderLayers();
        this.updateCorkState();
        this.updateBadgeState();
        this.updateSpecialMechanicsVisuals();
    }

    public get bottle(): Bottle {
        return this._bottleData;
    }

    public get index(): number {
        return this._index;
    }

    update() {
        // 倾斜或倒水动态变化时，实时按重力水面重绘流体
        if (this.node.angle !== 0 || this._drainUnits > 0 || this._risingUnits > 0 || this._revealProgress < 1.0) {
            this.renderLayers();
        }
    }

    /**
     * 二分查找：严格保证重力倾斜液面的液体总截面积与真实体积守恒！
     */
    private findSurfaceC(targetHeight: number, slope: number): number {
        const W = TUBE_HALF_WIDTH;
        const yMin = TUBE_BOTTOM_Y;
        const yMax = TUBE_TOP_Y;
        const maxH = yMax - yMin;

        if (targetHeight <= 0.05) return yMin - Math.abs(slope) * W - 100;
        if (targetHeight >= maxH) return yMax + Math.abs(slope) * W + 100;

        const targetArea = 2 * W * targetHeight;
        let low = yMin - Math.abs(slope) * W - maxH;
        let high = yMax + Math.abs(slope) * W + maxH;

        const steps = 18;
        const dx = (2 * W) / steps;

        for (let iter = 0; iter < 16; iter++) {
            const mid = (low + high) * 0.5;
            let area = 0;
            for (let s = 0; s < steps; s++) {
                const x = -W + (s + 0.5) * dx;
                const y = Math.max(yMin, Math.min(yMax, slope * x + mid));
                area += (y - yMin) * dx;
            }
            if (area < targetArea) {
                low = mid;
            } else {
                high = mid;
            }
        }
        return (low + high) * 0.5;
    }

    /**
     * 计算底部 U 型圆角内壁轮廓
     */
    private getBottomUProfile(x: number): number {
        const norm = x / TUBE_HALF_WIDTH;
        return TUBE_BOTTOM_Y + 10 * (norm * norm);
    }

    /**
     * 核心物理流体渲染：
     * 1. 严格体积守恒（绝不虚标满瓶）
     * 2. 重力自动找平
     * 3. 倾斜时液体自然向倾倒侧滑动汇聚
     * 4. 遮罩瓶底半透预览与隐藏瓶磨砂表现
     */
    public renderLayers() {
        if (!this._bottleData || !this._liquidGraphics) return;
        const g = this._liquidGraphics;
        g.clear();

        const layers = this._bottleData.layers;
        if (layers.length === 0 && this._risingUnits <= 0) return;

        const W = TUBE_HALF_WIDTH;
        const yMin = TUBE_BOTTOM_Y;
        const yMax = TUBE_TOP_Y;

        // 根据试管当前旋转角，计算世界水平面在试管局部坐标系下的斜率
        const rad = (this.node.angle * Math.PI) / 180;
        const slope = -Math.tan(rad);

        const isMaskedAndLocked = this._bottleData.type === 'masked' && !this._bottleData.maskRevealed;

        // 构建每层有效高度 (扣除正在倒出的体积)
        const layerHeights: number[] = [];
        let remainingDrain = this._drainUnits;

        for (let i = 0; i < layers.length; i++) {
            let h = LAYER_HEIGHT;
            // 从顶层开始扣除流出量
            const revIdx = layers.length - 1 - i;
            if (revIdx === 0 && remainingDrain > 0) {
                const drainH = Math.min(h, remainingDrain * LAYER_HEIGHT);
                h -= drainH;
                remainingDrain -= (drainH / LAYER_HEIGHT);
            }
            layerHeights.push(Math.max(0, h));
        }

        // 计算每层累积体积高度
        const cumulativeHeights: number[] = [0];
        let runningTotal = 0;
        for (let i = 0; i < layerHeights.length; i++) {
            runningTotal += layerHeights[i];
            cumulativeHeights.push(runningTotal);
        }

        // 如果有新水流入，追加流入层
        if (this._risingUnits > 0 && this._risingColorId) {
            runningTotal += this._risingUnits * LAYER_HEIGHT;
            cumulativeHeights.push(runningTotal);
        }

        const totalDrawLayers = layers.length + (this._risingUnits > 0 && this._risingColorId ? 1 : 0);
        const sampleCount = 20;
        const dx = (2 * W) / sampleCount;

        for (let i = 0; i < totalDrawLayers; i++) {
            const isRisingLayer = (i === layers.length);
            const colorId = isRisingLayer ? this._risingColorId! : layers[i];
            const hPrev = cumulativeHeights[i];
            const hCurr = cumulativeHeights[i + 1];

            if (hCurr - hPrev <= 0.5) continue;

            // 隐藏瓶判断
            const isHidden = !isRisingLayer &&
                this._bottleData.type === 'hidden' &&
                i < (this._bottleData.hiddenBottomLayers || 0);

            // 遮罩瓶未解锁时只画底部一层
            if (isMaskedAndLocked && i > 0) continue;

            const cDef = getColor(colorId);
            let fillCol: Color;

            if (isHidden) {
                if (i === this._revealingLayerIdx && this._revealProgress < 1.0) {
                    // 渐显揭晓
                    const baseCol = Color.fromHEX(new Color(), cDef?.hex || '#ffffff');
                    const fogCol = new Color(145, 160, 185, 235);
                    fillCol = new Color(
                        fogCol.r + (baseCol.r - fogCol.r) * this._revealProgress,
                        fogCol.g + (baseCol.g - fogCol.g) * this._revealProgress,
                        fogCol.b + (baseCol.b - fogCol.b) * this._revealProgress,
                        240
                    );
                } else {
                    fillCol = new Color(145, 160, 185, 235); // 磨砂雾灰
                }
            } else if (isMaskedAndLocked && i === 0) {
                fillCol = Color.fromHEX(new Color(), cDef?.hex || '#ffffff');
                fillCol.a = 85; // 底部微透预览
            } else {
                fillCol = Color.fromHEX(new Color(), cDef?.hex || '#ffffff');
            }

            const cTop = this.findSurfaceC(hCurr, slope);
            const cBot = this.findSurfaceC(hPrev, slope);

            // 绘制当前层的多边形
            g.fillColor = fillCol;

            // 1. 沿顶表面从左往右走
            for (let s = 0; s <= sampleCount; s++) {
                const x = -W + s * dx;
                const y = Math.max(yMin, Math.min(yMax, slope * x + cTop));
                if (s === 0) {
                    g.moveTo(x, y);
                } else {
                    g.lineTo(x, y);
                }
            }

            // 2. 沿底表面从右往左走闭合
            for (let s = sampleCount; s >= 0; s--) {
                const x = -W + s * dx;
                let y: number;
                if (i === 0) {
                    // 最底层紧贴试管 U 型内壁
                    y = Math.min(Math.max(yMin, Math.min(yMax, slope * x + cTop)), this.getBottomUProfile(x));
                } else {
                    y = Math.max(yMin, Math.min(yMax, slope * x + cBot));
                }
                g.lineTo(x, y);
            }

            g.close();
            g.fill();

            // 顶层液面高光
            const isVeryTop = (i === totalDrawLayers - 1);
            if (isVeryTop && !isMaskedAndLocked) {
                g.strokeColor = new Color(255, 255, 255, 210);
                g.lineWidth = 1.8;
                for (let s = 0; s <= sampleCount; s++) {
                    const x = -W + s * dx;
                    const y = Math.max(yMin, Math.min(yMax, slope * x + cTop));
                    if (s === 0) g.moveTo(x, y);
                    else g.lineTo(x, y);
                }
                g.stroke();
            } else if (i > 0 && !isMaskedAndLocked) {
                // 分层细微阴影刻度
                g.strokeColor = new Color(0, 0, 0, 35);
                g.lineWidth = 1.0;
                for (let s = 0; s <= sampleCount; s++) {
                    const x = -W + s * dx;
                    const y = Math.max(yMin, Math.min(yMax, slope * x + cBot));
                    if (s === 0) g.moveTo(x, y);
                    else g.lineTo(x, y);
                }
                g.stroke();
            }
        }
    }

    public setSelected(selected: boolean) {
        if (this._isSelected === selected) return;
        this._isSelected = selected;
        tween(this.node).stop();

        const targetY = selected ? this._initialPos.y + 35 : this._initialPos.y;
        tween(this.node)
            .to(0.18, { position: new Vec3(this._initialPos.x, targetY, this._initialPos.z) }, { easing: 'quadOut' })
            .start();
    }

    /**
     * 精准物理倾角计算：水越少倾斜角越大！
     * 4格: ~55°
     * 3格: ~66°
     * 2格: ~76°
     * 1格: ~86°
     */
    public calculatePourAngle(targetWorldPos: Vec3): number {
        const isTargetRight = targetWorldPos.x >= this.node.worldPosition.x;
        const currentUnits = Math.max(1, Math.min(4, this._bottleData?.layers?.length || 2));

        const baseAngles: Record<number, number> = {
            4: 55,
            3: 66,
            2: 76,
            1: 86
        };
        const deg = baseAngles[currentUnits] || 75;
        return isTargetRight ? -deg : deg;
    }

    /**
     * 抬瓶并转向倾倒位置
     */
    public playPourTo(targetWorldPos: Vec3): Promise<void> {
        return new Promise((resolve) => {
            const localTarget = this.node.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(targetWorldPos);
            const isTargetRight = targetWorldPos.x >= this.node.worldPosition.x;
            const targetAngle = this.calculatePourAngle(targetWorldPos);

            const hoverX = isTargetRight ? localTarget.x - 38 : localTarget.x + 38;
            const hoverY = localTarget.y + 115;
            const hoverPos = new Vec3(hoverX, hoverY, 0);

            // 顺畅两段式抬升：平滑飞越后旋至对应倾角
            tween(this.node)
                .to(0.26, { position: hoverPos, angle: isTargetRight ? -20 : 20 }, { easing: 'quadOut' })
                .to(0.18, { angle: targetAngle }, { easing: 'cubicOut' })
                .call(() => resolve())
                .start();
        });
    }

    /**
     * 动态排出顶层液体
     */
    public animateDrainTopLayer(count: number = 1, duration: number = 0.45): Promise<void> {
        return new Promise((resolve) => {
            this._drainUnits = 0;
            const obj = { p: 0 };
            tween(obj)
                .to(duration, { p: count }, {
                    onUpdate: () => {
                        this._drainUnits = obj.p;
                        this.renderLayers();
                    }
                })
                .call(() => {
                    this._drainUnits = 0;
                    resolve();
                })
                .start();
        });
    }

    /**
     * 目标瓶动态长出新注入液体
     */
    public animateRiseNewLayer(colorId: string, count: number = 1, duration: number = 0.45): Promise<void> {
        return new Promise((resolve) => {
            this._risingUnits = 0;
            this._risingColorId = colorId;
            const obj = { p: 0 };
            tween(obj)
                .to(duration, { p: count }, {
                    onUpdate: () => {
                        this._risingUnits = obj.p;
                        this.renderLayers();
                    }
                })
                .call(() => {
                    this._risingUnits = 0;
                    this._risingColorId = null;
                    resolve();
                })
                .start();
        });
    }

    /**
     * 倒水完毕平滑复位
     */
    public playReturn(): Promise<void> {
        return new Promise((resolve) => {
            tween(this.node)
                .to(0.18, { angle: 0 }, { easing: 'quadOut' })
                .to(0.24, { position: this._initialPos }, { easing: 'quadInOut' })
                .call(() => {
                    this._isSelected = false;
                    this.renderLayers();
                    resolve();
                })
                .start();
        });
    }

    /**
     * 遮罩瓶解锁动画：布罩向下滑落带微弹跳并淡出
     */
    public playUnmaskAnimation(): Promise<void> {
        return new Promise((resolve) => {
            if (!this._clothMaskNode || !this._clothMaskNode.active) {
                resolve();
                return;
            }
            tween(this._clothMaskNode)
                .to(0.35, { position: new Vec3(0, -90, 0) }, { easing: 'cubicIn' })
                .to(0.15, { scale: Vec3.ZERO }, { easing: 'quadOut' })
                .call(() => {
                    this._clothMaskNode!.active = false;
                    this.renderLayers();
                    resolve();
                })
                .start();
        });
    }

    /**
     * 隐藏层揭晓动画：磨砂雾气散去
     */
    public playRevealHiddenLayer(layerIdx: number): Promise<void> {
        return new Promise((resolve) => {
            this._revealingLayerIdx = layerIdx;
            this._revealProgress = 0;
            const obj = { p: 0 };
            tween(obj)
                .to(0.35, { p: 1 }, {
                    onUpdate: () => {
                        this._revealProgress = obj.p;
                        this.renderLayers();
                    }
                })
                .call(() => {
                    this._revealingLayerIdx = -1;
                    this._revealProgress = 1.0;
                    this.renderLayers();
                    resolve();
                })
                .start();
        });
    }

    /**
     * 收集起飞动画
     */
    public playFlyToBag(bagWorldPos: Vec3): Promise<void> {
        return new Promise((resolve) => {
            if (this.corkNode) {
                this.corkNode.active = true;
                this.corkNode.setScale(1.5, 1.5, 1);
                tween(this.corkNode)
                    .to(0.25, { scale: new Vec3(1, 1, 1) }, { easing: 'backOut' })
                    .start();
            }

            const localBagPos = this.node.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(bagWorldPos);

            tween(this.node)
                .delay(0.3)
                .to(0.2, { scale: new Vec3(1.15, 1.15, 1) }, { easing: 'quadOut' })
                .to(0.55, { position: localBagPos, scale: new Vec3(0.35, 0.35, 1), angle: -10 }, { easing: 'cubicIn' })
                .to(0.12, { scale: Vec3.ZERO }, { easing: 'quadIn' })
                .call(() => {
                    this.node.active = false;
                    resolve();
                })
                .start();
        });
    }

    public updateSpecialMechanicsVisuals() {
        if (!this._bottleData) return;

        // 1. 遮罩瓶布罩
        if (this._clothMaskNode) {
            const isMaskedAndLocked = this._bottleData.type === 'masked' && !this._bottleData.maskRevealed;
            this._clothMaskNode.active = isMaskedAndLocked;
            if (isMaskedAndLocked && this._clothLabel) {
                this._clothLabel.string = `${this._bottleData.unlockTargetCompletedBottles || 1}`;
            }
        }

        // 2. 底部漏水喷嘴
        if (this._leakNozzleNode) {
            this._leakNozzleNode.active = (this._bottleData.type === 'bottom_leak');
        }
    }

    public updateCorkState() {
        if (!this.corkNode) return;
        const isComplete = this._bottleData.layers.length === 4 &&
            this._bottleData.layers.every(c => c === this._bottleData.layers[0]);
        this.corkNode.active = isComplete;
    }

    public updateBadgeState() {
        if (!this.videoBadgeNode) return;
        const isVideoLocked = this._bottleData.type === 'empty' && (this._bottleData as any).videoLocked;
        this.videoBadgeNode.active = !!isVideoLocked;
    }
}
