// 臓器風のランダム標本ジェネレータ。毎回ちがう細胞の形・並びを作る。
// 出力は単位円(半径1)内の正規化座標。顕微鏡シーンが色を付けて描画する。
import { makeRng } from '../core/utils.js';

export const SPECIMEN_TYPES = [
  { id: 'skin', icon: '✋', label: 'ひふ' },
  { id: 'leaf', icon: '🌿', label: 'はっぱ' },
  { id: 'flower', icon: '🌸', label: 'おはな' },
  { id: 'villi', icon: '🫐', label: 'おなかのなか' },
  { id: 'blood', icon: '🩸', label: 'ちのなか' },
];

// 1つの細胞: 中心(x,y), 細胞質半径 r, 核オフセット, 核半径, 形の歪み
function cell(rng, x, y, r, opts = {}) {
  const wobble = [];
  const seg = 10;
  for (let i = 0; i < seg; i++) wobble.push(0.82 + rng() * 0.36);
  return {
    x, y, r,
    wobble,
    nucleusR: r * (opts.nucFrac ?? 0.28 + rng() * 0.14),
    nx: x + (rng() - 0.5) * r * (opts.nucSpread ?? 0.5),
    ny: y + (rng() - 0.5) * r * (opts.nucSpread ?? 0.5),
    hasWall: opts.hasWall ?? false,
    tint: rng(),
  };
}

function genSkin(rng) {
  const cells = [];
  const rows = 6;
  for (let row = 0; row < rows; row++) {
    const y = -0.85 + (row / (rows - 1)) * 1.7;
    const r = 0.1 + (row / rows) * 0.05;
    const count = Math.floor(1.7 / (r * 2.1));
    for (let i = 0; i < count; i++) {
      const x = -0.85 + (i + (row % 2) * 0.5) * (r * 2.05) + (rng() - 0.5) * 0.03;
      if (Math.abs(x) > 0.92) continue;
      cells.push(cell(rng, x, y, r, { nucFrac: 0.34, nucSpread: 0.3 }));
    }
  }
  return { cells, walls: 'rows' };
}

function genLeaf(rng) {
  const cells = [];
  const cols = 5;
  for (let cx = 0; cx < cols; cx++) {
    for (let cy = 0; cy < cols; cy++) {
      const x = -0.8 + (cx / (cols - 1)) * 1.6 + (rng() - 0.5) * 0.04;
      const y = -0.8 + (cy / (cols - 1)) * 1.6 + (rng() - 0.5) * 0.04;
      if (x * x + y * y > 0.95) continue;
      cells.push(cell(rng, x, y, 0.15, { nucFrac: 0.22, nucSpread: 0.9, hasWall: true }));
    }
  }
  return { cells, walls: 'grid' };
}

function genFlower(rng) {
  const cells = [];
  const petals = 6;
  cells.push(cell(rng, 0, 0, 0.2, { nucFrac: 0.4, nucSpread: 0.15 }));
  for (let p = 0; p < petals; p++) {
    const a = (p / petals) * Math.PI * 2;
    for (let k = 1; k <= 3; k++) {
      const rr = 0.28 * k;
      const x = Math.cos(a) * rr + (rng() - 0.5) * 0.05;
      const y = Math.sin(a) * rr + (rng() - 0.5) * 0.05;
      cells.push(cell(rng, x, y, 0.13 - k * 0.01, { nucFrac: 0.32, nucSpread: 0.4 }));
    }
  }
  return { cells, walls: 'radial' };
}

function genVilli(rng) {
  const cells = [];
  const fingers = 3;
  for (let f = 0; f < fingers; f++) {
    const baseX = -0.6 + f * 0.6;
    for (let s = 0; s < 12; s++) {
      const t = s / 11;
      const y = 0.85 - t * 1.6;
      const sway = Math.sin(t * 3 + f) * 0.12;
      const r = 0.09;
      cells.push(cell(rng, baseX + sway - r, y, r, { nucFrac: 0.4, nucSpread: 0.2 }));
      cells.push(cell(rng, baseX + sway + r, y, r, { nucFrac: 0.4, nucSpread: 0.2 }));
    }
  }
  return { cells, walls: 'none' };
}

function genBlood(rng) {
  const cells = [];
  for (let i = 0; i < 60; i++) {
    const a = rng() * Math.PI * 2;
    const rr = Math.sqrt(rng()) * 0.92;
    const x = Math.cos(a) * rr, y = Math.sin(a) * rr;
    const isWhite = rng() < 0.12;
    cells.push({
      ...cell(rng, x, y, isWhite ? 0.12 : 0.08, { nucFrac: isWhite ? 0.55 : 0.02, nucSpread: 0.2 }),
      isRed: !isWhite,
    });
  }
  return { cells, walls: 'none' };
}

const GENERATORS = { skin: genSkin, leaf: genLeaf, flower: genFlower, villi: genVilli, blood: genBlood };

export function generateSpecimen(seed) {
  const rng = makeRng(seed);
  const type = SPECIMEN_TYPES[Math.floor(rng() * SPECIMEN_TYPES.length)];
  const data = GENERATORS[type.id](rng);
  // ときどき隠れキャラ細胞(顔つき)を混ぜる楽しみ
  const hidden = rng() < 0.35 && data.cells.length > 0
    ? Math.floor(rng() * data.cells.length) : -1;
  return { type: type.id, icon: type.icon, label: type.label, seed, hiddenFace: hidden, ...data };
}
