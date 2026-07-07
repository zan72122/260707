// 画面下のおもちゃ箱ツールバー
// 押すたびに 光の色/ふとさ/かたち/光源/プリズム/おおきさ が切り替わる + 鏡の追加

import { audio } from './audio.js';
import { LIGHT_COLORS, WIDTH_LEVELS, BEAM_SHAPES } from '../light/lightrig.js';
import { RAINBOW, TAU, clamp, ease, rgba, roundRect, heartPath, starPath } from './utils.js';

const FONT = '"Hiragino Maru Gothic ProN","BIZ UDGothic","Yu Gothic",sans-serif';
const IDS = ['color', 'width', 'shape', 'source', 'prism', 'size', 'mirror'];

export class Toolbar {
  constructor(engine, rig, onMirror) {
    this.engine = engine;
    this.rig = rig;
    this.onMirror = onMirror;
    this.mirrorCount = 0;
    this.flash = null; // {label, x, y, t} 切り替え名の吹き出し
    this.pressT = new Map();
  }

  _layout() {
    const { W, H } = this.engine;
    const n = IDS.length;
    const bw = clamp((W - 20) / n - 8, 40, 56);
    const gap = clamp((W - n * bw) / (n + 1), 6, 26);
    const total = n * bw + (n - 1) * gap;
    const x0 = (W - total) / 2 + bw / 2;
    const y = H - bw / 2 - 10;
    return IDS.map((id, i) => ({ id, x: x0 + i * (bw + gap), y, r: bw / 2 }));
  }

  handleTap(x, y) {
    for (const b of this._layout()) {
      if (Math.hypot(x - b.x, y - b.y) > b.r + 8) continue;
      this._activate(b);
      return true;
    }
    return false;
  }

  _activate(b) {
    const rig = this.rig;
    let label = '';
    if (b.id === 'color') label = rig.cycleColor();
    else if (b.id === 'width') label = rig.cycleWidth();
    else if (b.id === 'shape') label = rig.cycleShape();
    else if (b.id === 'source') label = rig.cycleSource();
    else if (b.id === 'prism') label = rig.cyclePrism();
    else if (b.id === 'size') label = rig.cycleSize();
    else if (b.id === 'mirror') label = this.onMirror();
    audio.switchTone();
    this.flash = { label, x: b.x, y: b.y - b.r - 26, t: 0 };
    this.pressT.set(b.id, 0.22);
    this.engine.particles.ring(b.x, b.y, '#ffffff', b.r * 0.8);
  }

  update(dt) {
    if (this.flash) {
      this.flash.t += dt;
      if (this.flash.t > 1.2) this.flash = null;
    }
    for (const [k, v] of this.pressT) {
      if (v > 0) this.pressT.set(k, v - dt);
    }
  }

  draw(ctx) {
    for (const b of this._layout()) {
      const press = Math.max(0, this.pressT.get(b.id) ?? 0);
      const scale = 1 - ease.outCubic(Math.min(1, press / 0.22)) * 0.12;
      ctx.save();
      ctx.translate(b.x, b.y);
      ctx.scale(scale, scale);
      // ボタン台座
      ctx.fillStyle = 'rgba(255,255,255,0.88)';
      ctx.strokeStyle = 'rgba(150,120,190,0.55)';
      ctx.lineWidth = 2.5;
      ctx.shadowColor = 'rgba(30,15,60,0.3)';
      ctx.shadowBlur = 8;
      ctx.shadowOffsetY = 3;
      ctx.beginPath();
      ctx.arc(0, 0, b.r, 0, TAU);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.stroke();
      this._drawIcon(ctx, b.id, b.r);
      ctx.restore();
    }
    this._drawFlash(ctx);
  }

  _drawIcon(ctx, id, r) {
    const rig = this.rig;
    const s = r * 0.62;
    if (id === 'color') {
      const c = LIGHT_COLORS[rig.colorIndex];
      if (c.ci < 0) {
        for (let i = 0; i < RAINBOW.length; i++) {
          ctx.strokeStyle = RAINBOW[i].hex;
          ctx.lineWidth = 2.6;
          ctx.beginPath();
          ctx.arc(0, s * 0.5, s - i * 2.4, Math.PI * 1.1, Math.PI * 1.9);
          ctx.stroke();
        }
      } else {
        ctx.fillStyle = c.hex;
        ctx.beginPath();
        ctx.arc(0, 0, s * 0.72, 0, TAU);
        ctx.fill();
      }
    } else if (id === 'width') {
      const sc = WIDTH_LEVELS[rig.widthIndex].scale;
      ctx.fillStyle = '#f7b53d';
      roundRect(ctx, -s, -s * 0.28 * sc, s * 2, s * 0.56 * sc, s * 0.28 * sc);
      ctx.fill();
    } else if (id === 'shape') {
      ctx.fillStyle = '#ff8fb3';
      const shape = BEAM_SHAPES[rig.shapeIndex].id;
      if (shape === 'heart') {
        heartPath(ctx, 0, 0, s * 0.85);
        ctx.fill();
      } else if (shape === 'star') {
        starPath(ctx, 0, 0, s * 0.9, s * 0.42);
        ctx.fill();
      } else {
        ctx.fillStyle = '#f7d13d';
        roundRect(ctx, -s, -s * 0.16, s * 2, s * 0.32, s * 0.16);
        ctx.fill();
      }
    } else if (id === 'source') {
      this._sourceIcon(ctx, rig.sourceType, s);
    } else if (id === 'prism') {
      this._prismIcon(ctx, rig.prismType, s);
    } else if (id === 'size') {
      ctx.fillStyle = '#9adcff';
      ctx.strokeStyle = '#5a94b8';
      ctx.lineWidth = 2;
      const k = 0.55 + rig.sizeIndex * 0.28;
      ctx.beginPath();
      ctx.moveTo(0, -s * k);
      ctx.lineTo(s * k, s * k * 0.8);
      ctx.lineTo(-s * k, s * k * 0.8);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (id === 'mirror') {
      ctx.fillStyle = '#f7bcd9';
      ctx.strokeStyle = '#e07eb0';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.12, s * 0.6, s * 0.78, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();
      ctx.fillStyle = '#dff3ff';
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.12, s * 0.42, s * 0.58, 0, 0, TAU);
      ctx.fill();
      // 置いてある枚数バッジ
      if (this.mirrorCount > 0) {
        ctx.fillStyle = '#ff6b9e';
        ctx.beginPath();
        ctx.arc(s * 0.62, s * 0.55, s * 0.4, 0, TAU);
        ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.font = `bold ${s * 0.62}px ${FONT}`;
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(`${this.mirrorCount}`, s * 0.62, s * 0.58);
      }
    }
  }

