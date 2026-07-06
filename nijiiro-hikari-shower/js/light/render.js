// 光のリグ描画: 白い光の帯・クリスタルのプリズム・にじ色ファンを最高に綺麗に描く

import { TAU, rgba, drawGlow, dist } from '../core/utils.js';

// 白い光(光源→プリズム)をやわらかい帯で描く
export function drawWhiteBeam(ctx, rig, time) {
  const { lightX: lx, lightY: ly, prismX: px, prismY: py } = rig;
  const len = dist(lx, ly, px, py);
  if (len < 10) return;
  const a = Math.atan2(py - ly, px - lx);
  const w0 = 16 + Math.sin(time * 2.4) * 2.5;
  const w1 = 30;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(lx, ly);
  ctx.rotate(a);
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, 'rgba(255,255,240,0.5)');
  g.addColorStop(0.7, 'rgba(255,255,240,0.34)');
  g.addColorStop(1, 'rgba(255,255,255,0.5)');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -w0 / 2);
  ctx.lineTo(len, -w1 / 2);
  ctx.lineTo(len, w1 / 2);
  ctx.lineTo(0, w0 / 2);
  ctx.closePath();
  ctx.fill();
  // 中心の芯
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  ctx.beginPath();
  ctx.moveTo(0, -w0 * 0.16);
  ctx.lineTo(len, -w1 * 0.16);
  ctx.lineTo(len, w1 * 0.16);
  ctx.lineTo(0, w0 * 0.16);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}

// にじ色の帯(rig.raysのセグメント)を描く
export function drawRainbow(ctx, rig, time, alpha = 1) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const pulse = 0.88 + Math.sin(time * 3.1) * 0.12;
  for (const ray of rig.rays) {
    let travelled = 0;
    for (const s of ray.segs) {
      const segLen = dist(s.x1, s.y1, s.x2, s.y2);
      if (segLen < 4) continue;
      const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      const w0 = rig.bandHalfWidth(travelled) * 2;
      const w1 = rig.bandHalfWidth(travelled + segLen) * 2;
      ctx.save();
      ctx.translate(s.x1, s.y1);
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, segLen, 0);
      const baseA = 0.34 * alpha * pulse;
      g.addColorStop(0, rgba(ray.hex, baseA * 0.95));
      g.addColorStop(0.55, rgba(ray.hex, baseA));
      g.addColorStop(1, rgba(ray.hex, baseA * 0.55));
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.moveTo(0, -w0 / 2);
      ctx.lineTo(segLen, -w1 / 2);
      ctx.lineTo(segLen, w1 / 2);
      ctx.lineTo(0, w0 / 2);
      ctx.closePath();
      ctx.fill();
      ctx.restore();
      travelled += segLen;
    }
  }
  ctx.restore();
}

// クリスタルのプリズムを描く
export function drawPrism(ctx, rig, time) {
  const { prismX: x, prismY: y, prismSize: s, prismRot: rot } = rig;
  ctx.save();
  ctx.translate(x, y);

  // ときめきグロー
  const glowR = s * (2.2 + rig.glow * 1.2 + Math.sin(time * 2) * 0.15);
  drawGlow(ctx, 0, 0, glowR, '#bde5ff', 0.3 + rig.glow * 0.3);

  ctx.rotate(rot);
  // 本体(三角形のガラス)
  const tri = [];
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 3;
    tri.push({ x: Math.cos(a) * s, y: Math.sin(a) * s });
  }
  const grad = ctx.createLinearGradient(-s, -s, s, s);
  grad.addColorStop(0, 'rgba(235,250,255,0.92)');
  grad.addColorStop(0.45, 'rgba(190,225,255,0.65)');
  grad.addColorStop(0.55, 'rgba(255,220,250,0.6)');
  grad.addColorStop(1, 'rgba(210,235,255,0.88)');
  ctx.fillStyle = grad;
  ctx.strokeStyle = 'rgba(255,255,255,0.95)';
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(tri[0].x, tri[0].y);
  ctx.lineTo(tri[1].x, tri[1].y);
  ctx.lineTo(tri[2].x, tri[2].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();

  // 内側のカット面(キラッと感)
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.moveTo(tri[0].x, tri[0].y);
  ctx.lineTo(0, 0);
  ctx.lineTo(tri[1].x, tri[1].y);
  ctx.closePath();
  ctx.fill();
  // 走るハイライト
  const hl = (time * 0.6) % 1;
  const hx = tri[0].x + (tri[2].x - tri[0].x) * hl;
  const hy = tri[0].y + (tri[2].y - tri[0].y) * hl;
  drawGlow(ctx, hx, hy, s * 0.5, '#ffffff', 0.5);
  ctx.restore();
}

// 太陽を描く
export function drawSun(ctx, rig, time) {
  const { lightX: x, lightY: y, lightRadius: r } = rig;
  ctx.save();
  drawGlow(ctx, x, y, r * 3.4, '#ffe9a3', 0.6);
  // ゆらゆら回る光線
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
  // にっこり顔
  ctx.fillStyle = 'rgba(120,70,20,0.85)';
  ctx.beginPath();
  ctx.arc(-r * 0.32, -r * 0.1, r * 0.09, 0, TAU);
  ctx.arc(r * 0.32, -r * 0.1, r * 0.09, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,70,20,0.85)';
  ctx.lineWidth = r * 0.09;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, r * 0.14, r * 0.34, 0.25, Math.PI - 0.25);
  ctx.stroke();
  ctx.restore();
}

// 懐中電灯を描く(プリズム方向に向く)
export function drawFlashlight(ctx, rig, time) {
  const { lightX: x, lightY: y } = rig;
  const a = Math.atan2(rig.prismY - y, rig.prismX - x);
  ctx.save();
  drawGlow(ctx, x, y, 80, '#fff3c4', 0.4);
  ctx.translate(x, y);
  ctx.rotate(a);
  // ボディ
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
  // レンズ
  const lg = ctx.createRadialGradient(20, 0, 2, 20, 0, 22);
  lg.addColorStop(0, '#ffffff');
  lg.addColorStop(1, '#fff0b3');
  ctx.fillStyle = lg;
  ctx.beginPath();
  ctx.ellipse(20, 0, 7, 24, 0, 0, TAU);
  ctx.fill();
  // 星のワンポイント
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

// リグ一式をまとめて描く
export function drawRig(ctx, rig, time, rainbowAlpha = 1) {
  drawWhiteBeam(ctx, rig, time);
  drawRainbow(ctx, rig, time, rainbowAlpha);
  drawPrism(ctx, rig, time);
  if (rig.sunMode) drawSun(ctx, rig, time);
  else drawFlashlight(ctx, rig, time);
}
