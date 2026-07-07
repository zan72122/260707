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

export function syrupColor(syrup, seed = 0) {
  const hue = syrup.hue < 0 ? (seed * 47) % 360 : syrup.hue;
  return hue;
}

// たまに降ってくる特別なトッピング粒
export const SPECIALS = [
  { kind: 'star',   chance: 0.05, size: 1.7, msg: 'きらーん!' },
  { kind: 'heart',  chance: 0.04, size: 1.6, msg: 'だいすき!' },
  { kind: 'cherry', chance: 0.03, size: 1.8, msg: 'さくらんぼ!' },
  { kind: 'candy',  chance: 0.05, size: 1.5, msg: 'あめちゃん!' },
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

// ごほうびの掛け声
export const CHEERS = ['わーい!', 'すごい!', 'きれい!', 'やったー!', 'おいしそう!', 'ふわふわ~'];
