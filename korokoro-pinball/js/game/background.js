// 静的な背景アート(空+テーブル本体)。リサイズ時に一度だけ描く

import { TAU, hsl, starPath } from '../core/utils.js';
import {
  ARCH, LANE, WALL_L, WALL_R, TABLE_W, TABLE_H, GUIDES,
} from './table.js';

// 画面全体の空(スクリーン座標で描く)
export function paintSky(ctx, w, h) {
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, '#4fa9f5');
  g.addColorStop(0.45, '#8fd0ff');
  g.addColorStop(0.75, '#c9ecff');
  g.addColorStop(1, '#eafaff');
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);

  // 太陽
  const sx = w * 0.82;
  const sy = h * 0.1;
  const sr = Math.min(w, h) * 0.07;
  const sg = ctx.createRadialGradient(sx, sy, 0, sx, sy, sr * 2.6);
  sg.addColorStop(0, 'rgba(255, 244, 180, 0.95)');
  sg.addColorStop(0.35, 'rgba(255, 228, 120, 0.55)');
  sg.addColorStop(1, 'rgba(255, 228, 120, 0)');
  ctx.fillStyle = sg;
  ctx.fillRect(sx - sr * 3, sy - sr * 3, sr * 6, sr * 6);
  ctx.fillStyle = '#fff3b8';
  ctx.beginPath();
  ctx.arc(sx, sy, sr, 0, TAU);
  ctx.fill();

  // ふわふわ雲
  const clouds = [
    [0.12, 0.12, 0.9], [0.4, 0.06, 0.7], [0.68, 0.17, 1.1],
    [0.06, 0.42, 0.8], [0.92, 0.5, 0.9], [0.25, 0.78, 0.85], [0.85, 0.85, 1.0],
  ];
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  for (const [fx, fy, s] of clouds) {
    drawCloud(ctx, w * fx, h * fy, Math.min(w, h) * 0.055 * s);
  }
}

export function drawCloud(ctx, x, y, r) {
  ctx.beginPath();
  ctx.arc(x - r * 1.2, y, r * 0.75, 0, TAU);
  ctx.arc(x, y - r * 0.45, r, 0, TAU);
  ctx.arc(x + r * 1.2, y, r * 0.8, 0, TAU);
  ctx.arc(x + r * 0.2, y + r * 0.3, r * 0.85, 0, TAU);
  ctx.fill();
}

// テーブル本体(論理座標で描く)
export function paintTable(ctx) {
  paintRainbow(ctx);
  paintField(ctx);
  paintLane(ctx);
  paintWalls(ctx);
  paintDeco(ctx);
}

function fieldPath(ctx) {
  ctx.beginPath();
  ctx.moveTo(WALL_L, ARCH.cy);
  ctx.lineTo(WALL_L, TABLE_H);
  ctx.lineTo(WALL_R, TABLE_H);
  ctx.lineTo(WALL_R, ARCH.cy);
  ctx.arc(ARCH.cx, ARCH.cy, ARCH.r, 0, Math.PI, true);
  ctx.closePath();
}

function paintRainbow(ctx) {
  // アーチの外側にかかる虹
  const colors = ['#ff6b6b', '#ffb14e', '#ffe14d', '#6fd66f', '#5ab8ff', '#b47dff'];
  ctx.save();
  ctx.lineWidth = 13;
  ctx.lineCap = 'round';
  for (let i = 0; i < colors.length; i++) {
    ctx.strokeStyle = colors[i];
    ctx.globalAlpha = 0.85;
    ctx.beginPath();
    ctx.arc(ARCH.cx, ARCH.cy + 8, ARCH.r + 60 - i * 13, Math.PI * 1.08, Math.PI * 1.92);
    ctx.stroke();
  }
  ctx.restore();
}

function paintField(ctx) {
  ctx.save();
  fieldPath(ctx);
  const g = ctx.createLinearGradient(0, 0, 0, TABLE_H);
  g.addColorStop(0, '#b8eca0');
  g.addColorStop(0.5, '#9fe28a');
  g.addColorStop(1, '#8bd97b');
  ctx.fillStyle = g;
  ctx.fill();

  // クリップして模様を描く
  fieldPath(ctx);
  ctx.clip();

  // 市松風の淡いチェック
  ctx.fillStyle = 'rgba(255,255,255,0.10)';
  const s = 60;
  for (let gy = 0; gy < TABLE_H / s; gy++) {
    for (let gx = 0; gx < TABLE_W / s; gx++) {
      if ((gx + gy) % 2 === 0) ctx.fillRect(gx * s, gy * s, s, s);
    }
  }

  // 小花のドット
  ctx.fillStyle = 'rgba(255,255,255,0.35)';
  const flowers = [
    [70, 380], [250, 300], [480, 400], [140, 500], [380, 530],
    [60, 800], [530, 640], [330, 720], [240, 640], [450, 320],
  ];
  for (const [x, y] of flowers) drawTinyFlower(ctx, x, y, 7);

  // 下部の芝の影
  const sh = ctx.createLinearGradient(0, TABLE_H - 200, 0, TABLE_H);
  sh.addColorStop(0, 'rgba(60,140,70,0)');
  sh.addColorStop(1, 'rgba(60,140,70,0.25)');
  ctx.fillStyle = sh;
  ctx.fillRect(0, TABLE_H - 200, TABLE_W, 200);
  ctx.restore();
}

