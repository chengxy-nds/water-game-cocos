import { _decorator, Component, Graphics, Color, Vec3, UITransform } from 'cc';
import { getColor } from '../core/colors';

const { ccclass, property } = _decorator;

@ccclass('WaterStream')
export class WaterStream extends Component {
    private _graphics: Graphics = null!;
    private _isPouring: boolean = false;
    private _spoutPos: Vec3 = new Vec3();
    private _mouthPos: Vec3 = new Vec3();
    private _surfacePos: Vec3 = new Vec3();
    private _color: Color = Color.WHITE;
    private _lightColor: Color = Color.WHITE;
    private _topRimColor: Color = Color.WHITE;
    private _animPhase: number = 0;
    private _moveCount: number = 1;

    onLoad() {
        this._graphics = (this.getComponent(Graphics) || this.addComponent(Graphics))!;
    }

    public startPour(
        fromWorldPos: Vec3,
        mouthOrTargetPos: Vec3,
        surfaceWorldPos?: Vec3 | string,
        colorId?: string,
        moveCount: number = 1
    ) {
        this._isPouring = true;
        this._animPhase = 0;
        this._moveCount = moveCount;

        if (!this._graphics) {
            this._graphics = (this.getComponent(Graphics) || this.addComponent(Graphics))!;
        }

        const uiTrans = this.getComponent(UITransform);
        if (uiTrans) {
            this._spoutPos = uiTrans.convertToNodeSpaceAR(fromWorldPos);
            this._mouthPos = uiTrans.convertToNodeSpaceAR(mouthOrTargetPos);
            if (surfaceWorldPos && typeof surfaceWorldPos !== 'string') {
                this._surfacePos = uiTrans.convertToNodeSpaceAR(surfaceWorldPos);
            } else {
                this._surfacePos = new Vec3(this._mouthPos.x, this._mouthPos.y - 110, 0);
            }
        } else {
            this._spoutPos.set(fromWorldPos);
            this._mouthPos.set(mouthOrTargetPos);
            if (surfaceWorldPos && typeof surfaceWorldPos !== 'string') {
                this._surfacePos.set(surfaceWorldPos);
            } else {
                this._surfacePos = new Vec3(this._mouthPos.x, this._mouthPos.y - 110, 0);
            }
        }

        const actualColorId = typeof surfaceWorldPos === 'string' ? surfaceWorldPos : (colorId || 'blue');
        const cDef = getColor(actualColorId);
        if (cDef) {
            this._color = Color.fromHEX(new Color(), cDef.mid);
            this._lightColor = Color.fromHEX(new Color(), cDef.highlight || '#ffffff');
            this._topRimColor = Color.fromHEX(new Color(), cDef.topLight || '#ffffff');
        } else {
            this._color = new Color(56, 189, 248, 255);
            this._lightColor = new Color(186, 230, 253, 255);
            this._topRimColor = new Color(255, 255, 255, 255);
        }

        this.renderStream();
    }

    public updateSurfacePos(surfaceWorldPos: Vec3) {
        const uiTrans = this.getComponent(UITransform);
        if (uiTrans) {
            this._surfacePos = uiTrans.convertToNodeSpaceAR(surfaceWorldPos);
        } else {
            this._surfacePos.set(surfaceWorldPos);
        }
    }

    public stopPour() {
        this._isPouring = false;
        if (this._graphics) {
            this._graphics.clear();
        }
    }

    update(dt: number) {
        if (!this._isPouring) return;
        this._animPhase += dt * 5.2;
        this.renderStream();
    }

    public renderStream() {
        if (!this._graphics || !this._isPouring) return;
        const g = this._graphics;
        g.clear();

        const x1 = this._spoutPos.x;
        const y1 = this._spoutPos.y;
        const xm = this._mouthPos.x;
        const ym = this._mouthPos.y;
        const x2 = this._surfacePos.x;
        const y2 = Math.min(ym - 15, this._surfacePos.y);

        // 1. 瓶口自然重力抛物线拱弧
        const dx = xm - x1;
        const dyMouth = Math.max(18, y1 - ym);
        const cp1x = x1 + dx * 0.25;
        const cp1y = y1 + 10;
        const cp2x = xm;
        const cp2y = ym + dyMouth * 0.45;

        const wave = Math.sin(this._animPhase * 8) * 0.85;

        // A. 柔和外发光辉光带 (宽 18)
        g.strokeColor = new Color(this._color.r, this._color.g, this._color.b, 68);
        g.lineWidth = 18;
        g.moveTo(x1, y1);
        g.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, xm + wave * 0.5, ym);
        g.lineTo(x2 + wave * 0.3, y2);
        g.stroke();

