// 光源の描画: おひさま・かいちゅうでんとう・ろうそく・おつきさま

import { TAU, drawGlow, roundRect } from '../core/utils.js';

export function drawSource(ctx, rig, time) {
  switch (rig.sourceType) {
    case 'flash': return drawFlashlight(ctx, rig, time);
    case 'candle': return drawCandle(ctx, rig, time);
    case 'moon': return drawMoon(ctx, rig, time);
    default: return drawSun(ctx, rig, time);
  }
}

export function drawSun(ctx, rig, time) {
  const { lightX: x, lightY: y, lightRadius: r } = rig;
  ctx.save();
  drawGlow(ctx, x, y, r * 3.4, '#ffe9a3', 0.6);
  ctx.translate(x, y);
  ctx.rotate(time * 0.25);
  ctx.fillStyle = 'rgba(255,224,130,0.75)';
  for (let i = 0; i < 12; i++) {
    ctx.rotate(TAU / 12);
    const lenBoost = i % 2 === 0 ? 1.16 : 0.92;
    ctx.beginPath();
    ctx.moveTo(r * 1.12, -r * 0.16);
    ctx.lineTo(r * 1.55 * lenBoost, 0);
    ctx.lineTo(r * 1.12, r * 0.16);
    ctx.closePath();
    ctx.fill();
  }
  ctx.rotate(-time * 0.25);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 1.1);
  g.addColorStop(0, '#fffbe8');
  g.addColorStop(0.6, '#ffe066');
  g.addColorStop(1, '#ffb84d');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  drawFace(ctx, r, '#78461466');
  ctx.restore();
}

export function drawFlashlight(ctx, rig, time) {
  const { lightX: x, lightY: y } = rig;
  const a = Math.atan2(rig.prismY - y, rig.prismX - x);
  ctx.save();
  drawGlow(ctx, x, y, 80, '#fff3c4', 0.4);
  ctx.translate(x, y);
  ctx.rotate(a);
  const grad = ctx.createLinearGradient(0, -22, 0, 22);
  grad.addColorStop(0, '#ffd2e8');
  grad.addColorStop(0.5, '#ff9ecd');
  grad.addColorStop(1, '#e5679f');
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-46, -15);
  ctx.lineTo(6, -15);
  ctx.lineTo(20, -24);
  ctx.lineTo(20, 24);
  ctx.lineTo(6, 15);
  ctx.lineTo(-46, 15);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  const lg = ctx.createRadialGradient(20, 0, 2, 20, 0, 22);
  lg.addColorStop(0, '#ffffff');
  lg.addColorStop(1, '#fff0b3');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.ellipse(20, 0, 7, 24, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#fff6a8';
  ctx.save();
  ctx.translate(-24, 0);
  ctx.rotate(time);
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 8 : 3.6;
    const aa = (i * Math.PI) / 5 - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(aa) * r, Math.sin(aa) * r);
    else ctx.lineTo(Math.cos(aa) * r, Math.sin(aa) * r);
  }
  ctx.closePath();
  ctx.fill();
  ctx.restore();
  ctx.restore();
}

export function drawCandle(ctx, rig, time) {
  const { lightX: x, lightY: y } = rig;
  const flicker = Math.sin(time * 11) * 0.2 + Math.sin(time * 23 + 1) * 0.12;
  ctx.save();
  drawGlow(ctx, x, y - 26, 90 * (1 + flicker * 0.3), '#ffce8a', 0.55);
  // ろうそく本体
  const g = ctx.createLinearGradient(x - 16, 0, x + 16, 0);
  g.addColorStop(0, '#fef1dd');
  g.addColorStop(0.5, '#fffaf0');
  g.addColorStop(1, '#ecd9bd');
  ctx.fillStyle = g;
  roundRect(ctx, x - 15, y - 8, 30, 52, 7);
  ctx.fill();
  ctx.strokeStyle = 'rgba(200,160,110,0.6)';
  ctx.lineWidth = 2;
  ctx.stroke();
  // たれたろう
  ctx.fillStyle = '#fffaf0';
  ctx.beginPath();
  ctx.ellipse(x - 8, y - 4, 5, 9, 0.3, 0, TAU);
  ctx.fill();
  // 芯と炎(ゆらゆら)
  ctx.strokeStyle = '#6b503a';
  ctx.lineWidth = 2.4;
  ctx.beginPath();
  ctx.moveTo(x, y - 8);
  ctx.lineTo(x, y - 16);
  ctx.stroke();
  const fx = x + flicker * 5;
  const flame = ctx.createRadialGradient(fx, y - 26, 1, fx, y - 26, 16);
  flame.addColorStop(0, '#fff8d8');
  flame.addColorStop(0.55, '#ffc44d');
  flame.addColorStop(1, 'rgba(255,120,40,0)');
  ctx.fillStyle = flame;
  ctx.beginPath();
  ctx.ellipse(fx, y - 26, 9 + flicker * 2, 16 + flicker * 3, flicker * 0.2, 0, TAU);
  ctx.fill();
  ctx.restore();
}

export function drawMoon(ctx, rig, time) {
  const { lightX: x, lightY: y, lightRadius: r } = rig;
  ctx.save();
  drawGlow(ctx, x, y, r * 3.2, '#cfe4ff', 0.55);
  ctx.translate(x, y);
  ctx.rotate(Math.sin(time * 0.6) * 0.06);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r * 1.05);
  g.addColorStop(0, '#ffffee');
  g.addColorStop(0.7, '#f3ecc8');
  g.addColorStop(1, '#d8cf9e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  // クレーター
  ctx.fillStyle = 'rgba(190,180,130,0.4)';
  for (const [cx, cy, cr] of [[-0.35, 0.3, 0.16], [0.4, -0.15, 0.12], [0.05, 0.55, 0.1]]) {
    ctx.beginPath();
    ctx.arc(cx * r, cy * r, cr * r, 0, TAU);
    ctx.fill();
  }
  drawFace(ctx, r, '#7a6a3a99');
  // まわりの小さな星
  for (let i = 0; i < 5; i++) {
    const a = time * 0.5 + (i * TAU) / 5;
    const sx = Math.cos(a) * r * 1.9;
    const sy = Math.sin(a) * r * 1.9;
    const tw = 0.4 + 0.6 * Math.abs(Math.sin(time * 2 + i * 2));
    ctx.fillStyle = `rgba(255,255,220,${tw})`;
    ctx.beginPath();
    ctx.arc(sx, sy, 2.4, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// にっこり顔(太陽・月共通)
function drawFace(ctx, r, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(-r * 0.32, -r * 0.1, r * 0.09, 0, TAU);
  ctx.arc(r * 0.32, -r * 0.1, r * 0.09, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = color;
  ctx.lineWidth = r * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, r * 0.14, r * 0.34, 0.25, Math.PI - 0.25);
  ctx.stroke();
}
