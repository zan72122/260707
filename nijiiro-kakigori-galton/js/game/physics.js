// 玉の物理シミュレーション: 空間ハッシュによる玉同士の衝突、
// 漏斗の渋滞、密なピンの森での分岐、スロットへの着地
import { rand, clamp } from '../core/utils.js';

const SUBSTEPS = 2;
const BALL_RESTITUTION = 0.06;
const PIN_DAMP = 0.42;
const PIN_SIDE_KICK = 0.30;
const WALL_RADIUS = 1.5;
const STALL_KICK_AFTER = 0.7;   // 秒。ピンの上で止まった玉を蹴る
const GIANT_MASS_RATIO = 0.09;  // 巨大玉に対する小玉の押し返し比率

export class Physics {
  constructor() {
    this.balls = [];
    this.L = null;
    this.pinRows = [];          // 段ごとのピン配列(参照)
    this.pinGlow = [];
    this.removedPins = new Set();
    this.gateRatio = 0;         // 0=閉 1=全開
    this.windAx = 0;            // 横風の加速度
    this.giant = null;          // 巨大いちご玉
    this.activeCap = 240;
    this.movingCount = 0;
  }

  setLayout(L) {
    this.L = L;
    this.pinRows = [];
    for (let r = 0; r < L.pinRows; r++) this.pinRows.push([]);
    for (const pin of L.pins) this.pinRows[pin.row].push(pin);
    this.pinGlow = new Float32Array(L.pins.length);
  }

  reset() {
    this.balls.length = 0;
    this.removedPins.clear();
    this.giant = null;
    this.gateRatio = 0;
    this.windAx = 0;
  }

  spawn(rec, x = null, y = null, vx = null, vy = null) {
    const L = this.L;
    if (this.balls.length >= this.activeCap) return false;
    this.balls.push({
      x: x ?? L.cx + rand(-L.tank.w * 0.22, L.tank.w * 0.22),
      y: y ?? L.tankBottom + rand(-2, 8),
      vx: vx ?? rand(-20, 20),
      vy: vy ?? rand(20, 70),
      r: L.ballR,
      hue: rec.hue, kind: rec.kind || null, golden: !!rec.golden,
      stall: 0,
    });
    return true;
  }

  spawnGiant() {
    const L = this.L;
    this.giant = {
      x: L.cx + rand(-8, 8),
      y: L.tankBottom - L.ballR,
      vx: 0, vy: 40,
      r: L.throatHalf * 1.45,
      wob: 0, restT: 0,
    };
  }

  burstGiant() {
    const g = this.giant;
    this.giant = null;
    return g;
  }

  // hooks: { floorY(slot), onPinHit(pin, ball), onSettle(ball, slot) }
  update(dt, hooks) {
    const L = this.L;
    for (let i = 0; i < this.pinGlow.length; i++) {
      this.pinGlow[i] = Math.max(0, this.pinGlow[i] - dt * 2.4);
    }
    const sub = dt / SUBSTEPS;
    for (let s = 0; s < SUBSTEPS; s++) this._step(sub, hooks);

    let moving = 0;
    for (const b of this.balls) {
      if (Math.abs(b.vx) + Math.abs(b.vy) > 40) moving++;
    }
    this.movingCount = moving;
  }

