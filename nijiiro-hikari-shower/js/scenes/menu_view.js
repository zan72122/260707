// メニュー画面: 描画専用モジュール(空・大きな虹・タイトル・シーンカード)

import { discoveries } from '../core/discoveries.js';
import { RAINBOW, TAU, clamp, drawGlow, rgba, roundRect, starPath } from '../core/utils.js';

export const MENU_FONT = '"Hiragino Maru Gothic ProN","BIZ UDGothic","Yu Gothic",sans-serif';

export function drawMenuSky(ctx, W, H, t, stars) {
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#2b1d5c');
  g.addColorStop(0.45, '#6a4bb8');
  g.addColorStop(0.75, '#c97fc4');
  g.addColorStop(1, '#ffb98a');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  for (const s of stars) {
    const a = 0.3 + 0.7 * Math.abs(Math.sin(t * 1.4 + s.tw));
    ctx.fillStyle = `rgba(255,255,255,${a * 0.8})`;
    ctx.beginPath();
    ctx.arc(s.x * W, s.y * H, s.s, 0, TAU);
    ctx.fill();
  }
}

export function drawBigRainbow(ctx, W, H, t) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const cx = W / 2;
  const cy = H * 0.46 + Math.sin(t * 0.8) * 6;
  const base = Math.min(W, H) * 0.52;
  for (let i = 0; i < RAINBOW.length; i++) {
    ctx.strokeStyle = rgba(RAINBOW[i].hex, 0.4);
    ctx.lineWidth = base * 0.052;
    ctx.beginPath();
    ctx.arc(cx, cy, base - i * base * 0.055, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
  }
  ctx.restore();
  // 両端の雲
  for (const sx of [-1, 1]) {
    const x = cx + sx * base * 0.92;
    const y = cy - base * 0.18;
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    for (const [ox, oy, r] of [[0, 0, 26], [-22, 8, 20], [22, 8, 20], [0, 12, 24]]) {
      ctx.beginPath();
      ctx.arc(x + ox, y + oy + Math.sin(t + sx) * 3, r, 0, TAU);
      ctx.fill();
    }
  }
}

export function drawTitle(ctx, W, H, t) {
  const cx = W / 2;
  const cy = H * 0.17;
  // プリズムロゴ
  const s = Math.min(W, H) * 0.055;
  ctx.save();
  ctx.translate(cx, cy - s * 2.1);
  ctx.rotate(Math.sin(t * 0.9) * 0.18);
  drawGlow(ctx, 0, 0, s * 2.6, '#bde5ff', 0.5);
  ctx.fillStyle = 'rgba(230,248,255,0.92)';
  ctx.strokeStyle = '#fff';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(0, -s);
  ctx.lineTo(s * 0.9, s * 0.7);
  ctx.lineTo(-s * 0.9, s * 0.7);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.restore();

  const size = clamp(Math.min(W, H) * 0.075, 26, 54);
  ctx.save();
  ctx.font = `bold ${size}px ${MENU_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  const text = 'にじいろ ひかりシャワー';
  // 一文字ずつ虹色でぷかぷか
  const widths = [...text].map((ch) => ctx.measureText(ch).width);
  const totalW = widths.reduce((a, b) => a + b, 0);
  let x = cx - totalW / 2;
  [...text].forEach((ch, i) => {
    const col = RAINBOW[i % RAINBOW.length].hex;
    const y = cy + Math.sin(t * 2 + i * 0.55) * size * 0.09;
    ctx.shadowColor = 'rgba(40,20,80,0.55)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = ch === ' ' ? 'transparent' : col;
    ctx.fillText(ch, x + widths[i] / 2, y);
    x += widths[i];
  });
  ctx.shadowColor = 'transparent';
  ctx.font = `bold ${size * 0.42}px ${MENU_FONT}`;
  ctx.fillStyle = 'rgba(255,255,255,0.92)';
  ctx.fillText('どこで あそぶ? タッチしてね', cx, cy + size * 1.15);
  ctx.restore();
}

export function drawSceneCard(ctx, c, t, pressed) {
  const press = pressed ? 0.94 : 1;
  const bob = Math.sin(t * 1.6 + c.phase) * 4;
  const cx = c.x + c.w / 2;
  const cy = c.y + c.h / 2 + bob;
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(press, press);
  ctx.rotate(Math.sin(t * 1.2 + c.phase) * 0.015);
  const { w, h } = c;
  const gr = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  gr.addColorStop(0, c.bg[0]);
  gr.addColorStop(1, c.bg[1]);
  roundRect(ctx, -w / 2, -h / 2, w, h, 26);
  ctx.shadowColor = 'rgba(30,15,60,0.4)';
  ctx.shadowBlur = 16;
  ctx.shadowOffsetY = 7;
  ctx.fillStyle = gr;
  ctx.fill();
  ctx.shadowColor = 'transparent';
  ctx.strokeStyle = 'rgba(255,255,255,0.9)';
  ctx.lineWidth = 4;
  ctx.stroke();

  drawCardIcon(ctx, c.icon, 0, -h * 0.12, Math.min(w, h) * 0.3, t + c.phase);

  ctx.fillStyle = '#5a3d78';
  ctx.font = `bold ${clamp(w * 0.085, 13, 19)}px ${MENU_FONT}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(c.label, 0, h * 0.3);

  // 発見スター数
  const n = discoveries.countIn(c.id);
  if (n > 0) {
    ctx.fillStyle = '#ffb800';
    starPath(ctx, -w / 2 + 26, -h / 2 + 24, 12, 5.4);
    ctx.fill();
    ctx.fillStyle = '#7a5200';
    ctx.font = `bold 15px ${MENU_FONT}`;
    ctx.fillText(`${n}`, -w / 2 + 26, -h / 2 + 25);
  }
  ctx.restore();
}

