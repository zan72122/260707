// シーン共通基盤: 入力ルーティング・発見演出・更新/描画の骨組み
// 共通あそびの実体は scene_extras.js に分離している

import { LightRig } from '../light/lightrig.js';
import { drawRig } from '../light/render.js';
import { Hud } from '../core/hud.js';
import { Toolbar } from '../core/toolbar.js';
import { Hint } from '../core/hint.js';
import { discoveries } from '../core/discoveries.js';
import { audio } from '../core/audio.js';
import { RAINBOW, clamp, dist, rand, randPick } from '../core/utils.js';
import { drawHandMirror, mirrorSegment } from './props.js';
import { harp, trackShake, onMirrorButton, checkComboDiscoveries, updateHolds, drawNight } from './scene_extras.js';

export class SceneBase {
  constructor(engine, sceneId, totalDiscoveries, rigOpts = {}) {
    this.engine = engine;
    this.sceneId = sceneId;
    this.rig = new LightRig(engine, rigOpts);
    this.hud = new Hud(engine, sceneId, totalDiscoveries);
    this.toolbar = new Toolbar(engine, this.rig, () => onMirrorButton(this));
    this.hint = new Hint(engine, () => this._hintTargets());
    this.placedMirrors = [];
    this.time = 0;
    this._sparkleTimer = 0;
    this._chimeCooldown = 0;
    this._noteCooldown = 0;
    this._shakeFlips = [];
    this._lastLightDx = 0;

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
    this.hint.poke();
    if (this.hud.handleTap(p.x, p.y)) {
      p.target = 'hud';
      return;
    }
    if (this.toolbar.handleTap(p.x, p.y)) {
      p.target = 'hud';
      checkComboDiscoveries(this);
      return;
    }
    // 置いた鏡 → シーンの物 → プリズム → 光源 → 虹 → キャンバス の順で拾う
    for (const m of this.placedMirrors) {
      if (dist(p.x, p.y, m.x, m.y) < 80) {
        p.target = 'object';
        p.data = { kind: 'placed-mirror', m };
        audio.tap();
        return;
      }
    }
    const picked = this.pickObject(p.x, p.y);
    if (picked) {
      p.target = 'object';
      p.data = picked;
      p.holdT = 0;
      p.danced = false;
      this.objectDown(picked, p);
      return;
    }
    if (this.rig.hitPrismBody(p.x, p.y)) {
      p.target = 'prism-move';
      audio.tap();
      return;
    }
    if (this.rig.hitPrismRing(p.x, p.y)) {
      p.target = 'prism-spin';
      audio.tap();
      return;
    }
    if (this.rig.hitLight(p.x, p.y)) {
      p.target = 'light';
      audio.tap();
      return;
    }
    const bandColors = this.rig.colorsAt(p.x, p.y, 30);
    if (bandColors.length > 0) {
      p.target = 'rainbow';
      p.harp = bandColors.slice();
      this.rig.grabBend(p.x, p.y);
      audio.note(bandColors[0]);
      this.engine.particles.burst(p.x, p.y, RAINBOW[bandColors[0]].hex, 8, 70);
      this.discover('combo-bend', 'にじを つかまえた!', '#c07dff', p.x, p.y);
      return;
    }
    p.target = 'canvas';
    p.harp = [];
    this.canvasDown(p);
  }

  pointerMove(p) {
    const { W, H } = this.engine;
    if (p.target === 'light') {
      this.rig.dragLight(p.x, p.y, W, H);
      trackShake(this, p.dx ?? 0);
    } else if (p.target === 'prism-move') {
      this.rig.dragPrism(p.x, p.y, W, H);
    } else if (p.target === 'prism-spin') {
      this.rig.spinPrismToward(p.x, p.y, 1 / 60);
    } else if (p.target === 'rainbow') {
      this.rig.moveBend(p.x, p.y);
      harp(this, p);
    } else if (p.target === 'object') {
      if (p.data.kind === 'placed-mirror') {
        const m = p.data.m;
        m.x = clamp(p.x, 50, W - 50);
        m.y = clamp(p.y, 70, H - 90);
        m.rot += (p.dx ?? 0) * 0.008;
      } else {
        this.objectMove(p.data, p);
      }
    } else if (p.target === 'canvas') {
      harp(this, p);
      this.canvasMove(p);
    }
  }

