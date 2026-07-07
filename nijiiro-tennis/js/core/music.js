// Web Audio 生成のBGMシーケンサ(外部素材なし)
import { audioContext, masterBus } from './audio.js';

const BPM = 132;
const STEP = 60 / BPM / 2; // 8分音符
const LOOKAHEAD_SEC = 0.15;
const TICK_MS = 40;

const N = (s) => 261.63 * Math.pow(2, s / 12); // C4基準

// 明るくポップな16小節ループ(メロディ/ベース/コード)
const MELODY = [
  12, null, 16, null, 19, null, 16, 12, 14, null, 12, null, 16, null, null, null,
  12, null, 16, null, 19, null, 21, 19, 24, null, 21, 19, 16, null, null, null,
  17, null, 21, null, 24, 21, 17, null, 16, null, 19, null, 16, 12, null, null,
  14, 16, 14, 12, 9, null, 12, null, 12, null, null, null, null, null, null, null,
];
const BASS = [
  0, null, 0, null, 7, null, 5, null, 0, null, 0, null, 7, null, 5, null,
  0, null, 0, null, 7, null, 5, null, 9, null, 7, null, 5, null, 7, null,
  5, null, 5, null, 9, null, 9, null, 0, null, 0, null, 7, null, 5, null,
  2, null, 2, null, 7, null, 7, null, 0, null, 0, null, 0, null, null, null,
];
const CHORD_ROOTS = [0, 0, 5, 0]; // 4小節ごと

// 結果画面用のやわらかいループ
const CALM_MELODY = [
  12, null, null, 16, null, null, 19, null, 16, null, null, 14, null, null, 12, null,
];

export class Music {
  constructor() {
    this._timer = null;
    this._nextTime = 0;
    this._step = 0;
    this._mode = 'main';
    this._gain = null;
    this._fever = false;
  }

  setFever(on) { this._fever = on; }

  start(mode = 'main') {
    const ctx = audioContext();
    if (!ctx) return;
    this.stop();
    this._mode = mode;
    this._gain = ctx.createGain();
    this._gain.gain.value = mode === 'calm' ? 0.32 : 0.4;
    this._gain.connect(masterBus());
    this._step = 0;
    this._nextTime = ctx.currentTime + 0.05;
    this._timer = setInterval(() => this._tick(), TICK_MS);
  }

  stop() {
    if (this._timer) clearInterval(this._timer);
    this._timer = null;
    if (this._gain) {
      const ctx = audioContext();
      const g = this._gain;
      g.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.3);
      setTimeout(() => g.disconnect(), 400);
      this._gain = null;
    }
  }

  _tick() {
    const ctx = audioContext();
    if (!ctx || !this._gain) return;
    while (this._nextTime < ctx.currentTime + LOOKAHEAD_SEC) {
      this._schedule(this._step, this._nextTime);
      const speed = this._fever ? 0.85 : 1;
      this._nextTime += STEP * speed;
      this._step++;
    }
  }

  _note(freq, t, dur, type, vol) {
    const ctx = audioContext();
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type; o.frequency.value = freq;
    g.gain.setValueAtTime(0, t);
    g.gain.linearRampToValueAtTime(vol, t + 0.015);
    g.gain.exponentialRampToValueAtTime(0.001, t + dur);
    o.connect(g); g.connect(this._gain);
    o.start(t); o.stop(t + dur + 0.05);
  }

  _drum(t, kind) {
    const ctx = audioContext();
    if (kind === 'kick') {
      const o = ctx.createOscillator(); const g = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(150, t);
      o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
      g.gain.setValueAtTime(0.5, t);
      g.gain.exponentialRampToValueAtTime(0.001, t + 0.13);
      o.connect(g); g.connect(this._gain); o.start(t); o.stop(t + 0.15);
    } else {
      const len = Math.ceil(ctx.sampleRate * 0.05);
      const buf = ctx.createBuffer(1, len, ctx.sampleRate);
      const d = buf.getChannelData(0);
      for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
      const s = ctx.createBufferSource(); s.buffer = buf;
      const f = ctx.createBiquadFilter();
      f.type = 'highpass'; f.frequency.value = 7000;
      const g = ctx.createGain(); g.gain.value = kind === 'open' ? 0.22 : 0.13;
      s.connect(f); f.connect(g); g.connect(this._gain); s.start(t);
    }
  }

  _schedule(step, t) {
    if (this._mode === 'calm') {
      const i = step % CALM_MELODY.length;
      const m = CALM_MELODY[i];
      if (m !== null) {
        this._note(N(m + 12), t, STEP * 3, 'sine', 0.2);
        this._note(N(m), t, STEP * 3, 'triangle', 0.12);
      }
      if (i % 8 === 0) this._note(N(CHORD_ROOTS[0] - 12), t, STEP * 7, 'triangle', 0.16);
      return;
    }
    const i = step % MELODY.length;
    const fever = this._fever;
    const m = MELODY[i];
    if (m !== null) {
      this._note(N(m + 12), t, STEP * 1.6, 'square', fever ? 0.12 : 0.09);
      this._note(N(m + 24), t, STEP * 1.4, 'sine', 0.1);
      if (fever) this._note(N(m + 19), t, STEP * 1.4, 'triangle', 0.1);
    }
    const b = BASS[i];
    if (b !== null) this._note(N(b - 12), t, STEP * 1.7, 'triangle', 0.22);
    // コードのきらめき(2拍ごと)
    if (i % 8 === 4) {
      const root = CHORD_ROOTS[Math.floor(i / 16) % 4];
      [0, 4, 7].forEach((s, k) =>
        this._note(N(root + s + 12), t + k * 0.02, STEP * 2.2, 'triangle', 0.05));
    }
    if (i % 4 === 0) this._drum(t, 'kick');
    if (i % 4 === 2) this._drum(t, 'hat');
    if (i % 8 === 6) this._drum(t, 'open');
  }
}

export const music = new Music();
