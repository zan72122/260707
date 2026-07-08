// WebAudio による効果音・BGM(すべて合成音、外部ファイル不要)
// iOS Safari 対策: 最初のタッチで resume する

import { rand, pick } from './utils.js';

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.sfxGain = null;
    this.bgmGain = null;
    this.enabled = true;
    this.bgmTimer = null;
    this.bgmStep = 0;
  }

  ensure() {
    if (this.ctx) return true;
    try {
      const AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return false;
      this.ctx = new AC();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.85;
      this.master.connect(this.ctx.destination);
      this.sfxGain = this.ctx.createGain();
      this.sfxGain.gain.value = 1.0;
      this.sfxGain.connect(this.master);
      this.bgmGain = this.ctx.createGain();
      this.bgmGain.gain.value = 0.16;
      this.bgmGain.connect(this.master);
      return true;
    } catch (e) {
      return false;
    }
  }

  unlock() {
    if (!this.ensure()) return;
    if (this.ctx.state === 'suspended') this.ctx.resume();
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // 単音を鳴らす基本関数
  tone({ freq = 440, freqEnd = null, dur = 0.15, type = 'sine', vol = 0.3, delay = 0, attack = 0.005, dest = null }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.now() + delay;
    const osc = this.ctx.createOscillator();
    const g = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (freqEnd != null) osc.frequency.exponentialRampToValueAtTime(Math.max(1, freqEnd), t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.linearRampToValueAtTime(vol, t0 + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(g);
    g.connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.1, vol = 0.2, delay = 0, freq = 1200 }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.now() + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = 1.2;
    const g = this.ctx.createGain();
    g.gain.setValueAtTime(vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxGain);
    src.start(t0);
  }

  // ===== 効果音 =====

  flipper() {
    this.tone({ freq: 180, freqEnd: 90, dur: 0.08, type: 'square', vol: 0.12 });
    this.noise({ dur: 0.05, vol: 0.1, freq: 800 });
  }

  wallHit(strength = 0.5) {
    const v = Math.min(0.16, 0.04 + strength * 0.12);
    this.tone({ freq: 240 + strength * 160, freqEnd: 120, dur: 0.06, type: 'triangle', vol: v });
  }

  bumper() {
    const base = pick([392, 440, 494, 523]);
    this.tone({ freq: base, freqEnd: base * 1.6, dur: 0.12, type: 'square', vol: 0.16 });
    this.tone({ freq: base * 2, dur: 0.1, type: 'sine', vol: 0.12, delay: 0.02 });
    this.noise({ dur: 0.06, vol: 0.1, freq: 2400 });
  }

  sling() {
    this.tone({ freq: 330, freqEnd: 660, dur: 0.09, type: 'sawtooth', vol: 0.1 });
  }

  coin() {
    this.tone({ freq: 1319, dur: 0.07, type: 'square', vol: 0.12 });
    this.tone({ freq: 1760, dur: 0.22, type: 'square', vol: 0.12, delay: 0.07 });
  }

  star() {
    const notes = [784, 988, 1175, 1568];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.14, type: 'triangle', vol: 0.16, delay: i * 0.07 }));
  }

  enemyBop() {
    this.tone({ freq: 620, freqEnd: 180, dur: 0.18, type: 'square', vol: 0.16 });
    this.noise({ dur: 0.1, vol: 0.14, freq: 600 });
  }

  chestHit() {
    this.tone({ freq: 220, freqEnd: 160, dur: 0.1, type: 'square', vol: 0.15 });
    this.noise({ dur: 0.08, vol: 0.12, freq: 400 });
  }

  chestOpen() {
    const notes = [523, 659, 784, 1047, 1319];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.22, type: 'triangle', vol: 0.17, delay: i * 0.09 }));
    this.noise({ dur: 0.3, vol: 0.08, freq: 3000, delay: 0.1 });
  }

  charge(t) {
    this.tone({ freq: 120 + t * 500, dur: 0.06, type: 'square', vol: 0.06 });
  }

  launch() {
    this.tone({ freq: 150, freqEnd: 900, dur: 0.3, type: 'sawtooth', vol: 0.16 });
    this.noise({ dur: 0.2, vol: 0.12, freq: 1500 });
  }

  drain() {
    this.tone({ freq: 500, freqEnd: 140, dur: 0.5, type: 'sine', vol: 0.16 });
  }

  cheer() {
    const notes = [523, 659, 784];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.16, type: 'triangle', vol: 0.14, delay: 0.1 + i * 0.09 }));
  }

  feverStart() {
    const notes = [523, 587, 659, 784, 880, 1047, 1319, 1568];
    notes.forEach((f, i) => this.tone({ freq: f, dur: 0.18, type: 'square', vol: 0.13, delay: i * 0.07 }));
  }

  milestone() {
    const notes = [784, 784, 784, 1047];
    notes.forEach((f, i) => this.tone({ freq: f, dur: i === 3 ? 0.4 : 0.12, type: 'triangle', vol: 0.16, delay: i * 0.13 }));
  }

  pop() {
    this.tone({ freq: rand(700, 1000), freqEnd: 1500, dur: 0.06, type: 'sine', vol: 0.08 });
  }

  // ===== BGM(かんたんな8bit風ループ) =====

  startBgm() {
    if (!this.ctx || this.bgmTimer) return;
    // ドレミ表記: 明るいメロディー + ベース(C メジャー)
    const M = [523, 0, 659, 0, 784, 659, 523, 0, 587, 0, 698, 0, 880, 698, 587, 0,
               659, 0, 784, 0, 988, 784, 659, 0, 1047, 0, 784, 659, 523, 0, 0, 0];
    const B = [131, 0, 131, 0, 175, 0, 175, 0, 147, 0, 147, 0, 196, 0, 196, 0,
               165, 0, 165, 0, 196, 0, 196, 0, 131, 0, 165, 0, 196, 0, 196, 0];
    const stepDur = 60 / 112 / 2; // 112BPM 8分音符
    this.bgmStep = 0;
    const tick = () => {
      const i = this.bgmStep % M.length;
      if (M[i]) this.tone({ freq: M[i], dur: stepDur * 0.85, type: 'square', vol: 0.5, dest: this.bgmGain });
      if (B[i]) this.tone({ freq: B[i], dur: stepDur * 0.9, type: 'triangle', vol: 0.8, dest: this.bgmGain });
      this.bgmStep++;
    };
    this.bgmTimer = setInterval(tick, stepDur * 1000);
  }

  stopBgm() {
    if (this.bgmTimer) {
      clearInterval(this.bgmTimer);
      this.bgmTimer = null;
    }
  }

  setBgmBoost(on) {
    if (this.bgmGain) this.bgmGain.gain.value = on ? 0.24 : 0.16;
  }
}

export const audio = new AudioSystem();
