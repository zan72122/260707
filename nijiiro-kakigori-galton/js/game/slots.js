// 仕切り付きスロット: 玉が柱として積もり、分布(おやまのかたち)が現れる
// なぞり光の見せ場・ぷるんと弾む柱・金の玉のフラッシュ・食べる演出もここ
import { TAU, clamp, rand } from '../core/utils.js';
import { drawGrain } from '../render/grain.js';

const RIDGE_DURATION = 1.9;   // なぞり光が横断する秒数

export class Slots {
  constructor() {
    this.records = [];        // スロットごとの積み上げ [{hue,kind,golden}]
    this.L = null;
    this.dpr = 1;
    this.canvas = document.createElement('canvas');
    this.octx = this.canvas.getContext('2d');
    this.bounce = [];         // 柱のぷるん(スケール速度と値)
    this.bounceV = [];
    this.flash = [];          // 金の玉が入った時の光
    this.ridge = null;        // なぞり光の状態
    this.onRidgeSlot = null;  // (slot, height01) => void
    this.onRidgeDone = null;
  }

  setLayout(L, dpr) {
    this.L = L;
    this.dpr = Math.min(dpr, 2);
    if (this.records.length !== L.nSlots) {
      this.records = Array.from({ length: L.nSlots }, () => []);
    }
    const d = L.ballR * 2;
    this.rowH = d * 0.87;
    this.perRow = Math.max(2, Math.floor(L.slotW / (d * 1.05)));
    this.bakeTop = L.pinTop;  // あふれた分もピンの森まで描けるようにする
    this.canvas.width = Math.round(L.boardW * this.dpr);
    this.canvas.height = Math.round((L.iceY - this.bakeTop) * this.dpr);
    this.octx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this.bounce = new Array(L.nSlots).fill(0);
    this.bounceV = new Array(L.nSlots).fill(0);
    this.flash = new Array(L.nSlots).fill(0);
    this._rebake();
  }

  reset() {
    for (const arr of this.records) arr.length = 0;
    this.ridge = null;
    this._rebake();
  }

  total() {
    let n = 0;
    for (const arr of this.records) n += arr.length;
    return n;
  }

  // だいたい何個で「できあがり」にするか。
  // 中央の柱が満ちる頃(=釣鐘型がいちばん綺麗に見える量)を狙う
  targetCount() {
    const rows = (this.L.iceY - this.L.slotTop) / this.rowH;
    return Math.round(clamp(rows * this.perRow * this.L.nSlots * 0.5, 170, 340));
  }

  floorY(slot) {
    return this.L.iceY - (this.records[slot].length / this.perRow) * this.rowH;
  }

  topY(slot) {
    return this.floorY(slot);
  }

  add(slot, rec) {
    // スロットが仕切りの上まで満杯なら、砂山のように低い隣へ転がす
    for (let k = 0; k < 8; k++) {
      const fy = this.floorY(slot);
      if (fy > this.L.slotTop + this.L.ballR) break;
      const fl = slot > 0 ? this.floorY(slot - 1) : -Infinity;
      const fr = slot < this.L.nSlots - 1 ? this.floorY(slot + 1) : -Infinity;
      if (fl > fy + this.rowH * 0.5 && fl >= fr) slot -= 1;
      else if (fr > fy + this.rowH * 0.5) slot += 1;
      else break;
    }
    const idx = this.records[slot].length;
    this.records[slot].push(rec);
    const p = this._pos(slot, idx);
    this._bake(rec, p);
    return p;
  }

  flashSlot(slot) {
    this.flash[slot] = 1;
  }

  startRidge() {
    this.ridge = { u: -0.08, fired: new Array(this.L.nSlots).fill(false) };
  }

  get ridgeActive() { return !!this.ridge; }

  _pos(slot, idx) {
    const L = this.L;
    const row = (idx / this.perRow) | 0;
    const col = idx % this.perRow;
    const jitter = (((idx * 733 + slot * 131) % 89) / 89 - 0.5) * L.ballR * 0.4;
    const inner = L.slotW - L.ballR * 2 - 3;
    const x = L.slotX(slot) + L.ballR + 1.5 + ((col + (row % 2) * 0.5 + 0.5) / this.perRow) * inner + jitter * 0.5;
    const y = L.iceY - (row + 0.5) * this.rowH;
    return { x: clamp(x, L.slotX(slot) + L.ballR, L.slotX(slot) + L.slotW - L.ballR), y };
  }

  _bake(rec, p) {
    const L = this.L;
    drawGrain(
      this.octx,
      p.x - L.boardX, p.y - this.bakeTop,
      L.ballR, rec.hue,
      rec.golden ? 'gold' : rec.kind,
      (p.x * 13) % TAU, p.y * 0.05,
    );
  }

