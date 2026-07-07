// マルチタッチ対応の入力管理
// 4歳児の操作(同時タッチ・雑なドラッグ)を想定し、Pointer Eventsで統一的に扱う

import { audio } from './audio.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    // pointerId → {x, y, startX, startY, target, data}
    this.pointers = new Map();
    this.listeners = { down: [], move: [], up: [] };
    this._scale = 1;

    const opts = { passive: false };
    canvas.addEventListener('pointerdown', (e) => this._down(e), opts);
    canvas.addEventListener('pointermove', (e) => this._move(e), opts);
    canvas.addEventListener('pointerup', (e) => this._up(e), opts);
    canvas.addEventListener('pointercancel', (e) => this._up(e), opts);
    // iOSのダブルタップズーム等を抑止
    canvas.addEventListener('touchstart', (e) => e.preventDefault(), opts);
    document.addEventListener('gesturestart', (e) => e.preventDefault(), opts);
  }

  setScale(s) {
    this._scale = s;
  }

  on(type, fn) {
    this.listeners[type].push(fn);
  }

  _pos(e) {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: (e.clientX - rect.left) / this._scale,
      y: (e.clientY - rect.top) / this._scale,
    };
  }

  _down(e) {
    e.preventDefault();
    audio.unlock();
    try { this.canvas.setPointerCapture(e.pointerId); } catch (_) { /* no-op */ }
    const { x, y } = this._pos(e);
    const p = { id: e.pointerId, x, y, startX: x, startY: y, target: null, data: null };
    this.pointers.set(e.pointerId, p);
    for (const fn of this.listeners.down) fn(p);
  }

  _move(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    e.preventDefault();
    const { x, y } = this._pos(e);
    p.dx = x - p.x;
    p.dy = y - p.y;
    p.x = x;
    p.y = y;
    for (const fn of this.listeners.move) fn(p);
  }

  _up(e) {
    const p = this.pointers.get(e.pointerId);
    if (!p) return;
    this.pointers.delete(e.pointerId);
    for (const fn of this.listeners.up) fn(p);
  }

  clear() {
    this.pointers.clear();
  }
}
