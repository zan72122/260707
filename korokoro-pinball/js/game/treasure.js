// たからばこ と スター(フィーバーのもと)

import { TAU, bell, starPath } from '../core/utils.js';
import { collideCircle } from '../core/physics.js';

// ===== たからばこ(3回たたくとスターが出る) =====
export class Chest {
  constructor({ x, y, r }) {
    this.x = x;
    this.y = y;
    this.r = r;
    this.hp = 3;
    this.open = false;
    this.hitT = 1;
    this.openT = 0;
    this.cooldown = 0;
    this.wobble = 0;
  }

  update(dt) {
    this.hitT = Math.min(1, this.hitT + dt * 2.4);
    this.wobble += dt;
    if (this.open) {
      this.openT += dt;
      if (this.openT > 9) {
        // しばらくしたら閉じて復活
        this.open = false;
        this.hp = 3;
        this.openT = 0;
      }
    }
    this.cooldown = Math.max(0, this.cooldown - dt);
  }

  // 戻り値: 'hit' | 'open' | null
  tryHit(ball) {
    const hit = collideCircle(ball, this.x, this.y, this.r, 0.55, 120);
    if (!hit || this.open || this.cooldown > 0) return hit ? 'bounce' : null;
    this.cooldown = 0.45;
    this.hitT = 0;
    this.hp--;
    if (this.hp <= 0) {
      this.open = true;
      this.openT = 0;
      return 'open';
    }
    return 'hit';
  }

  draw(ctx) {
    const shake = bell(this.hitT) * Math.sin(this.hitT * 40) * 3;
    const r = this.r;
    ctx.save();
    ctx.translate(this.x + shake, this.y);
    // 影
    ctx.fillStyle = 'rgba(40,90,40,0.25)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.8, r * 1.05, r * 0.3, 0, 0, TAU);
    ctx.fill();
    // 本体
    ctx.fillStyle = '#a5652f';
    ctx.strokeStyle = '#7a4517';
    ctx.lineWidth = 3;
    const bw = r * 1.7;
    const bh = r * 1.0;
    roundedBox(ctx, -bw / 2, -bh * 0.1, bw, bh, 7);
    ctx.fill();
    ctx.stroke();
    // ふた(開くと後ろに倒れる)
    ctx.save();
    if (this.open) {
      ctx.translate(0, -bh * 0.1);
      ctx.scale(1, -0.55);
      ctx.translate(0, bh * 0.1);
    }
    ctx.fillStyle = '#c98a4b';
    roundedBox(ctx, -bw / 2, -bh * 0.72, bw, bh * 0.62, 9);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
    // 金のバンド
    ctx.fillStyle = '#ffd94d';
    ctx.fillRect(-bw * 0.09, -bh * 0.72, bw * 0.18, bh * 1.6 * (this.open ? 0.55 : 1));
    ctx.strokeStyle = '#c9992a';
    ctx.strokeRect(-bw * 0.09, -bh * 0.72, bw * 0.18, bh * 1.6 * (this.open ? 0.55 : 1));
    // 開いた宝箱は光る
    if (this.open) {
      const glow = 0.55 + Math.sin(this.wobble * 6) * 0.2;
      const g = ctx.createRadialGradient(0, -r * 0.5, 0, 0, -r * 0.5, r * 1.6);
      g.addColorStop(0, `rgba(255,240,150,${glow})`);
      g.addColorStop(1, 'rgba(255,240,150,0)');
      ctx.fillStyle = g;
      ctx.fillRect(-r * 1.8, -r * 2.2, r * 3.6, r * 3);
    } else {
      // 残り回数のハート
      ctx.fillStyle = '#fff';
      for (let i = 0; i < this.hp; i++) {
        ctx.beginPath();
        ctx.arc(-r * 0.55 + i * r * 0.55, r * 0.42, r * 0.1, 0, TAU);
        ctx.fill();
      }
    }
    ctx.restore();
  }
}

function roundedBox(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// ===== スター(取るとフィーバー) =====
export class StarPickup {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.vy = -220;
    this.r = 24;
    this.alive = true;
    this.age = 0;
  }

  update(dt) {
    this.age += dt;
    this.vy += 260 * dt;
    this.vy = Math.min(this.vy, 110); // ゆっくり落ちる
    this.y += this.vy * dt;
    this.x += Math.sin(this.age * 3.2) * 36 * dt;
    if (this.y > 940) this.alive = false; // 落ちたら消える(また宝箱で出せる)
  }

  tryCollect(ball) {
    if (!this.alive) return false;
    const dx = ball.x - this.x;
    const dy = ball.y - this.y;
    const rr = ball.r + this.r + 6;
    if (dx * dx + dy * dy < rr * rr) {
      this.alive = false;
      return true;
    }
    return false;
  }

  draw(ctx) {
    if (!this.alive) return;
    const pulse = 1 + Math.sin(this.age * 8) * 0.12;
    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(Math.sin(this.age * 4) * 0.25);
    ctx.scale(pulse, pulse);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, this.r * 2.2);
    g.addColorStop(0, 'rgba(255,240,150,0.75)');
    g.addColorStop(1, 'rgba(255,240,150,0)');
    ctx.fillStyle = g;
    ctx.fillRect(-this.r * 2.2, -this.r * 2.2, this.r * 4.4, this.r * 4.4);
    ctx.fillStyle = '#ffd94d';
    ctx.strokeStyle = '#e8a325';
    ctx.lineWidth = 3.5;
    starPath(ctx, 0, 0, this.r, this.r * 0.46);
    ctx.fill();
    ctx.stroke();
    ctx.fillStyle = '#5a3d1c';
    ctx.beginPath();
    ctx.arc(-6, -2, 2.8, 0, TAU);
    ctx.arc(6, -2, 2.8, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#5a3d1c';
    ctx.lineWidth = 2.2;
    ctx.beginPath();
    ctx.arc(0, 3, 5.5, 0.15 * Math.PI, 0.85 * Math.PI);
    ctx.stroke();
    ctx.restore();
  }
}
