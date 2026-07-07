// シーン2: おふろのにじあわ
// 湯気・シャボン玉・鏡・アヒル・水面で光あそび

import { SceneBase } from './scene_base.js';
import { drawHandMirror, mirrorSegment } from './props.js';
import { drawBathBackground, drawBathWater, drawDuck, drawBubble, drawSteamRainbow } from './bath_view.js';
import { RAINBOW, TAU, clamp, dist, rand } from '../core/utils.js';
import { audio } from '../core/audio.js';

const DISCOVERIES = 11; // シーン固有6 + 共通コンボ5
const YELLOW = 2; // RAINBOWのきいろindex
const MAX_BUBBLES = 14;
const POP_GOAL = 5;

export class BathScene extends SceneBase {
  constructor(engine) {
    super(engine, 'bath', DISCOVERIES, { source: 'flash', spread: 0.08 });
    this.bubbles = []; // {x,y,r,vx,vy,shine,hue,wob}
    this.mirror = { x: 0, y: 0, rot: 0.5, len: 150 };
    this.duck = { x: 0, y: 0, glow: 0, phase: 0 };
    this.poppedCount = 0;
    this.ceilingGlow = 0;
    this.waterLit = false;
    this.steamRainbow = false;
    this.layout(engine.W, engine.H);
  }

  layout(W, H) {
    const portrait = H > W;
    this.waterY = portrait ? H * 0.72 : H * 0.68;
    this.rig.lightX = W * 0.14;
    this.rig.lightY = H * 0.24;
    this.rig.prismX = portrait ? W * 0.5 : W * 0.42;
    this.rig.prismY = H * 0.44;
    this.mirror.x = portrait ? W * 0.84 : W * 0.86;
    this.mirror.y = H * 0.32;
    this.duck.x = W * 0.62;
    this.duck.y = this.waterY;
  }