        // B. 饱满浓郁水柱主体 (宽 10)
        g.strokeColor = this._color;
        g.lineWidth = 10;
        g.moveTo(x1, y1);
        g.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, xm + wave * 0.5, ym);
        g.lineTo(x2 + wave * 0.3, y2);
        g.stroke();

        // C. 内层明亮流光芯 (宽 5.2)
        g.strokeColor = this._lightColor;
        g.lineWidth = 5.2;
        g.moveTo(x1, y1);
        g.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, xm + wave * 0.5, ym);
        g.lineTo(x2 + wave * 0.3, y2);
        g.stroke();

        // D. 纯白晶莹高光反光丝 (宽 1.8)
        g.strokeColor = new Color(255, 255, 255, 230);
        g.lineWidth = 1.8;
        g.moveTo(x1 + 1.2, y1);
        g.bezierCurveTo(cp1x + 1.2, cp1y, cp2x - 0.8, cp2y, xm - 1.2, ym);
        g.lineTo(x2 - 1.2, y2);
        g.stroke();

        // 2. 液面撞击拱丘与光斑 (Impact Mound)
        const pulse = Math.sin(this._animPhase * 6.5) * 1.5;
        const impactRx = 14 + Math.abs(pulse) * 1.2;
        const impactRy = 6.5 + Math.abs(pulse) * 0.5;

        g.fillColor = this._color;
        g.ellipse(x2, y2, impactRx, impactRy);
        g.fill();

        g.fillColor = this._lightColor;
        g.ellipse(x2, y2 + 2.5 + pulse * 0.5, impactRx * 0.65, impactRy * 0.65);
        g.fill();

        g.fillColor = new Color(255, 255, 255, 240);
        g.circle(x2 - 1.5, y2 + 3.2 + pulse * 0.5, 2.0);
        g.fill();

        // 3. 动态同心透视波纹扩散 (Concentric Ripples)
        for (let i = 0; i < 3; i++) {
            const tRing = ((this._animPhase * 0.38 + i * 0.33) % 1);
            const rX = 6 + tRing * 18;
            const rY = rX * 0.38;
            const alpha = Math.max(0, Math.floor((1 - tRing) * 210));
            g.strokeColor = new Color(this._topRimColor.r, this._topRimColor.g, this._topRimColor.b, alpha);
            g.lineWidth = 1.4 * (1 - tRing * 0.5);
            g.ellipse(x2, y2, rX, rY);
            g.stroke();
        }

        // 4. 动态飞溅晶莹水花水滴粒子 (Airborne Splash Drops)
        const dropCount = 5 + Math.min(2, this._moveCount - 1) * 3;
        for (let d = 0; d < dropCount; d++) {
            const tDrop = (this._animPhase * (0.85 + d * 0.12) + d * 0.19) % 1.0;
            const side = d % 2 === 0 ? 1 : -1;
            const reachX = side * (10 + (d % 3) * 5.5);
            const peakH = 14 + (d % 3) * 6.5;

            const dxDrop = reachX * tDrop;
            const dyDrop = 4 * tDrop * (1 - tDrop) * peakH;
            const dropX = x2 + dxDrop;
            const dropY = y2 + dyDrop;
            const dropR = (2.0 + (d % 2) * 0.7) * (1 - tDrop * 0.4);
            const dropAlpha = Math.max(0, Math.floor((1 - tDrop) * 230));

            g.fillColor = new Color(this._lightColor.r, this._lightColor.g, this._lightColor.b, dropAlpha);
            g.circle(dropX, dropY, dropR);
            g.fill();

            g.fillColor = new Color(255, 255, 255, Math.floor(dropAlpha * 0.9));
            g.circle(dropX - 0.4, dropY + 0.4, dropR * 0.55);
            g.fill();
        }
    }
}