  pointerUp(p) {
    if (p.target === 'prism-spin') this.rig.releaseSpin();
    else if (p.target === 'rainbow') this.rig.releaseBend();
    else if (p.target === 'object' && p.data.kind !== 'placed-mirror') this.objectUp(p.data, p);
    else if (p.target === 'canvas') this.canvasUp(p);
  }

  // シーン側でオーバーライドするフック
  pickObject(_x, _y) { return null; }
  objectDown(_obj, _p) {}
  objectMove(_obj, _p) {}
  objectUp(_obj, _p) {}
  objectDance(_obj, _p) {}
  canvasDown(_p) {}
  canvasMove(_p) {}
  canvasUp(_p) {}
  extraHints() { return []; }

  _hintTargets() {
    return [
      { x: this.rig.lightX, y: this.rig.lightY },
      { x: this.rig.prismX, y: this.rig.prismY },
      ...this.extraHints(),
    ];
  }

  // ---- 発見 ----

  discover(key, text, hex, x, y) {
    if (discoveries.unlock(this.sceneId, key)) {
      this.hud.celebrate(text, hex, x, y);
      return true;
    }
    return false;
  }

  colorJoy(colorIndex, x, y) {
    if (this._chimeCooldown <= 0) {
      audio.chime(colorIndex);
      this._chimeCooldown = 0.28;
    }
    this.engine.particles.twinkle(x, y, RAINBOW[colorIndex].hex);
  }

  // ---- 更新 ----

  update(dt) {
    this.time += dt;
    this._chimeCooldown -= dt;
    this._noteCooldown -= dt;
    this.rig.mirrors = [];
    this.sceneUpdate(dt);
    for (const m of this.placedMirrors) this.rig.mirrors.push(mirrorSegment(m));
    this.rig.update(dt);
    this.hud.update(dt);
    this.toolbar.update(dt);
    this.hint.update(dt);
    updateHolds(this, dt);
    this._ambientSparkles(dt);
    if (this.rig.party > 0 && Math.random() < dt * 10) {
      this.engine.particles.confetti(rand(0, this.engine.W), -10, RAINBOW[(Math.random() * 7) | 0].hex);
    }
  }

  sceneUpdate(_dt) {}

  // 虹の帯にそってただようキラキラ(光のかたちで形が変わる)
  _ambientSparkles(dt) {
    this._sparkleTimer -= dt;
    if (this._sparkleTimer > 0) return;
    this._sparkleTimer = 0.09 / this.rig.widthScale;
    const ray = randPick(this.rig.rays);
    if (!ray || !ray.segs.length) return;
    const seg = randPick(ray.segs);
    const t = rand(0.1, 1);
    const x = seg.x1 + (seg.x2 - seg.x1) * t;
    const y = seg.y1 + (seg.y2 - seg.y1) * t;
    const { W, H } = this.engine;
    if (x < -40 || x > W + 40 || y < -40 || y > H + 40) return;
    const shape = this.rig.beamShape === 'heart' ? 'heart' : 'star';
    this.engine.particles.spawn({
      x: x + rand(-12, 12), y: y + rand(-12, 12),
      vx: rand(-8, 8), vy: rand(-30, -10),
      life: rand(0.8, 1.6), maxLife: 1.6,
      size: rand(2.5, 5.5), hex: RAINBOW[ray.ci].hex,
      shape, spin: rand(-2, 2), wobble: rand(4, 10), wobbleSpeed: rand(2, 5),
    });
  }

  // ---- 描画 ----

  draw(ctx) {
    this.drawBackground(ctx);
    this.drawBehindLight(ctx);
    if (this.rig.sourceType === 'moon') drawNight(ctx, this);
    drawRig(ctx, this.rig, this.time, (this.rainbowAlpha ?? 1) * (this.rig.sourceType === 'moon' ? 1.15 : 1));
    this.drawFrontOfLight(ctx);
    for (const m of this.placedMirrors) drawHandMirror(ctx, m, this.time);
    this.hud.draw(ctx);
    this.toolbar.draw(ctx);
    this.hint.draw(ctx);
  }

  drawBackground(_ctx) {}
  drawBehindLight(_ctx) {}
  drawFrontOfLight(_ctx) {}
}
