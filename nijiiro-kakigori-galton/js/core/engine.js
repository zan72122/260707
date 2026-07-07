// キャンバス管理・メインループ・ポインタ入力
export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.w = 0;
    this.h = 0;
    this.dpr = 1;
    this.t = 0;
    this.scene = null;
    this.pointers = new Map();
    this._last = performance.now();
    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    this._bindInput();
    this.resize();
  }

  resize() {
    const MAX_DPR = 2; // iPadでも滑らかに動くよう上限を設ける
    this.dpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
    this.w = window.innerWidth;
    this.h = window.innerHeight;
    this.canvas.width = Math.round(this.w * this.dpr);
    this.canvas.height = Math.round(this.h * this.dpr);
    this.canvas.style.width = this.w + 'px';
    this.canvas.style.height = this.h + 'px';
    this.ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    if (this.scene && this.scene.onResize) this.scene.onResize(this.w, this.h);
  }

  setScene(scene) {
    this.scene = scene;
    if (scene.onEnter) scene.onEnter(this);
    if (scene.onResize) scene.onResize(this.w, this.h);
  }

  _pos(e) {
    const r = this.canvas.getBoundingClientRect();
    return { x: e.clientX - r.left, y: e.clientY - r.top };
  }

  _bindInput() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      c.setPointerCapture(e.pointerId);
      const p = this._pos(e);
      this.pointers.set(e.pointerId, p);
      if (this.scene && this.scene.onDown) this.scene.onDown(p.x, p.y, e.pointerId);
    });
    c.addEventListener('pointermove', (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      const p = this._pos(e);
      this.pointers.set(e.pointerId, p);
      if (this.scene && this.scene.onMove) this.scene.onMove(p.x, p.y, e.pointerId);
    });
    const up = (e) => {
      if (!this.pointers.has(e.pointerId)) return;
      const p = this._pos(e);
      this.pointers.delete(e.pointerId);
      if (this.scene && this.scene.onUp) this.scene.onUp(p.x, p.y, e.pointerId);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    // ダブルタップ拡大などのジェスチャを抑止
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    c.addEventListener('touchstart', (e) => e.preventDefault(), { passive: false });
  }

  start() {
    const loop = (now) => {
      const dt = Math.min(0.033, (now - this._last) / 1000);
      this._last = now;
      this.t += dt;
      if (this.scene) {
        if (this.scene.update) this.scene.update(dt, this.t);
        if (this.scene.draw) this.scene.draw(this.ctx, this.t);
      }
      requestAnimationFrame(loop);
    };
    requestAnimationFrame(loop);
  }
}
