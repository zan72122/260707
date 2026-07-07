// WebAudioによる効果音・やさしいBGM(外部アセット不要の合成音)
import { rand, choice, clamp } from './utils.js';

const MAJOR = [523.25, 587.33, 659.25, 698.46, 783.99, 880.0, 987.77, 1046.5];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.enabled = true;
    this.musicTimer = null;
    this.musicStep = 0;
    this.lastTick = 0;
  }

  // iOSは初回タッチ以降でないと鳴らせないので、タッチ時に呼ぶ
  unlock() {
    if (this.ctx) {
      if (this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    this.ctx = new AC();
    this.master = this.ctx.createGain();
    this.master.gain.value = 0.9;
    this.master.connect(this.ctx.destination);
    this.sfxGain = this.ctx.createGain();
    this.sfxGain.gain.value = 0.85;
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.14;
    this.musicGain.connect(this.master);
    this.startMusic();
  }

  setMuted(muted) {
    this.enabled = !muted;
    if (this.master) this.master.gain.value = muted ? 0 : 0.9;
  }

  now() { return this.ctx ? this.ctx.currentTime : 0; }

  tone({ freq = 440, dur = 0.2, type = 'sine', vol = 0.3, attack = 0.005, slide = 0, dest = null, delay = 0 }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.now() + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.setValueAtTime(freq, t0);
    if (slide !== 0) osc.frequency.exponentialRampToValueAtTime(Math.max(40, freq + slide), t0 + dur);
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    osc.connect(gain).connect(dest || this.sfxGain);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  noise({ dur = 0.3, vol = 0.2, freq = 1200, q = 1, delay = 0, type = 'bandpass' }) {
    if (!this.ctx || !this.enabled) return;
    const t0 = this.now() + delay;
    const len = Math.floor(this.ctx.sampleRate * dur);
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = type;
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.sfxGain);
    src.start(t0);
  }

  // --- 効果音 ---
  tap() { this.tone({ freq: 680, dur: 0.1, type: 'triangle', vol: 0.25, slide: 240 }); }

  // 液にチャポン(ぽちゃん)
  chapon() {
    this.tone({ freq: 420, dur: 0.16, type: 'sine', vol: 0.28, slide: -180 });
    this.noise({ dur: 0.25, vol: 0.12, freq: 900, q: 0.7, delay: 0.02 });
    this.tone({ freq: 1000, dur: 0.12, type: 'sine', vol: 0.08, slide: 400, delay: 0.05 });
  }

  // 水でじゃぶじゃぶ(ゆらす一往復ごと)
  swish() {
    const t = performance.now();
    if (t - this.lastTick < 60) return;
    this.lastTick = t;
    this.noise({ dur: 0.22, vol: 0.14, freq: rand(1800, 3200), q: 0.6 });
    this.tone({ freq: rand(500, 700), dur: 0.12, type: 'sine', vol: 0.05, slide: 120 });
  }

  // ぐるぐる混ぜ(アルコール)
  swirl() {
    const t = performance.now();
    if (t - this.lastTick < 55) return;
    this.lastTick = t;
    this.noise({ dur: 0.18, vol: 0.1, freq: rand(2600, 4200), q: 1.2 });
  }

  // 長押しゲージのチクチク音(染み込み)
  soakTick(level = 0) {
    const t = performance.now();
    if (t - this.lastTick < 90) return;
    this.lastTick = t;
    this.tone({ freq: 300 + level * 500, dur: 0.08, type: 'sine', vol: 0.08 });
  }

  // 色がじわーっと入る(浸け置き)
  bloom() {
    this.tone({ freq: 300, dur: 0.7, type: 'sine', vol: 0.14, slide: 260, attack: 0.15 });
    this.tone({ freq: 600, dur: 0.6, type: 'sine', vol: 0.05, slide: 200, attack: 0.2 });
  }

  // ブルーイングの変身キラーン
  transform() {
    [0, 2, 4].forEach((i, k) => this.tone({ freq: MAJOR[i] * 1.5, dur: 0.4, type: 'triangle', vol: 0.16, delay: k * 0.08 }));
    this.tone({ freq: MAJOR[6] * 1.5, dur: 0.5, type: 'sine', vol: 0.1, delay: 0.26 });
  }

  // ちいさなキラキラ
  sparkle() {
    this.tone({ freq: choice(MAJOR) * 2, dur: 0.18, type: 'triangle', vol: 0.1 });
  }

  // 褒め声風(短いアルペジオ)
  praise() {
    const seq = choice([[0, 2, 4, 7], [0, 4, 2, 5], [2, 4, 5, 7]]);
    seq.forEach((i, k) => this.tone({ freq: MAJOR[i], dur: 0.28, type: 'triangle', vol: 0.2, delay: k * 0.11 }));
  }

  // ピント合わせ(くるっ)
  focusTune(level = 0) {
    this.tone({ freq: 400 + level * 700, dur: 0.1, type: 'sine', vol: 0.1 });
  }

  // 倍率アップ(ぐぐっと近づく)
  zoomUp() {
    this.tone({ freq: 260, dur: 0.5, type: 'sine', vol: 0.16, slide: 420, attack: 0.02 });
  }

  // 「見えた！」ごほうびファンファーレ
  fanfare() {
    const seq = [0, 2, 4, 7, 4, 7];
    seq.forEach((i, k) => {
      this.tone({ freq: MAJOR[i], dur: 0.45, type: 'triangle', vol: 0.22, delay: k * 0.14 });
      this.tone({ freq: MAJOR[i] * 2, dur: 0.35, type: 'sine', vol: 0.07, delay: k * 0.14 });
    });
    this.noise({ dur: 1.0, vol: 0.08, freq: 6000, q: 0.5, delay: 0.7 });
  }

  // --- やさしいBGM(オルゴール風) ---
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const melody = [0, 2, 4, 2, 5, 4, 2, 0, 4, 5, 7, 5, 4, 2, 1, 0];
    const stepDur = 0.46;
    const playStep = () => {
      if (!this.ctx || !this.enabled) return;
      const idx = melody[this.musicStep % melody.length];
      if (this.musicStep % 2 === 0 || Math.random() < 0.65) {
        this.tone({ freq: MAJOR[idx], dur: 0.95, type: 'sine', vol: 0.5, attack: 0.02, dest: this.musicGain });
        this.tone({ freq: MAJOR[idx] * 2, dur: 0.5, type: 'sine', vol: 0.1, dest: this.musicGain });
      }
      if (this.musicStep % 4 === 0) {
        this.tone({ freq: MAJOR[choice([0, 3, 4])] / 2, dur: 1.5, type: 'sine', vol: 0.34, dest: this.musicGain });
      }
      this.musicStep++;
    };
    this.musicTimer = setInterval(playStep, stepDur * 1000);
  }

  setMusicVolume(v) { if (this.musicGain) this.musicGain.gain.value = clamp(v, 0, 1); }
}

export const audio = new AudioEngine();
