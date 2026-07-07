// 縦横どちらでも破綻しないレイアウト計算のヘルパー

export function computeLayout(w, h) {
  const portrait = h >= w;
  const short = Math.min(w, h);
  const long = Math.max(w, h);
  // UI要素の基準サイズ(小さすぎ・大きすぎを防ぐ)
  const unit = Math.max(28, Math.min(short / 11, 74));
  return {
    w, h, portrait, short, long, unit,
    cx: w / 2, cy: h / 2,
    // 上部の工程バーの高さ、下部の道具置き場の高さ
    topBar: Math.max(56, short * 0.11),
    bottomBar: portrait ? Math.max(120, h * 0.2) : Math.max(110, h * 0.24),
    safeTop: 12,
  };
}

// フルスクリーンをカバーする縦グラデ背景を描く(Graphics利用)
export function paintBackground(g, w, h, topColor, botColor) {
  g.clear();
  const steps = 24;
  for (let i = 0; i < steps; i++) {
    const t = i / (steps - 1);
    const r1 = (topColor >> 16) & 0xff, g1 = (topColor >> 8) & 0xff, b1 = topColor & 0xff;
    const r2 = (botColor >> 16) & 0xff, g2 = (botColor >> 8) & 0xff, b2 = botColor & 0xff;
    const c = ((r1 + (r2 - r1) * t) << 16) | ((g1 + (g2 - g1) * t) << 8) | (b1 + (b2 - b1) * t);
    g.fillStyle(c, 1);
    g.fillRect(0, Math.floor(h * i / steps) - 1, w, Math.ceil(h / steps) + 2);
  }
}
