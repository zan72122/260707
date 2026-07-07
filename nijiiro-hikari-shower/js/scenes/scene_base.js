// シーン共通基盤: 光リグの操作・虹の当たり判定・発見演出をまとめる
// 各シーンはこれを継承し、背景・オブジェクト・発見を定義する

import { LightRig } from '../light/lightrig.js';
import { drawRig } from '../light/render.js';
import { Hud } from '../core/hud.js';
import { discoveries } from '../core/discoveries.js';
import { audio } from '../core/audio.js';
import { RAINBOW, rand, randPick } from '../core/utils.js';

export class SceneBase {
  constructor(engine, sceneId, totalDiscoveries, rigOpts = {}) {
    this.engine = engine;
    this.sceneId = sceneId;
    this.rig = new LightRig(engine, rigOpts);
    this.hud = new Hud(engine, sceneId, totalDiscoveries);
    this.time = 0;
    this._sparkleTimer = 0;
    this._chimeCooldown = 0;

    const input = engine.input;
    this._onDown = (p) => this.pointerDown(p);
    this._onMove = (p) => this.pointerMove(p);
    this._onUp = (p) => this.pointerUp(p);
    input.on('down', this._onDown);
    input.on('move', this._onMove);
    input.on('up', this._onUp);
  }

  exit() {
    const L = this.engine.input.listeners;
    for (const type of ['down', 'move', 'up']) {
      const key = { down: '_onDown', move: '_onMove', up: '_onUp' }[type];
      const i = L[type].indexOf(this[key]);
      if (i >= 0) L[type].splice(i, 1);
    }
  }

  // ---- 入力 ----

  pointerDown(p) {
    if (this.hud.handleTap(p.x, p.y)) {
      p.target = 'hud';
      return;
    }
    // シーン固有オブジェクトを優先
    const picked = this.pickObject(p.x, p.y);
    if (picked) {
      p.target = 'object';
      p.data = picked;
      this.objectDown(picked, p);
      return;
    }
    if (this.rig.hitPrism(p.x, p.y)) {
      p.target = 'prism';
      audio.tap();
      return;
    }
    if (this.rig.hitLight(p.x, p.y)) {
      p.target = 'light';
      audio.tap();
      return;
    }
    p.target = 'canvas';
    this.canvasDown(p);
  }

  pointerMove(p) {
    const { W, H } = this.engine;
    if (p.target === 'light') {
      this.rig.dragLight(p.x, p.y, W, H);
    } else if (p.target === 'prism') {
      this.rig.spinPrismToward(p.x, p.y, 1 / 60);
    } else if (p.target === 'object') {
      this.objectMove(p.data, p);
    } else if (p.target === 'canvas') {
      this.canvasMove(p);
    }
  }

  pointerUp(p) {
    if (p.target === 'prism') this.rig.releaseSpin();
    else if (p.target === 'object') this.objectUp(p.data, p);
    else if (p.target === 'canvas') this.canvasUp(p);
  }

  // シーン側でオーバーライドするフック
  pickObject(_x, _y) { return null; }
  objectDown(_obj, _p) {}
  objectMove(_obj, _p) {}
  objectUp(_obj, _p) {}
  canvasDown(_p) {}
  canvasMove(_p) {}
  canvasUp(_p) {}

  // ---- 発見 ----

  discover(key, text, hex, x, y) {
    if (discoveries.unlock(this.sceneId, key)) {
      this.hud.celebrate(text, hex, x, y);
      return true;
    }
    return false;
  }

  // 色が当たった小さなよろこび(音+キラキラ)。連打防止つき
  colorJoy(colorIndex, x, y) {
    if (this._chimeCooldown <= 0) {
      audio.chime(colorIndex);
      this._chimeCooldown = 0.28;
    }
    this.engine.particles.twinkle(x, y, RAINBOW[colorIndex].hex);
  }

  // ---- 更新・描画 ----

  update(dt) {
    this.time += dt;
    this._chimeCooldown -= dt;
    this.rig.update(dt);
    this.hud.update(dt);
    this._ambientSparkles(dt);
    this.sceneUpdate(dt);
  }

  sceneUpdate(_dt) {}

  // 虹の帯に沿ってただようキラキラ(綺麗さの底上げ)
  _ambientSparkles(dt) {
    this._sparkleTimer -= dt;
    if (this._sparkleTimer > 0) return;
    this._sparkleTimer = 0.09;
    const ray = randPick(this.rig.rays);
    if (!ray || !ray.segs.length) return;
    const seg = randPick(ray.segs);
    const t = rand(0.1, 1);
    const x = seg.x1 + (seg.x2 - seg.x1) * t;
    const y = seg.y1 + (seg.y2 - seg.y1) * t;
    const { W, H } = this.engine;
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) return;
    this.engine.particles.twinkle(x, y, RAINBOW[ray.ci].hex, rand(2.5, 5));
  }

  draw(ctx) {
    this.drawBackground(ctx);
    this.drawBehindLight(ctx);
    drawRig(ctx, this.rig, this.time, this.rainbowAlpha ?? 1);
    this.drawFrontOfLight(ctx);
    this.hud.draw(ctx);
  }

  drawBackground(_ctx) {}
  drawBehindLight(_ctx) {}
  drawFrontOfLight(_ctx) {}
}
