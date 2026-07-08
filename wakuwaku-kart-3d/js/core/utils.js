// 汎用ユーティリティ(数学・補間・乱数)

export const TAU = Math.PI * 2;

export function clamp(v, lo, hi) {
  return v < lo ? lo : (v > hi ? hi : v);
}

export function lerp(a, b, t) {
  return a + (b - a) * t;
}

// フレームレート非依存の指数減衰補間
export function damp(current, target, lambda, dt) {
  return lerp(current, target, 1 - Math.exp(-lambda * dt));
}

// 角度差を -PI..PI に正規化
export function angleDiff(a, b) {
  let d = (b - a) % TAU;
  if (d > Math.PI) d -= TAU;
  if (d < -Math.PI) d += TAU;
  return d;
}

export function dampAngle(current, target, lambda, dt) {
  return current + angleDiff(current, target) * (1 - Math.exp(-lambda * dt));
}

export function smoothstep(edge0, edge1, x) {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
}

// シード付き擬似乱数(コース装飾の再現性のため)
export function makeRandom(seed) {
  let s = seed >>> 0;
  return function random() {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function pick(random, array) {
  return array[Math.floor(random() * array.length)];
}

// 順位の表示テキスト(4歳向けにひらがな)
export const RANK_LABELS = ['1い', '2い', '3い', '4い', '5い', '6い'];

export function formatTime(seconds) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${String(s).padStart(2, '0')}`;
}
