// 汎用ユーティリティ(数学・描画ヘルパー)

export const TAU = Math.PI * 2;

export function clamp(v, lo, hi) { return v < lo ? lo : v > hi ? hi : v; }
export function lerp(a, b, t) { return a + (b - a) * t; }
export function rand(lo, hi) { return lo + Math.random() * (hi - lo); }
export function randi(lo, hi) { return Math.floor(rand(lo, hi + 1)); }
export function choice(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
export function dist2(ax, ay, bx, by) { const dx = ax - bx, dy = ay - by; return dx * dx + dy * dy; }

export function easeOutBack(t) {
  const c1 = 1.70158, c3 = c1 + 1;
  return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
}
export function easeOutCubic(t) { return 1 - Math.pow(1 - t, 3); }
export function easeInOutSine(t) { return -(Math.cos(Math.PI * t) - 1) / 2; }

// 角丸長方形のパスを作る
export function roundRect(ctx, x, y, w, h, r) {
  const rr = Math.min(r, w / 2, h / 2);
  ctx.beginPath();
  ctx.moveTo(x + rr, y);
  ctx.arcTo(x + w, y, x + w, y + h, rr);
  ctx.arcTo(x + w, y + h, x, y + h, rr);
  ctx.arcTo(x, y + h, x, y, rr);
  ctx.arcTo(x, y, x + w, y, rr);
  ctx.closePath();
}

// 星形のパスを作る
export function starPath(ctx, cx, cy, outerR, innerR, points = 5, rot = -Math.PI / 2) {
  ctx.beginPath();
  for (let i = 0; i < points * 2; i++) {
    const r = i % 2 === 0 ? outerR : innerR;
    const a = rot + (i * Math.PI) / points;
    const x = cx + Math.cos(a) * r, y = cy + Math.sin(a) * r;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
}

// ハート形のパスを作る
export function heartPath(ctx, cx, cy, s) {
  ctx.beginPath();
  ctx.moveTo(cx, cy + s * 0.9);
  ctx.bezierCurveTo(cx - s * 1.3, cy, cx - s * 0.9, cy - s, cx, cy - s * 0.35);
  ctx.bezierCurveTo(cx + s * 0.9, cy - s, cx + s * 1.3, cy, cx, cy + s * 0.9);
  ctx.closePath();
}

// ぷっくりした縁取り文字を描く(4歳児向けの読みやすい表示)
export function drawBubbleText(ctx, text, x, y, size, fill, stroke = '#ffffff', strokeW = 0.22) {
  ctx.save();
  ctx.font = `900 ${size}px 'Hiragino Maru Gothic ProN','ヒラギノ丸ゴ ProN W4','TsukuARdGothic-Regular','M PLUS Rounded 1c','Yu Gothic UI',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  if (strokeW > 0) {
    ctx.lineWidth = size * strokeW;
    ctx.strokeStyle = stroke;
    ctx.strokeText(text, x, y);
  }
  ctx.fillStyle = fill;
  ctx.fillText(text, x, y);
  ctx.restore();
}

// 虹色グラデーション文字
export function drawRainbowText(ctx, text, x, y, size, phase = 0) {
  ctx.save();
  ctx.font = `900 ${size}px 'Hiragino Maru Gothic ProN','ヒラギノ丸ゴ ProN W4','TsukuARdGothic-Regular','M PLUS Rounded 1c','Yu Gothic UI',sans-serif`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.lineJoin = 'round';
  const w = ctx.measureText(text).width;
  const g = ctx.createLinearGradient(x - w / 2, 0, x + w / 2, 0);
  for (let i = 0; i <= 6; i++) {
    g.addColorStop(i / 6, `hsl(${(phase + i * 60) % 360} 85% 62%)`);
  }
  ctx.lineWidth = size * 0.24;
  ctx.strokeStyle = '#ffffff';
  ctx.strokeText(text, x, y);
  ctx.fillStyle = g;
  ctx.fillText(text, x, y);
  ctx.restore();
}
