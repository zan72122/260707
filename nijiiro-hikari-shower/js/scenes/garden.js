// シーン4: あめあがりの にわ
// 水たまり・しずく・つぼみ・てんとうむし・霧吹きで虹あそび

import { SceneBase } from './scene_base.js';
import { drawFlower, drawSprayBottle } from './props.js';
import { drawGardenBackground, drawLeafDrops, drawMistRainbows, drawBug } from './garden_view.js';
import { RAINBOW, clamp, dist, rand } from '../core/utils.js';
import { audio } from '../core/audio.js';

const DISCOVERIES = 6;
const MIST_LIFETIME = 3.2;

export class GardenScene extends SceneBase {
  constructor(engine) {
    super(engine, 'garden', DISCOVERIES, { sunMode: true, spread: 0.085 });
    this.flowers = [];
    this.drops = [];
    this.mistClouds = []; // {x,y,t,rainbow}
    this.spray = { x: 0, y: 0, size: 52, squeeze: 0 };
    this.bug = { x: 0, y: 0, angle: 0, walkT: 0.2, visible: false };
    this.puddleGlow = 0;
    this.layout(engine.W, engine.H);
  }

  layout(W, H) {
    const portrait = H > W;
    this.groundY = H * 0.66;
    this.rig.lightX = W * 0.2;
    this.rig.lightY = H * 0.14;
    this.rig.prismX = portrait ? W * 0.5 : W * 0.42;
    this.rig.prismY = portrait ? H * 0.42 : H * 0.4;
    this.puddle = { x: portrait ? W * 0.5 : W * 0.62, y: H * 0.84, w: Math.min(W, H) * 0.4, h: Math.min(W, H) * 0.1 };
    this.spray.x = portrait ? W * 0.87 : W * 0.9;
    this.spray.y = H * 0.72;
    if (this.flowers.length === 0) {
      const xs = portrait ? [0.12, 0.3, 0.72, 0.9] : [0.08, 0.2, 0.82, 0.93];
      this.flowers = xs.map((fx, i) => ({
        x: W * fx,
        y: this.groundY + 10 + (i % 2) * 24,
        size: rand(26, 34),
        petals: new Array(6).fill(null),
        tint: new Array(6).fill(0),
        bloom: 0.12,
        glow: 0,
      }));
      for (let i = 0; i < 6; i++) {
        this.drops.push({
          x: W * rand(0.1, 0.9),
          y: this.groundY - rand(30, H * 0.28),
          r: rand(5, 9),
          lit: 0,
          leafRot: rand(-0.6, 0.6),
        });
      }
    } else {
      // 画面回転時は高さだけ再配置
      this.flowers.forEach((f, i) => { f.y = this.groundY + 10 + (i % 2) * 24; });
    }
  }

  pickObject(x, y) {
    if (dist(x, y, this.spray.x, this.spray.y) < 70) return { kind: 'spray' };
    for (const f of this.flowers) {
      if (dist(x, y, f.x, f.y) < 50) return { kind: 'flower', f };
    }
    return null;
  }

  objectDown(obj, p) {
    if (obj.kind === 'spray') {
      this._doSpray();
    } else if (obj.kind === 'flower') {
      audio.bloom();
      this.engine.particles.ring(obj.f.x, obj.f.y, '#ffffff', 26);
    }
  }

  objectMove(obj, p) {
    if (obj.kind === 'spray') {
      const { W, H } = this.engine;
      this.spray.x = clamp(p.x, 40, W - 40);
      this.spray.y = clamp(p.y, 80, H - 60);
    }
  }

  _doSpray() {
    audio.spray();
    this.spray.squeeze = 1;
    const mx = this.spray.x - 60;
    const my = this.spray.y - 40;
    this.mistClouds.push({ x: mx, y: my, t: 0, rainbow: 0 });
    for (let i = 0; i < 16; i++) {
      this.engine.particles.mist(mx + rand(-40, 20), my + rand(-30, 30), '#eafaff', rand(14, 30));
    }
  }

  sceneUpdate(dt) {
    this.spray.squeeze = Math.max(0, this.spray.squeeze - dt * 4);
    this._updateFlowers(dt);
    this._updateDrops(dt);
    this._updateMist(dt);
    this._updatePuddle(dt);
    this._updateBug(dt);
  }

