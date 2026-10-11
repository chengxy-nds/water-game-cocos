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
    private _lightColor: Color = Color.WHITE;
    private _animPhase: number = 0;

    onLoad() {
        this._graphics = (this.getComponent(Graphics) || this.addComponent(Graphics))!;
    }

    public startPour(fromWorldPos: Vec3, toWorldPos: Vec3, colorId: string) {
        this._isPouring = true;
        this._animPhase = 0;
        if (!this._graphics) {
            this._graphics = (this.getComponent(Graphics) || this.addComponent(Graphics))!;
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
            this._lightColor = Color.fromHEX(new Color(), cDef.topHex || '#ffffff');
        }
        this.renderStream();
    }

    public stopPour() {
        this._isPouring = false;
        if (this._graphics) {
            this._graphics.clear();
        }
    }

    update(dt: number) {
        if (!this._isPouring) return;
        this._animPhase += dt * 4.5;
        this.renderStream();
    }

    public renderStream() {
        if (!this._graphics || !this._isPouring) return;
        const g = this._graphics;
        g.clear();

        const x1 = this._startPos.x;
        const y1 = this._startPos.y;
        const x2 = this._endPos.x;
        const y2 = this._endPos.y;

        // Laminar gravity flow control points: straight vertical into target center
        const dy = Math.max(30, y1 - y2);
        const cp1x = x1;
        const cp1y = y1 - dy * 0.35;
        const cp2x = x2;
        const cp2y = y2 + dy * 0.45;

        // 1. Soft Ambient Fluid Glow
        const glowColor = new Color(this._color.r, this._color.g, this._color.b, 65);
        g.strokeColor = glowColor;
        g.lineWidth = 18;
        g.moveTo(x1, y1);
        g.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        g.stroke();

        // 2. Thick Viscous Fluid Core Body
        g.strokeColor = this._color;
        g.lineWidth = 9;
        g.moveTo(x1, y1);
        g.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        g.stroke();

        // 3. Inner Rich Liquid Light Core
        g.strokeColor = this._lightColor;
        g.lineWidth = 4.5;
        g.moveTo(x1, y1);
        g.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        g.stroke();

        // 4. High-Gloss White Specular Filament
        const specColor = new Color(255, 255, 255, 220);
        g.strokeColor = specColor;
        g.lineWidth = 1.6;
        g.moveTo(x1, y1);
        g.bezierCurveTo(cp1x, cp1y, cp2x, cp2y, x2, y2);
        g.stroke();

        // 5. 3D Volumetric Fluid Impact Mound & Splash Crown at surface
        const pulse = Math.sin(this._animPhase * 5) * 1.2;
        const moundY = y2;

        // Base dome
        g.fillColor = this._color;
        g.ellipse(x2, moundY, 11, 5.5);
        g.fill();

        // Raised center droplet
        g.fillColor = this._lightColor;
        g.ellipse(x2, moundY + 2 + pulse, 6, 4.5);
        g.fill();

        // Specular glint
        g.fillColor = Color.WHITE;
        g.circle(x2 - 1.5, moundY + 3.5 + pulse, 1.8);
        g.fill();

        // 6. Perspective Concentric Ripples
        for (let i = 0; i < 3; i++) {
            const tRing = ((this._animPhase * 0.35 + i * 0.33) % 1);
            const rx = 3 + tRing * 14;
            const ry = rx * 0.35;
            const alpha = Math.max(0, Math.floor((1 - tRing) * 180));
            g.strokeColor = new Color(255, 255, 255, alpha);
            g.lineWidth = 1.2;
            g.ellipse(x2, y2, rx, ry);
            g.stroke();
        }
    }
}
