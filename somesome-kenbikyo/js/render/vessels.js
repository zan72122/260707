// ガラス容器(ビーカー/バット)の描画。液面のゆらぎと"ちょうどいい"目印つき。
import { mixColor, scaleColor } from '../core/utils.js';

// ビーカーを描く。fill=0..1 の液量、phase=ゆらぎ位相
export function drawJar(g, x, y, w, h, liquid, fill, phase = 0) {
  g.clear();
  const left = x - w / 2, right = x + w / 2, bottom = y + h / 2, top = y - h / 2;
  const r = Math.min(18, w * 0.12);
  // 液体
  const liqTop = bottom - h * fill;
  if (fill > 0.02) {
    const amp = Math.max(2, w * 0.02);
    g.fillStyle(liquid.deep, 0.9);
    g.beginPath();
    g.moveTo(left + 4, bottom - r);
    g.lineTo(left + 4, liqTop);
    const seg = 16;
    for (let i = 0; i <= seg; i++) {
      const px = left + 4 + (w - 8) * (i / seg);
      const py = liqTop + Math.sin(phase + i * 0.6) * amp;
      g.lineTo(px, py);
    }
    g.lineTo(right - 4, bottom - r);
    g.arc(right - 4 - r, bottom - r, r, 0, Math.PI / 2, false);
    g.arc(left + 4 + r, bottom - r, r, Math.PI / 2, Math.PI, false);
    g.closePath();
    g.fillPath();
    // 表層の明るい帯
    g.fillStyle(mixColor(liquid.light, 0xffffff, 0.3), 0.5);
    g.fillRect(left + 6, liqTop, w - 12, Math.max(3, h * 0.03));
  }
  // ガラス
  g.lineStyle(Math.max(3, w * 0.035), 0xdff4ff, 0.85);
  g.beginPath();
  g.moveTo(left, top);
  g.lineTo(left, bottom - r);
  g.arc(left + r, bottom - r, r, Math.PI, Math.PI / 2, true);
  g.lineTo(right - r, bottom);
  g.arc(right - r, bottom - r, r, Math.PI / 2, 0, true);
  g.lineTo(right, top);
  g.strokePath();
  // ガラスの映り込み
  g.fillStyle(0xffffff, 0.12);
  g.fillRect(left + w * 0.14, top, w * 0.1, h * 0.9);
}

// 液から立ちのぼる色のゆらめき(装飾)
export function drawGlint(g, x, y, w, h, color, t) {
  g.clear();
  g.fillStyle(scaleColor(color, 1.4), 0.15);
  for (let i = 0; i < 3; i++) {
    const yy = y + h / 2 - ((t * 30 + i * h / 3) % (h * 0.9));
    g.fillCircle(x - w * 0.2 + i * w * 0.2, yy, w * 0.05);
  }
}
