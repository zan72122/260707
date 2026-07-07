// シーン1: あさのまどべ
// 窓からの朝の光をプリズムに通し、花・コップ・スプーン・カーテンで遊ぶ

import { SceneBase } from './scene_base.js';
import { drawFlower, drawGlassCup, drawCaustics, mirrorSegment } from './props.js';
import { drawMorningBackground, drawWindowFrame, drawSpoon, drawCurtain, drawFloorLight } from './morning_view.js';
import { RAINBOW, clamp, dist, drawGlow, rand } from '../core/utils.js';
import { audio } from '../core/audio.js';

const DISCOVERIES = 6;

export class MorningScene extends SceneBase {
  constructor(engine) {
    super(engine, 'morning', DISCOVERIES, { sunMode: true, spread: 0.075 });
    this.curtainOpen = 0.8; // 0=閉 1=開
    this.flower = { x: 0, y: 0, size: 40, petals: new Array(6).fill(null), tint: new Array(6).fill(0), glow: 0, bloom: 1 };
    this.cup = { x: 0, y: 0, size: 62 };
    this.spoon = { x: 0, y: 0, rot: -0.7, len: 120 };
    this.causticGlow = 0;
    this.spunOnce = false;
    this.layout(engine.W, engine.H);
  }

  layout(W, H) {
    const portrait = H > W;
    this.win = portrait
      ? { x: W * 0.08, y: H * 0.06, w: W * 0.84, h: H * 0.34 }
      : { x: W * 0.06, y: H * 0.08, w: W * 0.42, h: H * 0.52 };
    this.deskY = portrait ? H * 0.62 : H * 0.68;
    this.rig.lightX = this.win.x + this.win.w * 0.45;
    this.rig.lightY = this.win.y + this.win.h * 0.4;
    this.rig.prismX = portrait ? W * 0.5 : W * 0.55;
    this.rig.prismY = this.deskY - 40;
    this.flower.x = portrait ? W * 0.82 : W * 0.88;
    this.flower.y = this.deskY - 66;
    this.cup.x = portrait ? W * 0.16 : W * 0.72;
    this.cup.y = this.deskY - 42;
    this.spoon.x = portrait ? W * 0.66 : W * 0.36;
    this.spoon.y = this.deskY + H * 0.14;
  }

  pickObject(x, y) {
    if (dist(x, y, this.spoon.x, this.spoon.y) < 70) return this.spoon;
    if (dist(x, y, this.cup.x, this.cup.y) < 70) return this.cup;
    // カーテンの端をつかむ
    const edgeX = this.win.x + this.win.w * (1 - this.curtainOpen * 0.82);
    if (Math.abs(x - edgeX) < 46 && y > this.win.y && y < this.win.y + this.win.h) {
      return { kind: 'curtain' };
    }
    if (dist(x, y, this.flower.x, this.flower.y) < 60) return { kind: 'flower' };
    return null;
  }

  objectDown(obj) {
    if (obj.kind === 'flower') {
      audio.bloom();
      this.engine.particles.burst(this.flower.x, this.flower.y, '#fef9f0', 8, 60);
    } else {
      audio.tap();
    }
  }

  objectMove(obj, p) {
    const { W, H } = this.engine;
    if (obj === this.spoon) {
      this.spoon.x = clamp(p.x, 40, W - 40);
      this.spoon.y = clamp(p.y, this.win.y, H - 40);
      this.spoon.rot += (p.dx ?? 0) * 0.006;
    } else if (obj === this.cup) {
      this.cup.x = clamp(p.x, 50, W - 50);
      this.cup.y = clamp(p.y, this.deskY - 90, H - 60);
    } else if (obj.kind === 'curtain') {
      this._dragCurtain(p);
    }
  }

  _dragCurtain(p) {
    const open = 1 - (p.x - this.win.x) / (this.win.w * 0.82);
    const prev = this.curtainOpen;
    this.curtainOpen = clamp(open, 0.05, 1);
    if (Math.abs(this.curtainOpen - prev) > 0.004 && Math.random() < 0.15) audio.whoosh();
    if (this.curtainOpen < 0.15) this._curtainClosed = true;
    if (this._curtainClosed && this.curtainOpen > 0.9) {
      this.discover('curtain', 'おひさま こんにちは!', '#ffd76e', this.win.x + this.win.w / 2, this.win.y + this.win.h / 2);
    }
  }