  pickObject(x, y) {
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      if (dist(x, y, b.x, b.y) < b.r + 16) return { kind: 'bubble', b };
    }
    if (dist(x, y, this.mirror.x, this.mirror.y) < 90) return this.mirror;
    if (dist(x, y, this.duck.x, this.duck.y) < 70) return { kind: 'duck' };
    return null;
  }

  objectDown(obj) {
    if (obj.kind === 'bubble') {
      this._popBubble(obj.b);
    } else if (obj.kind === 'duck') {
      audio.quack();
      this.duck.glow = 1;
      this.engine.particles.ring(this.duck.x, this.duck.y, '#ffe066', 30);
    } else {
      audio.tap();
    }
  }

  objectMove(obj, p) {
    const { W, H } = this.engine;
    if (obj === this.mirror) {
      this.mirror.x = clamp(p.x, 60, W - 60);
      this.mirror.y = clamp(p.y, 80, H - 80);
      this.mirror.rot += (p.dx ?? 0) * 0.008;
    }
  }

  // 水面より上をタップ→シャボン玉、水面下→泡ぶくぶく
  canvasDown(p) {
    if (p.y < this.waterY) {
      this._blowBubble(p.x, p.y);
    } else {
      audio.bubble();
      for (let i = 0; i < 5; i++) {
        this._spawnTinyBubble(p.x + rand(-20, 20), p.y);
      }
    }
  }

  _blowBubble(x, y) {
    if (this.bubbles.length > MAX_BUBBLES) this.bubbles.shift();
    audio.bubble();
    this.bubbles.push({
      x, y, r: rand(24, 44),
      vx: rand(-14, 14), vy: rand(-26, -10),
      shine: 0, hue: rand(0, 360), wob: rand(0, TAU),
    });
  }

  _spawnTinyBubble(x, y) {
    this.engine.particles.spawn({
      x, y, vx: rand(-10, 10), vy: rand(-70, -35),
      life: rand(0.7, 1.6), maxLife: 1.6, size: rand(3, 8),
      hex: '#cfeeff', shape: 'ring',
    });
  }

  _popBubble(b) {
    const i = this.bubbles.indexOf(b);
    if (i >= 0) this.bubbles.splice(i, 1);
    audio.pop();
    this.engine.particles.burst(b.x, b.y, RAINBOW[(Math.random() * 7) | 0].hex, 14, 130);
    this.engine.particles.ring(b.x, b.y, '#ffffff', b.r);
    this.poppedCount++;
    if (this.poppedCount >= POP_GOAL) {
      this.discover('pop-5', 'あわ ぱちぱち めいじん!', '#8ee3f7', b.x, b.y);
    }
  }

  // 長押しダンス: アヒルがぴょんぴょんはねる
  objectDance(obj) {
    if (obj.kind === 'duck') {
      this.duck.jump = 1;
      audio.quack();
      setTimeout(() => audio.quack(), 220);
    } else if (obj === this.mirror) {
      this.engine.particles.burst(this.mirror.x, this.mirror.y, '#dff3ff', 12, 100);
    }
  }

  extraHints() {
    return [
      { x: this.duck.x, y: this.duck.y - 20 },
      { x: this.mirror.x, y: this.mirror.y },
    ];
  }

  sceneUpdate(dt) {
    this.rig.mirrors.push(mirrorSegment(this.mirror));
    this.duck.jump = Math.max(0, (this.duck.jump ?? 0) - dt * 0.9);
    this.duck.phase += dt;
    this.duck.x += Math.sin(this.duck.phase * 0.4) * 10 * dt;
    this.duck.y = this.waterY + Math.sin(this.duck.phase * 1.8) * 5;
    this.duck.glow = Math.max(0, this.duck.glow - dt * 0.8);

    this._updateBubbles(dt);
    this._updateSteam(dt);
    this._checkHits(dt);
  }

  _updateBubbles(dt) {
    const { W } = this.engine;
    for (let i = this.bubbles.length - 1; i >= 0; i--) {
      const b = this.bubbles[i];
      b.wob += dt * 2;
      b.x += (b.vx + Math.sin(b.wob) * 14) * dt;
      b.y += b.vy * dt;
      b.vy -= 3 * dt; // ふわふわ上へ
      b.shine = Math.max(0, b.shine - dt * 1.2);
      const hits = this.rig.colorsAt(b.x, b.y, b.r);
      if (hits.length > 0) {
        b.shine = Math.min(1, b.shine + dt * 3);
        if (Math.random() < dt * 3) this.colorJoy(hits[0], b.x, b.y);
        if (b.shine > 0.7) {
          this.discover('bubble-shine', 'シャボンだまが にじいろ!', '#c07dff', b.x, b.y);
        }
      }
      if (b.y < -60 || b.x < -60 || b.x > W + 60) this.bubbles.splice(i, 1);
    }
  }

  _updateSteam(dt) {
    const { W } = this.engine;
    // 湯気パーティクル
    if (Math.random() < dt * 8) {
      this.engine.particles.mist(rand(W * 0.1, W * 0.9), this.waterY - 8, '#ffffff', rand(26, 55));
    }
    // 湯気ゾーン(水面上の帯)に虹が通ると、ぼんやり虹
    const zoneY = this.waterY - 70;
    const hits = this.rig.colorsAt(W * 0.5, zoneY, W * 0.4);
    this.steamRainbow = hits.length >= 4;
    if (this.steamRainbow) {
      this.discover('steam-rainbow', 'ゆげのなかに にじ!', '#6fd8ff', W * 0.5, zoneY);
    }
  }

  _checkHits(dt) {
    const { W, H } = this.engine;
    // アヒル: きいろが当たるとピカッ
    const duckHits = this.rig.colorsAt(this.duck.x, this.duck.y, 44);
    if (duckHits.includes(YELLOW)) {
      this.duck.glow = 1;
      if (Math.random() < dt * 1.6) audio.quack();
      if (Math.random() < dt * 5) this.colorJoy(YELLOW, this.duck.x, this.duck.y - 30);
      this.discover('duck-glow', 'アヒルさん ぴかー!', '#ffe066', this.duck.x, this.duck.y - 40);
    }
    // 鏡反射で天井へ
    for (const ray of this.rig.rays) {
      if (ray.segs.length > 1) {
        const last = ray.segs[ray.segs.length - 1];
        if (Math.min(last.y1, last.y2) < H * 0.08) {
          this.ceilingGlow = Math.min(1, this.ceilingGlow + dt * 2);
          this.discover('mirror-bounce', 'かがみで ぴょーん!', '#ff9ecd', W / 2, 70);
        }
      }
    }
    this.ceilingGlow = Math.max(0, this.ceilingGlow - dt * 0.5);
    // 水面に虹 → 天井ゆらゆら
    const waterHits = this.rig.colorsAt(W * 0.5, this.waterY + 20, W * 0.45);
    this.waterLit = waterHits.length > 0;
    if (this.waterLit) {
      this.discover('water-caustics', 'てんじょうが ゆらゆら!', '#8ee3f7', W / 2, 60);
    }
  }

  // ---- 描画 ----

  drawBackground(ctx) {
    drawBathBackground(ctx, this);
  }

  drawBehindLight(ctx) {
    drawBathWater(ctx, this);
    drawDuck(ctx, this);
  }

  drawFrontOfLight(ctx) {
    drawHandMirror(ctx, this.mirror, this.time);
    for (const b of this.bubbles) drawBubble(ctx, b, this.time);
    if (this.steamRainbow) drawSteamRainbow(ctx, this);
  }
}
