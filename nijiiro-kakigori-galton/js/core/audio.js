// WebAudioによる効果音・BGM(外部アセット不要の合成音)
import { rand, choice, clamp } from './utils.js';

const PENTATONIC = [523.25, 587.33, 659.25, 783.99, 880.0, 1046.5, 1174.7, 1318.5, 1567.98];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.musicGain = null;
    this.sfxGain = null;
    this.jaraGain = null;
    this.enabled = true;
    this.musicTimer = null;
    this.musicStep = 0;
    this.lastPinAt = 0;
    this.lastXyloAt = 0;
    this.jaraLevel = 0;
  }

  // iOSは初回タッチ以降でないと再生できないため、タッチ時に呼ぶ
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
    this.sfxGain.gain.value = 0.8;
    this.sfxGain.connect(this.master);
    this.musicGain = this.ctx.createGain();
    this.musicGain.gain.value = 0.13;
    this.musicGain.connect(this.master);
    this._startJaraLoop();
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

  // --- じゃらじゃらループ(ビー玉が流れる粒立ちノイズ) ---
  _startJaraLoop() {
    const sr = this.ctx.sampleRate;
    const dur = 1.6;
    const buf = this.ctx.createBuffer(1, Math.floor(sr * dur), sr);
    const data = buf.getChannelData(0);
    // 短い減衰クリックを大量に散りばめて「じゃらじゃら」を作る
    for (let k = 0; k < 520; k++) {
      const start = Math.floor(Math.random() * (data.length - 90));
      const amp = rand(0.15, 0.75);
      const decay = rand(20, 80);
      for (let i = 0; i < decay; i++) {
        data[start + i] += (Math.random() * 2 - 1) * amp * (1 - i / decay);
      }
    }
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    src.loop = true;
    const hp = this.ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.value = 1400;
    this.jaraGain = this.ctx.createGain();
    this.jaraGain.gain.value = 0;
    src.connect(hp).connect(this.jaraGain).connect(this.master);
    src.start();
  }

  // 流れている玉の量(0..1)に応じてじゃらじゃらの濃さを変える
  setJara(level) {
    if (!this.jaraGain || !this.enabled) return;
    const target = clamp(level, 0, 1) * 0.5;
    this.jaraLevel += (target - this.jaraLevel) * 0.15;
    this.jaraGain.gain.setTargetAtTime(this.jaraLevel, this.now(), 0.08);
  }

  // --- ゲーム用効果音 ---

  // ピンに当たった時の鈴(鳴りすぎ防止のスロットリング付き)
  pinDing(row = 0) {
    const t = performance.now();
    if (t - this.lastPinAt < 55) return;
    this.lastPinAt = t;
    const base = PENTATONIC[Math.min(row % PENTATONIC.length, PENTATONIC.length - 1)];
    this.tone({ freq: base * rand(0.99, 1.01), dur: 0.1, type: 'triangle', vol: 0.07 });
  }

  // スロット着地の木琴(スロット番号で音程が変わる)
  xylo(slot) {
    const t = performance.now();
    if (t - this.lastXyloAt < 40) return;
    this.lastXyloAt = t;
    const f = PENTATONIC[slot % PENTATONIC.length];
    this.tone({ freq: f, dur: 0.14, type: 'triangle', vol: 0.14 });
    this.tone({ freq: f * 3.01, dur: 0.06, type: 'sine', vol: 0.05 });
  }

  // なぞり光が柱を通る時のベル琶音
  ridgeBell(slot, h01) {
    const f = PENTATONIC[slot % PENTATONIC.length] * (1 + h01 * 0.0);
    this.tone({ freq: f, dur: 0.5, type: 'sine', vol: 0.16 + h01 * 0.1 });
    this.tone({ freq: f * 2, dur: 0.35, type: 'sine', vol: 0.06 });
  }

  // レバーを最後まで引いた時のガチャン
  gachan() {
    this.tone({ freq: 82, dur: 0.14, type: 'square', vol: 0.22, slide: -30 });
    this.noise({ dur: 0.1, vol: 0.3, freq: 2800, q: 1.2 });
    this.tone({ freq: 46, dur: 0.22, type: 'sine', vol: 0.25 });
  }

  // 放出開始の「ゴゴゴ」
  rumble() {
    this.noise({ dur: 0.7, vol: 0.32, freq: 190, q: 0.6, type: 'lowpass' });
    this.tone({ freq: 55, dur: 0.6, type: 'sine', vol: 0.2, slide: 22 });
  }

  // ピンを外す「ぷにっ」/戻す「ぽこっ」
  puni() { this.tone({ freq: 320, dur: 0.13, type: 'sine', vol: 0.24, slide: 300 }); }
  poko() { this.tone({ freq: 560, dur: 0.11, type: 'sine', vol: 0.22, slide: -200 }); }

  // 巨大玉が割れる「ぱーん!」
  bigPop() {
    this.noise({ dur: 0.28, vol: 0.4, freq: 700, q: 0.5 });
    this.tone({ freq: 150, dur: 0.25, type: 'sine', vol: 0.28, slide: -70 });
    [880, 1174, 1568].forEach((f, i) => this.tone({ freq: f, dur: 0.25, type: 'triangle', vol: 0.12, delay: 0.05 + i * 0.05 }));
  }

  // 巨大玉が登場する「ゴロン」
  goron() {
    this.tone({ freq: 120, dur: 0.3, type: 'sine', vol: 0.25, slide: -50 });
    this.noise({ dur: 0.2, vol: 0.14, freq: 400, q: 0.8 });
  }

  // うちわの風
  whoosh() {
    this.noise({ dur: 0.7, vol: 0.2, freq: 900, q: 0.4 });
    this.tone({ freq: 250, dur: 0.6, type: 'sine', vol: 0.05, slide: 500 });
  }

  // 金の玉がスロットに入った時のチャイム
  goldChime() {
    [1318.5, 1567.98, 2093].forEach((f, i) => {
      this.tone({ freq: f, dur: 0.4, type: 'sine', vol: 0.14, delay: i * 0.07 });
    });
  }

  // シロップを注ぐ音
  pour() {
    this.noise({ dur: 0.4, vol: 0.1, freq: 2400, q: 0.8 });
    this.tone({ freq: rand(500, 700), dur: 0.3, type: 'sine', vol: 0.06, slide: 260 });
  }

  // ボタンタップ音
  tap() {
    this.tone({ freq: 660, dur: 0.1, type: 'triangle', vol: 0.25, slide: 220 });
  }

  // 器がいっぱいになった時のごほうび音
  fullChime() {
    const seq = [523.25, 659.25, 783.99, 1046.5];
    seq.forEach((f, i) => {
      this.tone({ freq: f, dur: 0.5, type: 'sine', vol: 0.2, delay: i * 0.12 });
      this.tone({ freq: f * 2, dur: 0.4, type: 'sine', vol: 0.06, delay: i * 0.12 });
    });
  }

  // 「いただきます」ジングル
  itadakimasu() {
    const seq = [659.25, 659.25, 783.99, 1046.5, 880.0, 1046.5];
    seq.forEach((f, i) => {
      this.tone({ freq: f, dur: 0.35, type: 'triangle', vol: 0.22, delay: i * 0.16 });
    });
    this.noise({ dur: 0.8, vol: 0.06, freq: 5000, q: 0.6, delay: 0.9 });
  }

  // ぱくぱく食べる音・すくうシャリシャリ音
  munch() {
    this.noise({ dur: 0.12, vol: 0.22, freq: rand(500, 900), q: 2 });
    this.tone({ freq: rand(180, 260), dur: 0.1, type: 'sine', vol: 0.15, slide: -80 });
  }
  scoop() { this.noise({ dur: 0.25, vol: 0.18, freq: 3600, q: 1.2 }); }

  // --- やさしいBGM(ペンタトニックのオルゴール風) ---
  startMusic() {
    if (!this.ctx || this.musicTimer) return;
    const melody = [0, 2, 4, 2, 5, 4, 2, 0, 1, 3, 5, 3, 4, 2, 1, 0];
    const stepDur = 0.42;
    const playStep = () => {
      if (!this.ctx || !this.enabled) return;
      const idx = melody[this.musicStep % melody.length];
      if (this.musicStep % 2 === 0 || Math.random() < 0.7) {
        this.tone({ freq: PENTATONIC[idx], dur: 0.9, type: 'sine', vol: 0.5, attack: 0.01, dest: this.musicGain });
        this.tone({ freq: PENTATONIC[idx] * 2, dur: 0.5, type: 'sine', vol: 0.12, dest: this.musicGain });
      }
      if (this.musicStep % 4 === 0) {
        this.tone({ freq: PENTATONIC[choice([0, 3])] / 2, dur: 1.4, type: 'sine', vol: 0.35, dest: this.musicGain });
      }
      this.musicStep++;
    };
    this.musicTimer = setInterval(playStep, stepDur * 1000);
  }
}

export const audio = new AudioEngine();
