import { _decorator, Component, Graphics, Color, Vec3, UITransform } from 'cc';
import { getColor } from '../core/colors';

const { ccclass, property } = _decorator;

@ccclass('WaterStream')
export class WaterStream extends Component {
    private _graphics: Graphics = null!;
    private _isPouring: boolean = false;
    private _startPos: Vec3 = new Vec3();
    private _endPos: Vec3 = new Vec3();
    private _color: Color = Color.WHITE;

    onLoad() {
        this._graphics = this.getComponent(Graphics) || this.addComponent(Graphics);
    }

    public startPour(fromWorldPos: Vec3, toWorldPos: Vec3, colorId: string) {
        this._isPouring = true;
        if (!this._graphics) {
            this._graphics = this.getComponent(Graphics) || this.addComponent(Graphics);
        }

        const uiTrans = this.getComponent(UITransform);
        if (uiTrans) {
            this._startPos = uiTrans.convertToNodeSpaceAR(fromWorldPos);
            this._endPos = uiTrans.convertToNodeSpaceAR(toWorldPos);
        } else {
            this._startPos.set(fromWorldPos);
            this._endPos.set(toWorldPos);
        }

        const cDef = getColor(colorId);
        if (cDef) {
            this._color = Color.fromHEX(new Color(), cDef.hex);
        }
        this.renderStream();
    }

    public stopPour() {
        this._isPouring = false;
        if (this._graphics) {
            this._graphics.clear();
        }
    }

    public renderStream() {
        if (!this._graphics || !this._isPouring) return;
        this._graphics.clear();

        const midX = (this._startPos.x + this._endPos.x) / 2;
        const midY = Math.max(this._startPos.y, this._endPos.y) + 20;

        this._graphics.strokeColor = this._color;
        this._graphics.fillColor = this._color;
        this._graphics.lineWidth = 12;

        this._graphics.moveTo(this._startPos.x, this._startPos.y);
        this._graphics.quadraticCurveTo(midX, midY, this._endPos.x, this._endPos.y);
        this._graphics.stroke();
    }
}