  _step(dt, hooks) {
    const L = this.L;
    const balls = this.balls;
    const maxV = L.maxFall;

    // 積分
    for (const b of balls) {
      b.vy += L.gravity * dt;
      if (this.windAx !== 0 && b.y > L.throatY && b.y < L.slotTop + L.slotW) b.vx += this.windAx * dt;
      b.vx = clamp(b.vx, -maxV, maxV);
      b.vy = clamp(b.vy, -maxV, maxV);
      b.x += b.vx * dt;
      b.y += b.vy * dt;
    }
    this._giantStep(dt);

    // 空間ハッシュで玉同士の衝突(押し合いへし合い)
    const cell = L.ballR * 2.4;
    const hash = new Map();
    for (let i = 0; i < balls.length; i++) {
      const b = balls[i];
      const key = ((b.x / cell) | 0) * 4096 + ((b.y / cell) | 0);
      let arr = hash.get(key);
      if (!arr) { arr = []; hash.set(key, arr); }
      arr.push(i);
    }
    for (let i = 0; i < balls.length; i++) {
      const a = balls[i];
      const cx0 = (a.x / cell) | 0, cy0 = (a.y / cell) | 0;
      for (let ox = -1; ox <= 1; ox++) {
        for (let oy = -1; oy <= 1; oy++) {
          const arr = hash.get((cx0 + ox) * 4096 + (cy0 + oy));
          if (!arr) continue;
          for (const j of arr) {
            if (j <= i) continue;
            this._ballPair(a, balls[j]);
          }
        }
      }
    }

    // 環境との衝突と着地
    for (let i = balls.length - 1; i >= 0; i--) {
      const b = balls[i];
      this._collideWalls(b);
      this._collidePins(b, hooks);
      this._collideDividers(b);
      if (this.giant) this._collideGiant(b);

      // スロットの床(氷+積もった玉)への着地 → 凍結
      const slot = clamp(((b.x - L.boardX) / L.slotW) | 0, 0, L.nSlots - 1);
      const fy = hooks.floorY(slot);
      if (b.y + b.r >= fy && b.vy >= -10) {
        balls.splice(i, 1);
        hooks.onSettle(b, slot);
        continue;
      }
      // 詰まり防止: ピンの森の中で止まった玉を軽く蹴る
      if (Math.abs(b.vx) + Math.abs(b.vy) < 9 && b.y > L.pinTop && b.y < fy - b.r * 3) {
        b.stall += dt;
        if (b.stall > STALL_KICK_AFTER) {
          b.vx += rand(-60, 60);
          b.vy -= rand(0, 40);
          b.stall = 0;
        }
      } else {
        b.stall = 0;
      }
      if (b.y > L.h + 80) balls.splice(i, 1);
    }
  }

