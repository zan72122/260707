// パーティクル演出(きらきら・紙吹雪・しぶき・浮かぶ文字)
import { TAU, rand, randi, choice, starPath, heartPath, drawBubbleText } from './utils.js';

const MAX_PARTICLES = 600;

export class FxSystem {
  constructor() {
    this.parts = [];
    this.floaters = [];
  }

  clear() {
    this.parts.length = 0;
    this.floaters.length = 0;
  }

  spawn(p) {
    if (this.parts.length >= MAX_PARTICLES) this.parts.shift();
    this.parts.push({
      x: 0, y: 0, vx: 0, vy: 0, g: 0, drag: 1,
      life: 1, decay: 1.2, size: 6, hue: 0, sat: 85, lit: 60,
      kind: 'spark', rot: rand(0, TAU), vr: rand(-4, 4), twinkle: rand(0, TAU),
      ...p,
    });
  }

  // ピンに当たった時の小さな煌めき
  sparkle(x, y, hue, n = 4, speed = 60) {
    for (let i = 0; i < n; i++) {
      const a = rand(0, TAU);
      this.spawn({
        x, y, hue,
        vx: Math.cos(a) * rand(10, speed),
        vy: Math.sin(a) * rand(10, speed) - 20,
        g: 120, decay: rand(1.6, 2.6), size: rand(2.5, 5), kind: 'spark',
      });
    }
  }

  // 着地時のしぶき
  splash(x, y, hue, n = 6) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI * 0.85, -Math.PI * 0.15);
      const sp = rand(30, 110);
      this.spawn({
        x, y, hue,
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: 300, decay: rand(1.8, 3), size: rand(2, 4.5), kind: 'dot',
      });
    }
  }

  // 大きなお祝い紙吹雪
  confettiBurst(x, y, n = 40, power = 320) {
    for (let i = 0; i < n; i++) {
      const a = rand(-Math.PI, 0);
      const sp = rand(power * 0.3, power);
      this.spawn({
        x, y, hue: randi(0, 360),
        vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
        g: 260, drag: 0.985, decay: rand(0.35, 0.6),
        size: rand(5, 10), kind: choice(['confetti', 'confetti', 'star', 'heart']),
      });
    }
  }

  // 上からひらひら降る紙吹雪
  confettiRain(w, n = 3) {
    for (let i = 0; i < n; i++) {
      this.spawn({
        x: rand(0, w), y: -12, hue: randi(0, 360),
        vx: rand(-25, 25), vy: rand(45, 110),
        g: 25, drag: 0.995, decay: rand(0.18, 0.3),
        size: rand(5, 10), kind: choice(['confetti', 'confetti', 'star', 'heart']),
      });
    }
  }

  // ふわっと浮かんで消える文字(「わーい!」など)
  floatText(x, y, text, hue = 0, size = 26) {
    this.floaters.push({ x, y, text, hue, size, life: 1 });
  }

  update(dt) {
    const parts = this.parts;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.vy += p.g * dt;
      p.vx *= p.drag;
      p.vy *= p.drag;
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.rot += p.vr * dt;
      p.life -= p.decay * dt;
      if (p.life <= 0) parts.splice(i, 1);
    }
    const fs = this.floaters;
    for (let i = fs.length - 1; i >= 0; i--) {
      const f = fs[i];
      f.y -= 34 * dt;
      f.life -= 0.8 * dt;
      if (f.life <= 0) fs.splice(i, 1);
    }
  }

  draw(ctx, t) {
    for (const p of this.parts) {
      const alpha = Math.min(1, p.life * 1.6);
      ctx.globalAlpha = alpha;
      const color = `hsl(${p.hue} ${p.sat}% ${p.lit}%)`;
      if (p.kind === 'spark') {
        const tw = 0.7 + 0.3 * Math.sin(t * 14 + p.twinkle);
        ctx.fillStyle = '#fff';
        starPath(ctx, p.x, p.y, p.size * tw, p.size * tw * 0.42, 4, p.rot);
        ctx.fill();
        ctx.fillStyle = color;
        starPath(ctx, p.x, p.y, p.size * tw * 0.6, p.size * tw * 0.25, 4, p.rot);
        ctx.fill();
      } else if (p.kind === 'dot') {
        ctx.fillStyle = color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, TAU);
        ctx.fill();
      } else if (p.kind === 'star') {
        ctx.fillStyle = color;
        starPath(ctx, p.x, p.y, p.size, p.size * 0.45, 5, p.rot);
        ctx.fill();
      } else if (p.kind === 'heart') {
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot * 0.4);
        ctx.fillStyle = color;
        heartPath(ctx, 0, 0, p.size * 0.7);
        ctx.fill();
        ctx.restore();
      } else { // confetti
        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rot);
        ctx.scale(1, 0.4 + 0.6 * Math.abs(Math.sin(t * 6 + p.twinkle)));
        ctx.fillStyle = color;
        ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size * 0.66);
        ctx.restore();
      }
    }
    ctx.globalAlpha = 1;
    for (const f of this.floaters) {
      ctx.globalAlpha = Math.min(1, f.life * 2);
      drawBubbleText(ctx, f.text, f.x, f.y, f.size, `hsl(${f.hue} 80% 55%)`, '#fff', 0.28);
    }
    ctx.globalAlpha = 1;
  }
}
