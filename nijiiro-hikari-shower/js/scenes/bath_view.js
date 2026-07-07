// おふろのにじあわ: 描画専用モジュール(タイル・水面・アヒル・シャボン玉)

import { RAINBOW, TAU, drawGlow, rgba } from '../core/utils.js';
import { drawCaustics } from './props.js';

const TILE_SIZE = 64;

export function drawBathBackground(ctx, s) {
  const { W, H } = s.engine;
  // タイルの壁
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#bfe8ef');
  g.addColorStop(1, '#8fc9dd');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 3;
  for (let x = 0; x < W; x += TILE_SIZE) {
    ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, s.waterY); ctx.stroke();
  }
  for (let y = 0; y < s.waterY; y += TILE_SIZE) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(W, y); ctx.stroke();
  }
  // 天井のゆらゆら光
  if (s.waterLit || s.ceilingGlow > 0.02) {
    const a = (s.waterLit ? 0.5 : 0) + s.ceilingGlow * 0.5;
    drawCaustics(ctx, W * 0.5, H * 0.05, W * 0.8, 60, s.time, '#dff6ff', a);
  }
}

export function drawBathWater(ctx, s) {
  const { W, H } = s.engine;
  const wg = ctx.createLinearGradient(0, s.waterY, 0, H);
  wg.addColorStop(0, 'rgba(120,205,235,0.94)');
  wg.addColorStop(1, 'rgba(60,150,200,0.98)');
  ctx.fillStyle = wg;
  ctx.beginPath();
  ctx.moveTo(0, s.waterY + 6);
  for (let x = 0; x <= W; x += 18) {
    ctx.lineTo(x, s.waterY + Math.sin(x * 0.03 + s.time * 2.2) * 5);
  }
  ctx.lineTo(W, H);
  ctx.lineTo(0, H);
  ctx.closePath();
  ctx.fill();
  // 水面のきらめき
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 7; i++) {
    const x = ((i * 173 + s.time * 40) % (W + 80)) - 40;
    drawGlow(ctx, x, s.waterY + Math.sin(x * 0.03 + s.time * 2.2) * 5, 24, '#ffffff', 0.22);
  }
  ctx.restore();
}

export function drawDuck(ctx, s) {
  const d = s.duck;
  const jump = d.jump ?? 0;
  const tilt = Math.sin(d.phase * 1.8) * 0.08 + Math.sin(s.time * 12) * 0.18 * jump;
  ctx.save();
  ctx.translate(d.x, d.y - Math.abs(Math.sin(s.time * 7)) * 34 * jump);
  ctx.rotate(tilt);
  if (d.glow > 0) drawGlow(ctx, 0, -10, 90, '#ffe066', d.glow * 0.7);
  // からだ
  const bg = ctx.createRadialGradient(-8, -18, 4, 0, -6, 46);
  bg.addColorStop(0, '#fff3a6');
  bg.addColorStop(1, '#ffd83d');
  ctx.fillStyle = bg;
  ctx.beginPath();
  ctx.ellipse(4, -6, 38, 26, 0, 0, TAU);
  ctx.arc(-20, -30, 20, 0, TAU);
  ctx.fill();
  // くちばし
  ctx.fillStyle = '#ff9736';
  ctx.beginPath();
  ctx.ellipse(-40, -28, 11, 6, -0.15, 0, TAU);
  ctx.fill();
  // 目(光ると笑う)
  ctx.fillStyle = '#4a3b2a';
  if (d.glow > 0.3) {
    ctx.lineWidth = 3;
    ctx.strokeStyle = '#4a3b2a';
    ctx.lineCap = 'round';
    ctx.beginPath();
    ctx.arc(-24, -33, 5, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  } else {
    ctx.beginPath();
    ctx.arc(-24, -34, 3.4, 0, TAU);
    ctx.fill();
  }
  // 羽
  ctx.fillStyle = 'rgba(240,185,40,0.75)';
  ctx.beginPath();
  ctx.ellipse(14, -4, 16, 10, -0.4, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawBubble(ctx, b, time) {
  ctx.save();
  ctx.translate(b.x, b.y);
  const g = ctx.createRadialGradient(-b.r * 0.3, -b.r * 0.3, b.r * 0.1, 0, 0, b.r);
  g.addColorStop(0, 'rgba(255,255,255,0.35)');
  g.addColorStop(0.75, 'rgba(220,245,255,0.1)');
  g.addColorStop(1, 'rgba(255,255,255,0.42)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, b.r, 0, TAU);
  ctx.fill();
  // 虹色の膜(光が当たると鮮やかに)
  const irid = 0.18 + b.shine * 0.6;
  ctx.globalCompositeOperation = 'lighter';
  ctx.lineWidth = 3.5 + b.shine * 3;
  for (let i = 0; i < 5; i++) {
    const hue = (b.hue + time * 60 + i * 60) % 360;
    ctx.strokeStyle = `hsla(${hue},90%,70%,${irid})`;
    ctx.beginPath();
    ctx.arc(0, 0, b.r - i * 1.8, i * 1.3 + time, i * 1.3 + time + 2.2);
    ctx.stroke();
  }
  // ハイライト
  ctx.fillStyle = 'rgba(255,255,255,0.8)';
  ctx.beginPath();
  ctx.ellipse(-b.r * 0.38, -b.r * 0.42, b.r * 0.16, b.r * 0.1, -0.7, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// 湯気の中にぼんやり浮かぶ虹
export function drawSteamRainbow(ctx, s) {
  const { W } = s.engine;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < RAINBOW.length; i++) {
    ctx.strokeStyle = rgba(RAINBOW[i].hex, 0.16);
    ctx.lineWidth = 10;
    ctx.beginPath();
    ctx.arc(W * 0.5, s.waterY + 40, 150 - i * 11, Math.PI * 1.15, Math.PI * 1.85);
    ctx.stroke();
  }
  ctx.restore();
}