  _ballPair(a, b) {
    const dx = b.x - a.x, dy = b.y - a.y;
    const rr = a.r + b.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 === 0) return;
    const d = Math.sqrt(d2);
    const nx = dx / d, ny = dy / d;
    const overlap = (rr - d) * 0.5;
    a.x -= nx * overlap; a.y -= ny * overlap;
    b.x += nx * overlap; b.y += ny * overlap;
    const rvn = (b.vx - a.vx) * nx + (b.vy - a.vy) * ny;
    if (rvn < 0) {
      const imp = -(1 + BALL_RESTITUTION) * rvn * 0.5;
      a.vx -= imp * nx; a.vy -= imp * ny;
      b.vx += imp * nx; b.vy += imp * ny;
    }
  }

  _segPush(b, x1, y1, x2, y2, radius) {
    // 線分カプセルから玉を押し出す
    const ex = x2 - x1, ey = y2 - y1;
    const len2 = ex * ex + ey * ey;
    let t = len2 > 0 ? ((b.x - x1) * ex + (b.y - y1) * ey) / len2 : 0;
    t = clamp(t, 0, 1);
    const px = x1 + ex * t, py = y1 + ey * t;
    const dx = b.x - px, dy = b.y - py;
    const rr = b.r + radius;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 === 0) return false;
    const d = Math.sqrt(d2);
    const nx = dx / d, ny = dy / d;
    b.x = px + nx * rr;
    b.y = py + ny * rr;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= vn * nx * 1.1;
      b.vy -= vn * ny * 1.1;
    }
    return true;
  }

  _collideWalls(b) {
    const L = this.L;
    for (const wall of L.walls) this._segPush(b, wall.x1, wall.y1, wall.x2, wall.y2, WALL_RADIUS);
    // ゲート(喉の扉): 開き具合に応じて左側から塞ぐ
    if (this.gateRatio < 0.98 && b.y < L.throatY + b.r * 2 && b.y > L.tankBottom - b.r) {
      const openFrom = L.cx - L.throatHalf + (1 - this.gateRatio) * L.throatHalf * 2;
      if (openFrom > L.cx - L.throatHalf + 1) {
        this._segPush(b, L.cx - L.throatHalf, L.throatY, openFrom, L.throatY, WALL_RADIUS + 1);
      }
    }
    // タンクの左右(こぼれ防止)
    if (b.y < L.tankBottom) {
      if (b.x < L.tank.x + b.r) { b.x = L.tank.x + b.r; b.vx = Math.abs(b.vx) * 0.3; }
      if (b.x > L.tank.x + L.tank.w - b.r) { b.x = L.tank.x + L.tank.w - b.r; b.vx = -Math.abs(b.vx) * 0.3; }
    }
  }

  _collidePins(b, hooks) {
    const L = this.L;
    if (b.y < L.pinTop - L.pinGapY || b.y > L.slotTop + L.pinGapY) return;
    const rowGuess = ((b.y - L.pinTop) / L.pinGapY - 0.5) | 0;
    for (let r = Math.max(0, rowGuess - 1); r <= Math.min(L.pinRows - 1, rowGuess + 1); r++) {
      for (const pin of this.pinRows[r]) {
        if (this.removedPins.has(pin.idx)) continue;
        const dx = b.x - pin.x, dy = b.y - pin.y;
        if (Math.abs(dx) > L.slotW) continue;
        const rr = b.r + L.pinR;
        const d2 = dx * dx + dy * dy;
        if (d2 >= rr * rr || d2 === 0) continue;
        const d = Math.sqrt(d2);
        const nx = dx / d, ny = dy / d;
        b.x = pin.x + nx * rr;
        b.y = pin.y + ny * rr;
        const vn = b.vx * nx + b.vy * ny;
        if (vn < 0) {
          b.vx -= (1 + PIN_DAMP) * vn * nx;
          b.vy -= (1 + PIN_DAMP) * vn * ny;
        }
        // 真上から当たったら左右50%で分岐(ゴルトンの核)
        const side = Math.abs(nx) < 0.2 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(nx);
        b.vx += side * (Math.abs(vn) * PIN_SIDE_KICK + L.ballR * 4.5);
        if (this.pinGlow[pin.idx] < 0.4) {
          this.pinGlow[pin.idx] = 1;
          hooks.onPinHit(pin, b);
        } else {
          this.pinGlow[pin.idx] = 1;
        }
        return;
      }
    }
  }

  _collideDividers(b) {
    const L = this.L;
    if (b.y < L.slotTop - b.r * 2) return;
    const k = Math.round((b.x - L.boardX) / L.slotW);
    if (k < 1 || k > L.nSlots - 1) return;
    const dx = L.boardX + k * L.slotW;
    this._segPush(b, dx, L.slotTop, dx, L.iceY, WALL_RADIUS);
  }

  _giantStep(dt) {
    const g = this.giant;
    if (!g) return;
    const L = this.L;
    g.vy += L.gravity * dt * 0.8;
    g.x += g.vx * dt;
    g.y += g.vy * dt;
    g.vx *= 0.98;
    g.wob = Math.max(0, g.wob - dt * 2);
    for (const wall of L.walls) this._segPush(g, wall.x1, wall.y1, wall.x2, wall.y2, WALL_RADIUS);
    // 喉より大きいので必ず詰まる
    if (g.y + g.r > L.throatY + g.r * 0.4) {
      g.y = L.throatY + g.r * 0.4 - g.r;
      if (g.vy > 0) { g.vy = 0; g.restT += dt; }
    }
  }

  _collideGiant(b) {
    const g = this.giant;
    const dx = b.x - g.x, dy = b.y - g.y;
    const rr = b.r + g.r;
    const d2 = dx * dx + dy * dy;
    if (d2 >= rr * rr || d2 === 0) return;
    const d = Math.sqrt(d2);
    const nx = dx / d, ny = dy / d;
    b.x = g.x + nx * rr;
    b.y = g.y + ny * rr;
    const vn = b.vx * nx + b.vy * ny;
    if (vn < 0) {
      b.vx -= vn * nx * 1.2;
      b.vy -= vn * ny * 1.2;
    }
    g.vx -= nx * 6 * GIANT_MASS_RATIO;
    g.wob = Math.min(1, g.wob + 0.08);
  }
}
