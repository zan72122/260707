// かき氷の器と氷の山の描画
import { TAU, clamp } from '../core/utils.js';

// 氷の山(ふわふわの白いドーム)。pile.groundAt と同じ形にする
export function drawIceDome(ctx, L, groundAt, t) {
  const left = L.bowlCx - L.bowlW / 2;
  const steps = 36;

  ctx.save();
  // 本体
  const g = ctx.createLinearGradient(0, L.iceTop, 0, L.rimY + 10);
  g.addColorStop(0, '#ffffff');
  g.addColorStop(0.6, '#f2fbff');
  g.addColorStop(1, '#d9f0fb');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(left, L.rimY + 2);
  for (let i = 0; i <= steps; i++) {
    const u = i / steps;
    ctx.lineTo(left + u * L.bowlW, groundAt(u));
  }
  ctx.lineTo(left + L.bowlW, L.rimY + 2);
  ctx.closePath();
  ctx.fill();

  // ふわふわ感を出すスカラップ(もこもこの縁)
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  const puffs = 13;
  for (let i = 0; i < puffs; i++) {
    const u = (i + 0.5) / puffs;
    const x = left + u * L.bowlW;
    const y = groundAt(u);
    const r = L.bowlW / puffs * 0.72 * (0.9 + 0.1 * Math.sin(i * 2.7));
    ctx.beginPath();
    ctx.arc(x, y + r * 0.25, r, 0, TAU);
    ctx.fill();
  }

  // きらきら光る氷の粒
  ctx.fillStyle = 'rgba(190,230,250,0.8)';
  for (let i = 0; i < 26; i++) {
    const u = ((i * 0.383) % 1);
    const x = left + u * L.bowlW;
    const gy = groundAt(u);
    const y = gy + (L.rimY - gy) * ((i * 0.617) % 1) * 0.9 + 6;
    const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
    ctx.globalAlpha = 0.25 + tw * 0.45;
    const s = 1.6 + tw * 1.6;
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(i + t * 0.4);
    ctx.fillRect(-s / 2, -s * 1.6, s, s * 3.2);
    ctx.fillRect(-s * 1.6, -s / 2, s * 3.2, s);
    ctx.restore();
  }
  ctx.globalAlpha = 1;
  ctx.restore();
}

// ガラスの器(高台つきのかき氷カップ)
export function drawGlassBowl(ctx, L, t) {
  const cx = L.bowlCx;
  const topW = L.bowlW * 1.06;
  const botW = L.bowlW * 0.5;
  const y0 = L.rimY;
  const y1 = L.bowlBottom - L.bowlH * 0.12;

  ctx.save();

  // 器のボウル部分(半透明ガラス)
  const glass = ctx.createLinearGradient(cx - topW / 2, 0, cx + topW / 2, 0);
  glass.addColorStop(0, 'rgba(180,225,250,0.55)');
  glass.addColorStop(0.2, 'rgba(235,250,255,0.35)');
  glass.addColorStop(0.5, 'rgba(200,235,252,0.3)');
  glass.addColorStop(0.8, 'rgba(235,250,255,0.35)');
  glass.addColorStop(1, 'rgba(160,215,245,0.6)');
  ctx.fillStyle = glass;
  ctx.beginPath();
  ctx.moveTo(cx - topW / 2, y0);
  ctx.bezierCurveTo(cx - topW / 2, y1 * 0.35 + y0 * 0.65, cx - botW / 2 - 8, y1 - 6, cx - botW / 2, y1);
  ctx.lineTo(cx + botW / 2, y1);
  ctx.bezierCurveTo(cx + botW / 2 + 8, y1 - 6, cx + topW / 2, y1 * 0.35 + y0 * 0.65, cx + topW / 2, y0);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,205,235,0.9)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  // ふちの楕円
  ctx.fillStyle = 'rgba(220,245,255,0.5)';
  ctx.beginPath();
  ctx.ellipse(cx, y0, topW / 2, Math.max(6, topW * 0.03), 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,205,235,0.95)';
  ctx.lineWidth = 3;
  ctx.stroke();

  // ガラスのハイライト
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = Math.max(4, topW * 0.02);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(cx - topW * 0.36, y0 + 14);
  ctx.bezierCurveTo(cx - topW * 0.34, y0 + 30, cx - botW * 0.44, y1 - 26, cx - botW * 0.35, y1 - 12);
  ctx.stroke();

  // 高台(足)
  const footY = L.bowlBottom;
  const footW = botW * 1.15;
  ctx.fillStyle = 'rgba(190,228,250,0.75)';
  ctx.beginPath();
  ctx.moveTo(cx - botW * 0.22, y1);
  ctx.lineTo(cx - footW / 2, footY - 4);
  ctx.quadraticCurveTo(cx, footY + 5, cx + footW / 2, footY - 4);
  ctx.lineTo(cx + botW * 0.22, y1);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(150,205,235,0.9)';
  ctx.lineWidth = 2.5;
  ctx.stroke();

  ctx.restore();
}

