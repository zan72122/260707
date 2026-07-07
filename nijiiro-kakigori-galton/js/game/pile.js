// かき氷の上に積もる粒の山(ヒストグラム状に蓄積される)
import { clamp, rand, TAU } from '../core/utils.js';
import { drawGrain } from './board.js';

const SPILL_TOL = 2.2;   // 隣の列よりこれだけ(粒何個分)高いと崩れる
const LAYERS_TO_FULL = 6.5; // 平均何段積もったら「できあがり」か

export class Pile {
  constructor() {
    this.grains = [];   // { u, hue, kind, rs, jx, jy, rot }
    this.heights = [];  // 列ごとの積み上げ高さ(px)
    this.L = null;
    this.ncol = 0;
    this.colW = 0;
    this.canvas = document.createElement('canvas');
    this.octx = this.canvas.getContext('2d');
    this.dpr = 1;
  }

  setLayout(L, dpr) {
    this.L = L;
    this.dpr = Math.min(dpr, 2);
    this.colW = L.grainR * 1.35;
    this.ncol = Math.max(8, Math.round(L.bowlW / this.colW));
    this.colW = L.bowlW / this.ncol;
    this.canvas.width = Math.round(L.w * this.dpr);
    this.canvas.height = Math.round(L.h * this.dpr);
    this.octx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._rebuild();
  }

  reset() {
    this.grains = [];
    this.heights = new Array(this.ncol).fill(0);
    this.octx.clearRect(0, 0, this.L.w, this.L.h);
  }

  // 氷の山の表面(粒が積もる土台)のY座標
  groundAt(u) {
    const L = this.L;
    const domeH = L.rimY - L.iceTop;
    const uu = clamp(u, 0, 1);
    const profile = Math.pow(Math.max(0, Math.cos((uu - 0.5) * Math.PI)), 0.75);
    return L.rimY - domeH * profile;
  }

  colOf(x) {
    const u = (x - (this.L.bowlCx - this.L.bowlW / 2)) / this.L.bowlW;
    return clamp(Math.floor(u * this.ncol), 0, this.ncol - 1);
  }

  surfaceAt(x) {
    const col = this.colOf(x);
    const u = (col + 0.5) / this.ncol;
    return this.groundAt(u) - this.heights[col];
  }

  // 粒を山に固定する。戻り値は描画位置
  addGrain(x, hue, kind, rs = 1) {
    let col = this.colOf(x);
    // 砂山のように、高すぎる列は低い隣へ転がり落ちる
    for (let k = 0; k < 6; k++) {
      const hl = col > 0 ? this.heights[col - 1] : Infinity;
      const hr = col < this.ncol - 1 ? this.heights[col + 1] : Infinity;
      const tol = this.L.grainR * SPILL_TOL;
      if (this.heights[col] - hl > tol && hl <= hr) col -= 1;
      else if (this.heights[col] - hr > tol) col += 1;
      else break;
    }
    const grain = {
      u: (col + 0.5) / this.ncol,
      stackH: this.heights[col],
      hue, kind, rs,
      jx: rand(-0.25, 0.25), jy: rand(-0.1, 0.1),
      rot: rand(0, TAU),
    };
    this.heights[col] += this.L.grainR * 1.55 * (kind ? rs * 0.9 : 1);
    this.grains.push(grain);
    const pos = this._grainPos(grain);
    this._paint(grain, pos);
    return pos;
  }

  _grainPos(g) {
    const L = this.L;
    const x = L.bowlCx - L.bowlW / 2 + g.u * L.bowlW + g.jx * this.colW;
    const y = this.groundAt(g.u) - g.stackH - L.grainR * 0.8 + g.jy * L.grainR;
    return { x, y };
  }

  _paint(g, pos) {
    drawGrain(this.octx, pos.x, pos.y, this.L.grainR * g.rs, g.hue, g.kind, g.rot, g.rot);
  }

  // リサイズ時: 記録した粒を並べ直して山を再構築
  _rebuild() {
    const old = this.grains;
    this.reset();
    for (const g of old) {
      const col = clamp(Math.floor(g.u * this.ncol), 0, this.ncol - 1);
      g.u = (col + 0.5) / this.ncol;
      g.stackH = this.heights[col];
      this.heights[col] += this.L.grainR * 1.55 * (g.kind ? g.rs * 0.9 : 1);
      this.grains.push(g);
      this._paint(g, this._grainPos(g));
    }
  }

  // 0..1 のできあがり度
  fillRatio() {
    if (this.ncol === 0) return 0;
    let sum = 0;
    // 中央寄りの列を重視して平均
    const lo = Math.floor(this.ncol * 0.15), hi = Math.ceil(this.ncol * 0.85);
    for (let i = lo; i < hi; i++) sum += this.heights[i];
    const avg = sum / (hi - lo);
    return clamp(avg / (this.L.grainR * 1.55 * LAYERS_TO_FULL), 0, 1);
  }

  draw(ctx) {
    ctx.drawImage(this.canvas, 0, 0, this.L.w, this.L.h);
  }

  // 食べる演出用: 上から順に粒を消す。消した粒の位置を返す
  eatBite(n = 14) {
    if (this.grains.length === 0) return null;
    // 一番高い場所の粒からn個消す
    const removed = [];
    for (let k = 0; k < n && this.grains.length > 0; k++) {
      let best = -1, bestY = Infinity;
      // 後ろの方(新しい粒=上に載っている)から探す
      const scan = Math.min(this.grains.length, 60);
      for (let i = this.grains.length - 1; i >= this.grains.length - scan; i--) {
        const pos = this._grainPos(this.grains[i]);
        if (pos.y < bestY) { bestY = pos.y; best = i; }
      }
      if (best < 0) break;
      const g = this.grains.splice(best, 1)[0];
      const col = clamp(Math.floor(g.u * this.ncol), 0, this.ncol - 1);
      this.heights[col] = Math.max(0, this.heights[col] - this.L.grainR * 1.55 * (g.kind ? g.rs * 0.9 : 1));
      removed.push({ ...this._grainPos(g), hue: g.hue });
    }
    // 山を描き直す
    const remain = this.grains;
    this.grains = [];
    this.octx.clearRect(0, 0, this.L.w, this.L.h);
    const heights = new Array(this.ncol).fill(0);
    this.heights = heights;
    for (const g of remain) {
      const col = clamp(Math.floor(g.u * this.ncol), 0, this.ncol - 1);
      g.stackH = heights[col];
      heights[col] += this.L.grainR * 1.55 * (g.kind ? g.rs * 0.9 : 1);
      this.grains.push(g);
      this._paint(g, this._grainPos(g));
    }
    return removed;
  }
}
