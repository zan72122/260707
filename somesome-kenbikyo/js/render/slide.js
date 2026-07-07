// スライドガラスと、そこに乗った組織の描画。
// マクロ表示(工程中): 色がじわーっと入る様子。ミクロ表示は microscope 側。
import { makeRng, mixColor, clamp } from '../core/utils.js';

// ガラスのスライド本体(すりガラスのラベル端つき)
export function drawSlideGlass(g, x, y, w, h, coverAlpha = 0) {
  g.clear();
  const left = x - w / 2, top = y - h / 2;
  g.fillStyle(0xeaf6ff, 0.16);
  g.fillRoundedRect(left, top, w, h, 8);
  g.lineStyle(3, 0xdff4ff, 0.85);
  g.strokeRoundedRect(left, top, w, h, 8);
  // すりガラスのラベル(左端)
  g.fillStyle(0xf6fbff, 0.5);
  g.fillRoundedRect(left, top, w * 0.16, h, 8);
  g.lineStyle(2, 0xffffff, 0.4);
  g.strokeRoundedRect(left, top, w * 0.16, h, 8);
  // カバーガラス(封入後に光る)
  if (coverAlpha > 0) {
    g.fillStyle(0xffffff, 0.14 * coverAlpha);
    g.fillRoundedRect(left + w * 0.22, top + h * 0.12, w * 0.7, h * 0.76, 4);
    g.lineStyle(2, 0xffffff, 0.6 * coverAlpha);
    g.strokeRoundedRect(left + w * 0.22, top + h * 0.12, w * 0.7, h * 0.76, 4);
  }
}

// 組織のマクロ表示。look は stain.computeResult() の戻り値。
export function drawTissueMacro(g, cx, cy, radius, look, seed = 1, phase = 0) {
  g.clear();
  const rng = makeRng(seed);
  // 組織のベース(にじんだ楕円)
  const baseColor = mixColor(look.bgColor, look.cytoColor, look.cytoAlpha * 0.7);
  g.fillStyle(baseColor, 0.55);
  g.fillEllipse(cx, cy, radius * 1.9, radius * 1.5);
  // 細胞質のかたまり
  for (let i = 0; i < 10; i++) {
    const a = rng() * Math.PI * 2;
    const rr = Math.sqrt(rng()) * radius * 0.85;
    const px = cx + Math.cos(a) * rr;
    const py = cy + Math.sin(a) * rr * 0.8;
    g.fillStyle(look.cytoColor, look.cytoAlpha * (0.4 + rng() * 0.4));
    g.fillCircle(px, py, radius * (0.12 + rng() * 0.1));
  }
  // 核のつぶつぶ(青むらさき)
  for (let i = 0; i < 26; i++) {
    const a = rng() * Math.PI * 2;
    const rr = Math.sqrt(rng()) * radius * 0.9;
    const px = cx + Math.cos(a) * rr + Math.sin(phase + i) * 1.2;
    const py = cy + Math.sin(a) * rr * 0.8;
    g.fillStyle(look.nucleusColor, look.nucleusAlpha * (0.5 + rng() * 0.5));
    g.fillCircle(px, py, radius * (0.03 + rng() * 0.035));
  }
  // ムラ(水質)
  if (look.muraAmount > 0.05) {
    for (let i = 0; i < 5; i++) {
      g.fillStyle(0x88a0c0, look.muraAmount * 0.18);
      g.fillEllipse(cx + (rng() - 0.5) * radius, cy + (rng() - 0.5) * radius, radius * 0.6, radius * 0.2);
    }
  }
  // 濁り(脱水不足)
  if (look.hazeAlpha > 0.02) {
    g.fillStyle(0xf2f4ee, clamp(look.hazeAlpha));
    g.fillEllipse(cx, cy, radius * 1.95, radius * 1.55);
  }
}
