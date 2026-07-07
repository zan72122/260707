// シーン3: にじいろドレスこうぼう
// 白いドレスを虹の光で染める。しましまも、まるい模様も自由自在

import { SceneBase } from './scene_base.js';
import { drawHandMirror, mirrorSegment } from './props.js';
import { drawAtelierBackground, drawDress, drawFan } from './dress_view.js';
import { RAINBOW, clamp, dist, rand } from '../core/utils.js';
import { audio } from '../core/audio.js';

const DISCOVERIES = 6;
const COLS = 9;
const ROWS = 12;
const STRIPE_CHANGES_NEEDED = 3;

export class DressScene extends SceneBase {
  constructor(engine) {
    super(engine, 'dress', DISCOVERIES, { sunMode: false, spread: 0.07 });
    // ドレスの染色セル
    this.cells = [];
    for (let r = 0; r < ROWS; r++) {
      for (let c = 0; c < COLS; c++) {
        this.cells.push({ c, r, ci: -1, amt: 0 });
      }
    }
    this.ribbon = { ci: -1, amt: 0 };
    this.gems = [];
    this.mirror = { x: 0, y: 0, rot: -0.5, len: 140 };
    this.gust = 0;
    this.fan = { x: 0, y: 0 };
    this.layout(engine.W, engine.H);
  }

  layout(W, H) {
    const portrait = H > W;
    this.dress = {
      x: portrait ? W * 0.5 : W * 0.68,
      y: portrait ? H * 0.56 : H * 0.52,
      w: Math.min(W, H) * (portrait ? 0.52 : 0.42),
      h: Math.min(W, H) * (portrait ? 0.62 : 0.56),
    };
    this.rig.lightX = W * 0.12;
    this.rig.lightY = H * 0.2;
    this.rig.prismX = portrait ? W * 0.26 : W * 0.32;
    this.rig.prismY = portrait ? H * 0.36 : H * 0.42;
    this.mirror.x = portrait ? W * 0.85 : W * 0.9;
    this.mirror.y = H * 0.2;
    this.fan.x = portrait ? W * 0.14 : W * 0.12;
    this.fan.y = H * 0.85;
    this.gems = [0, 1, 2].map((i) => ({
      x: this.dress.x + (i - 1) * this.dress.w * 0.16,
      y: this.dress.y - this.dress.h * 0.18,
      r: 9,
      lit: 0,
    }));
  }

  // ドレスのセル中心座標
  _cellPos(cell) {
    const d = this.dress;
    const ty = cell.r / (ROWS - 1);
    const width = d.w * (0.3 + ty * 0.7); // スカートは下ほど広い
    const x = d.x + (cell.c / (COLS - 1) - 0.5) * width;
    const y = d.y - d.h * 0.42 + ty * d.h * 0.86;
    return { x, y };
  }

  pickObject(x, y) {
    if (dist(x, y, this.mirror.x, this.mirror.y) < 85) return this.mirror;
    if (dist(x, y, this.fan.x, this.fan.y) < 70) return { kind: 'fan' };
    return null;
  }

  objectDown(obj) {
    if (obj.kind === 'fan') {
      this.gust = 1;
      audio.whoosh();
      const dyed = this.cells.some((c) => c.amt > 0.4);
      if (dyed) {
        this.discover('wind', 'ドレスが ふわ〜り!', '#9fe8a0', this.dress.x, this.dress.y);
      }
      for (let i = 0; i < 12; i++) {
        this.engine.particles.streak(this.fan.x + 40, this.fan.y + rand(-30, 30), rand(-0.5, 0.2), '#dff6ff');
      }
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

  sceneUpdate(dt) {
    this.rig.mirrors = [mirrorSegment(this.mirror)];
    this.gust = Math.max(0, this.gust - dt * 0.5);
    this._dye(dt);
    this._checkPatterns();
    this._updateRibbonAndGems(dt);
  }

  _dye(dt) {
    let dyedNow = false;
    for (const cell of this.cells) {
      const { x, y } = this._cellPos(cell);
      const hits = this.rig.colorsAt(x, y, 16);
      if (hits.length === 0) continue;
      const ci = hits[(Math.random() * hits.length) | 0];
      if (cell.ci !== ci && cell.amt > 0.5) cell.amt = 0.5; // 塗り替えは少し薄めから
      cell.ci = ci;
      cell.amt = Math.min(1, cell.amt + dt * 1.4);
      dyedNow = true;
      if (Math.random() < dt * 1.6) this.colorJoy(ci, x + rand(-8, 8), y + rand(-8, 8));
      if (cell.amt > 0.6) {
        this.discover('first-dye', 'ドレスが そまった!', RAINBOW[ci].hex, x, y);
      }
    }
    if (dyedNow && Math.random() < dt * 4) audio.sparkle();
  }

  _checkPatterns() {
    // しましま: 隣り合う列が違う色でよく染まっている
    const colColor = [];
    for (let c = 0; c < COLS; c++) {
      const counts = new Map();
      let dyed = 0;
      for (let r = 0; r < ROWS; r++) {
        const cell = this.cells[r * COLS + c];
        if (cell.amt > 0.55 && cell.ci >= 0) {
          dyed++;
          counts.set(cell.ci, (counts.get(cell.ci) || 0) + 1);
        }
      }
      let best = -1;
      let bestN = 0;
      for (const [ci, n] of counts) {
        if (n > bestN) { best = ci; bestN = n; }
      }
      colColor.push(dyed >= ROWS * 0.55 && bestN >= dyed * 0.7 ? best : -1);
    }
    let changes = 0;
    for (let c = 1; c < COLS; c++) {
      if (colColor[c] >= 0 && colColor[c - 1] >= 0 && colColor[c] !== colColor[c - 1]) changes++;
    }
    if (changes >= STRIPE_CHANGES_NEEDED) {
      this.discover('stripes', 'しましま ドレス!', '#ffa8d3', this.dress.x, this.dress.y);
    }
    // ぜんぶ染まった
    if (this.cells.every((cell) => cell.amt > 0.5)) {
      this.discover('full-dress', 'にじいろドレス かんせい!', '#c07dff', this.dress.x, this.dress.y - 60);
    }
  }

  _updateRibbonAndGems(dt) {
    const d = this.dress;
    // リボン(胸元)
    const rx = d.x;
    const ry = d.y - d.h * 0.34;
    const hits = this.rig.colorsAt(rx, ry, 26);
    if (hits.length > 0) {
      this.ribbon.ci = hits[0];
      this.ribbon.amt = Math.min(1, this.ribbon.amt + dt * 1.4);
      if (this.ribbon.amt > 0.6) {
        this.discover('ribbon', 'リボンに いろが ついた!', RAINBOW[hits[0]].hex, rx, ry);
      }
    }
    // ガラスの宝石
    for (const g of this.gems) {
      const gh = this.rig.colorsAt(g.x, g.y, 18);
      g.lit = Math.max(0, g.lit - dt);
      if (gh.length > 0) {
        g.lit = 1;
        if (Math.random() < dt * 4) this.engine.particles.twinkle(g.x, g.y, RAINBOW[gh[0]].hex, 6);
        this.discover('gems', 'ほうせきが きらーん!', '#6fd8ff', g.x, g.y);
      }
    }
  }

  // ---- 描画 ----

  drawBackground(ctx) {
    drawAtelierBackground(ctx, this);
  }

  drawBehindLight(ctx) {
    drawDress(ctx, this, ROWS, COLS);
  }

  drawFrontOfLight(ctx) {
    drawHandMirror(ctx, this.mirror, this.time);
    drawFan(ctx, this);
  }
}
