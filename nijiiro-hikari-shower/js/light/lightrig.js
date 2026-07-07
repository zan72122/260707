// 光のリグ: 光源・プリズム・虹の状態管理と操作・当たり判定
// 光線の計算は rays.js、描画は render*.js が担当する

import { RAINBOW, TAU, clamp, angleLerp, dist, lerp, pointSegDist, pointSegT } from '../core/utils.js';
import { computeRays } from './rays.js';

// 切り替えできる光とプリズムのバリエーション
export const LIGHT_COLORS = [
  { name: 'にじ', ci: -1, hex: '#ffffff' },
  { name: 'あか', ci: 0, hex: RAINBOW[0].hex },
  { name: 'きいろ', ci: 2, hex: RAINBOW[2].hex },
  { name: 'あお', ci: 5, hex: RAINBOW[5].hex },
];
export const WIDTH_LEVELS = [
  { name: 'ほそい', scale: 0.55 },
  { name: 'ふつう', scale: 1 },
  { name: 'ふとい', scale: 1.7 },
];
export const BEAM_SHAPES = [
  { name: 'まっすぐ', id: 'line' },
  { name: 'ハート', id: 'heart' },
  { name: 'ほし', id: 'star' },
];
export const SOURCE_TYPES = [
  { name: 'おひさま', id: 'sun' },
  { name: 'でんとう', id: 'flash' },
  { name: 'ろうそく', id: 'candle' },
  { name: 'おつきさま', id: 'moon' },
];
export const PRISM_TYPES = [
  { name: 'さんかく', id: 'triangle' },
  { name: 'ビーだま', id: 'marble' },
  { name: 'ダイヤ', id: 'diamond' },
  { name: 'ハート', id: 'heart' },
  { name: 'ほし', id: 'star' },
  { name: 'われた', id: 'broken' },
];
export const SIZE_LEVELS = [
  { name: 'ちいさい', size: 30, spread: 0.75 },
  { name: 'ふつう', size: 46, spread: 1 },
  { name: 'おおきい', size: 64, spread: 1.35 },
];

export class LightRig {
  constructor(engine, opts = {}) {
    this.engine = engine;
    this.lightX = opts.lightX ?? 100;
    this.lightY = opts.lightY ?? 100;
    this.prismX = opts.prismX ?? 300;
    this.prismY = opts.prismY ?? 300;
    this.prismRot = opts.prismRot ?? 0;
    this.lightRadius = opts.lightRadius ?? 42;
    this.baseSpread = opts.spread ?? 0.075;
    this.beamLength = opts.beamLength ?? 2000;
    this.mirrors = [];
    this._targetRot = this.prismRot;
    this.spinVel = 0;
    this.rays = [];
    this.glow = 0;

    // 切り替え状態
    this.colorIndex = 0;
    this.widthIndex = 1;
    this.shapeIndex = 0;
    this.sourceIndex = Math.max(0, SOURCE_TYPES.findIndex((s) => s.id === (opts.source ?? 'sun')));
    this.prismTypeIndex = 0;
    this.sizeIndex = 1;

    // 虹つかみ(ベンド)とおまつりモード
    this.bendX = 0;
    this.bendY = 0;
    this.bendHeld = false;
    this.bendT = 0;
    this.party = 0;
  }

  // ---- 現在の状態 ----
  get lightColor() { return LIGHT_COLORS[this.colorIndex]; }
  get widthScale() { return WIDTH_LEVELS[this.widthIndex].scale; }
  get beamShape() { return BEAM_SHAPES[this.shapeIndex].id; }
  get sourceType() { return SOURCE_TYPES[this.sourceIndex].id; }
  get prismType() { return PRISM_TYPES[this.prismTypeIndex].id; }
  get prismSize() { return SIZE_LEVELS[this.sizeIndex].size; }
  get spread() { return this.baseSpread * SIZE_LEVELS[this.sizeIndex].spread; }

  // ---- 切り替え(トグルボタンから呼ばれる) ----
  cycleColor() { this.colorIndex = (this.colorIndex + 1) % LIGHT_COLORS.length; return LIGHT_COLORS[this.colorIndex].name; }
  cycleWidth() { this.widthIndex = (this.widthIndex + 1) % WIDTH_LEVELS.length; return WIDTH_LEVELS[this.widthIndex].name; }
  cycleShape() { this.shapeIndex = (this.shapeIndex + 1) % BEAM_SHAPES.length; return BEAM_SHAPES[this.shapeIndex].name; }
  cycleSource() { this.sourceIndex = (this.sourceIndex + 1) % SOURCE_TYPES.length; return SOURCE_TYPES[this.sourceIndex].name; }
  cyclePrism() { this.prismTypeIndex = (this.prismTypeIndex + 1) % PRISM_TYPES.length; this.glow = 1; return PRISM_TYPES[this.prismTypeIndex].name; }
  cycleSize() { this.sizeIndex = (this.sizeIndex + 1) % SIZE_LEVELS.length; this.glow = 1; return SIZE_LEVELS[this.sizeIndex].name; }

