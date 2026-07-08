// 動的な描画(ボール・フリッパー・発射バネ・フィーバー演出)

import { TAU, clamp, hsl, lerp } from '../core/utils.js';
import { LANE, TABLE_H } from './table.js';

// ===== ボール(コロン:にこにこボール) =====
export function drawBall(ctx, ball, fever, time) {
  // 残像
  const tr = ball.trail;
  for (let i = 0; i < tr.length; i++) {
    const t = i / tr.length;
    const p = tr[i];
    ctx.globalAlpha = t * 0.35;
    ctx.fillStyle = fever ? hsl((time * 300 + i * 30) % 360, 90, 65) : 'rgba(255,150,140,0.8)';
    ctx.beginPath();
    ctx.arc(p.x, p.y, ball.r * (0.4 + t * 0.5), 0, TAU);
    ctx.fill();
  }
  ctx.globalAlpha = 1;

  ctx.save();
  ctx.translate(ball.x, ball.y);
  // 影
  ctx.fillStyle = 'rgba(40,90,40,0.22)';
  ctx.beginPath();
  ctx.ellipse(2, ball.r * 0.85, ball.r * 0.85, ball.r * 0.32, 0, 0, TAU);
  ctx.fill();

  // フィーバー中はにじ色オーラ
  if (fever) {
    const g = ctx.createRadialGradient(0, 0, ball.r * 0.5, 0, 0, ball.r * 2.4);
    g.addColorStop(0, hsl((time * 300) % 360, 95, 70, 0.55));
    g.addColorStop(1, hsl((time * 300) % 360, 95, 70, 0));
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, ball.r * 2.4, 0, TAU);
    ctx.fill();
  }

  ctx.rotate(ball.angle);
  // 本体(下半分 赤 / 上半分 白 のカプセルボール風)
  const body = ctx.createRadialGradient(-ball.r * 0.35, -ball.r * 0.4, ball.r * 0.15, 0, 0, ball.r * 1.25);
  body.addColorStop(0, '#ffffff');
  body.addColorStop(1, '#e8e2da');
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.arc(0, 0, ball.r, 0, TAU);
  ctx.fill();
  // 赤い帯(回転がわかる)
  ctx.save();
  ctx.beginPath();
  ctx.arc(0, 0, ball.r, 0, TAU);
  ctx.clip();
  const red = ctx.createLinearGradient(0, -ball.r, 0, 0);
  red.addColorStop(0, '#ff6a5e');
  red.addColorStop(1, '#e03c30');
  ctx.fillStyle = red;
  ctx.beginPath();
  ctx.arc(0, 0, ball.r + 1, Math.PI, 0);
  ctx.closePath();
  ctx.fill();
  // 白まる(中心ボタン)
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = '#c9c2b8';
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.arc(0, 0, ball.r * 0.34, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
  // つやハイライト(回転に依存しないよう逆回転)
  ctx.rotate(-ball.angle);
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  ctx.beginPath();
  ctx.ellipse(-ball.r * 0.38, -ball.r * 0.42, ball.r * 0.26, ball.r * 0.16, -0.6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ===== フリッパー =====
export function drawFlipper(ctx, fl, color = '#ff5a4e') {
  const t = fl.tip();
  ctx.save();
  ctx.lineCap = 'round';
  // 影
  ctx.strokeStyle = 'rgba(40,90,40,0.28)';
  ctx.lineWidth = fl.r * 2 + 6;
  ctx.beginPath();
  ctx.moveTo(fl.px + 3, fl.py + 6);
  ctx.lineTo(t.x + 3, t.y + 6);
  ctx.stroke();
  // 本体
  ctx.strokeStyle = '#c9331f';
  ctx.lineWidth = fl.r * 2 + 5;
  ctx.beginPath();
  ctx.moveTo(fl.px, fl.py);
  ctx.lineTo(t.x, t.y);
  ctx.stroke();
  ctx.strokeStyle = color;
  ctx.lineWidth = fl.r * 2 - 2;
  ctx.beginPath();
  ctx.moveTo(fl.px, fl.py);
  ctx.lineTo(t.x, t.y);
  ctx.stroke();
  // 白ストライプ
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = fl.r * 0.7;
  ctx.beginPath();
  ctx.moveTo(lerp(fl.px, t.x, 0.15), lerp(fl.py, t.y, 0.15) - fl.r * 0.35);
  ctx.lineTo(lerp(fl.px, t.x, 0.9), lerp(fl.py, t.y, 0.9) - fl.r * 0.35);
  ctx.stroke();
  // 根元のボルト
  ctx.fillStyle = '#ffd94d';
  ctx.strokeStyle = '#c9992a';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(fl.px, fl.py, fl.r * 0.75, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

// ===== 発射バネ(引っぱって放すイメージ) =====
export function drawPlunger(ctx, charge, time) {
  const cx = LANE.launchX;
  const baseY = TABLE_H - 14;
  const springTop = baseY - 70 + charge * 44; // チャージで縮む
  ctx.save();
  // バネ(ジグザグ)
  ctx.strokeStyle = '#e07a30';
  ctx.lineWidth = 7;
  ctx.lineJoin = 'round';
  ctx.beginPath();
  const coils = 5;
  for (let i = 0; i <= coils * 2; i++) {
    const y = lerp(springTop, baseY, i / (coils * 2));
    const x = cx + (i % 2 === 0 ? -14 : 14);
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.stroke();
  // ノブ
  const wob = charge > 0 ? Math.sin(time * 28) * charge * 2.4 : 0;
  ctx.fillStyle = '#ff5a4e';
  ctx.strokeStyle = '#c9331f';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.arc(cx + wob, springTop - 12, 20, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.fillStyle = 'rgba(255,255,255,0.7)';
  ctx.beginPath();
  ctx.arc(cx + wob - 6, springTop - 18, 6, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// ===== フィーバー全画面演出(スクリーン座標) =====
export function drawFeverOverlay(ctx, w, h, time, feverT) {
  const alpha = clamp(feverT * 3, 0, 1) * clamp((1 - feverT) * 8 + 0.3, 0, 1);
  ctx.save();
  ctx.globalAlpha = 0.18 * alpha;
  // 回転するにじ色の光線
  ctx.translate(w / 2, h * 0.35);
  const n = 12;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * TAU + time * 0.5;
    ctx.fillStyle = hsl((i * 30 + time * 120) % 360, 95, 65);
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, Math.max(w, h), a, a + TAU / n / 2);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

// ボールの残像を記録
export function pushTrail(ball) {
  ball.trail.push({ x: ball.x, y: ball.y });
  if (ball.trail.length > 10) ball.trail.shift();
}
