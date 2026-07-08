// テーブル上のオブジェクト(キノコバンパー・お花・ペグ・コイン・プニ)
// たからばこ と スター は treasure.js を参照

import { TAU, clamp, rand, bell, easeOutBack } from '../core/utils.js';
import { collideCircle } from '../core/physics.js';

// ===== キノコバンパー =====
export class Bumper {
  constructor({ x, y, r, hue }) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.hue = hue; // 0=赤 200=あお 45=きいろ
    this.hitT = 1; // ヒットアニメ経過(1=待機)
    this.blink = rand(0, 5);
  }

  update(dt) {
    this.hitT = Math.min(1, this.hitT + dt * 2.6);
    this.blink += dt;
  }

  tryHit(ball) {
    const hit = collideCircle(ball, this.x, this.y, this.r, 0.4, 520);
    if (hit) this.hitT = 0;
    return hit;
  }

  draw(ctx) {
    const squash = 1 + bell(this.hitT) * 0.22;
    const capColors = {
      0: ['#ff6a5e', '#e03c30'],
      200: ['#5ab8ff', '#2f8fe0'],
      45: ['#ffd24d', '#f0a825'],
    }[this.hue];
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(squash, 2 - squash);
    // 影
    ctx.fillStyle = 'rgba(40,90,40,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, this.r * 0.72, this.r * 0.95, this.r * 0.35, 0, 0, TAU);
    ctx.fill();
    // 軸(顔)
    ctx.fillStyle = '#fff3e0';
    ctx.beginPath();
    ctx.ellipse(0, this.r * 0.3, this.r * 0.62, this.r * 0.55, 0, 0, TAU);
    ctx.fill();
    // かさ
    const g = ctx.createRadialGradient(-this.r * 0.3, -this.r * 0.5, this.r * 0.1, 0, 0, this.r * 1.15);
    g.addColorStop(0, capColors[0]);
    g.addColorStop(1, capColors[1]);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, -this.r * 0.18, this.r, this.r * 0.78, 0, Math.PI, 0);
    ctx.quadraticCurveTo(this.r * 0.6, this.r * 0.12, 0, this.r * 0.12);
    ctx.quadraticCurveTo(-this.r * 0.6, this.r * 0.12, -this.r, -this.r * 0.18);
    ctx.fill();
    // かさの白ドット
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    for (const [dx, dy, dr] of [[-0.45, -0.42, 0.16], [0.3, -0.55, 0.2], [0.05, -0.2, 0.12]]) {
      ctx.beginPath();
      ctx.arc(this.r * dx, this.r * dy, this.r * dr, 0, TAU);
      ctx.fill();
    }
    // 目(たまに瞬き)
    const blinkNow = (this.blink % 3.7) < 0.12 || this.hitT < 0.3;
    ctx.fillStyle = '#4a2f16';
    if (blinkNow) {
      ctx.lineWidth = this.r * 0.07;
      ctx.strokeStyle = '#4a2f16';
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.moveTo(s * this.r * 0.3 - this.r * 0.1, this.r * 0.32);
        ctx.lineTo(s * this.r * 0.3 + this.r * 0.1, this.r * 0.32);
        ctx.stroke();
      }
    } else {
      for (const s of [-1, 1]) {
        ctx.beginPath();
        ctx.ellipse(s * this.r * 0.28, this.r * 0.32, this.r * 0.09, this.r * 0.14, 0, 0, TAU);
        ctx.fill();
      }
    }
    // ほっぺ
    ctx.fillStyle = 'rgba(255,140,140,0.6)';
    for (const s of [-1, 1]) {
      ctx.beginPath();
      ctx.arc(s * this.r * 0.48, this.r * 0.45, this.r * 0.1, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ===== スリングのお花(強く弾く) =====
export class Sling {
  constructor({ x, y, r }) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.hitT = 1;
    this.spin = rand(0, TAU);
  }

  update(dt) {
    this.hitT = Math.min(1, this.hitT + dt * 2.2);
    this.spin += dt * 0.4;
  }

  tryHit(ball) {
    const hit = collideCircle(ball, this.x, this.y, this.r, 0.3, 700);
    if (hit) this.hitT = 0;
    return hit;
  }

  draw(ctx) {
    const pop = 1 + bell(this.hitT) * 0.3;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.spin + bell(this.hitT) * 0.7);
    ctx.scale(pop, pop);
    ctx.fillStyle = '#ff9ecf';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * this.r * 0.62, Math.sin(a) * this.r * 0.62, this.r * 0.5, this.r * 0.34, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 0.42, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#f0a825';
    for (let i = 0; i < 5; i++) {
      const a = (i / 5) * TAU + 0.4;
      ctx.beginPath();
      ctx.arc(Math.cos(a) * this.r * 0.2, Math.sin(a) * this.r * 0.2, this.r * 0.05, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
}

// ===== 小さなペグ(ひなぎく) =====
export class Peg {
  constructor({ x, y, r }) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.hitT = 1;
  }

  update(dt) {
    this.hitT = Math.min(1, this.hitT + dt * 3);
  }

  tryHit(ball) {
    const hit = collideCircle(ball, this.x, this.y, this.r, 0.75, 0);
    if (hit) this.hitT = 0;
    return hit;
  }

  draw(ctx) {
    const pop = 1 + bell(this.hitT) * 0.25;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.scale(pop, pop);
    ctx.fillStyle = '#ffffff';
    for (let i = 0; i < 6; i++) {
      const a = (i / 6) * TAU + 0.26;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * this.r * 0.55, Math.sin(a) * this.r * 0.55, this.r * 0.42, this.r * 0.28, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffcf3d';
    ctx.beginPath();
    ctx.arc(0, 0, this.r * 0.4, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

// ===== コイン =====
const COIN_RESPAWN = 7;

export class Coin {
  constructor({ x, y }) {
    this.x = x;
    this.y = y;
    this.r = 16;
    this.alive = true;
    this.respawnT = 0;
    this.phase = rand(0, TAU);
    this.spawnT = 1;
  }

  update(dt) {
    this.phase += dt * 3;
    if (!this.alive) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) {
        this.alive = true;
        this.spawnT = 0;
      }
    }
    this.spawnT = Math.min(1, this.spawnT + dt * 3);
  }

  tryCollect(ball) {
    if (!this.alive) return false;
    const dx = ball.x - this.x;
    const dy = ball.y - this.y;
    if (dx * dx + dy * dy < (ball.r + this.r) * (ball.r + this.r)) {
      this.alive = false;
      this.respawnT = COIN_RESPAWN;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (!this.alive) return;
    const w = Math.abs(Math.sin(this.phase)) * 0.75 + 0.25; // くるくる回転
    const scale = easeOutBack(clamp(this.spawnT, 0, 1));
    const bob = Math.sin(this.phase * 0.55) * 3;
    ctx.save();
    ctx.translate(this.x, this.y + bob);
    ctx.scale(scale, scale);
    ctx.fillStyle = '#e8a325';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.r * w, this.r, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd94d';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.r * w * 0.78, this.r * 0.78, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#e8a325';
    ctx.beginPath();
    ctx.ellipse(0, 0, this.r * w * 0.3, this.r * 0.42, 0, 0, TAU);
    ctx.fill();
    // きらり
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(-this.r * w * 0.35, -this.r * 0.4, this.r * 0.14, 0, TAU);
    ctx.fill();
    ctx.restore();
  }
}

// ===== プニ(歩き回る敵。ふんづけると得点) =====
const ENEMY_RESPAWN = 5;

export class Enemy {
  constructor({ y, xMin, xMax }, offset = 0) {
    this.y = y;
    this.xMin = xMin;
    this.xMax = xMax;
    this.x = xMin + (xMax - xMin) * (0.25 + offset * 0.5);
    this.dir = offset === 0 ? 1 : -1;
    this.r = 26;
    this.alive = true;
    this.respawnT = 0;
    this.walk = rand(0, TAU);
    this.squishT = 1;
    this.spawnT = 1;
  }

  update(dt) {
    this.squishT = Math.min(1, this.squishT + dt * 1.6);
    this.spawnT = Math.min(1, this.spawnT + dt * 2);
    if (!this.alive) {
      this.respawnT -= dt;
      if (this.respawnT <= 0) {
        this.alive = true;
        this.spawnT = 0;
        this.x = this.dir > 0 ? this.xMin : this.xMax;
      }
      return;
    }
    this.walk += dt * 9;
    this.x += this.dir * 52 * dt;
    if (this.x > this.xMax) { this.x = this.xMax; this.dir = -1; }
    if (this.x < this.xMin) { this.x = this.xMin; this.dir = 1; }
  }

  tryBop(ball) {
    if (!this.alive) return false;
    const dx = ball.x - this.x;
    const dy = ball.y - this.y;
    const rr = ball.r + this.r;
    if (dx * dx + dy * dy < rr * rr) {
      this.alive = false;
      this.respawnT = ENEMY_RESPAWN;
      this.squishT = 0;
      // ボールはぽよんと跳ね返す
      const d = Math.max(1, Math.hypot(dx, dy));
      ball.vx += (dx / d) * 260;
      ball.vy += (dy / d) * 260 - 120;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (!this.alive) {
      // ぺしゃんこ演出
      if (this.squishT < 1) {
        const t = this.squishT;
        ctx.save();
        ctx.globalAlpha = 1 - t;
        ctx.translate(this.x, this.y + this.r * 0.5);
        ctx.scale(1.4, 0.3);
        this.body(ctx, 0);
        ctx.restore();
      }
      return;
    }
    const hop = Math.abs(Math.sin(this.walk)) * 6;
    const sc = easeOutBack(clamp(this.spawnT, 0.01, 1));
    ctx.save();
    ctx.translate(this.x, this.y - hop);
    ctx.scale(sc * this.dir, sc); // 進行方向を向く
    this.body(ctx, hop);
    ctx.restore();
  }

  body(ctx, hop) {
    const r = this.r;
    // 影
    ctx.fillStyle = 'rgba(40,90,40,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.85 + hop, r * 0.9, r * 0.3, 0, 0, TAU);
    ctx.fill();
    // あし
    ctx.fillStyle = '#e07a30';
    const step = Math.sin(this.walk) * r * 0.3;
    ctx.beginPath();
    ctx.ellipse(-r * 0.4 + step, r * 0.72, r * 0.3, r * 0.18, 0, 0, TAU);
    ctx.ellipse(r * 0.4 - step, r * 0.72, r * 0.3, r * 0.18, 0, 0, TAU);
    ctx.fill();
    // からだ
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.4, r * 0.2, 0, 0, r * 1.2);
    g.addColorStop(0, '#ffb066');
    g.addColorStop(1, '#f28a3d');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 0.95, r * 0.85, 0, 0, TAU);
    ctx.fill();
    // おなか
    ctx.fillStyle = '#ffe6c2';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.3, r * 0.55, r * 0.4, 0, 0, TAU);
    ctx.fill();
    // 目と口(まゆげで少し不満げ、でもかわいい)
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.ellipse(r * 0.25, -r * 0.25, r * 0.22, r * 0.26, 0, 0, TAU);
    ctx.ellipse(r * 0.62, -r * 0.25, r * 0.2, r * 0.24, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#3a2410';
    ctx.beginPath();
    ctx.arc(r * 0.32, -r * 0.22, r * 0.1, 0, TAU);
    ctx.arc(r * 0.66, -r * 0.22, r * 0.09, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#3a2410';
    ctx.lineWidth = r * 0.08;
    ctx.beginPath();
    ctx.arc(r * 0.42, r * 0.1, r * 0.14, 0.1 * Math.PI, 0.9 * Math.PI);
    ctx.stroke();
  }
}
