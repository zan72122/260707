// あめあがりのにわ: 描画専用モジュール(空・草むら・水たまり・しずく・ミニ虹・てんとうむし)

import { RAINBOW, TAU, drawGlow, rgba } from '../core/utils.js';

export function drawGardenBackground(ctx, s) {
  const { W, H } = s.engine;
  // 雨上がりの空
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#7fc4e8');
  g.addColorStop(0.5, '#b3e3f5');
  g.addColorStop(1, '#e8f8ff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 遠ざかる雨雲
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  const cx = W * 0.85 + Math.sin(s.time * 0.2) * 8;
  for (const [ox, oy, r] of [[0, 0, 34], [-30, 10, 26], [30, 10, 26], [0, 16, 30]]) {
    ctx.beginPath();
    ctx.arc(cx + ox, H * 0.1 + oy, r, 0, TAU);
    ctx.fill();
  }
  // 草むら
  const gg = ctx.createLinearGradient(0, s.groundY, 0, H);
  gg.addColorStop(0, '#8ed47f');
  gg.addColorStop(1, '#5aa860');
  ctx.fillStyle = gg;
  ctx.beginPath();
  ctx.moveTo(0, s.groundY + 14);
  for (let x = 0; x <= W; x += 24) {
    ctx.lineTo(x, s.groundY + Math.sin(x * 0.05) * 8);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  // 草の葉
  ctx.strokeStyle = 'rgba(70,140,80,0.6)';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  for (let i = 0; i < 24; i++) {
    const x = (i * 83) % W;
    const sway = Math.sin(s.time * 1.5 + i) * 3;
    ctx.beginPath();
    ctx.moveTo(x, s.groundY + 20);
    ctx.quadraticCurveTo(x + sway, s.groundY - 2, x + sway * 2, s.groundY - 16);
    ctx.stroke();
  }
  drawPuddle(ctx, s);
}

export function drawPuddle(ctx, s) {
  const p = s.puddle;
  const pg = ctx.createRadialGradient(p.x, p.y, 2, p.x, p.y, p.w * 0.6);
  pg.addColorStop(0, '#cdeffb');
  pg.addColorStop(1, '#7fb8d8');
  ctx.fillStyle = pg;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, p.w * 0.6, p.h, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // 波紋
  const rip = (s.time % 2.4) / 2.4;
  ctx.strokeStyle = `rgba(255,255,255,${0.5 * (1 - rip)})`;
  ctx.beginPath();
  ctx.ellipse(p.x, p.y, p.w * 0.55 * rip, p.h * 0.9 * rip, 0, 0, TAU);
  ctx.stroke();
  // 水たまりの虹リフレクション
  if (s.puddleGlow > 0.02) {
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < RAINBOW.length; i++) {
      ctx.strokeStyle = rgba(RAINBOW[i].hex, 0.32 * s.puddleGlow);
      ctx.lineWidth = 9;
      ctx.beginPath();
      ctx.arc(p.x, p.y + 8, p.w * 0.42 - i * 8, Math.PI * 1.1, Math.PI * 1.9);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawLeafDrops(ctx, s) {
  for (const d of s.drops) {
    ctx.save();
    ctx.translate(d.x, d.y + d.r + 4);
    ctx.rotate(d.leafRot);
    ctx.fillStyle = '#6dbb6d';
    ctx.beginPath();
    ctx.ellipse(0, 4, d.r * 3.2, d.r * 1.4, 0, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(50,110,60,0.6)';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-d.r * 2.8, 4);
    ctx.lineTo(d.r * 2.8, 4);
    ctx.stroke();
    ctx.restore();
    // しずく
    if (d.lit > 0) drawGlow(ctx, d.x, d.y, d.r * 4.5, '#dff6ff', d.lit * 0.7);
    const dg = ctx.createRadialGradient(d.x - d.r * 0.3, d.y - d.r * 0.3, 0.5, d.x, d.y, d.r);
    dg.addColorStop(0, 'rgba(255,255,255,0.95)');
    dg.addColorStop(1, d.lit > 0 ? 'rgba(170,230,255,0.9)' : 'rgba(160,210,240,0.75)');
    ctx.fillStyle = dg;
    ctx.beginPath();
    ctx.arc(d.x, d.y, d.r, 0, TAU);
    ctx.fill();
  }
}

// 霧吹きで生まれた空中ミニ虹
export function drawMistRainbows(ctx, s) {
  for (const m of s.mistClouds) {
    if (!m.rainbow) continue;
    const fade = m.t > 2.4 ? 1 - (m.t - 2.4) / 0.8 : 1;
    ctx.save();
    ctx.globalCompositeOperation = 'lighter';
    for (let i = 0; i < RAINBOW.length; i++) {
      ctx.strokeStyle = rgba(RAINBOW[i].hex, 0.4 * m.rainbow * fade);
      ctx.lineWidth = 6;
      ctx.beginPath();
      ctx.arc(m.x, m.y + 26, 60 - i * 5.5, Math.PI * 1.08, Math.PI * 1.92);
      ctx.stroke();
    }
    ctx.restore();
  }
}

export function drawBug(ctx, s) {
  const b = s.bug;
  const wob = Math.sin(s.time * 14) * 1.6;
  ctx.save();
  ctx.translate(b.x, b.y - 8 + wob);
  ctx.rotate(b.angle);
  ctx.fillStyle = '#e33b3b';
  ctx.beginPath();
  ctx.ellipse(0, 0, 13, 9, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#2b2b2b';
  ctx.beginPath();
  ctx.arc(11, 0, 5, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#2b2b2b';
  ctx.lineWidth = 1.6;
  ctx.beginPath();
  ctx.moveTo(-2, -9);
  ctx.lineTo(-2, 9);
  ctx.stroke();
  for (const [px, py] of [[-6, -4], [0, -5], [6, -3], [-6, 4], [0, 5], [6, 3]]) {
    ctx.fillStyle = '#2b2b2b';
    ctx.beginPath();
    ctx.arc(px, py, 1.8, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
