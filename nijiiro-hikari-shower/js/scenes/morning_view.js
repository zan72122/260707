// あさのまどべ: 描画専用モジュール(部屋・窓・カーテン・スプーン)

import { TAU, drawGlow, rgba, roundRect } from '../core/utils.js';

export function drawMorningBackground(ctx, s) {
  const { W, H } = s.engine;
  // 朝の部屋の壁
  const g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, '#fdeecd');
  g.addColorStop(0.55, '#f7d9a8');
  g.addColorStop(1, '#e8b988');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  // カーテンによる明るさの変化
  ctx.fillStyle = `rgba(80,60,110,${0.34 * (1 - s.curtainOpen)})`;
  ctx.fillRect(0, 0, W, H);

  drawWindowSky(ctx, s);

  // 机
  const dg = ctx.createLinearGradient(0, s.deskY, 0, H);
  dg.addColorStop(0, '#c98f5e');
  dg.addColorStop(0.06, '#b57a4a');
  dg.addColorStop(1, '#96603a');
  ctx.fillStyle = dg;
  ctx.fillRect(0, s.deskY, W, H - s.deskY);
  ctx.fillStyle = 'rgba(255,235,200,0.22)';
  ctx.fillRect(0, s.deskY, W, 7);
  // 木目
  ctx.strokeStyle = 'rgba(120,75,40,0.25)';
  ctx.lineWidth = 2;
  for (let i = 0; i < 5; i++) {
    const y = s.deskY + 26 + i * (H - s.deskY) * 0.2;
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.bezierCurveTo(W * 0.3, y + 9, W * 0.6, y - 9, W, y + 5);
    ctx.stroke();
  }
}

export function drawWindowSky(ctx, s) {
  const { x, y, w, h } = s.win;
  const sky = ctx.createLinearGradient(0, y, 0, y + h);
  sky.addColorStop(0, '#9fd8ff');
  sky.addColorStop(1, '#e3f6ff');
  ctx.fillStyle = sky;
  ctx.fillRect(x, y, w, h);
  // 遠くの雲
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [cx, cy, r] of [[0.25, 0.7, 0.09], [0.7, 0.25, 0.07], [0.55, 0.8, 0.08]]) {
    const px = x + w * cx + Math.sin(s.time * 0.3 + cx * 9) * 12;
    const py = y + h * cy;
    for (const [ox, oy, rr] of [[0, 0, 1], [-0.8, 0.3, 0.75], [0.8, 0.3, 0.75]]) {
      ctx.beginPath();
      ctx.arc(px + ox * w * r, py + oy * w * r, w * r * rr, 0, TAU);
      ctx.fill();
    }
  }
}

export function drawWindowFrame(ctx, s) {
  const { x, y, w, h } = s.win;
  ctx.strokeStyle = '#a8794f';
  ctx.lineWidth = 12;
  ctx.strokeRect(x, y, w, h);
  ctx.lineWidth = 6;
  ctx.beginPath();
  ctx.moveTo(x + w / 2, y);
  ctx.lineTo(x + w / 2, y + h);
  ctx.moveTo(x, y + h / 2);
  ctx.lineTo(x + w, y + h / 2);
  ctx.stroke();
}

export function drawSpoon(ctx, s) {
  const sp = s.spoon;
  ctx.save();
  ctx.translate(sp.x, sp.y);
  ctx.rotate(sp.rot + Math.PI / 2);
  const g = ctx.createLinearGradient(-14, 0, 14, 0);
  g.addColorStop(0, '#b8c4cf');
  g.addColorStop(0.5, '#f4fbff');
  g.addColorStop(1, '#9fadb9');
  ctx.fillStyle = g;
  roundRect(ctx, -6, -sp.len * 0.12, 12, sp.len * 0.62, 6);
  ctx.fill();
  ctx.beginPath();
  ctx.ellipse(0, -sp.len * 0.3, 20, 30, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.75)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.restore();
}

export function drawCurtain(ctx, s) {
  const { x, y, w, h } = s.win;
  const cw = w * (1 - s.curtainOpen * 0.82);
  ctx.save();
  const g = ctx.createLinearGradient(x, 0, x + cw, 0);
  g.addColorStop(0, '#ffbfd6');
  g.addColorStop(1, '#ff9ecd');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(x - 8, y - 10);
  const folds = 6;
  for (let i = 0; i <= folds; i++) {
    const fx = x + (cw * i) / folds;
    const sway = Math.sin(s.time * 1.8 + i) * 5 * s.curtainOpen;
    ctx.lineTo(fx + sway, y - 10);
  }
  for (let i = folds; i >= 0; i--) {
    const fx = x + (cw * i) / folds;
    const sway = Math.sin(s.time * 1.6 + i * 1.4) * 9;
    ctx.lineTo(fx + sway + (i % 2 === 0 ? 8 : -8), y + h + 12);
  }
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2;
  for (let i = 1; i < folds; i++) {
    const fx = x + (cw * i) / folds;
    ctx.beginPath();
    ctx.moveTo(fx, y - 6);
    ctx.quadraticCurveTo(fx + Math.sin(s.time + i) * 8, y + h * 0.5, fx + (i % 2 === 0 ? 8 : -8), y + h + 8);
    ctx.stroke();
  }
  // つかむところ
  const edgeX = x + cw;
  drawGlow(ctx, edgeX, y + h * 0.5, 26, '#ffffff', 0.35 + Math.sin(s.time * 3) * 0.12);
  ctx.fillStyle = '#fff';
  ctx.beginPath();
  ctx.arc(edgeX, y + h * 0.5, 10, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// 床に落ちる窓の光だまり
export function drawFloorLight(ctx, s) {
  const { H } = s.engine;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = rgba('#ffe9a3', 0.1 + s.curtainOpen * 0.12);
  ctx.beginPath();
  ctx.ellipse(s.win.x + s.win.w * 0.5, s.deskY + (H - s.deskY) * 0.4, s.win.w * 0.5, (H - s.deskY) * 0.3, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}
