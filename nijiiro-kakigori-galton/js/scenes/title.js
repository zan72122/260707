// タイトル画面: お祭りのかき氷マシンがドン!と鎮座
import { TAU, rand, randi, clamp, drawRainbowText, drawBubbleText } from '../core/utils.js';
import { audio } from '../core/audio.js';
import { FxSystem } from '../core/fx.js';
import { computeLayout } from '../game/layout.js';
import { Background } from '../render/background.js';
import { drawTable, drawStall, drawTankBack, drawTankFront, drawPins, drawCup, drawDividers, drawLever } from '../render/machine.js';
import { drawBallFast } from '../render/grain.js';

const NO_GLOW = new Float32Array(0);
const NO_REMOVED = new Set();

export class TitleScene {
  constructor(onStart) {
    this.onStart = onStart;
    this.bg = new Background();
    this.fx = new FxSystem();
    this.drops = [];
    this.L = null;
    this.startPressed = false;
    this.pressT = 0;
  }

  onEnter(engine) { this.engine = engine; }

  onResize(w, h) {
    this.L = computeLayout(w, h);
    this.glow = new Float32Array(this.L.pins.length);
    this.bg.setSize(w, h);
    this.drops = [];
    for (let i = 0; i < 16; i++) {
      this.drops.push({
        x: rand(this.L.boardX, this.L.boardX + this.L.boardW),
        y: rand(0, h),
        v: rand(50, 130),
        r: this.L.ballR * rand(0.9, 1.3),
        hue: randi(0, 360),
      });
    }
  }

  onDown() {
    audio.unlock();
    audio.tap();
    this.startPressed = true;
  }

  update(dt, t) {
    this.bg.update(dt);
    this.fx.update(dt);
    const L = this.L;
    for (const d of this.drops) {
      d.y += d.v * dt;
      if (d.y > L.iceY) {
        d.y = rand(-60, -10);
        d.x = rand(L.boardX, L.boardX + L.boardW);
      }
    }
    if (Math.random() < dt * 4) {
      this.fx.mist(rand(L.boardX, L.boardX + L.boardW), L.iceY + 4, rand(14, 30));
    }
    if (this.startPressed) {
      this.pressT += dt;
      if (this.pressT > 0.28) this.onStart();
    }
  }

  draw(ctx, t) {
    const L = this.L;
    const { w, h } = L;
    this.bg.draw(ctx, t);
    drawTable(ctx, L);
    drawStall(ctx, L, t);
    drawCup(ctx, L, t);
    drawDividers(ctx, L);
    drawTankBack(ctx, L);
    drawTankFront(ctx, L, 0, t);
    drawPins(ctx, L, this.glow, NO_REMOVED, t);
    for (const d of this.drops) {
      ctx.globalAlpha = 0.85;
      drawBallFast(ctx, d.x, d.y, d.r, d.hue, null);
    }
    ctx.globalAlpha = 1;
    drawLever(ctx, L, 0, true, t);
    this.fx.draw(ctx, t);

    // ロゴ(ぷかぷか)
    const ts = clamp(Math.min(w * 0.105, h * 0.075), 26, 66);
    const ty = L.pinTop + (L.slotTop - L.pinTop) * 0.30 + Math.sin(t * 1.8) * 5;
    ctx.save();
    ctx.rotate(-0.015);
    drawRainbowText(ctx, 'じゃらじゃらGO!', L.cx, ty, ts, t * 90);
    ctx.restore();
    drawBubbleText(ctx, 'にじいろ かきごおりマシン', L.cx, ty + ts * 1.15, ts * 0.62, '#4a7a9b', '#ffffff', 0.24);

    // かき氷絵文字
    ctx.font = `${clamp(Math.min(w, h) * 0.11, 44, 90)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🍧', L.cx, ty + ts * 2.6 + Math.sin(t * 2.2) * 4);

    // スタート案内
    const a = 0.65 + 0.35 * Math.sin(t * 3.4);
    ctx.globalAlpha = this.startPressed ? 1 : a;
    const bs = clamp(Math.min(w, h) * 0.05, 18, 36);
    const scale = this.startPressed ? 1 + this.pressT * 2.5 : 1;
    ctx.save();
    ctx.translate(L.cx, L.slotTop + (L.iceY - L.slotTop) * 0.5);
    ctx.scale(scale, scale);
    drawBubbleText(ctx, 'タップして はじめる!', 0, 0, bs, '#ff6f9c', '#ffffff', 0.26);
    ctx.restore();
    ctx.globalAlpha = 1;
    drawBubbleText(ctx, 'たまを ためて レバーで じゃらじゃら~!', L.cx, L.iceY + (L.cupBottom - L.iceY) * 0.5, bs * 0.55, '#4a7a9b', '#ffffff', 0.2);
  }
}
