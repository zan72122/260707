// ガラスタンク(ホッパー): シロップを注いでためる。FIFOで下から流れ出る
// → 注いだ順序が保たれるので、山にゆるい色の地層ができる
import { clamp, rand, roundRect } from '../core/utils.js';
import { drawBallFast, drawGrain } from '../render/grain.js';

const HEAP_BALL_SCALE = 0.85;   // タンク内は少し小さめに描いてぎっしり感を出す

export class Hopper {
  constructor() {
    this.queue = [];        // { hue, kind, golden } 先頭がタンクの底
    this.canvas = document.createElement('canvas');
    this.octx = this.canvas.getContext('2d');
    this.L = null;
    this.dpr = 1;
    this.bakeIndex = 0;     // 直近リベイク以降に積んだ数
    this.drained = 0;       // 直近リベイク以降に流れ出た数
    this.capacity = 400;
  }

  setLayout(L, dpr) {
    this.L = L;
    this.dpr = Math.min(dpr, 2);
    const d = L.ballR * 2 * HEAP_BALL_SCALE;
    this.d = d;
    this.rowH = d * 0.88;
    this.perRow = Math.max(4, Math.floor((L.tank.w * 0.94) / (d * 1.02)));
    this.maxRows = Math.max(4, Math.floor((L.tank.h * 0.96) / this.rowH));
    this.capacity = Math.min(500, this.perRow * this.maxRows);
    this.canvas.width = Math.round(L.tank.w * this.dpr);
    this.canvas.height = Math.round((L.tank.h + this.rowH * 3) * this.dpr);
    this.octx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    this._rebake();
  }

  reset() {
    this.queue.length = 0;
    this._rebake();
  }

  count() { return this.queue.length; }
  isFull() { return this.queue.length >= this.capacity; }

  // タンク内の山の一番上のY座標(注ぎ演出の着地点)
  heapTopY() {
    const rows = this.queue.length / this.perRow;
    return this.L.tank.y + this.L.tank.h - rows * this.rowH;
  }

  pour(rec) {
    if (this.isFull()) return false;
    this.queue.push(rec);
    this._bakeAt(rec, this.bakeIndex++);
    return true;
  }

  dequeue() {
    if (this.queue.length === 0) return null;
    const rec = this.queue.shift();
    this.drained++;
    // 空になったら描き残しを消す。沈み込みが大きくなったら描き直す
    if (this.queue.length === 0 || (this.drained / this.perRow) * this.rowH > this.L.tank.h * 1.1) {
      this._rebake();
    }
    return rec;
  }

  _latticePos(i) {
    const row = (i / this.perRow) | 0;
    const col = i % this.perRow;
    const jitter = (((i * 1301) % 97) / 97 - 0.5) * this.d * 0.22;
    const x = this.L.tank.w * 0.03 + (col + (row % 2) * 0.5 + 0.5) * ((this.L.tank.w * 0.94) / this.perRow) + jitter;
    const canvasH = this.canvas.height / this.dpr;
    const y = canvasH - (row + 0.5) * this.rowH - 2;
    return { x: clamp(x, this.d / 2, this.L.tank.w - this.d / 2), y };
  }

  _bakeAt(rec, i) {
    const p = this._latticePos(i);
    const r = this.d / 2;
    if (rec.kind && rec.kind !== 'gold') {
      drawGrain(this.octx, p.x, p.y, r, rec.hue, rec.kind, i, i * 0.3);
    } else {
      drawBallFast(this.octx, p.x, p.y, r, rec.hue, rec.golden ? 'gold' : null);
    }
  }

  _rebake() {
    if (!this.L) return;
    this.octx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.bakeIndex = 0;
    this.drained = 0;
    for (const rec of this.queue) this._bakeAt(rec, this.bakeIndex++);
  }

  // タンクの中身(玉の山)を描く。draining中は小刻みに揺れる
  draw(ctx, t, draining) {
    const L = this.L;
    if (this.queue.length === 0 && this.drained === 0) return;
    const sink = (this.drained / this.perRow) * this.rowH;
    const jx = draining ? rand(-1.2, 1.2) : 0;
    const jy = draining ? rand(-0.8, 0.8) : 0;
    ctx.save();
    roundRect(ctx, L.tank.x + 2, L.tank.y + 2, L.tank.w - 4, L.tank.h + L.ballR, 10);
    ctx.clip();
    const canvasH = this.canvas.height / this.dpr;
    ctx.drawImage(
      this.canvas,
      L.tank.x + jx,
      L.tank.y + L.tank.h - canvasH + sink + jy,
      L.tank.w, canvasH,
    );
    ctx.restore();
  }
}
