// マスコット: しろくまのコリー(応援したり食べたりする)
import { TAU, clamp } from '../core/utils.js';

export class Mascot {
  constructor() {
    this.mood = 'idle'; // idle | cheer | eat | yum
    this.moodT = 0;
    this.blinkT = 0;
    this.x = 0;
    this.y = 0;
    this.s = 40;
  }

  setPlace(x, y, s) {
    this.x = x;
    this.y = y;
    this.s = s;
  }

  setMood(mood, dur = 1.6) {
    this.mood = mood;
    this.moodT = dur;
  }

  update(dt) {
    if (this.moodT > 0) {
      this.moodT -= dt;
      if (this.moodT <= 0 && this.mood !== 'eat') this.mood = 'idle';
    }
    this.blinkT -= dt;
    if (this.blinkT < -0.14) this.blinkT = 2.4 + Math.random() * 2.5;
  }

  draw(ctx, t) {
    const s = this.s;
    const cheer = this.mood === 'cheer' || this.mood === 'yum';
    const hop = cheer ? Math.abs(Math.sin(t * 9)) * s * 0.22 : Math.sin(t * 2.2) * s * 0.03;
    const x = this.x, y = this.y - hop;

    ctx.save();
    ctx.translate(x, y);

    // 影
    ctx.fillStyle = 'rgba(90,60,30,0.18)';
    ctx.beginPath();
    ctx.ellipse(0, this.y - y + s * 1.02, s * 0.85, s * 0.16, 0, 0, TAU);
    ctx.fill();

    // 体
    const body = ctx.createRadialGradient(-s * 0.25, -s * 0.2, s * 0.2, 0, 0, s * 1.15);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(1, '#dfeef7');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.ellipse(0, s * 0.35, s * 0.78, s * 0.68, 0, 0, TAU);
    ctx.fill();

    // 腕(応援時はバンザイ)
    const armA = cheer ? -0.9 + Math.sin(t * 9) * 0.25 : 0.55;
    for (const side of [-1, 1]) {
      ctx.save();
      ctx.translate(side * s * 0.62, s * 0.12);
      ctx.rotate(side * armA);
      ctx.fillStyle = '#f2f8fc';
      ctx.beginPath();
      ctx.ellipse(0, s * 0.22, s * 0.2, s * 0.36, 0, 0, TAU);
      ctx.fill();
      ctx.restore();
    }

    // 頭
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(0, -s * 0.42, s * 0.62, 0, TAU);
    ctx.fill();
    // 耳
    ctx.fillStyle = '#eef6fb';
    ctx.beginPath();
    ctx.arc(-s * 0.45, -s * 0.88, s * 0.17, 0, TAU);
    ctx.arc(s * 0.45, -s * 0.88, s * 0.17, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ffd7de';
    ctx.beginPath();
    ctx.arc(-s * 0.45, -s * 0.88, s * 0.08, 0, TAU);
    ctx.arc(s * 0.45, -s * 0.88, s * 0.08, 0, TAU);
    ctx.fill();

    // 顔
    const blink = this.blinkT < 0 ? 0.1 : 1;
    ctx.fillStyle = '#3d4a55';
    if (this.mood === 'yum' || this.mood === 'cheer') {
      // にっこり目(^ ^)
      ctx.strokeStyle = '#3d4a55';
      ctx.lineWidth = s * 0.06;
      ctx.lineCap = 'round';
      for (const side of [-1, 1]) {
        ctx.beginPath();
        ctx.arc(side * s * 0.22, -s * 0.45, s * 0.1, Math.PI + 0.4, TAU - 0.4);
        ctx.stroke();
      }
    } else {
      ctx.beginPath();
      ctx.ellipse(-s * 0.22, -s * 0.46, s * 0.07, s * 0.07 * blink, 0, 0, TAU);
      ctx.ellipse(s * 0.22, -s * 0.46, s * 0.07, s * 0.07 * blink, 0, 0, TAU);
      ctx.fill();
    }
    // 鼻・口
    ctx.fillStyle = '#5a6b7a';
    ctx.beginPath();
    ctx.ellipse(0, -s * 0.3, s * 0.09, s * 0.065, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = '#5a6b7a';
    ctx.lineWidth = s * 0.045;
    ctx.lineCap = 'round';
    if (this.mood === 'eat') {
      // ぱくぱく口
      const open = (Math.sin(t * 10) + 1) / 2;
      ctx.fillStyle = '#e26a7c';
      ctx.beginPath();
      ctx.ellipse(0, -s * 0.14, s * 0.12, s * (0.04 + open * 0.09), 0, 0, TAU);
      ctx.fill();
    } else {
      ctx.beginPath();
      ctx.arc(0, -s * 0.2, s * 0.1, 0.3, Math.PI - 0.3);
      ctx.stroke();
    }
    // ほっぺ
    ctx.fillStyle = 'rgba(255,150,170,0.55)';
    ctx.beginPath();
    ctx.arc(-s * 0.42, -s * 0.28, s * 0.1, 0, TAU);
    ctx.arc(s * 0.42, -s * 0.28, s * 0.1, 0, TAU);
    ctx.fill();

    // 足
    ctx.fillStyle = '#eef6fb';
    ctx.beginPath();
    ctx.ellipse(-s * 0.3, s * 0.95, s * 0.2, s * 0.12, 0, 0, TAU);
    ctx.ellipse(s * 0.3, s * 0.95, s * 0.2, s * 0.12, 0, 0, TAU);
    ctx.fill();

    ctx.restore();
  }
}
