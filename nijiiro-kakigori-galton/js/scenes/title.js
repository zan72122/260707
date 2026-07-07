// タイトル画面: にじいろ かきごおり ゴルトン
import { TAU, rand, randi, clamp, drawRainbowText, drawBubbleText } from '../core/utils.js';
import { audio } from '../core/audio.js';
import { Background } from '../render/background.js';
import { drawGrain } from '../game/board.js';

export class TitleScene {
  constructor(onStart) {
    this.onStart = onStart;
    this.bg = new Background();
    this.drops = [];
    this.w = 0;
    this.h = 0;
    this.startPressed = false;
    this.pressT = 0;
  }

  onEnter(engine) {
    this.engine = engine;
  }

  onResize(w, h) {
    this.w = w;
    this.h = h;
    this.bg.setSize(w, h);
    this.drops = [];
    for (let i = 0; i < 26; i++) this._spawn(true);
  }

  _spawn(anywhere = false) {
    this.drops.push({
      x: rand(0, this.w),
      y: anywhere ? rand(-this.h, this.h) : rand(-60, -10),
      v: rand(40, 120),
      r: rand(6, 14),
      hue: randi(0, 360),
      kind: Math.random() < 0.12 ? (Math.random() < 0.5 ? 'star' : 'heart') : null,
      rot: rand(0, TAU),
      vr: rand(-2, 2),
    });
  }

  onDown() {
    audio.unlock();
    audio.tap();
    this.startPressed = true;
  }

  update(dt, t) {
    this.bg.update(dt);
    for (const d of this.drops) {
      d.y += d.v * dt;
      d.rot += d.vr * dt;
      if (d.y > this.h + 30) {
        d.y = rand(-80, -20);
        d.x = rand(0, this.w);
      }
    }
    if (this.startPressed) {
      this.pressT += dt;
      if (this.pressT > 0.28) this.onStart();
    }
  }

  draw(ctx, t) {
    const { w, h } = this;
    this.bg.draw(ctx, t);

    for (const d of this.drops) {
      ctx.globalAlpha = 0.85;
      drawGrain(ctx, d.x, d.y, d.r, d.hue, d.kind, d.rot, t);
    }
    ctx.globalAlpha = 1;

    // 大きなかき氷の絵文字がゆらゆら
    const cy = h * 0.46;
    ctx.save();
    ctx.translate(w / 2, cy + Math.sin(t * 1.8) * 8);
    ctx.rotate(Math.sin(t * 1.2) * 0.06);
    const emoSize = clamp(Math.min(w, h) * 0.24, 90, 190);
    ctx.font = `${emoSize}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍧', 0, 0);
    ctx.restore();

    // タイトルロゴ
    const ts = clamp(Math.min(w * 0.088, h * 0.075), 26, 64);
    const ty = h * 0.2;
    drawRainbowText(ctx, 'にじいろ かきごおり', w / 2, ty, ts, t * 90);
    drawRainbowText(ctx, 'ゴルトン', w / 2, ty + ts * 1.35, ts * 1.25, t * 90 + 120);

    // スタート案内(ぷかぷか点滅)
    const a = 0.65 + 0.35 * Math.sin(t * 3.4);
    ctx.globalAlpha = this.startPressed ? 1 : a;
    const bs = clamp(Math.min(w, h) * 0.052, 20, 38);
    const scale = this.startPressed ? 1 + this.pressT * 2.5 : 1;
    ctx.save();
    ctx.translate(w / 2, h * 0.74);
    ctx.scale(scale, scale);
    drawBubbleText(ctx, 'タップして はじめる!', 0, 0, bs, '#ff6f9c', '#ffffff', 0.26);
    ctx.restore();
    ctx.globalAlpha = 1;

    drawBubbleText(ctx, 'つぶを おとして にじいろの やまを つくろう', w / 2, h * 0.83, bs * 0.55, '#4a7a9b', '#ffffff', 0.2);
  }
}
