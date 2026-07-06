// にじいろドレスこうぼう: 描画専用モジュール(舞台・ドレス・リボン・宝石・扇風機)

import { RAINBOW, TAU, drawGlow, rgba, starPath } from '../core/utils.js';

export function drawAtelierBackground(ctx, s) {
  const { W, H } = s.engine;
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#4a2f66');
  g.addColorStop(0.6, '#6d4488');
  g.addColorStop(1, '#8f5aa3');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // 舞台のスポットライト
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const sp = ctx.createRadialGradient(s.dress.x, s.dress.y, 0, s.dress.x, s.dress.y, s.dress.h);
  sp.addColorStop(0, 'rgba(255,240,255,0.18)');
  sp.addColorStop(1, 'rgba(255,240,255,0)');
  ctx.fillStyle = sp;
  ctx.fillRect(0, 0, W, H);
  ctx.restore();
  // 床
  ctx.fillStyle = '#3b2352';
  ctx.fillRect(0, H * 0.88, W, H * 0.12);
  // 星のかざり
  for (let i = 0; i < 14; i++) {
    const x = (i * 197) % W;
    const y = (i * 89) % (H * 0.3);
    ctx.fillStyle = `rgba(255,230,160,${0.25 + 0.4 * Math.abs(Math.sin(s.time * 1.3 + i))})`;
    starPath(ctx, x, y, 5, 2.2);
    ctx.fill();
  }
}

export function dressPath(ctx, d, sway) {
  ctx.beginPath();
  const top = d.y - d.h * 0.5;
  ctx.moveTo(d.x - d.w * 0.14, top);
  ctx.lineTo(d.x + d.w * 0.14, top);
  ctx.quadraticCurveTo(d.x + d.w * 0.18, d.y - d.h * 0.18, d.x + d.w * 0.16, d.y - d.h * 0.08);
  ctx.quadraticCurveTo(d.x + d.w * 0.52 + sway * 18, d.y + d.h * 0.22, d.x + d.w * 0.5 + sway * 30, d.y + d.h * 0.44);
  ctx.quadraticCurveTo(d.x + sway * 22, d.y + d.h * 0.52, d.x - d.w * 0.5 + sway * 30, d.y + d.h * 0.44);
  ctx.quadraticCurveTo(d.x - d.w * 0.52 + sway * 18, d.y + d.h * 0.22, d.x - d.w * 0.16, d.y - d.h * 0.08);
  ctx.quadraticCurveTo(d.x - d.w * 0.18, d.y - d.h * 0.18, d.x - d.w * 0.14, top);
  ctx.closePath();
}

export function drawDress(ctx, s, ROWS, COLS) {
  const d = s.dress;
  const sway = Math.sin(s.time * 3) * s.gust + Math.sin(s.time * 1.1) * 0.06;
  // トルソー(マネキン台)
  ctx.strokeStyle = '#c9a26b';
  ctx.lineWidth = 8;
  ctx.beginPath();
  ctx.moveTo(d.x, d.y + d.h * 0.4);
  ctx.lineTo(d.x, d.y + d.h * 0.62);
  ctx.stroke();
  ctx.beginPath();
  ctx.ellipse(d.x, d.y + d.h * 0.63, d.w * 0.2, 10, 0, 0, TAU);
  ctx.fillStyle = '#a37d4b';
  ctx.fill();

  ctx.save();
  dressPath(ctx, d, sway);
  // 白い布
  const fb = ctx.createLinearGradient(d.x - d.w / 2, d.y - d.h / 2, d.x + d.w / 2, d.y + d.h / 2);
  fb.addColorStop(0, '#ffffff');
  fb.addColorStop(1, '#f0eaf2');
  ctx.fillStyle = fb;
  ctx.fill();
  ctx.save();
  ctx.clip();
  // 染色セルをやわらかい円で描く
  for (const cell of s.cells) {
    if (cell.amt <= 0.01 || cell.ci < 0) continue;
    const { x, y } = s._cellPos(cell);
    const sx = x + sway * (cell.r / ROWS) * 26;
    const rad = (d.w / COLS) * 1.05;
    const grd = ctx.createRadialGradient(sx, y, 0, sx, y, rad);
    grd.addColorStop(0, rgba(RAINBOW[cell.ci].hex, 0.85 * cell.amt));
    grd.addColorStop(1, rgba(RAINBOW[cell.ci].hex, 0));
    ctx.fillStyle = grd;
    ctx.beginPath();
    ctx.arc(sx, y, rad, 0, TAU);
    ctx.fill();
  }
  // 布のドレープ陰影
  ctx.strokeStyle = 'rgba(120,90,140,0.16)';
  ctx.lineWidth = 3;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.moveTo(d.x + i * d.w * 0.1, d.y - d.h * 0.05);
    ctx.quadraticCurveTo(d.x + i * d.w * 0.16 + sway * 20, d.y + d.h * 0.2, d.x + i * d.w * 0.22 + sway * 30, d.y + d.h * 0.46);
    ctx.stroke();
  }
  ctx.restore();
  ctx.strokeStyle = 'rgba(190,170,200,0.7)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.restore();

  drawRibbonAndGems(ctx, s, d);
}

