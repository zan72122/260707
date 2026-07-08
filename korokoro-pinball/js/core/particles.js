// パーティクル(キラキラ・星・紙吹雪・スコアポップ)

import { TAU, rand, pick, hsl, starPath, heartPath, font, outlinedText, clamp } from './utils.js';

const CONFETTI_COLORS = ['#ff5a4e', '#ffb830', '#ffe14d', '#5ad462', '#4db6ff', '#b47dff', '#ff8ac2'];

export class Particles {
  constructor() {
    this.items = [];
    this.pops = []; // スコア/文字ポップ
  }

  clear() {
    this.items.length = 0;
    this.pops.length = 0;
  }

  spark(x, y, n = 8, color = '#ffe14d', speed = 260) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const s = rand(speed * 0.3, speed);
      this.items.push({
        kind: 'spark', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(0.25, 0.55), age: 0,
        size: rand(2.5, 6), color,
        drag: 3.5, grav: 300,
      });
    }
  }

  stars(x, y, n = 6, color = '#ffe14d') {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      const s = rand(120, 380);
      this.items.push({
        kind: 'star', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s - 120,
        life: rand(0.5, 0.9), age: 0,
        size: rand(6, 13), color,
        rot: rand(0, TAU), rotV: rand(-8, 8),
        drag: 2.0, grav: 500,
      });
    }
  }

  hearts(x, y, n = 5) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.85, -Math.PI * 0.15);
      const s = rand(90, 240);
      this.items.push({
        kind: 'heart', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(0.6, 1.1), age: 0,
        size: rand(8, 15), color: pick(['#ff8ac2', '#ff5a8a', '#ffb3d6']),
        rot: rand(-0.5, 0.5), rotV: rand(-2, 2),
        drag: 1.6, grav: -60,
      });
    }
  }

  confetti(x, y, n = 26) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.9, -Math.PI * 0.1);
      const s = rand(220, 620);
      this.items.push({
        kind: 'confetti', x, y,
        vx: Math.cos(a) * s, vy: Math.sin(a) * s,
        life: rand(0.9, 1.7), age: 0,
        size: rand(5, 10), color: pick(CONFETTI_COLORS),
        rot: rand(0, TAU), rotV: rand(-10, 10),
        drag: 1.4, grav: 620, flutter: rand(4, 9),
      });
    }
  }

  ring(x, y, color = '#ffffff', maxR = 60) {
    this.items.push({ kind: 'ring', x, y, life: 0.35, age: 0, color, maxR, vx: 0, vy: 0, drag: 0, grav: 0 });
  }

  bubble(x, y, n = 3) {
    for (let i = 0; i < n; i++) {
      this.items.push({
        kind: 'bubble', x: x + rand(-10, 10), y,
        vx: rand(-20, 20), vy: rand(-90, -50),
        life: rand(0.8, 1.4), age: 0,
        size: rand(3, 8), color: 'rgba(255,255,255,0.75)',
        drag: 0.4, grav: -40,
      });
    }
  }

  pop(x, y, text, { color = '#ffffff', size = 34, stroke = '#e8562f' } = {}) {
    this.pops.push({ x, y, text, color, stroke, size, age: 0, life: 0.9 });
  }

  update(dt) {
    const items = this.items;
    for (let i = items.length - 1; i >= 0; i--) {
      const p = items[i];
      p.age += dt;
      if (p.age >= p.life) {
        items.splice(i, 1);
        continue;
      }
      const drag = 1 - clamp(p.drag * dt, 0, 0.9);
      p.vx *= drag;
      p.vy = p.vy * drag + p.grav * dt;
      if (p.flutter) p.vx += Math.sin(p.age * p.flutter * 3) * 30 * dt;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      if (p.rotV) p.rot += p.rotV * dt;
    }
    const pops = this.pops;
    for (let i = pops.length - 1; i >= 0; i--) {
      const p = pops[i];
      p.age += dt;
      if (p.age >= p.life) pops.splice(i, 1);
    }
  }

  draw(ctx) {
    for (const p of this.items) {
      const t = p.age / p.life;
      const alpha = 1 - t * t;
      ctx.globalAlpha = alpha;
      switch (p.kind) {
        case 'spark': {
          ctx.fillStyle = p.color;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size * (1 - t * 0.6), 0, TAU);
          ctx.fill();
          break;
        }
        case 'star': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          starPath(ctx, 0, 0, p.size, p.size * 0.45);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'heart': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          heartPath(ctx, 0, 0, p.size);
          ctx.fill();
          ctx.restore();
          break;
        }
        case 'confetti': {
          ctx.save();
          ctx.translate(p.x, p.y);
          ctx.rotate(p.rot);
          ctx.fillStyle = p.color;
          const w = p.size;
          const h = p.size * (0.5 + 0.5 * Math.abs(Math.sin(p.age * 7)));
          ctx.fillRect(-w / 2, -h / 2, w, h);
          ctx.restore();
          break;
        }
        case 'ring': {
          const r = p.maxR * (0.3 + 0.7 * t);
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 4 * (1 - t);
          ctx.beginPath();
          ctx.arc(p.x, p.y, r, 0, TAU);
          ctx.stroke();
          break;
        }
        case 'bubble': {
          ctx.strokeStyle = p.color;
          ctx.lineWidth = 1.5;
          ctx.beginPath();
          ctx.arc(p.x, p.y, p.size, 0, TAU);
          ctx.stroke();
          break;
        }
      }
    }
    ctx.globalAlpha = 1;

    for (const p of this.pops) {
      const t = p.age / p.life;
      const scale = t < 0.25 ? 0.5 + (t / 0.25) * 0.6 : 1.1 - (t - 0.25) * 0.12;
      const y = p.y - t * 46;
      ctx.save();
      ctx.globalAlpha = 1 - Math.max(0, (t - 0.6) / 0.4);
      ctx.translate(p.x, y);
      ctx.scale(scale, scale);
      ctx.font = font(p.size);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      outlinedText(ctx, p.text, 0, 0, p.color, p.stroke, p.size * 0.22);
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }
}