  _updateFlowers(dt) {
    let bloomed = 0;
    for (const f of this.flowers) {
      f.glow = Math.max(0, f.glow - dt);
      const hits = this.rig.colorsAt(f.x, f.y, 42);
      for (const ci of hits) {
        const idx = ci % f.petals.length;
        f.petals[idx] = RAINBOW[ci].hex;
        f.tint[idx] = Math.min(1, f.tint[idx] + dt * 0.7);
        const before = f.bloom;
        f.bloom = Math.min(1, f.bloom + dt * 0.4);
        f.glow = 0.5;
        if (before < 0.95 && f.bloom >= 0.95) {
          audio.bloom();
          this.engine.particles.burst(f.x, f.y, RAINBOW[ci].hex, 14, 110);
          this.discover('bloom', 'おはなが さいた!', RAINBOW[ci].hex, f.x, f.y);
        }
        if (Math.random() < dt * 4) this.colorJoy(ci, f.x + rand(-16, 16), f.y + rand(-16, 16));
      }
      if (f.bloom >= 0.95) bloomed++;
    }
    if (bloomed === this.flowers.length && this.flowers.length > 0) {
      this.discover('bloom-all', 'おにわが まんかい!', '#ff8fb3', this.engine.W / 2, this.groundY - 40);
    }
  }

  _updateDrops(dt) {
    for (const d of this.drops) {
      d.lit = Math.max(0, d.lit - dt * 1.5);
      const hits = this.rig.colorsAt(d.x, d.y, d.r + 14);
      if (hits.length > 0) {
        d.lit = 1;
        if (Math.random() < dt * 5) this.engine.particles.twinkle(d.x, d.y, RAINBOW[hits[0]].hex, 4);
        this.discover('drop-sparkle', 'しずくの なかに にじ!', '#6fd8ff', d.x, d.y);
      }
    }
  }

  _updateMist(dt) {
    for (let i = this.mistClouds.length - 1; i >= 0; i--) {
      const m = this.mistClouds[i];
      m.t += dt;
      if (m.t > MIST_LIFETIME) {
        this.mistClouds.splice(i, 1);
        continue;
      }
      // 霧に虹の光か白い光が通ると、空中にミニ虹が生まれる
      const hits = this.rig.colorsAt(m.x, m.y, 70);
      const beamNear = dist(m.x, m.y, this.rig.prismX, this.rig.prismY) < 220;
      if (hits.length >= 2 || beamNear) {
        m.rainbow = Math.min(1, m.rainbow + dt * 2);
        this.discover('mist-rainbow', 'くうきに ちいさな にじ!', '#c07dff', m.x, m.y);
      }
    }
  }

  _updatePuddle(dt) {
    const p = this.puddle;
    const hits = this.rig.colorsAt(p.x, p.y, p.w * 0.5);
    if (hits.length >= 3) {
      this.puddleGlow = Math.min(1, this.puddleGlow + dt * 1.6);
      if (this.puddleGlow > 0.7) {
        this.discover('puddle', 'みずたまりに にじ!', '#8ee3f7', p.x, p.y - 60);
      }
    } else {
      this.puddleGlow = Math.max(0, this.puddleGlow - dt);
    }
  }

  // てんとうむしが虹の帯の上をよちよち歩く
  _updateBug(dt) {
    const mid = this.rig.rays[3];
    if (!mid || !mid.segs.length) return;
    const seg = mid.segs[0];
    this.bug.walkT += dt * 0.07;
    if (this.bug.walkT > 0.85) this.bug.walkT = 0.12;
    const t = this.bug.walkT;
    const x = seg.x1 + (seg.x2 - seg.x1) * t;
    const y = seg.y1 + (seg.y2 - seg.y1) * t;
    const { W, H } = this.engine;
    this.bug.visible = x > 30 && x < W - 30 && y > 60 && y < H - 30;
    this.bug.x = x;
    this.bug.y = y;
    this.bug.angle = Math.atan2(seg.y2 - seg.y1, seg.x2 - seg.x1);
    if (this.bug.visible && Math.random() < dt * 0.6) {
      this.discover('bug-walk', 'むしさんが にじの うえ!', '#ff5a5a', x, y - 30);
    }
  }

  // ---- 描画 ----

  drawBackground(ctx) {
    drawGardenBackground(ctx, this);
  }

  drawBehindLight(ctx) {
    drawLeafDrops(ctx, this);
  }

  drawFrontOfLight(ctx) {
    for (const f of this.flowers) drawFlower(ctx, f, this.time);
    drawMistRainbows(ctx, this);
    drawSprayBottle(ctx, this.spray, this.spray.squeeze);
    if (this.bug.visible) drawBug(ctx, this);
  }
}
