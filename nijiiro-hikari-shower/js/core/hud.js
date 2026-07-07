// HUD: おうちボタン・音ボタン・発見スター・ほめことばトースト

import { audio } from './audio.js';
import { discoveries } from './discoveries.js';
import { TAU, clamp, dist, ease, rgba, roundRect, starPath } from './utils.js';

const BTN_R = 27;
const FONT = '"Hiragino Maru Gothic ProN","BIZ UDGothic","Yu Gothic",sans-serif';
const PRAISE = ['すごい!', 'きれい!', 'はっけん!', 'やったね!', 'わあ!'];

export class Hud {
  constructor(engine, sceneId, totalDiscoveries) {
    this.engine = engine;
    this.sceneId = sceneId;
    this.total = totalDiscoveries;
    this.toasts = []; // {text, t, hex}
    this.starPulse = 0;
    this.muted = audio.muted;
  }

  get homePos() {
    return { x: 16 + BTN_R, y: 16 + BTN_R };
  }

  get soundPos() {
    return { x: this.engine.W - 16 - BTN_R, y: 16 + BTN_R };
  }

  // タップがHUDで処理されたら true
  handleTap(x, y) {
    const h = this.homePos;
    if (dist(x, y, h.x, h.y) < BTN_R + 12) {
      audio.tap();
      this.engine.goto('menu');
      return true;
    }
    const s = this.soundPos;
    if (dist(x, y, s.x, s.y) < BTN_R + 12) {
      this.muted = !this.muted;
      audio.setMuted(this.muted);
      if (!this.muted) audio.tap();
      return true;
    }
    return false;
  }

  // 発見演出(scene_baseから呼ばれる)
  celebrate(text, hex, x, y) {
    // 画面がトーストだらけにならないよう、古いものから間引く
    while (this.toasts.length >= 3) this.toasts.shift();
    this.toasts.push({ text, t: 0, hex });
    const praise = PRAISE[(Math.random() * PRAISE.length) | 0];
    this.toasts.push({ text: praise, t: -0.5, hex: '#ffd76e' });
    this.starPulse = 1;
    audio.fanfare();
    const P = this.engine.particles;
    P.burst(x, y, hex, 22, 160);
    P.burst(x, y, '#ffffff', 8, 90);
    for (let i = 0; i < 6; i++) P.heart(x, y, hex);
  }

  update(dt) {
    for (let i = this.toasts.length - 1; i >= 0; i--) {
      const t = this.toasts[i];
      t.t += dt;
      if (t.t > 2.6) this.toasts.splice(i, 1);
    }
    this.starPulse = Math.max(0, this.starPulse - dt * 0.7);
  }

  draw(ctx) {
    const { W } = this.engine;
    this._drawButton(ctx, this.homePos.x, this.homePos.y, '#ff9ecd', (c, x, y) => {
      // おうちアイコン
      c.fillStyle = '#fff';
      c.beginPath();
      c.moveTo(x, y - 13);
      c.lineTo(x + 14, y);
      c.lineTo(x + 9, y);
      c.lineTo(x + 9, y + 12);
      c.lineTo(x - 9, y + 12);
      c.lineTo(x - 9, y);
      c.lineTo(x - 14, y);
      c.closePath();
      c.fill();
    });
    this._drawButton(ctx, this.soundPos.x, this.soundPos.y, '#8ecdf7', (c, x, y) => {
      c.fillStyle = '#fff';
      c.beginPath();
      c.moveTo(x - 11, y - 5);
      c.lineTo(x - 4, y - 5);
      c.lineTo(x + 3, y - 12);
      c.lineTo(x + 3, y + 12);
      c.lineTo(x - 4, y + 5);
      c.lineTo(x - 11, y + 5);
      c.closePath();
      c.fill();
      if (this.muted) {
        c.strokeStyle = '#ff6b6b';
        c.lineWidth = 4;
        c.lineCap = 'round';
        c.beginPath();
        c.moveTo(x + 6, y - 8);
        c.lineTo(x + 14, y + 8);
        c.stroke();
      } else {
        c.strokeStyle = '#fff';
        c.lineWidth = 3;
        c.lineCap = 'round';
        c.beginPath();
        c.arc(x + 4, y, 9, -0.9, 0.9);
        c.stroke();
      }
    });

    // 発見スターカウンター(上中央)
    const found = discoveries.countIn(this.sceneId);
    const cx = W / 2;
    const cy = 16 + BTN_R;
    const pulse = 1 + ease.outBack(this.starPulse) * 0.28;
    ctx.save();
    roundRect(ctx, cx - 58, cy - 22, 116, 44, 22);
    ctx.fillStyle = 'rgba(40,25,80,0.4)';
    ctx.fill();
    ctx.translate(cx - 26, cy);
    ctx.scale(pulse, pulse);
    ctx.fillStyle = '#ffd76e';
    ctx.shadowColor = '#ffd76e';
    ctx.shadowBlur = 12;
    starPath(ctx, 0, 0, 15, 6.6);
    ctx.fill();
    ctx.restore();
    ctx.fillStyle = '#fff';
    ctx.font = `bold 21px ${FONT}`;
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${found} / ${this.total}`, cx - 4, cy + 1);

    this._drawToasts(ctx);
  }

  _drawButton(ctx, x, y, hex, iconFn) {
    ctx.save();
    ctx.fillStyle = rgba(hex, 0.92);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3;
    ctx.shadowColor = 'rgba(0,0,0,0.25)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.beginPath();
    ctx.arc(x, y, BTN_R, 0, TAU);
    ctx.fill();
    ctx.shadowColor = 'transparent';
    ctx.stroke();
    iconFn(ctx, x, y);
    ctx.restore();
  }

  _drawToasts(ctx) {
    const { W, H } = this.engine;
    let row = 0;
    for (const t of this.toasts) {
      if (t.t < 0) continue;
      const inK = ease.outBack(clamp(t.t / 0.4, 0, 1));
      const outK = clamp((t.t - 2.1) / 0.5, 0, 1);
      const y = H * 0.2 + row * 62 - (1 - inK) * 30;
      ctx.save();
      ctx.globalAlpha = (1 - outK) * inK;
      ctx.font = `bold 30px ${FONT}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      const w = ctx.measureText(t.text).width + 56;
      roundRect(ctx, W / 2 - w / 2, y - 26, w, 52, 26);
      ctx.fillStyle = 'rgba(255,255,255,0.94)';
      ctx.shadowColor = rgba(t.hex, 0.8);
      ctx.shadowBlur = 22;
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = t.hex === '#ffd76e' ? '#c78a00' : t.hex;
      ctx.fillText(t.text, W / 2, y + 2);
      ctx.restore();
      row++;
    }
  }
}
