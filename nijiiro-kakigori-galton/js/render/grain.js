// 粒(シロップ玉・トッピング)の描画。大量描画用のスプライトキャッシュ付き
import { TAU } from '../core/utils.js';

const SPRITE_PX = 32;      // スプライトの解像度
const HUE_STEP = 12;       // 色相のバケツ幅(キャッシュ数を抑える)
const spriteCache = new Map();

// つやつやシロップ玉のスプライトを取得(hueを量子化してキャッシュ)
export function getBallSprite(hue, golden = false) {
  const key = golden ? 'gold' : Math.round(((hue % 360) + 360) % 360 / HUE_STEP);
  let c = spriteCache.get(key);
  if (c) return c;
  c = document.createElement('canvas');
  c.width = c.height = SPRITE_PX;
  const ctx = c.getContext('2d');
  const r = SPRITE_PX / 2 - 1;
  const cx = SPRITE_PX / 2, cy = SPRITE_PX / 2;
  const g = ctx.createRadialGradient(cx - r * 0.35, cy - r * 0.4, r * 0.1, cx, cy, r);
  if (golden) {
    g.addColorStop(0, '#fffbe0');
    g.addColorStop(0.5, '#ffe066');
    g.addColorStop(1, '#e8a30c');
  } else {
    const h = key * HUE_STEP;
    g.addColorStop(0, `hsl(${h} 90% 82%)`);
    g.addColorStop(0.65, `hsl(${h} 85% 60%)`);
    g.addColorStop(1, `hsl(${h} 80% 46%)`);
  }
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(cx - r * 0.32, cy - r * 0.4, r * 0.28, r * 0.19, -0.6, 0, TAU);
  ctx.fill();
  spriteCache.set(key, c);
  return c;
}

// 高速描画(通常玉・金の玉はスプライト、特別トッピングはベクタ描画)
export function drawBallFast(ctx, x, y, r, hue, kind, rot = 0, t = 0) {
  if (!kind || kind === 'gold') {
    const s = getBallSprite(hue, kind === 'gold');
    ctx.drawImage(s, x - r, y - r, r * 2, r * 2);
    return;
  }
  drawGrain(ctx, x, y, r, hue, kind, rot, t);
}

// 粒1個の丁寧描画(ベイク用途・特別トッピング)
export function drawGrain(ctx, x, y, r, hue, kind, rot = 0, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'gold') {
    ctx.rotate(rot * 0.3);
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.1, 0, 0, r);
    g.addColorStop(0, '#fffbe0');
    g.addColorStop(0.55, '#ffe066');
    g.addColorStop(1, '#e8a30c');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.95)';
    starShape(ctx, r * 0.55, 0, -r * 0.05);
    ctx.fill();
  } else if (kind === 'star') {
    ctx.rotate(rot);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.3);
    g.addColorStop(0, '#fff8d0');
    g.addColorStop(1, '#ffd93b');
    ctx.fillStyle = g;
    starShape(ctx, r * 1.25);
    ctx.fill();
    ctx.strokeStyle = '#e8a90c';
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.stroke();
  } else if (kind === 'heart') {
    ctx.rotate(Math.sin(rot) * 0.3);
    ctx.fillStyle = '#ff6f9c';
    heartShape(ctx, r * 1.1);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.4, r * 0.28, 0, TAU);
    ctx.fill();
  } else if (kind === 'candy') {
    ctx.rotate(rot);
    ctx.fillStyle = `hsl(${(t * 60) % 360} 80% 78%)`;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `hsl(${(t * 60 + 180) % 360} 75% 55%)`;
    ctx.lineWidth = Math.max(1.5, r * 0.22);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.28 + i * 0.3), i, i + 2.2);
      ctx.stroke();
    }
  } else {
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, `hsl(${hue} 90% 82%)`);
    g.addColorStop(0.65, `hsl(${hue} 85% 60%)`);
    g.addColorStop(1, `hsl(${hue} 80% 46%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, -r * 0.4, r * 0.26, r * 0.18, -0.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

// 巨大いちご玉(通路に詰まる。タップで割れる)
export function drawGiantBerry(ctx, x, y, r, wob, t) {
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(Math.sin(t * 6) * wob * 0.06);
  const g = ctx.createRadialGradient(-r * 0.3, -r * 0.35, r * 0.15, 0, 0, r);
  g.addColorStop(0, '#ff9aa8');
  g.addColorStop(0.6, '#ff4d6b');
  g.addColorStop(1, '#d81f3e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(0, 0, r, 0, TAU);
  ctx.fill();
  // つぶつぶ
  ctx.fillStyle = 'rgba(255,240,180,0.85)';
  for (let i = 0; i < 8; i++) {
    const a = (i / 8) * TAU + 0.4;
    const rr = r * (0.35 + (i % 3) * 0.18);
    ctx.beginPath();
    ctx.ellipse(Math.cos(a) * rr, Math.sin(a) * rr, r * 0.06, r * 0.09, a, 0, TAU);
    ctx.fill();
  }
  // へた
  ctx.fillStyle = '#3f9d4b';
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(i * r * 0.22, -r * 0.92, r * 0.11, r * 0.22, i * 0.35, 0, TAU);
    ctx.fill();
  }
  // ハイライトと顔(にこにこ)
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.ellipse(-r * 0.35, -r * 0.42, r * 0.2, r * 0.13, -0.6, 0, TAU);
  ctx.fill();
  ctx.fillStyle = '#7a1428';
  ctx.beginPath();
  ctx.arc(-r * 0.22, -r * 0.05, r * 0.06, 0, TAU);
  ctx.arc(r * 0.22, -r * 0.05, r * 0.06, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#7a1428';
  ctx.lineWidth = r * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, r * 0.12, r * 0.18, 0.3, Math.PI - 0.3);
  ctx.stroke();
  ctx.restore();
}

function starShape(ctx, R, ox = 0, oy = 0) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? R : R * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) ctx.moveTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r);
    else ctx.lineTo(ox + Math.cos(a) * r, oy + Math.sin(a) * r);
  }
  ctx.closePath();
}

function heartShape(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(-s * 1.3, 0, -s * 0.9, -s, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.9, -s, s * 1.3, 0, 0, s * 0.9);
  ctx.closePath();
}