  sceneUpdate(dt) {
    // 光量: カーテンで変わる
    this.rainbowAlpha = 0.2 + this.curtainOpen * 0.8;
    // 太陽は窓の中だけ動ける
    this.rig.lightX = clamp(this.rig.lightX, this.win.x + 40, this.win.x + this.win.w - 40);
    this.rig.lightY = clamp(this.rig.lightY, this.win.y + 40, this.win.y + this.win.h - 40);
    // スプーンを鏡として登録
    this.rig.mirrors = [mirrorSegment({ x: this.spoon.x, y: this.spoon.y, rot: this.spoon.rot, len: this.spoon.len })];

    if (!this.spunOnce && this.rig.glow > 0.5) {
      this.spunOnce = true;
      this.discover('first-rainbow', 'にじが でた!', '#c07dff', this.rig.prismX, this.rig.prismY);
    }

    this._updateFlower(dt);
    this._updateCup(dt);
    this._updateSpoonBounce();
  }

  _updateFlower(dt) {
    const f = this.flower;
    const hits = this.rig.colorsAt(f.x, f.y, 46);
    f.glow = Math.max(0, (f.glow ?? 0) - dt);
    for (const ci of hits) {
      const idx = ci % f.petals.length;
      f.petals[idx] = RAINBOW[ci].hex;
      f.tint[idx] = Math.min(1, f.tint[idx] + dt * 0.55); // シロップが染みるように
      f.glow = 0.6;
      if (Math.random() < dt * 6) this.colorJoy(ci, f.x + rand(-20, 20), f.y + rand(-20, 20));
      if (f.tint[idx] > 0.5) {
        this.discover('flower-color', 'おはなに いろが ついた!', RAINBOW[ci].hex, f.x, f.y);
      }
    }
    if (f.tint.every((t) => t > 0.85)) {
      this.discover('flower-full', 'にじいろの おはな!', '#ff8fb3', f.x, f.y);
      if (Math.random() < dt * 2) this.engine.particles.petal(f.x, f.y - 10, RAINBOW[(Math.random() * 7) | 0].hex);
    }
  }

  _updateCup(dt) {
    const hits = this.rig.colorsAt(this.cup.x, this.cup.y, 50);
    if (hits.length > 0) {
      this.causticGlow = Math.min(1, this.causticGlow + dt * 2);
      if (Math.random() < dt * 4) this.colorJoy(hits[0], this.cup.x + rand(-20, 20), this.cup.y - 30);
      if (this.causticGlow > 0.8) {
        this.discover('cup-caustics', 'みずが ゆらゆら ひかる!', '#6fd8ff', this.cup.x, this.cup.y - 60);
      }
    } else {
      this.causticGlow = Math.max(0, this.causticGlow - dt * 1.5);
    }
  }

  _updateSpoonBounce() {
    // 反射した虹が天井(上端)に届いたら発見
    for (const ray of this.rig.rays) {
      if (ray.segs.length > 1) {
        const last = ray.segs[ray.segs.length - 1];
        if (last.y2 < this.engine.H * 0.1 || last.y1 < this.engine.H * 0.1) {
          this.discover('spoon-bounce', 'てんじょうに にじ!', '#ffe066', this.engine.W / 2, 70);
        }
      }
    }
  }

  // ---- 描画 ----

  drawBackground(ctx) {
    drawMorningBackground(ctx, this);
  }

  drawBehindLight(ctx) {
    drawWindowFrame(ctx, this);
  }

  drawFrontOfLight(ctx) {
    const { H } = this.engine;
    if (this.causticGlow > 0.02) {
      drawCaustics(ctx, this.cup.x, Math.max(40, this.cup.y - H * 0.3), 220, 80, this.time, '#bfe9ff', this.causticGlow * 0.9);
      drawGlow(ctx, this.cup.x, this.cup.y, 90, '#9adcff', this.causticGlow * 0.35);
    }
    drawGlassCup(ctx, this.cup, this.time);
    drawSpoon(ctx, this);
    drawFlower(ctx, this.flower, this.time);
    drawCurtain(ctx, this);
    drawFloorLight(ctx, this);
  }
}