function drawTinyFlower(ctx, x, y, r) {
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * TAU;
    ctx.beginPath();
    ctx.arc(x + Math.cos(a) * r, y + Math.sin(a) * r, r * 0.62, 0, TAU);
    ctx.fill();
  }
}

function paintLane(ctx) {
  // 発射レーン(みずいろの道)
  ctx.save();
  ctx.beginPath();
  ctx.rect(LANE.x1, 415, LANE.x2 - LANE.x1, TABLE_H - 415);
  const g = ctx.createLinearGradient(LANE.x1, 0, LANE.x2, 0);
  g.addColorStop(0, '#9adcff');
  g.addColorStop(0.5, '#c9eeff');
  g.addColorStop(1, '#9adcff');
  ctx.fillStyle = g;
  ctx.fill();
  // 泡もよう
  ctx.fillStyle = 'rgba(255,255,255,0.5)';
  for (let y = 470; y < TABLE_H - 60; y += 90) {
    ctx.beginPath();
    ctx.arc(LANE.launchX + (y % 180 === 0 ? -12 : 12), y, 6, 0, TAU);
    ctx.fill();
  }
  // 上向き矢印
  ctx.fillStyle = 'rgba(60,150,220,0.5)';
  for (let y = 620; y < 900; y += 130) {
    ctx.beginPath();
    ctx.moveTo(LANE.launchX, y - 20);
    ctx.lineTo(LANE.launchX - 14, y);
    ctx.lineTo(LANE.launchX - 5, y);
    ctx.lineTo(LANE.launchX - 5, y + 16);
    ctx.lineTo(LANE.launchX + 5, y + 16);
    ctx.lineTo(LANE.launchX + 5, y);
    ctx.lineTo(LANE.launchX + 14, y);
    ctx.closePath();
    ctx.fill();
  }
  ctx.restore();
}

function wallStroke(ctx, draw) {
  // 外側の濃い縁 → 本体 → ハイライト の3層で立体感
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
  ctx.strokeStyle = '#8a5a2b';
  ctx.lineWidth = 30;
  draw();
  ctx.strokeStyle = '#c98a4b';
  ctx.lineWidth = 22;
  draw();
  ctx.strokeStyle = '#f0c489';
  ctx.lineWidth = 9;
  draw();
}

function paintWalls(ctx) {
  ctx.save();
  // 外周(左壁 → アーチ → 右壁)
  wallStroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(WALL_L, TABLE_H + 20);
    ctx.lineTo(WALL_L, ARCH.cy);
    ctx.arc(ARCH.cx, ARCH.cy, ARCH.r, Math.PI, 0, false);
    ctx.lineTo(WALL_R, TABLE_H + 20);
    ctx.stroke();
  });
  // レーン内壁
  wallStroke(ctx, () => {
    ctx.beginPath();
    ctx.moveTo(LANE.x1, 430);
    ctx.lineTo(LANE.x1, 700);
    ctx.stroke();
  });
  // ガイド壁
  for (const gd of GUIDES) {
    wallStroke(ctx, () => {
      ctx.beginPath();
      ctx.moveTo(gd.ax, gd.ay);
      ctx.lineTo(gd.bx, gd.by);
      ctx.stroke();
    });
  }
  ctx.restore();
}

function paintDeco(ctx) {
  // アーチ頂上のおほしさま看板
  ctx.save();
  const topX = ARCH.cx;
  const topY = ARCH.cy - ARCH.r - 4;
  ctx.fillStyle = '#ffd94d';
  ctx.strokeStyle = '#e8a325';
  ctx.lineWidth = 4;
  starPath(ctx, topX, topY, 34, 15);
  ctx.fill();
  ctx.stroke();
  // 目
  ctx.fillStyle = '#5a3d1c';
  ctx.beginPath();
  ctx.arc(topX - 8, topY - 2, 3.4, 0, TAU);
  ctx.arc(topX + 8, topY - 2, 3.4, 0, TAU);
  ctx.fill();
  // にっこり口
  ctx.strokeStyle = '#5a3d1c';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.arc(topX, topY + 4, 7, 0.15 * Math.PI, 0.85 * Math.PI);
  ctx.stroke();

  // 壁ぎわの草
  ctx.fillStyle = hsl(110, 55, 42, 0.9);
  for (const [x, y] of [[45, 970], [555, 970], [48, 690], [498, 690]]) {
    for (let i = -1; i <= 1; i++) {
      ctx.beginPath();
      ctx.ellipse(x + i * 10, y, 6, 14, i * 0.3, 0, TAU);
      ctx.fill();
    }
  }
  ctx.restore();
}
