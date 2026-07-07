// 汎用ユーティリティ: 数学・色・虹パレット

export const TAU = Math.PI * 2;

export const RAINBOW = [
  { name: 'あか',    hex: '#ff5a5a', h: 0 },
  { name: 'オレンジ', hex: '#ffa245', h: 30 },
  { name: 'きいろ',   hex: '#ffe066', h: 52 },
  { name: 'みどり',   hex: '#7de87d', h: 120 },
  { name: 'みずいろ', hex: '#6fd8ff', h: 195 },
  { name: 'あお',    hex: '#6f8cff', h: 228 },
  { name: 'むらさき', hex: '#c07dff', h: 275 },
];

export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function dist(x1, y1, x2, y2) {
  const dx = x2 - x1;
  const dy = y2 - y1;
  return Math.hypot(dx, dy);
}

export function angleLerp(a, b, t) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return a + d * t;
}

export function rand(lo = 0, hi = 1) {
  return lo + Math.random() * (hi - lo);
}

export function randPick(arr) {
  return arr[(Math.random() * arr.length) | 0];
}

// hex → {r,g,b}
export function hexToRgb(hex) {
  const n = parseInt(hex.slice(1), 16);
  return { r: (n >> 16) & 255, g: (n >> 8) & 255, b: n & 255 };
}

export function rgba(hex, a) {
  const { r, g, b } = hexToRgb(hex);
  return `rgba(${r},${g},${b},${a})`;
}

// 2色のhexを混ぜる
export function mixHex(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(lerp(a.r, b.r, t));
  const g = Math.round(lerp(a.g, b.g, t));
  const bl = Math.round(lerp(a.b, b.b, t));
  return `rgb(${r},${g},${bl})`;
}

// 点pと線分(a→b)の距離
export function pointSegDist(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return dist(px, py, ax, ay);
  let t = ((px - ax) * abx + (py - ay) * aby) / len2;
  t = clamp(t, 0, 1);
  return dist(px, py, ax + abx * t, ay + aby * t);
}

// 点pを線分方向に投影したときのt(0..1の外も返す)
export function pointSegT(px, py, ax, ay, bx, by) {
  const abx = bx - ax;
  const aby = by - ay;
  const len2 = abx * abx + aby * aby;
  if (len2 === 0) return 0;
  return ((px - ax) * abx + (py - ay) * aby) / len2;
}

// 入射ベクトルを法線で反射
export function reflect(dx, dy, nx, ny) {
  const d = dx * nx + dy * ny;
  return { x: dx - 2 * d * nx, y: dy - 2 * d * ny };
}

// イージング
export const ease = {
  outCubic: (t) => 1 - Math.pow(1 - t, 3),
  outBack: (t) => {
    const c = 1.70158;
    return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2);
  },
  inOutSine: (t) => -(Math.cos(Math.PI * t) - 1) / 2,
};

// 角丸長方形パス
export function roundRect(ctx, x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

// やわらかい光のグロー(放射グラデーション)を描く
export function drawGlow(ctx, x, y, radius, hex, alpha) {
  const g = ctx.createRadialGradient(x, y, 0, x, y, radius);
  g.addColorStop(0, rgba(hex, alpha));
  g.addColorStop(0.5, rgba(hex, alpha * 0.35));
  g.addColorStop(1, rgba(hex, 0));
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
}

// ハート型パス(発見スター演出などに)
export function heartPath(ctx, x, y, s) {
  ctx.beginPath();
  ctx.moveTo(x, y + s * 0.35);
  ctx.bezierCurveTo(x - s, y - s * 0.45, x - s * 0.4, y - s * 1.1, x, y - s * 0.4);
  ctx.bezierCurveTo(x + s * 0.4, y - s * 1.1, x + s, y - s * 0.45, x, y + s * 0.35);
  ctx.closePath();
}

// 星型パス
export function starPath(ctx, x, y, outer, inner, points = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outer : inner;
    const a = rot + (i * Math.PI) / points;
    const px = x + Math.cos(a) * r;
    const py = y + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(px, py);
    else ctx.lineTo(px, py);
  }
  ctx.closePath();
}
