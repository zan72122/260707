// 染色工程の定義。順番・使う液・操作の種類・しずくの声かけアイコン。
import { LIQUID } from '../core/palette.js';

// type: longpress(長押しゲージ) / shake(ゆらす) / soak(浸け置き) / mix(ぐるぐる) / cover(カバーガラス)
export const STEPS = [
  {
    id: 'hematoxylin', liquid: LIQUID.hematoxylin, type: 'longpress', param: 'hema',
    icon: '🔵', title: 'あおい えきに ちゃぽん', hint: 'ながおしして そめよう',
  },
  {
    id: 'water', liquid: LIQUID.water, type: 'shake', param: 'diff',
    icon: '💧', title: 'おみずで じゃぶじゃぶ', hint: 'ゆらして あらおう',
  },
  {
    id: 'bluing', liquid: LIQUID.bluing, type: 'soak', param: 'blue',
    icon: '✨', title: 'まほうの あおい みず', hint: 'つけて あおに へんしん',
  },
  {
    id: 'eosin', liquid: LIQUID.eosin, type: 'longpress', param: 'eosin',
    icon: '🩷', title: 'ピンクの えきに ちゃぽん', hint: 'ながおしして そめよう',
  },
  {
    id: 'alcohol', liquid: LIQUID.alcohol, type: 'mix', param: 'dehyd',
    icon: '🫧', title: 'アルコールで さっと', hint: 'ぐるぐる まぜよう',
  },
  {
    id: 'mount', liquid: LIQUID.mount, type: 'cover', param: null,
    icon: '🟦', title: 'とうめいえきと カバーガラス', hint: 'ぽん とのせよう',
  },
  {
    id: 'scope', liquid: null, type: 'scope', param: null,
    icon: '🔬', title: 'けんびきょうで のぞこう', hint: 'タップして みてみよう',
  },
];

// 長押し/浸け置き/混ぜで param をどれだけ増やすか(1秒/1操作あたり)
export const RATES = {
  longpress: 0.42,  // 1秒あたり
  soak: 0.34,       // 1秒あたり(自動)
  shakePerSwing: 0.11,
  mixPerTurn: 0.14,
};
