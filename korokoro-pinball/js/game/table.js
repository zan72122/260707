// テーブルの形状定義(論理座標 600 x 1000)
// 壁は線分の集合。上部はアーチ(円弧)を線分に分割して表現する

import { TABLE_W, TABLE_H } from '../core/physics.js';

export const ARCH = { cx: 300, cy: 330, r: 280 };
export const LANE = { x1: 520, x2: 580, launchX: 550 }; // 右側の発射レーン
export const WALL_L = 20;
export const WALL_R = 580;
export const DRAIN_Y = 985; // これより下に落ちたらボールロスト

export const FLIPPER_CONF = {
  left: { px: 180, py: 866, length: 112, side: 'L', restAngle: 0.48, upAngle: -0.52 },
  right: { px: 420, py: 866, length: 112, side: 'R', restAngle: Math.PI - 0.48, upAngle: Math.PI + 0.52 },
};

// ガイド(フリッパーへボールを導く斜め壁)
export const GUIDES = [
  { ax: WALL_L, ay: 700, bx: 172, by: 860 },
  { ax: LANE.x1, ay: 700, bx: 428, by: 860 },
];

// 発射レーン上部のワンウェイゲート(下向きにだけ衝突する)
export const GATE = { ax: LANE.x1 + 2, ay: 415, bx: LANE.x2 - 2, by: 415 };

// アーチを線分に分割
function buildArchSegments() {
  const segs = [];
  const n = 30;
  for (let i = 0; i < n; i++) {
    const a0 = Math.PI + (i / n) * Math.PI;
    const a1 = Math.PI + ((i + 1) / n) * Math.PI;
    segs.push({
      ax: ARCH.cx + Math.cos(a0) * ARCH.r,
      ay: ARCH.cy + Math.sin(a0) * ARCH.r,
      bx: ARCH.cx + Math.cos(a1) * ARCH.r,
      by: ARCH.cy + Math.sin(a1) * ARCH.r,
      rest: 0.55,
    });
  }
  return segs;
}

// 衝突用の壁線分をすべて構築
export function buildWalls() {
  const segs = [];
  const R = (ax, ay, bx, by, rest = 0.55) => segs.push({ ax, ay, bx, by, rest });

  // 左壁
  R(WALL_L, TABLE_H, WALL_L, ARCH.cy);
  // 右外壁(レーン外側)
  R(WALL_R, ARCH.cy, WALL_R, TABLE_H);
  // レーン内壁(プレイフィールド右端)
  R(LANE.x1, 430, LANE.x1, 700);
  // レーン内壁の頂点キャップ(丸く跳ねるよう斜めに)
  R(LANE.x1 - 10, 442, LANE.x1, 430, 0.5);
  // レーン底(ボール待機位置)
  R(LANE.x1, TABLE_H - 14, LANE.x2, TABLE_H - 14, 0.3);
  // ガイド壁
  for (const g of GUIDES) R(g.ax, g.ay, g.bx, g.by, 0.4);
  // アーチ
  segs.push(...buildArchSegments());
  return segs;
}

// 円形ペグ(お花の飾り、当たると軽く跳ねる)
export const PEGS = [
  { x: 92, y: 610, r: 16 },
  { x: 448, y: 610, r: 16 },
  { x: 300, y: 585, r: 14 },
];

// スリングショット(強く弾く花)
export const SLINGS = [
  { x: 152, y: 762, r: 26 },
  { x: 448, y: 762, r: 26 },
];

// バンパー(キノコ)
export const BUMPERS = [
  { x: 188, y: 338, r: 35, hue: 0 },
  { x: 412, y: 338, r: 35, hue: 200 },
  { x: 300, y: 462, r: 38, hue: 45 },
];

// コイン配置
export function buildCoinSpots() {
  const spots = [];
  // アーチに沿った虹形のコイン列
  const angles = [150, 125, 100, 80, 55, 30];
  for (const deg of angles) {
    const a = (deg * Math.PI) / 180;
    spots.push({
      x: ARCH.cx + Math.cos(Math.PI + a) * -195,
      y: ARCH.cy - Math.sin(a) * 195,
    });
  }
  // 中段の横列
  for (let i = 0; i < 3; i++) spots.push({ x: 240 + i * 60, y: 555 });
  // ガイド上の誘導コイン
  spots.push({ x: 68, y: 668 }, { x: 472, y: 668 });
  return spots;
}

// たからばこ
export const CHEST = { x: 88, y: 528, r: 34 };

// 敵(プニ)の巡回ライン
export const ENEMY_PATH = { y: 655, xMin: 150, xMax: 420 };

export { TABLE_W, TABLE_H };
