// パーティクルシステム: キラキラ・花びら・泡・霧・星などの演出を一手に担う

import { TAU, rand, rgba, starPath, heartPath } from './utils.js';

const MAX_PARTICLES = 600;

export class Particles {
  constructor() {
    this.items = [];
  }

  spawn(opts) {
    if (this.items.length >= MAX_PARTICLES) this.items.shift();
    this.items.push({
      x: 0, y: 0, vx: 0, vy: 0,
      life: 1, maxLife: 1,
      size: 6, hex: '#ffffff',
      gravity: 0, drag: 1,
      shape: 'dot', // dot | star | heart | ring | petal | mist | streak
      spin: 0, rot: rand(0, TAU),
      wobble: 0, wobbleSpeed: 0,
      alpha: 1,
      ...opts,
      t: 0,
    });
  }

  // キラキラの爆発(色ヒット時)
  burst(x, y, hex, count = 10, speed = 90) {
    for (let i = 0; i < count; i++) {
      const a = rand(0, TAU);
      const v = rand(speed * 0.3, speed);
      this.spawn({
        x, y,
        vx: Math.cos(a) * v,
        vy: Math.sin(a) * v - 20,
        life: rand(0.5, 1.1), maxLife: 1.1,
        size: rand(3, 8), hex,
        gravity: 60, drag: 0.96,
        shape: Math.random() < 0.4 ? 'star' : 'dot',
        spin: rand(-4, 4),
      });
    }
  }

  // ゆっくり立ちのぼるキラキラ
  twinkle(x, y, hex, size = 5) {
    this.spawn({
      x: x + rand(-14, 14), y: y + rand(-14, 14),
      vx: rand(-8, 8), vy: rand(-30, -10),
      life: rand(0.8, 1.6), maxLife: 1.6,
      size, hex, shape: 'star', spin: rand(-2, 2),
      wobble: rand(4, 10), wobbleSpeed: rand(2, 5),
    });
  }

  // ハートがぽわん
  heart(x, y, hex = '#ff8fb3') {
    this.spawn({
      x, y, vx: rand(-10, 10), vy: rand(-55, -35),
      life: 1.4, maxLife: 1.4, size: rand(8, 14), hex,
      shape: 'heart', wobble: 8, wobbleSpeed: 3,
    });
  }

  // 波紋リング
  ring(x, y, hex, size = 20) {
    this.spawn({ x, y, life: 0.8, maxLife: 0.8, size, hex, shape: 'ring' });
  }

  // 花びらひらひら
  petal(x, y, hex) {
    this.spawn({
      x, y, vx: rand(-25, 25), vy: rand(5, 30),
      life: rand(2, 3.5), maxLife: 3.5, size: rand(5, 9), hex,
      shape: 'petal', gravity: 12, drag: 0.99,
      spin: rand(-3, 3), wobble: rand(15, 30), wobbleSpeed: rand(1, 2.5),
    });
  }

  // 霧・湯気のもや
  mist(x, y, hex = '#ffffff', size = 30) {
    this.spawn({
      x, y, vx: rand(-12, 12), vy: rand(-24, -8),
      life: rand(1.5, 2.6), maxLife: 2.6, size, hex,
      shape: 'mist', alpha: 0.16, drag: 0.99,
    });
  }

  // 音符がぽろん(ダンス・ハープ)
  noteMark(x, y, hex = '#ffffff') {
    this.spawn({
      x, y, vx: rand(-14, 14), vy: rand(-70, -40),
      life: rand(0.9, 1.5), maxLife: 1.5, size: rand(7, 11), hex,
      shape: 'note', spin: rand(-1.5, 1.5), wobble: 8, wobbleSpeed: 3,
    });
  }

  // 紙ふぶき(おまつりモード)
  confetti(x, y, hex) {
    this.spawn({
      x, y, vx: rand(-140, 140), vy: rand(-220, -80),
      life: rand(1.2, 2.2), maxLife: 2.2, size: rand(4, 8), hex,
      shape: 'confetti', gravity: 240, drag: 0.985,
      spin: rand(-8, 8), wobble: rand(6, 16), wobbleSpeed: rand(2, 5),
    });
  }

  // 流れ星のような光の筋
  streak(x, y, angle, hex) {
    this.spawn({
      x, y,
      vx: Math.cos(angle) * rand(120, 220),
      vy: Math.sin(angle) * rand(120, 220),
      life: rand(0.3, 0.6), maxLife: 0.6, size: rand(2, 4), hex,
      shape: 'streak', drag: 0.97,
    });
  }

  update(dt) {
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const p = items[i];
      p.t += dt;
      p.life -= dt;
      if (p.life <= 0) {
        items.splice(i, 1);
        continue;
      }
      p.vy += p.gravity * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt + (p.wobble ? Math.sin(p.t * p.wobbleSpeed * TAU * 0.3) * p.wobble * dt : 0);
      p.y += p.vy * dt;
      p.rot += p.spin * dt;
    }
  }

  draw(ctx) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (const p of this.items) {
      const k = Math.max(0, p.life / p.maxLife);
      const a = p.alpha * (k < 0.3 ? k / 0.3 : 1);
      ctx.globalAlpha = a;
      switch (p.shape) {
        case 'star': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.hex;
          starPath(ctx, 0, 0, p.size, p.size * 0.42, 4);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'heart': {
          ctx.fillStyle = p.hex;
          heartPath(ctx, p.x, p.y, p.size * (0.8 + 0.2 * Math.sin(p.t * 6)));
          ctx.fill();
          break;
        }
        case 'ring': {
          const r = p.size * (1 + (1 - k) * 2.2);
          ctx.strokeStyle = p.hex;
          ctx.lineWidth = 3 * k;
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, TAU);
          ctx.stroke();
          break;
        }
        case 'petal': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.hex;
          ctx.beginPath();
          ctx.ellipse(0, 0, p.size, p.size * 0.55, 0, 0, TAU);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'mist': {
          const g = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.size);
          g.addColorStop(0, rgba(p.hex, 0.5));
          g.addColorStop(1, rgba(p.hex, 0));
          ctx.fillStyle = g;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.fill();
          break;
        }
        case 'note': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot * 0.2);
          ctx.fillStyle = p.hex;
          ctx.strokeStyle = p.hex;
          ctx.lineWidth = p.size * 0.22;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.ellipse(0, p.size * 0.5, p.size * 0.5, p.size * 0.36, -0.4, 0, TAU);
          ctx.fill();
          ctx.beginPath();
          ctx.moveTo(p.size * 0.42, p.size * 0.4);
          ctx.lineTo(p.size * 0.42, -p.size * 0.7);
          ctx.stroke();
          ctx.restore();
          break;
        }
        case 'confetti': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.hex;
          ctx.fillRect(-p.size / 2, -p.size * 0.3, p.size, p.size * 0.6);
          ctx.restore();
          break;
        }
        case 'streak': {
          ctx.strokeStyle = p.hex;
          ctx.lineWidth = p.size;
          ctx.lineCap = 'round';
          ctx.beginPath();
          ctx.moveTo(p.x, p.y);
          ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06);
          ctx.stroke();
          break;
        }
        default: {
          ctx.fillStyle = p.hex;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * k, 0, TAU);
          ctx.fill();
        }
      }
    }
    ctx.restore();
    ctx.globalAlpha = 1;
  }
}
