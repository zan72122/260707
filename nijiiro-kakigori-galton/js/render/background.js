// 夏祭りの空の背景(太陽・雲・ガーランド・ぼかし光)
import { TAU, rand } from '../core/utils.js';

export class Background {
  constructor() {
    this.clouds = [];
    this.bokeh = [];
    this.w = 0;
    this.h = 0;
  }

  setSize(w, h) {
    this.w = w;
    this.h = h;
    this.clouds = [];
    const n = Math.max(4, Math.round(w / 220));
    for (let i = 0; i < n; i++) {
      this.clouds.push({
        x: rand(0, w),
        y: rand(h * 0.04, h * 0.42),
        s: rand(0.5, 1.3),
        v: rand(6, 16),
        puffs: [rand(0.7, 1), rand(0.8, 1.1), rand(0.6, 0.9)],
      });
    }
    this.bokeh = [];
    for (let i = 0; i < 14; i++) {
      this.bokeh.push({ x: rand(0, w), y: rand(0, h), r: rand(20, 70), p: rand(0, TAU), v: rand(0.3, 0.8) });
    }
  }

  update(dt) {
    for (const c of this.clouds) {
      c.x += c.v * dt;
      if (c.x - 120 * c.s > this.w) c.x = -120 * c.s;
    }
  }

  draw(ctx, t) {
    const { w, h } = this;
    // 空のグラデーション
    const sky = ctx.createLinearGradient(0, 0, 0, h);
    sky.addColorStop(0, '#6fc3f7');
    sky.addColorStop(0.45, '#a8ddfb');
    sky.addColorStop(0.75, '#e3f5ff');
    sky.addColorStop(1, '#fff3e0');
    ctx.fillStyle = sky;
    ctx.fillRect(0, 0, w, h);

    // ふわふわ光るぼかし玉
    for (const b of this.bokeh) {
      const a = 0.05 + 0.04 * Math.sin(t * b.v + b.p);
      ctx.fillStyle = `hsla(${(b.p * 60 + t * 12) % 360} 80% 85% / ${a})`;
      ctx.beginPath();
      ctx.arc(b.x, b.y + Math.sin(t * b.v * 0.7 + b.p) * 8, b.r, 0, TAU);
      ctx.fill();
    }

    // にこにこ太陽
    this._sun(ctx, w * 0.86, h * 0.1, Math.min(w, h) * 0.055, t);

    // 雲
    for (const c of this.clouds) this._cloud(ctx, c, t);
  }

  _sun(ctx, x, y, r, t) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(t * 0.15);
    ctx.strokeStyle = 'rgba(255,200,60,0.75)';
    ctx.lineWidth = r * 0.18;
    ctx.lineCap = 'round';
    for (let i = 0; i < 12; i++) {
      const a = (i / 12) * TAU;
      const r1 = r * 1.25, r2 = r * (1.5 + 0.12 * Math.sin(t * 3 + i));
      ctx.beginPath();
      ctx.moveTo(Math.cos(a) * r1, Math.sin(a) * r1);
      ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2);
      ctx.stroke();
    }
    ctx.rotate(-t * 0.15);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#fff4b8');
    g.addColorStop(1, '#ffcb3d');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    // にっこり顔
    ctx.fillStyle = '#c77f1b';
    ctx.beginPath();
    ctx.arc(-r * 0.32, -r * 0.12, r * 0.09, 0, TAU);
    ctx.arc(r * 0.32, -r * 0.12, r * 0.09, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#c77f1b';
    ctx.lineWidth = r * 0.1;
    ctx.beginPath();
    ctx.arc(0, r * 0.12, r * 0.34, 0.25, Math.PI - 0.25);
    ctx.stroke();
    ctx.restore();
  }

  _cloud(ctx, c, t) {
    const y = c.y + Math.sin(t * 0.5 + c.x) * 4;
    ctx.fillStyle = 'rgba(255,255,255,0.92)';
    ctx.beginPath();
    const s = 34 * c.s;
    ctx.arc(c.x, y, s * c.puffs[0], 0, TAU);
    ctx.arc(c.x + s * 1.1, y - s * 0.35, s * c.puffs[1], 0, TAU);
    ctx.arc(c.x + s * 2.2, y, s * c.puffs[2], 0, TAU);
    ctx.arc(c.x + s * 1.1, y + s * 0.45, s * 1.05, 0, TAU);
    ctx.fill();
  }

}