  _sourceIcon(ctx, type, s) {
    if (type === 'sun') {
      ctx.fillStyle = '#ffd24d';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.55, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = '#ffb84d';
      ctx.lineWidth = 2.6;
      for (let i = 0; i < 8; i++) {
        const a = (i * TAU) / 8;
        ctx.beginPath();
        ctx.moveTo(Math.cos(a) * s * 0.72, Math.sin(a) * s * 0.72);
        ctx.lineTo(Math.cos(a) * s, Math.sin(a) * s);
        ctx.stroke();
      }
    } else if (type === 'flash') {
      ctx.fillStyle = '#ff9ecd';
      roundRect(ctx, -s, -s * 0.3, s * 1.2, s * 0.6, s * 0.14);
      ctx.fill();
      ctx.fillStyle = '#ffe28a';
      ctx.beginPath();
      ctx.moveTo(s * 0.2, -s * 0.42);
      ctx.lineTo(s * 0.95, -s * 0.14);
      ctx.lineTo(s * 0.95, s * 0.14);
      ctx.lineTo(s * 0.2, s * 0.42);
      ctx.closePath();
      ctx.fill();
    } else if (type === 'candle') {
      ctx.fillStyle = '#fffaf0';
      roundRect(ctx, -s * 0.3, -s * 0.15, s * 0.6, s * 1.05, s * 0.16);
      ctx.fill();
      ctx.fillStyle = '#ffc44d';
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.52, s * 0.22, s * 0.4, 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.fillStyle = '#f3ecc8';
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.66, 0, TAU);
      ctx.fill();
      ctx.fillStyle = 'rgba(190,180,130,0.5)';
      for (const [cx, cy, cr] of [[-0.2, 0.2, 0.14], [0.25, -0.12, 0.1]]) {
        ctx.beginPath();
        ctx.arc(cx * s, cy * s, cr * s, 0, TAU);
        ctx.fill();
      }
    }
  }

  _prismIcon(ctx, type, s) {
    ctx.fillStyle = '#cfe9ff';
    ctx.strokeStyle = '#7fb0d9';
    ctx.lineWidth = 2;
    if (type === 'marble') {
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.66, 0, TAU);
      ctx.fill();
      ctx.stroke();
    } else if (type === 'diamond') {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.8);
      ctx.lineTo(s * 0.62, 0);
      ctx.lineTo(0, s * 0.8);
      ctx.lineTo(-s * 0.62, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else if (type === 'heart') {
      heartPath(ctx, 0, s * 0.1, s * 0.8);
      ctx.fill();
      ctx.stroke();
    } else if (type === 'star') {
      starPath(ctx, 0, 0, s * 0.85, s * 0.4);
      ctx.fill();
      ctx.stroke();
    } else {
      ctx.beginPath();
      ctx.moveTo(0, -s * 0.75);
      ctx.lineTo(s * 0.7, s * 0.6);
      ctx.lineTo(-s * 0.7, s * 0.6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      if (type === 'broken') {
        ctx.strokeStyle = '#5a86ad';
        ctx.beginPath();
        ctx.moveTo(-s * 0.05, -s * 0.45);
        ctx.lineTo(s * 0.1, 0);
        ctx.lineTo(-s * 0.1, s * 0.45);
        ctx.stroke();
      }
    }
  }

  _drawFlash(ctx) {
    if (!this.flash) return;
    const f = this.flash;
    const inK = ease.outBack(clamp(f.t / 0.25, 0, 1));
    const outK = clamp((f.t - 0.8) / 0.4, 0, 1);
    ctx.save();
    ctx.globalAlpha = inK * (1 - outK);
    ctx.font = `bold 19px ${FONT}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const w = ctx.measureText(f.label).width + 30;
    const x = clamp(f.x, w / 2 + 6, this.engine.W - w / 2 - 6);
    roundRect(ctx, x - w / 2, f.y - 18 - (1 - inK) * 8, w, 36, 18);
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    ctx.shadowColor = rgba('#c07dff', 0.7);
    ctx.shadowBlur = 14;
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.fillStyle = '#8a5ab8';
    ctx.fillText(f.label, x, f.y + 1 - (1 - inK) * 8);
    ctx.restore();
  }
}
