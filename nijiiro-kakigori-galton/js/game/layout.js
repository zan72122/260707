// 屋台マシンのレイアウト計算(縦画面・横画面の両対応)
// タンク(ホッパー) → 漏斗(狭い喉) → ピンの森 → 仕切りスロット → 氷のカップ
import { clamp } from '../core/utils.js';

export const N_SLOTS = 9;      // 分布を見せるスロット(ビン)の数
export const PIN_ROWS = 10;    // ピンの森の段数(密)

export function computeLayout(w, h) {
  const portrait = h >= w;
  const L = { w, h, portrait, nSlots: N_SLOTS, pinRows: PIN_ROWS };

  if (portrait) {
    L.buttonH = clamp(h * 0.105, 62, 100);
    L.sideR = clamp(w * 0.135, 56, 120);          // 右のレバー帯
    L.boardW = Math.min(w - L.sideR - 18, h * 0.60);
    L.boardX = clamp((w - L.sideR - L.boardW) / 2 + 4, 6, w);
  } else {
    L.buttonH = 0;
    L.sideL = clamp(w * 0.135, 86, 150);          // 左のボトル帯
    L.sideR = clamp(w * 0.135, 86, 150);          // 右のレバー+マスコット帯
    L.boardW = Math.min(w - L.sideL - L.sideR - 20, h * 1.05);
    L.boardX = L.sideL + (w - L.sideL - L.sideR - L.boardW) / 2;
  }
  L.cx = L.boardX + L.boardW / 2;

  const H = h - L.buttonH;                        // マシンが使える高さ
  L.awningH = clamp(H * 0.055, 26, 56);           // ひさし(赤白テント)

  // ガラスタンク(ホッパー)
  L.tank = {
    w: L.boardW * 0.74,
    h: H * 0.150,
    x: 0, y: L.awningH + clamp(H * 0.012, 5, 12),
  };
  L.tank.x = L.cx - L.tank.w / 2;
  L.tankBottom = L.tank.y + L.tank.h;

  // 漏斗と喉(狭い入口)
  L.throatY = L.tankBottom + H * 0.055;
  L.slotW = L.boardW / N_SLOTS;
  L.ballR = clamp(L.slotW * 0.135, 3.5, 10);
  L.throatHalf = L.ballR * 2.6;                   // 玉2.6個分の狭い通路

  // ピンの森(密な三角格子)
  L.pinTop = L.throatY + H * 0.030;
  L.slotTop = L.pinTop + H * 0.295;               // 仕切りの上端
  L.pinGapY = (L.slotTop - L.pinTop) / PIN_ROWS;
  L.pinR = clamp(L.slotW * 0.10, 2.5, 7);
  L.pins = [];
  let idx = 0;
  for (let row = 0; row < PIN_ROWS; row++) {
    const dividerAligned = row % 2 === 1;         // 奇数段は仕切りの真上に並ぶ
    const count = dividerAligned ? N_SLOTS - 1 : N_SLOTS;
    const offset = dividerAligned ? L.slotW : L.slotW / 2;
    for (let i = 0; i < count; i++) {
      L.pins.push({ x: L.boardX + offset + i * L.slotW, y: L.pinTop + (row + 0.5) * L.pinGapY, row, idx: idx++ });
    }
  }

  // スロット(仕切り付きビン)と氷の床
  L.iceY = L.slotTop + H * 0.215;
  L.cupBottom = L.iceY + H * 0.055;
  L.slotX = (i) => L.boardX + i * L.slotW;

  // 物理用の壁(漏斗の左右・盤面の側壁)。法線側に玉を押し出す線分
  L.walls = [
    { x1: L.tank.x, y1: L.tankBottom, x2: L.cx - L.throatHalf, y2: L.throatY },
    { x1: L.tank.x + L.tank.w, y1: L.tankBottom, x2: L.cx + L.throatHalf, y2: L.throatY },
    { x1: L.cx - L.throatHalf, y1: L.throatY, x2: L.boardX + L.slotW * 0.35, y2: L.pinTop + L.pinGapY },
    { x1: L.cx + L.throatHalf, y1: L.throatY, x2: L.boardX + L.boardW - L.slotW * 0.35, y2: L.pinTop + L.pinGapY },
    { x1: L.boardX, y1: L.pinTop, x2: L.boardX, y2: L.iceY },
    { x1: L.boardX + L.boardW, y1: L.pinTop, x2: L.boardX + L.boardW, y2: L.iceY },
  ];

  // レバー(右側の大きな赤レバー)
  const leverX = portrait ? L.boardX + L.boardW + L.sideR * 0.42 : w - L.sideR * 0.52;
  const handleR = clamp(L.sideR * 0.30, 20, 38);
  L.lever = {
    x: leverX,
    topY: Math.max(L.tank.y + clamp(H * 0.02, 8, 18), L.awningH + handleR + 8),
    botY: L.throatY + clamp(H * 0.06, 20, 46),
    handleR,
  };

  // シロップボトルのボタン
  L.buttons = [];
  const n = 7;
  if (portrait) {
    const bw = Math.min(w / n, 96);
    const r = clamp(bw * 0.40, 22, 40);
    const y = h - L.buttonH / 2;
    const x0 = w / 2 - ((n - 1) * bw) / 2;
    for (let i = 0; i < n; i++) L.buttons.push({ x: x0 + i * bw, y, r });
  } else {
    const bh = Math.min((h - 60) / n, 88);
    const r = clamp(bh * 0.42, 20, 36);
    const x = L.sideL / 2;
    const y0 = h / 2 - ((n - 1) * bh) / 2 + 14;
    for (let i = 0; i < n; i++) L.buttons.push({ x, y: y0 + i * bh, r });
  }

  // 各種ボタン
  L.muteBtn = { x: portrait ? w - 32 : L.boardX + L.boardW - 26, y: 32, r: 20 };
  L.fanBtn = {
    x: portrait ? L.boardX + L.slotW * 0.85 : L.lever.x,
    y: portrait ? (L.tankBottom + L.throatY) / 2 : L.lever.botY + handleR * 2.8,
    r: clamp(Math.min(w, h) * 0.036, 20, 30),
  };
  L.meter = portrait ? { x: 14, y: 14 } : { x: L.boardX + 14, y: L.awningH + 10 };

  // マスコットの位置
  if (portrait) {
    L.mascot = { x: clamp(L.boardX * 0.55, 30, 80), y: L.cupBottom - 6, s: clamp(H * 0.045, 26, 46) };
  } else {
    L.mascot = { x: w - L.sideR * 0.5, y: L.cupBottom - 10, s: clamp(H * 0.075, 30, 56) };
  }

  // 物理定数
  L.gravity = h * 1.30;
  L.maxFall = h * 1.30;

  return L;
}
