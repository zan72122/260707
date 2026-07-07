// 光のリグ: 光源 → プリズム → 虹の帯(7色ファン) → 鏡での反射 までの幾何計算
// 4歳児向けに「太くやわらかい光の帯」で表現する

import { RAINBOW, TAU, clamp, angleLerp, dist, pointSegDist, pointSegT } from '../core/utils.js';

const BAND_COUNT = RAINBOW.length;
const DEFAULT_SPREAD = 0.062; // 帯1本あたりの角度差(ラジアン)
const MAX_BOUNCE = 2;

// 光線(p + t*d)と線分(a→b)の交差判定。tと交点を返す
function raySegHit(px, py, dx, dy, ax, ay, bx, by) {
  const sx = bx - ax;
  const sy = by - ay;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((ax - px) * sy - (ay - py) * sx) / denom;
  const u = ((ax - px) * dy - (ay - py) * dx) / denom;
  if (t > 8 && u >= 0 && u <= 1) {
    return { t, x: px + dx * t, y: py + dy * t };
  }
  return null;
}

export class LightRig {
  constructor(engine, opts = {}) {
    this.engine = engine;
    this.lightX = opts.lightX ?? 100;
    this.lightY = opts.lightY ?? 100;
    this.prismX = opts.prismX ?? 300;
    this.prismY = opts.prismY ?? 300;
    this.prismRot = opts.prismRot ?? 0;
    this.prismSize = opts.prismSize ?? 46;
    this.lightRadius = opts.lightRadius ?? 42;
    this.sunMode = opts.sunMode ?? false; // trueなら太陽、falseなら懐中電灯
    this.spread = opts.spread ?? DEFAULT_SPREAD;
    this.beamLength = opts.beamLength ?? 2000;
    this.mirrors = []; // {ax, ay, bx, by} 鏡の線分
    this.prismMovable = opts.prismMovable ?? false;
    this._targetRot = this.prismRot;
    this.spinVel = 0; // くるくる回した勢い
    this.rays = []; // 計算済みの虹光線 [{ci, segs:[{x1,y1,x2,y2}], hex}]
    this.glow = 0; // プリズムのときめき度
  }

  // ---- 操作 ----

  hitLight(x, y) {
    return dist(x, y, this.lightX, this.lightY) < this.lightRadius + 34;
  }

  hitPrism(x, y) {
    return dist(x, y, this.prismX, this.prismY) < this.prismSize + 40;
  }

  dragLight(x, y, W, H) {
    this.lightX = clamp(x, 30, W - 30);
    this.lightY = clamp(y, 30, H - 30);
  }

  dragPrism(x, y, W, H) {
    if (!this.prismMovable) return;
    this.prismX = clamp(x, 60, W - 60);
    this.prismY = clamp(y, 60, H - 60);
  }

  // 指の位置に向けてプリズムを回す(くるくる)
  spinPrismToward(x, y, dt) {
    const a = Math.atan2(y - this.prismY, x - this.prismX);
    const prev = this._targetRot;
    this._targetRot = a;
    let d = (a - prev) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    this.spinVel = d / Math.max(dt, 1 / 120);
    this.glow = Math.min(1, this.glow + Math.abs(d) * 2);
  }

  releaseSpin() {
    // 離したあとも勢いでくるくる回る(楽しい!)
    this.spinVel *= 0.9;
  }

  // ---- 更新 ----

  update(dt) {
    // 回転の追従と慣性
    this.prismRot = angleLerp(this.prismRot, this._targetRot, 1 - Math.pow(0.001, dt));
    if (Math.abs(this.spinVel) > 0.05) {
      this._targetRot += this.spinVel * dt;
      this.spinVel *= Math.pow(0.35, dt);
    }
    this.glow = Math.max(0, this.glow - dt * 0.8);
    this._computeRays();
  }

  // 入射角に応じた虹の射出方向
  exitAngle() {
    const inAngle = Math.atan2(this.prismY - this.lightY, this.prismX - this.lightX);
    // プリズム回転で屈折の曲がりが変わる(物理的正確さより遊びやすさ優先)
    const bend = Math.sin(this.prismRot * 1.5) * 0.9;
    return inAngle + bend;
  }

  _computeRays() {
    this.rays = [];
    const base = this.exitAngle();
    const mid = (BAND_COUNT - 1) / 2;
    for (let ci = 0; ci < BAND_COUNT; ci++) {
      const a = base + (ci - mid) * this.spread;
      // 出口を色ごとに少し横へずらし、プリズム付近でも色が分かれて見えるようにする
      const off = (ci - mid) * this.prismSize * 0.3;
      const cx = this.prismX + Math.cos(a + Math.PI / 2) * off;
      const cy = this.prismY + Math.sin(a + Math.PI / 2) * off;
      const segs = this._traceRay(cx, cy, Math.cos(a), Math.sin(a));
      this.rays.push({ ci, hex: RAINBOW[ci].hex, segs });
    }
  }

  _traceRay(px, py, dx, dy) {
    const segs = [];
    let x = px;
    let y = py;
    let dirX = dx;
    let dirY = dy;
    let remaining = this.beamLength;
    for (let bounce = 0; bounce <= MAX_BOUNCE; bounce++) {
      let bestT = remaining;
      let bestMirror = null;
      let bestHit = null;
      for (const m of this.mirrors) {
        const hit = raySegHit(x, y, dirX, dirY, m.ax, m.ay, m.bx, m.by);
        if (hit && hit.t < bestT) {
          bestT = hit.t;
          bestMirror = m;
          bestHit = hit;
        }
      }
      const ex = x + dirX * bestT;
      const ey = y + dirY * bestT;
      segs.push({ x1: x, y1: y, x2: ex, y2: ey, dx: dirX, dy: dirY });
      if (!bestMirror) break;
      // 鏡の法線で反射
      const mx = bestMirror.bx - bestMirror.ax;
      const my = bestMirror.by - bestMirror.ay;
      const len = Math.hypot(mx, my) || 1;
      let nx = -my / len;
      let ny = mx / len;
      if (nx * dirX + ny * dirY > 0) {
        nx = -nx;
        ny = -ny;
      }
      const dot = dirX * nx + dirY * ny;
      dirX = dirX - 2 * dot * nx;
      dirY = dirY - 2 * dot * ny;
      x = bestHit.x + dirX * 2;
      y = bestHit.y + dirY * 2;
      remaining -= bestT;
      if (remaining <= 20) break;
    }
    return segs;
  }

  // ---- 当たり判定 ----

  // 点(x,y)に当たっている色indexの配列を返す
  colorsAt(x, y, radius = 30) {
    const found = [];
    for (const ray of this.rays) {
      for (const s of ray.segs) {
        const t = pointSegT(x, y, s.x1, s.y1, s.x2, s.y2);
        if (t < 0.02) continue; // プリズム至近は除外
        const d = pointSegDist(x, y, s.x1, s.y1, s.x2, s.y2);
        const distAlong = t * dist(s.x1, s.y1, s.x2, s.y2);
        const bandHalf = this.bandHalfWidth(distAlong);
        if (d < radius + bandHalf) {
          found.push(ray.ci);
          break;
        }
      }
    }
    return found;
  }

  // 距離に応じて帯が太くなる
  bandHalfWidth(distAlong) {
    return 9 + distAlong * 0.018;
  }

  // 白い光がプリズムに届いているか(遮蔽は現状なし=常にtrue)
  isLit() {
    return true;
  }
}
