// シロップの色定義とトッピング(特別な粒)の定義

// 4歳児にわかりやすい、あざやかで美味しそうな6色+にじいろ
export const SYRUPS = [
  { id: 'ichigo',  name: 'いちご',   hue: 350, label: '🍓' },
  { id: 'orange',  name: 'みかん',   hue: 28,  label: '🍊' },
  { id: 'lemon',   name: 'レモン',   hue: 52,  label: '🍋' },
  { id: 'melon',   name: 'メロン',   hue: 130, label: '🍈' },
  { id: 'soda',    name: 'ソーダ',   hue: 200, label: '🫧' },
  { id: 'grape',   name: 'ぶどう',   hue: 275, label: '🍇' },
  { id: 'rainbow', name: 'にじいろ', hue: -1,  label: '🌈' },
];

// にじいろはなめらかなグラデーションになる(注ぐほど色相が回る)
export function syrupColor(syrup, seed = 0) {
  const hue = syrup.hue < 0 ? (seed * 16) % 360 : syrup.hue + (seed % 5) - 2;
  return ((hue % 360) + 360) % 360;
}

// たまに混ざる特別なトッピング粒(物理サイズは同じ、見た目だけ特別)
export const SPECIALS = [
  { kind: 'star',  chance: 0.020, msg: 'きらーん!' },
  { kind: 'heart', chance: 0.016, msg: 'だいすき!' },
  { kind: 'candy', chance: 0.018, msg: 'あめちゃん!' },
];

export function rollSpecial() {
  const r = Math.random();
  let acc = 0;
  for (const s of SPECIALS) {
    acc += s.chance;
    if (r < acc) return s;
  }
  return null;
}

// 金の玉はだいたいこの個数ごとに1個まざる
export const GOLD_EVERY = 75;

// ごほうびの掛け声
export const CHEERS = ['わーい!', 'すごい!', 'きれい!', 'やったー!', 'おいしそう!', 'じゃらじゃら~'];