export function drawRibbonAndGems(ctx, s, d) {
  // リボン
  const rx = d.x;
  const ry = d.y - d.h * 0.34;
  const col = s.ribbon.ci >= 0 ? rgba(RAINBOW[s.ribbon.ci].hex, 0.35 + s.ribbon.amt * 0.65) : '#f6f0f6';
  ctx.fillStyle = col;
  ctx.strokeStyle = 'rgba(150,130,160,0.5)';
  ctx.lineWidth = 2;
  for (const sgn of [-1, 1]) {
    ctx.beginPath();
    ctx.moveTo(rx, ry);
    ctx.quadraticCurveTo(rx + sgn * 26, ry - 16, rx + sgn * 30, ry);
    ctx.quadraticCurveTo(rx + sgn * 26, ry + 16, rx, ry);
    ctx.fill();
    ctx.stroke();
  }
  ctx.beginPath();
  ctx.arc(rx, ry, 7, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // 宝石
  for (const g of s.gems) {
    if (g.lit > 0) drawGlow(ctx, g.x, g.y, 30, '#bfe9ff', g.lit * 0.8);
    const gg = ctx.createRadialGradient(g.x - 3, g.y - 3, 1, g.x, g.y, g.r);
    gg.addColorStop(0, '#ffffff');
    gg.addColorStop(1, g.lit > 0 ? '#9adcff' : '#cfd8e6');
    ctx.fillStyle = gg;
    starPath(ctx, g.x, g.y, g.r, g.r * 0.55, 4, s.time * (g.lit > 0 ? 2 : 0.4));
    ctx.fill();
  }
}

export function drawFan(ctx, s) {
  const f = s.fan;
  const spin = s.gust > 0.05 ? s.time * 26 : s.time * 2;
  ctx.save();
  ctx.translate(f.x, f.y);
  drawGlow(ctx, 0, 0, 60, '#bfe9ff', 0.2 + s.gust * 0.3);
  // 台座
  ctx.fillStyle = '#7fb7d9';
  ctx.beginPath();
  ctx.ellipse(0, 46, 30, 10, 0, 0, TAU);
  ctx.fill();
  ctx.fillRect(-6, 10, 12, 38);
  // 羽根
  ctx.save();
  ctx.rotate(spin);
  for (let i = 0; i < 4; i++) {
    ctx.rotate(TAU / 4);
    ctx.fillStyle = 'rgba(220,245,255,0.9)';
    ctx.beginPath();
    ctx.ellipse(0, -20, 12, 22, 0, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
  ctx.fillStyle = '#5a94b8';
  ctx.beginPath();
  ctx.arc(0, 0, 9, 0, TAU);
  ctx.fill();
  ctx.restore();
}
