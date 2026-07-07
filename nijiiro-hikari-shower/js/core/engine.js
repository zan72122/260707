// ゲームエンジン: ループ・リサイズ・シーン遷移を管理

import { Input } from './input.js';
import { Particles } from './particles.js';
import { clamp, ease } from './utils.js';

const MAX_DT = 1 / 20; // タブ復帰時などの巨大なdtを抑える
const TRANSITION_DUR = 0.9;

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.input = new Input(canvas);
    this.particles = new Particles();
    this.W = 0;
    this.H = 0;
    this.dpr = 1;
    this.time = 0;
    this.scene = null;
    this.nextScene = null;
    this.transition = 0; // 0=なし, 0..1=進行中
    this.transitionPhase = 'none'; // out | in
    this._last = 0;
    this._sceneFactories = new Map();

    window.addEventListener('resize', () => this._resize());
    window.addEventListener('orientationchange', () => {
      setTimeout(() => this._resize(), 250);
    });
    this._resize();
  }

  registerScene(name, factory) {
    this._sceneFactories.set(name, factory);
  }

  // シーン切り替え(にじ色サークルワイプ付き)
  goto(name, immediate = false) {
    const factory = this._sceneFactories.get(name);
    if (!factory) {
      console.warn(`unknown scene: ${name}`);
      return;
    }
    if (immediate) {
      this._activate(factory);
      return;
    }
    if (this.transitionPhase !== 'none') return;
    this._pendingFactory = factory;
    this.transitionPhase = 'out';
    this.transition = 0;
  }

  _activate(factory) {
    if (this.scene && this.scene.exit) this.scene.exit();
    this.input.clear();
    this.particles.items.length = 0;
    this.scene = factory(this);
    if (this.scene.layout) this.scene.layout(this.W, this.H);
    if (this.scene.enter) this.scene.enter();
  }

  _resize() {
    this.dpr = clamp(window.devicePixelRatio || 1, 1, 2.5);
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.canvas.width = Math.round(w * this.dpr);
    this.canvas.height = Math.round(h * this.dpr);
    this.canvas.style.width = `${w}px`;
    this.canvas.style.height = `${h}px`;
    this.W = w;
    this.H = h;
    this.input.setScale(1);
    if (this.scene && this.scene.layout) this.scene.layout(w, h);
  }

  start() {
    const loop = (ts) => {
      const dt = clamp((ts - this._last) / 1000, 0, MAX_DT);
      this._last = ts;
      this.time += dt;
      this._update(dt);
      this._draw();
      requestAnimationFrame(loop);
    };
    requestAnimationFrame((ts) => {
      this._last = ts;
      requestAnimationFrame(loop);
    });
  }

  _update(dt) {
    if (this.transitionPhase !== 'none') {
      this.transition += dt / (TRANSITION_DUR / 2);
      if (this.transitionPhase === 'out' && this.transition >= 1) {
        this._activate(this._pendingFactory);
        this._pendingFactory = null;
        this.transitionPhase = 'in';
        this.transition = 0;
      } else if (this.transitionPhase === 'in' && this.transition >= 1) {
        this.transitionPhase = 'none';
        this.transition = 0;
      }
    }
    if (this.scene && this.scene.update) this.scene.update(dt);
    this.particles.update(dt);
  }

  _draw() {
    const { ctx } = this;
    ctx.save();
    ctx.scale(this.dpr, this.dpr);
    if (this.scene && this.scene.draw) this.scene.draw(ctx);
    this.particles.draw(ctx);
    this._drawTransition(ctx);
    ctx.restore();
  }

  // にじ色のサークルワイプ演出
  _drawTransition(ctx) {
    if (this.transitionPhase === 'none') return;
    const t = clamp(this.transition, 0, 1);
    const k = this.transitionPhase === 'out' ? ease.inOutSine(t) : 1 - ease.inOutSine(t);
    const maxR = Math.hypot(this.W, this.H) * 0.75;
    const r = maxR * (1 - k);
    const cx = this.W / 2;
    const cy = this.H / 2;

    ctx.save();
    // 円の外側を虹グラデーションで塗りつぶす
    ctx.beginPath();
    ctx.rect(0, 0, this.W, this.H);
    ctx.arc(cx, cy, Math.max(0, r), 0, Math.PI * 2, true);
    const g = ctx.createRadialGradient(cx, cy, Math.max(0, r), cx, cy, Math.max(1, r + 260));
    g.addColorStop(0, '#ffd6ec');
    g.addColorStop(0.3, '#c9b7ff');
    g.addColorStop(0.6, '#9adcff');
    g.addColorStop(1, '#2b1d5c');
    ctx.fillStyle = g;
    ctx.fill();
    ctx.restore();
  }
}
