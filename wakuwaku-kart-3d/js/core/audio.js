// WebAudioによる効果音・BGM(全て合成音、外部ファイル不要)
import { clamp } from './utils.js';

const MUSIC_VOLUME = 0.16;
const SFX_VOLUME = 0.5;
const ENGINE_VOLUME = 0.05;

class AudioSystem {
  constructor() {
    this.ctx = null;
    this.masterGain = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.engineOsc = null;
    this.engineGain = null;
    this.musicTimer = null;
    this.musicStep = 0;
    this.enabled = true;
  }

  // iOSでは最初のタップで初期化する必要がある
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const Ctx = window.AudioContext || window.webkitAudioContext;
    if (!Ctx) return;
    this.ctx = new Ctx();
    this.masterGain = this.ctx.createGain();
    this.masterGain.gain.value = 1;
    this.masterGain.connect(this.ctx.destination);

    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = MUSIC_VOLUME;
    this.musicGain.connect(this.masterGain);

    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = SFX_VOLUME;
    this.sfxGain.connect(this.masterGain);
  }

  get ready() {
    return !!this.ctx && this.enabled;
  }

  now() {
    return this.ctx ? this.ctx.currentTime : 0;
  }

  // ---- 効果音プリミティブ ----
  tone({ freq = 440, endFreq = null, duration = 0.15, type = 'sine', volume = 1, delay = 0, attack = 0.005 }) {
    if (!this.ready) return;
    const t0 = this.now() + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (endFreq !== null) osc.frequency.exponentialRampToValueAtTime(Math.max(20, endFreq), t0 + duration);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  noise({ duration = 0.2, volume = 0.5, delay = 0, filterFreq = 2000 }) {
    if (!this.ready) return;
    const t0 = this.now() + delay;
    const bufferSize = Math.floor(this.ctx.sampleRate * duration);
    const buffer = this.ctx.createBuffer(1, bufferSize, this.ctx.sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < bufferSize; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buffer;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = filterFreq;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(volume, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    src.connect(filter);
    filter.connect(gain);
    gain.connect(this.sfxGain);
    src.start(t0);
  }

  // ---- ゲーム効果音 ----
  sfxTap() { this.tone({ freq: 660, endFreq: 880, duration: 0.1, type: 'triangle', volume: 0.5 }); }

  sfxCoin() {
    this.tone({ freq: 988, duration: 0.08, type: 'square', volume: 0.25 });
    this.tone({ freq: 1319, duration: 0.25, type: 'square', volume: 0.25, delay: 0.08 });
  }

  sfxItemBox() {
    this.tone({ freq: 523, duration: 0.09, type: 'triangle', volume: 0.4 });
    this.tone({ freq: 659, duration: 0.09, type: 'triangle', volume: 0.4, delay: 0.09 });
    this.tone({ freq: 784, duration: 0.09, type: 'triangle', volume: 0.4, delay: 0.18 });
    this.tone({ freq: 1047, duration: 0.2, type: 'triangle', volume: 0.4, delay: 0.27 });
  }

  sfxBoost() {
    this.tone({ freq: 220, endFreq: 1200, duration: 0.5, type: 'sawtooth', volume: 0.3 });
    this.noise({ duration: 0.4, volume: 0.15, filterFreq: 3500 });
  }

  sfxJump() { this.tone({ freq: 330, endFreq: 720, duration: 0.25, type: 'sine', volume: 0.4 }); }

  sfxLand() { this.noise({ duration: 0.12, volume: 0.2, filterFreq: 900 }); }

  sfxBump() {
    this.tone({ freq: 160, endFreq: 80, duration: 0.2, type: 'square', volume: 0.3 });
    this.noise({ duration: 0.15, volume: 0.25, filterFreq: 700 });
  }

  sfxStar() {
    const notes = [784, 988, 1175, 1568];
    notes.forEach((f, i) => this.tone({ freq: f, duration: 0.12, type: 'square', volume: 0.22, delay: i * 0.07 }));
  }

  sfxBalloonPop() {
    this.noise({ duration: 0.18, volume: 0.35, filterFreq: 2500 });
    this.tone({ freq: 500, endFreq: 900, duration: 0.15, type: 'sine', volume: 0.3, delay: 0.02 });
  }

  sfxCountBeep(isGo) {
    if (isGo) this.tone({ freq: 880, duration: 0.5, type: 'square', volume: 0.35 });
    else this.tone({ freq: 440, duration: 0.25, type: 'square', volume: 0.3 });
  }

  sfxLap() {
    this.tone({ freq: 659, duration: 0.1, type: 'triangle', volume: 0.4 });
    this.tone({ freq: 880, duration: 0.1, type: 'triangle', volume: 0.4, delay: 0.1 });
    this.tone({ freq: 1319, duration: 0.3, type: 'triangle', volume: 0.4, delay: 0.2 });
  }

  sfxFanfare() {
    const seq = [
      [523, 0.0], [659, 0.12], [784, 0.24], [1047, 0.36],
      [784, 0.6], [1047, 0.72],
    ];
    seq.forEach(([f, d]) => this.tone({ freq: f, duration: 0.28, type: 'triangle', volume: 0.4, delay: d }));
    this.tone({ freq: 1319, duration: 0.9, type: 'triangle', volume: 0.42, delay: 0.96 });
  }

  sfxSparkle() { this.tone({ freq: 1568, endFreq: 2093, duration: 0.15, type: 'sine', volume: 0.2 }); }

  // ---- エンジン音(連続) ----
  startEngine() {
    if (!this.ready || this.engineOsc) return;
    this.engineOsc = this.ctx.createOscillator();
    this.engineOsc.type = 'sawtooth';
    this.engineOsc.frequency.value = 60;
    this.engineGain = this.ctx.createGain();
    this.engineGain.gain.value = 0;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 500;
    this.engineOsc.connect(filter);
    filter.connect(this.engineGain);
    this.engineGain.connect(this.masterGain);
    this.engineOsc.start();
  }

  updateEngine(speedRatio) {
    if (!this.engineOsc) return;
    const t = this.now();
    const freq = 55 + speedRatio * 110;
    this.engineOsc.frequency.setTargetAtTime(freq, t, 0.1);
    this.engineGain.gain.setTargetAtTime(ENGINE_VOLUME * clamp(0.3 + speedRatio, 0, 1), t, 0.1);
  }

  stopEngine() {
    if (!this.engineOsc) return;
    try {
      this.engineGain.gain.setTargetAtTime(0, this.now(), 0.15);
      const osc = this.engineOsc;
      setTimeout(() => { try { osc.stop(); } catch (e) { /* 停止済みは無視 */ } }, 400);
    } catch (e) { /* コンテキスト破棄後は無視 */ }
    this.engineOsc = null;
    this.engineGain = null;
  }

  // ---- BGM(簡易ステップシーケンサ) ----
  startMusic(kind = 'race') {
    if (!this.ready) return;
    this.stopMusic();
    this.musicStep = 0;
    const melodyRace = [523, 0, 659, 784, 659, 0, 523, 0, 587, 0, 698, 880, 698, 0, 587, 0,
      659, 0, 784, 988, 784, 0, 659, 0, 523, 587, 659, 784, 880, 784, 659, 587];
    const melodyTitle = [392, 0, 523, 0, 659, 0, 523, 0, 440, 0, 587, 0, 698, 0, 587, 0,
      392, 0, 523, 0, 659, 0, 784, 0, 659, 523, 440, 0, 392, 0, 0, 0];
    const bassRace = [131, 131, 165, 165, 147, 147, 175, 175, 165, 165, 196, 196, 131, 147, 165, 147];
    const melody = kind === 'race' ? melodyRace : melodyTitle;
    const stepMs = kind === 'race' ? 140 : 190;
    this.musicTimer = setInterval(() => {
      if (!this.ready) return;
      const i = this.musicStep % melody.length;
      const note = melody[i];
      if (note > 0) {
        this.musicNote(note, stepMs / 1000 * 1.7, 'triangle', 0.5);
      }
      const bass = bassRace[this.musicStep % bassRace.length];
      if (this.musicStep % 2 === 0) {
        this.musicNote(bass, stepMs / 1000 * 1.8, 'sine', 0.6);
      }
      this.musicStep++;
    }, stepMs);
  }

  musicNote(freq, duration, type, volume) {
    const t0 = this.now();
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(volume, t0 + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + duration);
    osc.connect(gain);
    gain.connect(this.musicGain);
    osc.start(t0);
    osc.stop(t0 + duration + 0.05);
  }

  stopMusic() {
    if (this.musicTimer) {
      clearInterval(this.musicTimer);
      this.musicTimer = null;
    }
  }
}

export const audio = new AudioSystem();
