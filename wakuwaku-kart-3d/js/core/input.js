// 入力管理: 4歳向けの超シンプル操作
// 画面の左半分タッチ=ひだりに曲がる、右半分タッチ=みぎに曲がる。
// アクセルは自動。キーボード(矢印キー)にも対応。
import { clamp } from './utils.js';

class InputSystem {
  constructor() {
    this.steer = 0;          // -1(左)..+1(右)
    this.touchSteer = 0;
    this.keyLeft = false;
    this.keyRight = false;
    this.activeTouches = new Map(); // id -> {x, y}
    this.listeners = [];
    this.enabled = false;
    this.onFirstInteraction = null;
    this._interacted = false;
  }

  attach(rootElement) {
    this.root = rootElement;
    const opts = { passive: false };

    rootElement.addEventListener('touchstart', (e) => this.handleTouch(e, true), opts);
    rootElement.addEventListener('touchmove', (e) => this.handleTouch(e, true), opts);
    rootElement.addEventListener('touchend', (e) => this.handleTouch(e, false), opts);
    rootElement.addEventListener('touchcancel', (e) => this.handleTouch(e, false), opts);

    // マウス(PCテスト用)
    rootElement.addEventListener('mousedown', (e) => this.handleMouse(e, true), opts);
    rootElement.addEventListener('mousemove', (e) => { if (this.mouseDown) this.handleMouse(e, true); }, opts);
    rootElement.addEventListener('mouseup', (e) => this.handleMouse(e, false), opts);

    window.addEventListener('keydown', (e) => this.handleKey(e, true));
    window.addEventListener('keyup', (e) => this.handleKey(e, false));
  }

  fireInteraction() {
    if (!this._interacted) {
      this._interacted = true;
    }
    if (this.onFirstInteraction) this.onFirstInteraction();
  }

  handleTouch(e, isDown) {
    e.preventDefault();
    this.fireInteraction();
    for (const touch of e.changedTouches) {
      if (isDown && (e.type === 'touchstart' || e.type === 'touchmove')) {
        this.activeTouches.set(touch.identifier, { x: touch.clientX, y: touch.clientY });
      } else {
        this.activeTouches.delete(touch.identifier);
      }
    }
    this.recomputeTouchSteer();
    if (e.type === 'touchstart') this.emitTap(e.changedTouches[0].clientX, e.changedTouches[0].clientY);
  }

  handleMouse(e, isDown) {
    this.fireInteraction();
    this.mouseDown = isDown && e.type !== 'mouseup';
    if (this.mouseDown) {
      this.activeTouches.set('mouse', { x: e.clientX, y: e.clientY });
    } else {
      this.activeTouches.delete('mouse');
    }
    this.recomputeTouchSteer();
    if (e.type === 'mousedown') this.emitTap(e.clientX, e.clientY);
  }

  handleKey(e, isDown) {
    if (e.repeat) return;
    if (e.key === 'ArrowLeft' || e.key === 'a') this.keyLeft = isDown;
    if (e.key === 'ArrowRight' || e.key === 'd') this.keyRight = isDown;
    if (isDown && (e.key === ' ' || e.key === 'Enter')) {
      this.fireInteraction();
      this.emitTap(window.innerWidth / 2, window.innerHeight / 2);
    }
  }

  recomputeTouchSteer() {
    if (this.activeTouches.size === 0) {
      this.touchSteer = 0;
      return;
    }
    const width = window.innerWidth;
    let sum = 0;
    for (const { x } of this.activeTouches.values()) {
      // 中央から離れるほど強く曲がる(中央付近はまっすぐ)
      const normalized = (x / width - 0.5) * 2; // -1..1
      if (Math.abs(normalized) < 0.08) continue;
      sum += Math.sign(normalized) * clamp(Math.abs(normalized) * 1.8, 0.35, 1);
    }
    this.touchSteer = clamp(sum, -1, 1);
  }

  // タップイベント(シーン遷移用)
  onTap(callback) {
    this.listeners.push(callback);
    return () => {
      const i = this.listeners.indexOf(callback);
      if (i >= 0) this.listeners.splice(i, 1);
    };
  }

  emitTap(x, y) {
    for (const cb of [...this.listeners]) cb(x, y);
  }

  update() {
    const keySteer = (this.keyLeft ? -1 : 0) + (this.keyRight ? 1 : 0);
    this.steer = clamp(keySteer + this.touchSteer, -1, 1);
  }

  get isTouchingLeft() {
    if (this.keyLeft) return true;
    for (const { x } of this.activeTouches.values()) {
      if (x < window.innerWidth * 0.46) return true;
    }
    return false;
  }

  get isTouchingRight() {
    if (this.keyRight) return true;
    for (const { x } of this.activeTouches.values()) {
      if (x > window.innerWidth * 0.54) return true;
    }
    return false;
  }
}

export const input = new InputSystem();
