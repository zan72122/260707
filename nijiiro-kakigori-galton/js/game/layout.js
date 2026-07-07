// 画面サイズに応じたレイアウト計算(縦画面・横画面の両対応)
import { clamp } from '../core/utils.js';

export function computeLayout(w, h) {
  const portrait = h >= w;
  const L = { w, h, portrait };

  if (portrait) {
    // 縦画面: 上から 雲じゃぐち → ピンのボード → かき氷の器 → シロップボタン
    L.buttonH = clamp(h * 0.12, 70, 110);
    L.boardW = Math.min(w * 0.92, h * 0.62);
    L.boardX = (w - L.boardW) / 2;
    L.faucetY = clamp(h * 0.075, 44, 90);
    L.pinTop = L.faucetY + clamp(h * 0.06, 34, 60);
    L.bowlH = clamp(h * 0.30, 150, 300);
    L.bowlBottom = h - L.buttonH - 8;
    L.pinBottom = L.bowlBottom - L.bowlH + clamp(h * 0.02, 8, 20);
    L.rows = 7;
  } else {
    // 横画面: 左にシロップボタン、中央にボード、右にマスコット
    L.buttonH = 0;
    L.sideW = clamp(w * 0.16, 96, 170);
    L.boardW = Math.min(w - L.sideW * 2 - 12, h * 1.0);
    L.boardX = (w - L.boardW) / 2;
    L.faucetY = clamp(h * 0.10, 40, 76);
    L.pinTop = L.faucetY + clamp(h * 0.075, 30, 54);
    L.bowlH = clamp(h * 0.34, 120, 240);
    L.bowlBottom = h - 6;
    L.pinBottom = L.bowlBottom - L.bowlH + clamp(h * 0.02, 6, 16);
    L.rows = 6;
  }

  // ピンの格子
  L.cols = 9; // 一番広い段のピン数
  L.pinGapX = L.boardW / L.cols;
  L.pinGapY = (L.pinBottom - L.pinTop) / (L.rows - 0.5);
  L.pinR = clamp(L.pinGapX * 0.14, 5, 12);
  L.grainR = clamp(L.pinGapX * 0.16, 5.5, 13);

  // かき氷の器
  L.bowlCx = w / 2;
  L.bowlW = L.boardW * 1.0;
  L.bowlTop = L.bowlBottom - L.bowlH;
  L.iceTop = L.bowlTop + L.bowlH * 0.28; // 氷の山の頂上
  L.rimY = L.bowlBottom - L.bowlH * 0.42; // 器のふちの高さ

  // シロップボタンの座標(縦: 下段横並び / 横: 左端縦並び)
  L.buttons = [];
  const n = 7;
  if (portrait) {
    const bw = Math.min(w / n, 96);
    const r = clamp(bw * 0.40, 24, 40);
    const y = h - L.buttonH / 2;
    const x0 = w / 2 - ((n - 1) * bw) / 2;
    for (let i = 0; i < n; i++) L.buttons.push({ x: x0 + i * bw, y, r });
  } else {
    const bh = Math.min((h - 40) / n, 90);
    const r = clamp(bh * 0.42, 22, 38);
    const x = L.sideW / 2;
    const y0 = h / 2 - ((n - 1) * bh) / 2 + 10;
    for (let i = 0; i < n; i++) L.buttons.push({ x, y: y0 + i * bh, r });
  }

  // 右上のミュートボタン
  L.muteBtn = { x: w - 34, y: 34, r: 22 };

  // 物理定数(画面高さに合わせてスケール)
  L.gravity = h * 1.15;
  L.maxFall = h * 0.9;

  return L;
}