  _rebake() {
    if (!this.L) return;
    // dprが1未満の環境でも全域が消えるよう、変換をリセットして消去する
    this.octx.save();
    this.octx.setTransform(1, 0, 0, 1, 0, 0);
    this.octx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.octx.restore();
    for (let s = 0; s < this.records.length; s++) {
      this.records[s].forEach((rec, idx) => this._bake(rec, this._pos(s, idx)));
    }
  }

  update(dt) {
    const L = this.L;
    // 柱のぷるん(ばね)
    for (let i = 0; i < L.nSlots; i++) {
      this.bounceV[i] += -this.bounce[i] * 180 * dt - this.bounceV[i] * 8 * dt;
      this.bounce[i] += this.bounceV[i] * dt;
      this.flash[i] = Math.max(0, this.flash[i] - dt * 1.3);
    }
    // なぞり光の進行
    if (this.ridge) {
      this.ridge.u += dt / RIDGE_DURATION;
      const maxH = Math.max(1, L.iceY - Math.min(...this.records.map((_, i) => this.floorY(i))));
      for (let i = 0; i < L.nSlots; i++) {
        const su = (i + 0.5) / L.nSlots;
        if (!this.ridge.fired[i] && this.ridge.u >= su) {
          this.ridge.fired[i] = true;
          this.bounceV[i] = -3.2;
          const h01 = (L.iceY - this.floorY(i)) / maxH;
          if (this.onRidgeSlot) this.onRidgeSlot(i, h01);
        }
      }
      if (this.ridge.u > 1.15) {
        this.ridge = null;
        if (this.onRidgeDone) this.onRidgeDone();
      }
    }
  }

  draw(ctx, t) {
    const L = this.L;
    const srcH = this.canvas.height;
    // スロットごとに縦スケールをかけて「ぷるん」を表現
    for (let i = 0; i < L.nSlots; i++) {
      const sY = 1 + this.bounce[i];
      const sx = (L.slotX(i) - L.boardX) * this.dpr;
      const sw = L.slotW * this.dpr;
      ctx.save();
      ctx.translate(L.slotX(i), L.iceY);
      ctx.scale(1, sY);
      ctx.drawImage(this.canvas, sx, 0, sw, srcH, 0, -(L.iceY - this.bakeTop), L.slotW, L.iceY - this.bakeTop);
      ctx.restore();
      // 金の玉フラッシュ
      if (this.flash[i] > 0.02) {
        const fh = L.iceY - this.floorY(i) + 20;
        const g = ctx.createLinearGradient(0, L.iceY - fh, 0, L.iceY);
        g.addColorStop(0, `rgba(255,240,140,0)`);
        g.addColorStop(0.5, `rgba(255,235,120,${this.flash[i] * 0.55})`);
        g.addColorStop(1, `rgba(255,250,200,${this.flash[i] * 0.3})`);
        ctx.fillStyle = g;
        ctx.fillRect(L.slotX(i) + 1, L.iceY - fh, L.slotW - 2, fh);
      }
    }
    if (this.ridge) this._drawComet(ctx, t);
  }

  _drawComet(ctx, t) {
    const L = this.L;
    const u = clamp(this.ridge.u, 0, 1);
    const x = L.boardX + u * L.boardW;
    const slot = clamp((u * L.nSlots) | 0, 0, L.nSlots - 1);
    const y = this.floorY(slot) - L.ballR * 1.6;
    const r = L.slotW * 0.8;
    const g = ctx.createRadialGradient(x, y, 0, x, y, r);
    g.addColorStop(0, 'rgba(255,255,255,0.95)');
    g.addColorStop(0.25, `hsla(${(t * 200) % 360} 90% 75% / 0.7)`);
    g.addColorStop(1, 'rgba(255,255,255,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(x, y, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.arc(x, y, L.ballR * 0.9, 0, TAU);
    ctx.fill();
  }

  // 食べる演出: 高い柱から順に上の玉を消す。消した場所を返す
  eatBite(n) {
    if (this.total() === 0) return null;
    const removed = [];
    for (let k = 0; k < n; k++) {
      let best = -1, bestY = Infinity;
      for (let i = 0; i < this.records.length; i++) {
        if (this.records[i].length === 0) continue;
        const y = this.floorY(i);
        if (y < bestY) { bestY = y; best = i; }
      }
      if (best < 0) break;
      const idx = this.records[best].length - 1;
      const p = this._pos(best, idx);
      const rec = this.records[best].pop();
      removed.push({ x: p.x, y: p.y, hue: rec.hue });
      this.bounceV[best] = -1.6;
    }
    this._rebake();
    return removed;
  }
}
