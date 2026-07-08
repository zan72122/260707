// 汎用ユーティリティ(数学・乱数・イージング・描画補助)

export const TAU = Math.PI * 2;

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

export function rand(lo = 0, hi = 1) {
  return lo + Math.random() * (hi - lo);
}

export function randInt(lo, hi) {
  return Math.floor(rand(lo, hi + 1));
}

export function pick(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function easeOutCubic(t) {
  const u = 1 - t;
  return 1 - u * u * u;
}

export function easeOutBack(t) {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  const u = t - 1;
  return 1 + c3 * u * u * u + c1 * u * u;
}

export function easeInQuad(t) {
  return t * t;
}

export function easeOutQuad(t) {
  return 1 - (1 - t) * (1 - t);
}

// 0→1→0 の山型カーブ
export function bell(t) {
  return Math.sin(clamp(t, 0, 1) * Math.PI);
}

export function hsl(h, s, l, a = 1) {
  return `hsla(${h}, ${s}%, ${l}%, ${a})`;
}

// 角丸長方形パス(iOS15以前の roundRect 未対応にも備える)
export function roundRectPath(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// 星形パス
export function starPath(ctx, cx, cy, outerR, innerR, points = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r;
    const y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y);
    else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ハート形パス
export function heartPath(ctx, cx, cy, size) {
  const s = size;
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.32);
  ctx.bezierCurveTo(cx + s * 0.5, cy - s * 0.24, cx + s * 0.42, cy - s * 0.78, cx, cy - s * 0.44);
  ctx.bezierCurveTo(cx - s * 0.42, cy - s * 0.78, cx - s * 0.5, cy - s * 0.24, cx, cy + s * 0.32);
  ctx.closePath();
}

// ふちどり付きテキスト
export function outlinedText(ctx, text, x, y, fill, stroke, lineWidth) {
  ctx.lineJoin = 'round';
  ctx.strokeStyle = stroke;
  ctx.lineWidth = lineWidth;
  ctx.strokeText(text, x, y);
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
}

export const FONT = '"M PLUS Rounded 1c", "Hiragino Maru Gothic ProN", "ヒラギノ丸ゴ ProN W4", system-ui, sans-serif';

export function font(size, weight = 800) {
  return `${weight} ${size}px ${FONT}`;
}
