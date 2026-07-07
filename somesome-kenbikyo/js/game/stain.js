// HE染色の状態モデル。各工程の入力量から仕上がりの色と「味わいコメント」を計算する。
// 4歳向けに"失敗"はなく、微妙な仕上がりの違いを楽しむための再現。
import { clamp, mixColor, scaleColor } from '../core/utils.js';
import { RESULT } from '../core/palette.js';

// 各工程の理想レンジ(この範囲だと「ちょうどいい」)
export const IDEAL = {
  hema: [0.42, 0.82],   // ヘマトキシリン浸け置き
  diff: [0.28, 0.62],   // 分別(水洗い/ゆらし)
  blue: [0.62, 1.0],    // ブルーイング
  eosin: [0.4, 0.8],    // エオジン
  dehyd: [0.36, 0.7],   // 脱水(アルコール混ぜ)
};

export class StainState {
  constructor(waterQuality = 1) {
    this.hema = 0;   // 核染めの取り込み量
    this.diff = 0;   // 分別で流した量
    this.blue = 0;   // 青への変身度
    this.eosin = 0;  // 細胞質のピンク取り込み量
    this.dehyd = 0;  // 脱水の進み具合
    this.waterQuality = waterQuality; // 1=きれい, 小さいほどムラ
  }

  // 仕上がりの色・不透明度・ムラを算出
  computeResult() {
    const mura = clamp(1 - this.waterQuality);
    // 核の濃さ: ヘマトキシリンから分別で抜けた分を引く
    const nucleusIntensity = clamp(this.hema - this.diff * 0.55);
    // 背景に残る余分な青(分別が短いと残る)
    const backgroundBlue = clamp(this.hema * 0.7 - this.diff - 0.12 - mura * -0.1);
    // 染めすぎ(全体が重く暗い)
    const overStain = clamp(this.hema - 0.98) * 1.4;
    // 核の色相: 赤紫→青紫(ブルーイングで変身)。水質で少し揺れる。
    const hueT = clamp(this.blue - mura * 0.15);
    let nucleusColor = mixColor(RESULT.nucleusRedPurple, RESULT.nucleusBluePurple, hueT);
    if (overStain > 0) nucleusColor = scaleColor(nucleusColor, 1 - overStain * 0.4);

    // 細胞質のピンク: 脱水が過ぎるとエオジンが抜ける
    const eosinLoss = clamp(this.dehyd - 0.72) * 1.1;
    const cytoIntensity = clamp(this.eosin - eosinLoss);
    const cytoOver = clamp(this.eosin - 0.98) * 1.3;
    let cytoColor = mixColor(RESULT.cytoLight, RESULT.cytoDeep, clamp(cytoIntensity + cytoOver * 0.5));

    // 背景色: きれい→わずかに青
    const bgColor = mixColor(RESULT.bgClean, RESULT.bgBluish, backgroundBlue);
    // 濁り: 脱水不足でくもる
    const hazeAlpha = clamp(0.5 - this.dehyd) * 1.5;

    return {
      nucleusColor,
      nucleusAlpha: clamp(0.28 + nucleusIntensity * 0.85),
      cytoColor,
      cytoAlpha: clamp(0.22 + cytoIntensity * 0.72),
      bgColor,
      hazeAlpha: clamp(hazeAlpha) * 0.6,
      muraAmount: mura,
      overStain,
      cytoOver,
      // 全体の見やすさ(コントラスト)。褒めコメントの判定に使う。
      contrast: clamp(nucleusIntensity * 0.6 + cytoIntensity * 0.4 - backgroundBlue * 0.4 - hazeAlpha * 0.3 - cytoOver * 0.3),
    };
  }

  // 4歳向けの「味わい」コメント群を返す(重要度の高い順)
  feedback() {
    const tags = [];
    const push = (key, icon, jp, weight) => tags.push({ key, icon, jp, weight });
    const [hLo, hHi] = IDEAL.hema;
    const [dLo, dHi] = IDEAL.diff;
    const [bLo] = IDEAL.blue;
    const [eLo, eHi] = IDEAL.eosin;
    const [, deHi] = IDEAL.dehyd;
    const deLo = IDEAL.dehyd[0];

    if (this.hema < hLo) push('nucleusFaint', '🔵', 'あおい まるが みえにくいね', hLo - this.hema);
    if (this.hema > hHi) push('nucleusHeavy', '🌑', 'あおが おおすぎて まっくら', this.hema - hHi);
    if (this.diff > dHi) push('nucleusWashed', '💧', 'あおが ながれちゃった', this.diff - dHi);
    if (this.diff < dLo) push('bgBlue', '🟦', 'よぶんな あおが のこってる', dLo - this.diff);
    if (this.blue < bLo) push('notBlued', '🟣', 'まだ あおに へんしんしてない', bLo - this.blue);
    if (this.eosin < eLo) push('pinkFaint', '🩷', 'ピンクが たりない', eLo - this.eosin);
    if (this.eosin > eHi) push('pinkHeavy', '🌸', 'ぜんぶ ピンクすぎる', this.eosin - eHi);
    if (this.dehyd > deHi) push('eosinLost', '🫧', 'ピンクが おちすぎた', this.dehyd - deHi);
    if (this.dehyd < deLo) push('cloudy', '🌫️', 'くもりガラスみたい', deLo - this.dehyd);
    if (this.waterQuality < 0.62) push('water', '🚰', 'おみずの クセで いろが かわった', 0.62 - this.waterQuality);

    tags.sort((a, b) => b.weight - a.weight);
    if (tags.length === 0) {
      return [{ key: 'perfect', icon: '⭐', jp: 'かんぺき！ばっちり！', weight: 1 }];
    }
    return tags;
  }

  // 星の数(3段階の優しい評価: 1〜3, 失敗なし)
  stars() {
    const c = this.computeResult().contrast;
    if (c > 0.5) return 3;
    if (c > 0.28) return 2;
    return 1;
  }
}