export function drawCardIcon(ctx, icon, x, y, r, t) {
  ctx.save();
  ctx.translate(x, y);
  if (icon === 'window') {
    ctx.fillStyle = '#fff8e6';
    roundRect(ctx, -r, -r, r * 2, r * 2, r * 0.2);
    ctx.fill();
    ctx.strokeStyle = '#d9a05b';
    ctx.lineWidth = r * 0.14;
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(0, -r);
    ctx.lineTo(0, r);
    ctx.moveTo(-r, 0);
    ctx.lineTo(r, 0);
    ctx.stroke();
    drawGlow(ctx, r * 0.4, -r * 0.4, r * 0.9, '#ffe066', 0.8);
  } else if (icon === 'duck') {
    ctx.fillStyle = '#ffd83d';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.25, r * 0.95, r * 0.65, 0, 0, TAU);
    ctx.arc(-r * 0.45, -r * 0.45, r * 0.5, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#ff9736';
    ctx.beginPath();
    ctx.ellipse(-r * 0.95, -r * 0.4, r * 0.28, r * 0.16, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = '#4a3b2a';
    ctx.beginPath();
    ctx.arc(-r * 0.55, -r * 0.55, r * 0.08, 0, TAU);
    ctx.fill();
  } else if (icon === 'dress') {
    ctx.fillStyle = '#ffffff';
    ctx.beginPath();
    ctx.moveTo(-r * 0.35, -r);
    ctx.lineTo(r * 0.35, -r);
    ctx.lineTo(r * 0.2, -r * 0.3);
    ctx.lineTo(r * 0.85, r);
    ctx.quadraticCurveTo(0, r * 1.25, -r * 0.85, r);
    ctx.lineTo(-r * 0.2, -r * 0.3);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = '#ffa8d3';
    ctx.lineWidth = r * 0.09;
    ctx.stroke();
    drawGlow(ctx, 0, r * 0.3, r * 0.7, '#ff9ecd', 0.6);
  } else if (icon === 'flower') {
    for (let i = 0; i < 6; i++) {
      const a = (i * TAU) / 6 + Math.sin(t) * 0.06;
      ctx.fillStyle = RAINBOW[i % 7].hex;
      ctx.beginPath();
      ctx.ellipse(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, r * 0.42, r * 0.26, a, 0, TAU);
      ctx.fill();
    }
    ctx.fillStyle = '#ffe066';
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.32, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}
