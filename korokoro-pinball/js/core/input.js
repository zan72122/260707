// タッチ/マウス/キーボード入力
// 画面の左半分タッチ=左フリッパー、右半分=右フリッパー
// 4歳児向けにマルチタッチ・押しっぱなしに対応

import { audio } from './audio.js';

export class Input {
  constructor(canvas) {
    this.canvas = canvas;
    this.pointers = new Map(); // pointerId -> {x, y, side}
    this.leftHeld = false;
    this.rightHeld = false;
    this.anyHeld = false;
    this.listeners = { press: [], release: [], leftFlip: [], rightFlip: [] };
    this.keyLeft = false;
    this.keyRight = false;
    this.keySpace = false;
    this.bind();
  }

  on(name, fn) {
    this.listeners[name].push(fn);
  }

  emit(name, arg) {
    for (const fn of this.listeners[name]) fn(arg);
  }

  bind() {
    const c = this.canvas;
    c.addEventListener('pointerdown', (e) => {
      e.preventDefault();
      audio.unlock();
      c.setPointerCapture?.(e.pointerId);
      const pos = this.toLocal(e);
      const side = pos.x < c.clientWidth / 2 ? 'L' : 'R';
      this.pointers.set(e.pointerId, { ...pos, side });
      this.refresh(side);
      this.emit('press', pos);
    }, { passive: false });

    c.addEventListener('pointermove', (e) => {
      const p = this.pointers.get(e.pointerId);
      if (!p) return;
      const pos = this.toLocal(e);
      p.x = pos.x;
      p.y = pos.y;
    });

    const up = (e) => {
      const p = this.pointers.get(e.pointerId);
      this.pointers.delete(e.pointerId);
      this.refresh(null);
      if (p) this.emit('release', p);
    };
    c.addEventListener('pointerup', up);
    c.addEventListener('pointercancel', up);
    c.addEventListener('lostpointercapture', up);

    window.addEventListener('keydown', (e) => {
      if (e.repeat) return;
      audio.unlock();
      if (e.key === 'ArrowLeft' || e.key === 'z') { this.keyLeft = true; this.refresh('L'); }
      if (e.key === 'ArrowRight' || e.key === '/') { this.keyRight = true; this.refresh('R'); }
      if (e.key === ' ' || e.key === 'ArrowDown') {
        this.keySpace = true;
        this.refresh(null);
        this.emit('press', { x: this.canvas.clientWidth / 2, y: this.canvas.clientHeight / 2 });
      }
    });
    window.addEventListener('keyup', (e) => {
      if (e.key === 'ArrowLeft' || e.key === 'z') { this.keyLeft = false; this.refresh(null); }
      if (e.key === 'ArrowRight' || e.key === '/') { this.keyRight = false; this.refresh(null); }
      if (e.key === ' ' || e.key === 'ArrowDown') {
        this.keySpace = false;
        this.refresh(null);
        this.emit('release', { x: this.canvas.clientWidth / 2, y: this.canvas.clientHeight / 2 });
      }
    });

    // iOSのダブルタップ拡大などを抑止
    document.addEventListener('gesturestart', (e) => e.preventDefault());
    c.addEventListener('contextmenu', (e) => e.preventDefault());
  }

  toLocal(e) {
    const rect = this.canvas.getBoundingClientRect();
    return { x: e.clientX - rect.left, y: e.clientY - rect.top };
  }

  refresh(newSide) {
    let left = this.keyLeft;
    let right = this.keyRight;
    for (const p of this.pointers.values()) {
      if (p.side === 'L') left = true;
      else right = true;
    }
    if (left && !this.leftHeld) this.emit('leftFlip');
    if (right && !this.rightHeld) this.emit('rightFlip');
    this.leftHeld = left;
    this.rightHeld = right;
    this.anyHeld = left || right || this.keySpace || this.pointers.size > 0;
  }
}
