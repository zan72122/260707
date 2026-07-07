// 色の定数(HE染色の液体・仕上がりの基準色)

export const LIQUID = {
  // ヘマトキシリン(青むらさきの染色液)
  hematoxylin: { light: 0x5b7fd6, deep: 0x2b3f8f, name: 'hematoxylin' },
  // 水(分別・水洗い)
  water: { light: 0xbfe8ff, deep: 0x7cc4f0, name: 'water' },
  // 魔法の青い水(ブルーイング液)
  bluing: { light: 0x8fd0ff, deep: 0x3aa0e6, name: 'bluing' },
  // エオジン(ピンクの染色液)
  eosin: { light: 0xff9ec4, deep: 0xf25c9a, name: 'eosin' },
  // アルコール(脱水・透明〜わずかに青)
  alcohol: { light: 0xeaf6ff, deep: 0xcfe9ff, name: 'alcohol' },
  // 封入剤(透明液)
  mount: { light: 0xf3fbff, deep: 0xdff2ff, name: 'mount' },
};

// 仕上がりの基準色
export const RESULT = {
  // 核: 赤紫(未ブルーイング) → 青紫(ブルーイング後)
  nucleusRedPurple: 0x8a2f6e,
  nucleusBluePurple: 0x2e2a78,
  // 細胞質(エオジン): 淡いピンク → 濃いローズ
  cytoLight: 0xffd3e2,
  cytoDeep: 0xef6f9c,
  // 背景(細胞外・組織のすきま)
  bgClean: 0xfdf3f7,
  bgBluish: 0xbcd0f0,
  // 濁り(脱水不足)
  haze: 0xf2f4ee,
};

export const UI = {
  panelDark: 0x14263a,
  panelMid: 0x1d3552,
  accent: 0x7fe0ff,
  gold: 0xffd66b,
  text: 0xffffff,
  glassEdge: 0xdff4ff,
};