// 木のテーブル
export function drawTable(ctx, L) {
  const y = L.bowlBottom - 2;
  const g = ctx.createLinearGradient(0, y, 0, L.h);
  g.addColorStop(0, '#e8b878');
  g.addColorStop(0.25, '#d9a05e');
  g.addColorStop(1, '#c08a4a');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, L.w, L.h - y);
  // 木目
  ctx.strokeStyle = 'rgba(150,100,50,0.25)';
  ctx.lineWidth = 2;
  const n = Math.ceil(L.w / 90);
  for (let i = 0; i <= n; i++) {
    const x = i * 90 + 20;
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.quadraticCurveTo(x + 25, (y + L.h) / 2, x - 10, L.h);
    ctx.stroke();
  }
}

// 雲のシロップじゃぐち(ドラッグで左右に動かせる)
export function drawFaucetCloud(ctx, L, x, hue, pouring, t) {
  const y = L.faucetY;
  const s = clamp(L.boardW * 0.055, 26, 44);
  ctx.save();
  const bounce = pouring ? Math.sin(t * 18) * 2 : Math.sin(t * 2.4) * 2.5;
  ctx.translate(x, y + bounce);

  // 虹のアーチ(雲の上)
  for (let i = 0; i < 6; i++) {
    ctx.strokeStyle = `hsla(${i * 55} 85% 65% / 0.9)`;
    ctx.lineWidth = s * 0.14;
    ctx.beginPath();
    ctx.arc(0, s * 0.1, s * (1.55 - i * 0.13), Math.PI + 0.35, TAU - 0.35);
    ctx.stroke();
  }

  // 雲本体
  ctx.fillStyle = '#ffffff';
  ctx.beginPath();
  ctx.arc(-s * 0.95, 0, s * 0.62, 0, TAU);
  ctx.arc(0, -s * 0.28, s * 0.8, 0, TAU);
  ctx.arc(s * 0.95, 0, s * 0.62, 0, TAU);
  ctx.arc(0, s * 0.22, s * 0.9, 0, TAU);
  ctx.fill();
  ctx.fillStyle = 'rgba(190,220,240,0.5)';
  ctx.beginPath();
  ctx.ellipse(0, s * 0.55, s * 1.4, s * 0.28, 0, 0, TAU);
  ctx.fill();

  // 目と口(にこにこ)
  ctx.fillStyle = '#5a6b7a';
  const blink = (Math.sin(t * 0.7) > 0.985) ? 0.12 : 1;
  ctx.beginPath();
  ctx.ellipse(-s * 0.3, -s * 0.1, s * 0.08, s * 0.08 * blink, 0, 0, TAU);
  ctx.ellipse(s * 0.3, -s * 0.1, s * 0.08, s * 0.08 * blink, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#5a6b7a';
  ctx.lineWidth = s * 0.07;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.arc(0, s * 0.05, s * 0.18, 0.3, Math.PI - 0.3);
  ctx.stroke();

  // ほっぺ
  ctx.fillStyle = 'rgba(255,150,170,0.5)';
  ctx.beginPath();
  ctx.arc(-s * 0.55, s * 0.08, s * 0.12, 0, TAU);
  ctx.arc(s * 0.55, s * 0.08, s * 0.12, 0, TAU);
  ctx.fill();

  // じゃぐち(そそぎ口)
  const spoutHue = hue < 0 ? (t * 120) % 360 : hue;
  ctx.fillStyle = `hsl(${spoutHue} 75% 60%)`;
  ctx.beginPath();
  ctx.moveTo(-s * 0.28, s * 0.62);
  ctx.lineTo(s * 0.28, s * 0.62);
  ctx.lineTo(s * 0.16, s * 1.05);
  ctx.lineTo(-s * 0.16, s * 1.05);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();

  ctx.restore();
}
