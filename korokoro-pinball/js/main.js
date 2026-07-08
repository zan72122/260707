// エントリーポイント(起動・リサイズ・メインループ・画面遷移)

import { clamp } from './core/utils.js';
import { audio } from './core/audio.js';
import { Input } from './core/input.js';
import { Particles } from './core/particles.js';
import { TABLE_W, TABLE_H } from './game/table.js';
import { paintSky, paintTable } from './game/background.js';
import { Game } from './game/game.js';
import { Hud } from './game/hud.js';
import { drawBall, drawFlipper, drawPlunger, drawFeverOverlay } from './game/render.js';

const canvas = document.getElementById('game');
const ctx = canvas.getContext('2d');

const view = { w: 0, h: 0, dpr: 1, scale: 1, offX: 0, offY: 0 };
let skyCanvas = null;
let tableCanvas = null;

const input = new Input(canvas);
const hud = new Hud();
const particles = new Particles();
const game = new Game(input, hud, particles);

let state = 'title'; // title | play
let time = 0;
let lastTs = 0;

function resize() {
  const w = window.innerWidth;
  const h = window.innerHeight;
  const dpr = clamp(window.devicePixelRatio || 1, 1, 2);
  view.w = w;
  view.h = h;
  view.dpr = dpr;
  canvas.width = Math.round(w * dpr);
  canvas.height = Math.round(h * dpr);
  canvas.style.width = `${w}px`;
  canvas.style.height = `${h}px`;

  // テーブルを画面にフィット(縦横どちらでもOK)
  const sc = Math.min(w / TABLE_W, h / TABLE_H) * 0.995;
  view.scale = sc;
  view.offX = (w - TABLE_W * sc) / 2;
  view.offY = (h - TABLE_H * sc) * 0.5;

  // 空(スクリーンサイズで静的描画)
  skyCanvas = document.createElement('canvas');
  skyCanvas.width = canvas.width;
  skyCanvas.height = canvas.height;
  const sctx = skyCanvas.getContext('2d');
  sctx.scale(dpr, dpr);
  paintSky(sctx, w, h);

  // テーブル(論理座標 → 実ピクセルで静的描画)
  const k = sc * dpr;
  tableCanvas = document.createElement('canvas');
  tableCanvas.width = Math.max(1, Math.round(TABLE_W * k * 1.35)); // 虹が外にはみ出す分の余白
  tableCanvas.height = Math.max(1, Math.round(TABLE_H * k * 1.1));
  const tctx = tableCanvas.getContext('2d');
  // 余白オフセット(左右 0.175 * W, 上 0.08 * H)
  tctx.setTransform(k, 0, 0, k, TABLE_W * k * 0.175, TABLE_H * k * 0.08);
  paintTable(tctx);
}

function applyTableTransform() {
  ctx.setTransform(
    view.scale * view.dpr, 0, 0, view.scale * view.dpr,
    view.offX * view.dpr, view.offY * view.dpr,
  );
}

function screenTransform() {
  ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
}

function drawTableStatic() {
  applyTableTransform();
  ctx.drawImage(
    tableCanvas,
    -TABLE_W * 0.175, -TABLE_H * 0.08,
    TABLE_W * 1.35, TABLE_H * 1.1,
  );
}

function drawPlayfield() {
  applyTableTransform();
  for (const p of game.pegs) p.draw(ctx);
  for (const c of game.coins) c.draw(ctx);
  game.chest.draw(ctx);
  for (const s of game.slings) s.draw(ctx);
  for (const e of game.enemies) e.draw(ctx);
  for (const b of game.bumpers) b.draw(ctx);
  drawPlunger(ctx, game.charge, time);
  drawFlipper(ctx, game.flipperL);
  drawFlipper(ctx, game.flipperR);
  for (const s of game.starPickups) s.draw(ctx);
  if (game.ballState !== 'drained') {
    drawBall(ctx, game.ball, game.fever(), time);
  }
  particles.draw(ctx);
  if (game.ballState === 'waiting') {
    hud.drawLaunchPrompt(ctx, game.ball.x, game.ball.y, time, game.charging, game.charge);
  }
}

function frame(ts) {
  requestAnimationFrame(frame);
  const dt = clamp((ts - lastTs) / 1000, 0, 1 / 30);
  lastTs = ts;
  time = ts / 1000;

  hud.update(dt);
  particles.update(dt);
  if (state === 'play') {
    game.update(dt, time);
  }

  // ===== 描画 =====
  screenTransform();
  ctx.drawImage(skyCanvas, 0, 0, view.w, view.h);
  if (game.fever()) {
    drawFeverOverlay(ctx, view.w, view.h, time, game.feverTime / game.feverTotal);
    screenTransform();
  }
  drawTableStatic();

  if (state === 'play') {
    drawPlayfield();
    screenTransform();
    hud.draw(ctx, view, game, time);
    hud.drawTouchHints(ctx, view, input.leftHeld, input.rightHeld);
  } else {
    // タイトル(テーブルはうっすら見せる)
    applyTableTransform();
    for (const b of game.bumpers) b.draw(ctx);
    for (const c of game.coins) c.draw(ctx);
    drawFlipper(ctx, game.flipperL);
    drawFlipper(ctx, game.flipperR);
    screenTransform();
    hud.drawTitle(ctx, view, time);
  }
}

function startPlay() {
  state = 'play';
  game.reset();
  particles.clear();
  hud.resetHints();
  hud.showBanner('コロコロ★スタート!', '#ffde59', 1.8);
  audio.startBgm();
}

input.on('press', () => {
  if (state === 'title') startPlay();
});
input.on('release', () => {
  if (state === 'play') game.onRelease();
});
input.on('leftFlip', () => {
  if (state === 'play' && game.ballState === 'live') audio.flipper();
});
input.on('rightFlip', () => {
  if (state === 'play' && game.ballState === 'live') audio.flipper();
});

window.addEventListener('resize', resize);
window.addEventListener('orientationchange', () => setTimeout(resize, 250));
if (window.visualViewport) {
  window.visualViewport.addEventListener('resize', () => setTimeout(resize, 50));
}

resize();
requestAnimationFrame((ts) => {
  lastTs = ts;
  requestAnimationFrame(frame);
});

// ブート画面を消す
setTimeout(() => {
  document.getElementById('boot')?.classList.add('hidden');
}, 350);