  // ---- 操作 ----

  hitLight(x, y) {
    return dist(x, y, this.lightX, this.lightY) < this.lightRadius + 34;
  }

  // プリズム中心: つかんで移動
  hitPrismBody(x, y) {
    return dist(x, y, this.prismX, this.prismY) < this.prismSize * 1.05;
  }

  // プリズムの外周リング: くるくる回す
  hitPrismRing(x, y) {
    const d = dist(x, y, this.prismX, this.prismY);
    return d >= this.prismSize * 1.05 && d < this.prismSize + 72;
  }

  dragLight(x, y, W, H) {
    this.lightX = clamp(x, 30, W - 30);
    this.lightY = clamp(y, 30, H - 30);
  }

  dragPrism(x, y, W, H) {
    this.prismX = clamp(x, 50, W - 50);
    this.prismY = clamp(y, 50, H - 50);
    this.glow = Math.min(1, this.glow + 0.02);
  }

  spinPrismToward(x, y, dt) {
    const a = Math.atan2(y - this.prismY, x - this.prismX);
    const prev = this._targetRot;
    this._targetRot = a;
    let d = (a - prev) % TAU;
    if (d > Math.PI) d -= TAU;
    if (d < -Math.PI) d += TAU;
    this.spinVel = d / Math.max(dt, 1 / 120);
    this.glow = Math.min(1, this.glow + Math.abs(d) * 2);
  }

  releaseSpin() {
    this.spinVel *= 0.9;
  }

  // 虹つかみ: 指の位置に虹の帯を引き寄せる
  grabBend(x, y) {
    this.bendX = x;
    this.bendY = y;
    this.bendHeld = true;
  }

  moveBend(x, y) {
    this.bendX = x;
    this.bendY = y;
  }

  releaseBend() {
    this.bendHeld = false;
  }

  startParty() {
    this.party = 6;
  }

  // ---- 更新 ----

  update(dt) {
    this.prismRot = angleLerp(this.prismRot, this._targetRot, 1 - Math.pow(0.001, dt));
    if (Math.abs(this.spinVel) > 0.05) {
      this._targetRot += this.spinVel * dt;
      this.spinVel *= Math.pow(0.35, dt);
    }
    this.glow = Math.max(0, this.glow - dt * 0.8);
    this.party = Math.max(0, this.party - dt);

    // ベンドはつかむとふわっと効き、離すと直線へ戻る(ばね感)
    const target = this.bendHeld ? 1 : 0;
    this.bendT = lerp(this.bendT, target, 1 - Math.pow(0.002, dt));
    if (!this.bendHeld && this.bendT > 0.02) {
      // 離したあと、つかんだ点が元の直線上へすべり戻る
      const a = this.exitAngle();
      const t = Math.max(60, pointSegT(this.bendX, this.bendY, this.prismX, this.prismY,
        this.prismX + Math.cos(a) * 600, this.prismY + Math.sin(a) * 600) * 600);
      const fx = this.prismX + Math.cos(a) * t;
      const fy = this.prismY + Math.sin(a) * t;
      const k = 1 - Math.pow(0.02, dt);
      this.bendX = lerp(this.bendX, fx, k);
      this.bendY = lerp(this.bendY, fy, k);
    }

    this.rays = computeRays(this);
  }

  exitAngle() {
    const inAngle = Math.atan2(this.prismY - this.lightY, this.prismX - this.lightX);
    const bend = Math.sin(this.prismRot * 1.5) * 0.9;
    return inAngle + bend;
  }

  // ---- 当たり判定 ----

  colorsAt(x, y, radius = 30) {
    const found = [];
    for (const ray of this.rays) {
      for (const s of ray.segs) {
        const t = pointSegT(x, y, s.x1, s.y1, s.x2, s.y2);
        if (t < 0.02) continue;
        const d = pointSegDist(x, y, s.x1, s.y1, s.x2, s.y2);
        const distAlong = t * dist(s.x1, s.y1, s.x2, s.y2);
        const bandHalf = this.bandHalfWidth(distAlong) * (ray.wBoost ?? 1);
        if (d < radius + bandHalf) {
          if (!found.includes(ray.ci)) found.push(ray.ci);
          break;
        }
      }
    }
    return found;
  }

  bandHalfWidth(distAlong) {
    return (9 + distAlong * 0.018) * this.widthScale;
  }
}
