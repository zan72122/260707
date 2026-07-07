// ゲーム内UI: シロップボタン・メーター・ミュート・いただきますボタン
import { TAU, clamp, easeOutBack, drawBubbleText } from '../core/utils.js';
import { SYRUPS } from '../game/palette.js';

// シロップボトルのボタンを描く
export function drawSyrupButtons(ctx, L, selected, t) {
  for (let i = 0; i < SYRUPS.length; i++) {
    const syrup = SYRUPS[i];
    const b = L.buttons[i];
    const sel = i === selected;
    const pop = sel ? 1 + Math.sin(t * 6) * 0.05 : 1;
    const r = b.r * pop;

    ctx.save();
    ctx.translate(b.x, b.y);

    // 選択リング
    if (sel) {
      ctx.strokeStyle = '#ffffff';
      ctx.lineWidth = 5;
      ctx.setLineDash([9, 7]);
      ctx.lineDashOffset = -t * 40;
      ctx.beginPath();
      ctx.arc(0, 0, r * 1.28, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
    }

    // ボトル形の背景
    const hue = syrup.hue;
    const fill = hue < 0
      ? conicRainbow(ctx, r, t)
      : `hsl(${hue} 82% 62%)`;
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    ctx.beginPath();
    ctx.arc(0, 0, r * 1.12, 0, TAU);
    ctx.fill();
    ctx.fillStyle = fill;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    // つや
    ctx.fillStyle = 'rgba(255,255,255,0.5)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.3, -r * 0.38, r * 0.3, r * 0.2, -0.5, 0, TAU);
    ctx.fill();

    // 絵文字ラベル
    ctx.font = `${Math.round(r * 1.0)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(syrup.label, 0, r * 0.05);

    ctx.restore();
  }
}

function conicRainbow(ctx, r, t) {
  const g = ctx.createConicGradient ? ctx.createConicGradient(t * 1.5, 0, 0) : null;
  if (!g) return 'hsl(300 80% 65%)';
  for (let i = 0; i <= 6; i++) g.addColorStop(i / 6, `hsl(${i * 60} 85% 62%)`);
  return g;
}

// できあがりメーター(かき氷カップが満ちていく)
export function drawMeter(ctx, L, ratio, t) {
  const x = 16, y = 16, w = 46, h = 64;
  ctx.save();
  ctx.translate(x, y);
  // カップ
  ctx.fillStyle = 'rgba(255,255,255,0.75)';
  ctx.strokeStyle = 'rgba(110,170,210,0.9)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(4, 12);
  ctx.lineTo(w - 4, 12);
  ctx.lineTo(w - 12, h);
  ctx.lineTo(12, h);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  // 中身(虹色に満ちる)
  const fh = (h - 16) * clamp(ratio, 0, 1);
  if (fh > 1) {
    const g = ctx.createLinearGradient(0, h - fh, 0, h);
    g.addColorStop(0, `hsl(${(t * 50) % 360} 85% 65%)`);
    g.addColorStop(1, `hsl(${(t * 50 + 120) % 360} 85% 60%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    const yTop = h - 2 - fh;
    const inset = (u) => 4 + (12 - 4) * (u - 12) / (h - 12);
    ctx.moveTo(inset(yTop) + 2, yTop);
    ctx.lineTo(w - inset(yTop) - 2, yTop);
    ctx.lineTo(w - 13, h - 2);
    ctx.lineTo(13, h - 2);
    ctx.closePath();
    ctx.fill();
  }
  // 満タン時にきらめく
  if (ratio >= 1) {
    const a = 0.5 + 0.5 * Math.sin(t * 8);
    ctx.strokeStyle = `rgba(255,255,120,${a})`;
    ctx.lineWidth = 4;
    ctx.stroke();
  }
  ctx.restore();
}

// 丸いアイコンボタン(ミュートなど)
export function drawIconButton(ctx, btn, icon, t) {
  ctx.save();
  ctx.translate(btn.x, btn.y);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.arc(0, 0, btn.r, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(120,180,220,0.8)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  ctx.font = `${Math.round(btn.r * 1.15)}px sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(icon, 0, 2);
  ctx.restore();
}

// 大きな「いただきます」ボタン(できあがり時に登場)
export function drawItadakimasuButton(ctx, btn, appearT, t) {
  const k = easeOutBack(clamp(appearT, 0, 1));
  const pulse = 1 + Math.sin(t * 5) * 0.045;
  const w = btn.w * k * pulse, h = btn.h * k * pulse;
  if (w < 4) return;
  ctx.save();
  ctx.translate(btn.x, btn.y);
  ctx.rotate(Math.sin(t * 2.6) * 0.03);
  // 後光
  for (let i = 0; i < 10; i++) {
    const a = (i / 10) * TAU + t * 0.8;
    ctx.fillStyle = `hsla(${(i * 36 + t * 60) % 360} 90% 70% / 0.5)`;
    ctx.beginPath();
    const r1 = w * 0.52, r2 = w * 0.62 + Math.sin(t * 4 + i) * 6;
    ctx.moveTo(Math.cos(a - 0.09) * r1, Math.sin(a - 0.09) * r1 * (h / w));
    ctx.lineTo(Math.cos(a) * r2, Math.sin(a) * r2 * (h / w));
    ctx.lineTo(Math.cos(a + 0.09) * r1, Math.sin(a + 0.09) * r1 * (h / w));
    ctx.closePath();
    ctx.fill();
  }
  // ボタン本体
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#ff9db4');
  g.addColorStop(1, '#ff5f87');
  ctx.fillStyle = g;
  rr(ctx, -w / 2, -h / 2, w, h, h * 0.5);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5 * k;
  ctx.stroke();
  drawBubbleText(ctx, 'いただきます!', 0, 0, h * 0.42, '#ffffff', 'rgba(200,40,80,0.9)', 0.16);
  ctx.restore();
}

function rr(ctx, x, y, w, h, r) {
  const rr2 = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr2, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr2);
  ctx.arcTo(x + w, y + h, x, y + h, rr2);
  ctx.arcTo(x, y + h, x, y, rr2);
  ctx.arcTo(x, y, x + w, y, rr2);
  ctx.closePath();
}

// ぴょこぴょこ跳ねる案内矢印(4歳児向けの誘導)
export function drawArrowHint(ctx, x, y, angle, t, label = '') {
  const hop = Math.abs(Math.sin(t * 4)) * 10;
  ctx.save();
  ctx.translate(x - Math.cos(angle) * hop, y - Math.sin(angle) * hop);
  ctx.rotate(angle);
  ctx.fillStyle = '#ff6f9c';
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 4;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  ctx.moveTo(-10, -16);
  ctx.lineTo(12, -16);
  ctx.lineTo(12, -26);
  ctx.lineTo(34, 0);
  ctx.lineTo(12, 26);
  ctx.lineTo(12, 16);
  ctx.lineTo(-10, 16);
  ctx.closePath();
  ctx.stroke();
  ctx.fill();
  ctx.restore();
  if (label) drawBubbleText(ctx, label, x - Math.cos(angle) * 60, y - Math.sin(angle) * 60 - 34, 20, '#4a7a9b', '#ffffff', 0.24);
}

export function hitCircle(px, py, btn, pad = 8) {
  const dx = px - btn.x, dy = py - btn.y;
  const r = btn.r + pad;
  return dx * dx + dy * dy <= r * r;
}

export function hitRect(px, py, btn, pad = 10) {
  return Math.abs(px - btn.x) <= btn.w / 2 + pad && Math.abs(py - btn.y) <= btn.h / 2 + pad;
}
