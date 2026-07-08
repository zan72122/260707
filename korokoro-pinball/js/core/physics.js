// 2Dピンボール物理(円 vs 線分/円/フリッパー)
// テーブルは論理座標系(TABLE_W x TABLE_H)で設計する

import { clamp } from './utils.js';

export const TABLE_W = 600;
export const TABLE_H = 1000;
export const GRAVITY = 1350; // px/s^2(論理座標)
export const BALL_R = 17;
export const MAX_SPEED = 1500;

export class Ball {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;
    this.r = BALL_R;
    this.alive = true;
    this.inLane = false; // 発射レーン内フラグ
    this.trail = []; // 残像用
    this.spin = 0; // 見た目の回転
    this.angle = 0;
  }

  speed() {
    return Math.hypot(this.vx, this.vy);
  }

  limit() {
    const s = this.speed();
    if (s > MAX_SPEED) {
      const k = MAX_SPEED / s;
      this.vx *= k;
      this.vy *= k;
    }
  }
}

// 円 vs 線分。めり込み解消+反射。衝突したら {nx, ny, impact} を返す
export function collideSegment(ball, ax, ay, bx, by, restitution = 0.6) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 <= 0.0001) return null;
  const t = clamp(((ball.x - ax) * abx + (ball.y - ay) * aby) / len2, 0, 1);
  const px = ax + abx * t;
  const py = ay + aby * t;
  let dx = ball.x - px;
  let dy = ball.y - py;
  const d = Math.hypot(dx, dy);
  if (d >= ball.r || d <= 0.00001) return null;
  const nx = dx / d;
  const ny = dy / d;
  // めり込み解消
  ball.x = px + nx * ball.r;
  ball.y = py + ny * ball.r;
  const vn = ball.vx * nx + ball.vy * ny;
  if (vn < 0) {
    ball.vx -= (1 + restitution) * vn * nx;
    ball.vy -= (1 + restitution) * vn * ny;
    // 接線方向の摩擦
    const tx = -ny;
    const ty = nx;
    const vt = ball.vx * tx + ball.vy * ty;
    ball.vx -= vt * 0.015 * tx;
    ball.vy -= vt * 0.015 * ty;
    return { nx, ny, impact: -vn };
  }
  return { nx, ny, impact: 0 };
}

// 円 vs 円。反射して {nx, ny, impact} を返す
export function collideCircle(ball, cx, cy, r, restitution = 0.7, extraPush = 0) {
  const dx = ball.x - cx;
  const dy = ball.y - cy;
  const rr = ball.r + r;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr || d2 <= 0.0001) return null;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  ball.x = cx + nx * rr;
  ball.y = cy + ny * rr;
  const vn = ball.vx * nx + ball.vy * ny;
  let impact = 0;
  if (vn < 0) {
    ball.vx -= (1 + restitution) * vn * nx;
    ball.vy -= (1 + restitution) * vn * ny;
    impact = -vn;
  }
  if (extraPush > 0) {
    ball.vx += nx * extraPush;
    ball.vy += ny * extraPush;
    impact = Math.max(impact, extraPush);
  }
  return { nx, ny, impact };
}

// フリッパー(回転するカプセル)
export class Flipper {
  constructor({ px, py, length, side, restAngle, upAngle, r = 13 }) {
    this.px = px;
    this.py = py;
    this.length = length;
    this.side = side; // 'L' or 'R'
    this.restAngle = restAngle;
    this.upAngle = upAngle;
    this.angle = restAngle;
    this.angVel = 0;
    this.r = r;
    this.active = false;
    this.speedUp = 24; // rad/s
    this.speedDown = 14;
  }

  tip() {
    return {
      x: this.px + Math.cos(this.angle) * this.length,
      y: this.py + Math.sin(this.angle) * this.length,
    };
  }

  update(dt, pressed) {
    this.active = pressed;
    const target = pressed ? this.upAngle : this.restAngle;
    const dir = Math.sign(target - this.angle);
    const speed = pressed ? this.speedUp : this.speedDown;
    const prev = this.angle;
    if (dir !== 0) {
      this.angle += dir * speed * dt;
      if ((dir > 0 && this.angle > target) || (dir < 0 && this.angle < target)) {
        this.angle = target;
      }
    }
    this.angVel = (this.angle - prev) / Math.max(dt, 0.0001);
  }

  collide(ball) {
    const t = this.tip();
    const hit = collideSegmentCapsule(ball, this.px, this.py, t.x, t.y, this.r, 0.35);
    if (!hit) return null;
    // フリッパーの回転による打ち出し速度を加算
    if (Math.abs(this.angVel) > 0.5) {
      // ボールに最も近い軸上の点までの距離に応じた速度
      const abx = t.x - this.px;
      const aby = t.y - this.py;
      const len2 = abx * abx + aby * aby;
      const tt = clamp(((ball.x - this.px) * abx + (ball.y - this.py) * aby) / len2, 0, 1);
      const armLen = tt * this.length;
      const surfSpeed = Math.abs(this.angVel) * armLen;
      // 打ち上げ方向(法線)に加える
      const power = clamp(surfSpeed * 1.05, 0, 1250);
      ball.vx += hit.nx * power;
      ball.vy += hit.ny * power;
      hit.impact = Math.max(hit.impact, power);
      hit.flick = true;
    }
    ball.limit();
    return hit;
  }
}

// カプセル(半径付き線分)との衝突
export function collideSegmentCapsule(ball, ax, ay, bx, by, capR, restitution = 0.5) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 <= 0.0001) return null;
  const t = clamp(((ball.x - ax) * abx + (ball.y - ay) * aby) / len2, 0, 1);
  const px = ax + abx * t;
  const py = ay + aby * t;
  const dx = ball.x - px;
  const dy = ball.y - py;
  const rr = ball.r + capR;
  const d2 = dx * dx + dy * dy;
  if (d2 >= rr * rr || d2 <= 0.0001) return null;
  const d = Math.sqrt(d2);
  const nx = dx / d;
  const ny = dy / d;
  ball.x = px + nx * rr;
  ball.y = py + ny * rr;
  const vn = ball.vx * nx + ball.vy * ny;
  let impact = 0;
  if (vn < 0) {
    ball.vx -= (1 + restitution) * vn * nx;
    ball.vy -= (1 + restitution) * vn * ny;
    impact = -vn;
  }
  return { nx, ny, impact };
}
