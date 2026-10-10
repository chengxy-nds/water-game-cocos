import { _decorator, Component, Node, Sprite, Color, tween, Vec3, UITransform } from 'cc';
import { Bottle } from '../core/types';
import { getColor } from '../core/colors';

const { ccclass, property } = _decorator;

@ccclass('TubeView')
export class TubeView extends Component {
    @property(Node)
    public bottleBody: Node = null!;

    @property([Node])
    public liquidLayers: Node[] = [];

    @property(Node)
    public corkNode: Node = null!;

    @property(Node)
    public videoBadgeNode: Node = null!;

    private _bottleData: Bottle = null!;
    private _index: number = 0;
    private _isSelected: boolean = false;
    private _initialPos: Vec3 = new Vec3();

    onLoad() {
        this._initialPos.set(this.node.position);
        this.autoBindNodes();
    }

    private autoBindNodes() {
        if (!this.bottleBody) {
            this.bottleBody = this.node.getChildByName('GlassBody') || this.node;
        }
        if (!this.liquidLayers || this.liquidLayers.length === 0) {
            this.liquidLayers = this.node.children.filter(c => c.name.startsWith('Liquid_'));
            this.liquidLayers.sort((a, b) => a.name.localeCompare(b.name));
        }
        if (!this.videoBadgeNode) {
            this.videoBadgeNode = this.node.getChildByName('VideoBadge')!;
        }
        if (!this.corkNode) {
            this.corkNode = this.node.getChildByName('Cork')!;
        }
    }

    public init(index: number, bottle: Bottle) {
        this.autoBindNodes();
        this._index = index;
        this._bottleData = bottle;
        this.renderLayers();
        this.updateCorkState();
        this.updateBadgeState();
    }

    public get bottle(): Bottle {
        return this._bottleData;
    }

    public get index(): number {
        return this._index;
    }

    public renderLayers() {
        if (!this._bottleData) return;
        this.autoBindNodes();
        const layers = this._bottleData.layers;

        while (this.liquidLayers.length < layers.length && this.liquidLayers.length < 4) {
            const newLayerIdx = this.liquidLayers.length;
            const newLayerNode = new Node(`Liquid_${newLayerIdx}`);
            const trans = newLayerNode.addComponent(UITransform);
            trans.setContentSize(44, 25);
            newLayerNode.addComponent(Sprite);
            newLayerNode.setParent(this.node);
            if (this.bottleBody) {
                newLayerNode.setSiblingIndex(this.bottleBody.getSiblingIndex());
            }
            this.liquidLayers.push(newLayerNode);
        }

        for (let i = 0; i < this.liquidLayers.length; i++) {
            const layerNode = this.liquidLayers[i];
            if (!layerNode) continue;

            if (i < layers.length) {
                layerNode.active = true;
                const cId = layers[i];
                const cDef = getColor(cId);
                const sprite = layerNode.getComponent(Sprite);
                if (sprite && cDef) {
                    sprite.color = Color.fromHEX(new Color(), cDef.hex);
                }
                const trans = layerNode.getComponent(UITransform);
                if (trans) {
                    trans.setContentSize(44, 25);
                }
                layerNode.setPosition(0, -42 + i * 25, 0);
            } else {
                layerNode.active = false;
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

    public playPourTo(targetWorldPos: Vec3, duration: number = 0.5): Promise<void> {
        return new Promise((resolve) => {
            const localTarget = this.node.parent!.getComponent(UITransform)!.convertToNodeSpaceAR(targetWorldPos);
            const hoverPos = new Vec3(localTarget.x - 45, localTarget.y + 110, 0);

            tween(this.node)
                .to(0.25, { position: hoverPos }, { easing: 'quadOut' })
                .to(0.2, { angle: -65 }, { easing: 'cubicOut' })
                .call(() => resolve())
                .start();
        });
    }

    public playReturn(): Promise<void> {
        return new Promise((resolve) => {
            tween(this.node)
                .to(0.2, { angle: 0 }, { easing: 'quadOut' })
                .to(0.25, { position: this._initialPos }, { easing: 'quadInOut' })
                .call(() => {
                    this._isSelected = false;
                    resolve();
                })
                .start();
        });
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
