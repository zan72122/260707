// WebAudioによる効果音合成(音源ファイル不要)
// 4歳児向けにやわらかい音色(サイン波+ゆるやかな減衰)を中心に作る

const PENTATONIC = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];

class AudioEngine {
  constructor() {
    this.ctx = null;
    this.master = null;
    this.muted = false;
    this._unlocked = false;
  }

  // iOSは最初のタッチでAudioContextを起動する必要がある
  unlock() {
    if (this._unlocked) {
      if (this.ctx && this.ctx.state === 'suspended') this.ctx.resume();
      return;
    }
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext;
      this.ctx = new Ctx();
      this.master = this.ctx.createGain();
      this.master.gain.value = 0.55;
      this.master.connect(this.ctx.destination);
      this._unlocked = true;
    } catch (err) {
      console.warn('AudioContext unavailable:', err);
    }
  }

  setMuted(m) {
    this.muted = m;
    if (this.master) {
      this.master.gain.setTargetAtTime(m ? 0 : 0.55, this.ctx.currentTime, 0.05);
    }
  }

  _tone({ freq = 440, dur = 0.4, type = 'sine', vol = 0.3, attack = 0.01, detune = 0, delay = 0, pan = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = type;
    osc.frequency.value = freq;
    osc.detune.value = detune;
    gain.gain.setValueAtTime(0, t0);
    gain.gain.linearRampToValueAtTime(vol, t0 + attack);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    let node = gain;
    if (pan !== 0 && this.ctx.createStereoPanner) {
      const p = this.ctx.createStereoPanner();
      p.pan.value = pan;
      gain.connect(p);
      node = p;
    }
    osc.connect(gain);
    node.connect(this.master);
    osc.start(t0);
    osc.stop(t0 + dur + 0.05);
  }

  _noise({ dur = 0.3, vol = 0.15, freq = 1200, q = 1, delay = 0 }) {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime + delay;
    const len = Math.max(1, Math.floor(this.ctx.sampleRate * dur));
    const buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    const data = buf.getChannelData(0);
    for (let i = 0; i < len; i++) data[i] = Math.random() * 2 - 1;
    const src = this.ctx.createBufferSource();
    src.buffer = buf;
    const filter = this.ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.value = freq;
    filter.Q.value = q;
    const gain = this.ctx.createGain();
    gain.gain.setValueAtTime(vol, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
    src.connect(filter).connect(gain).connect(this.master);
    src.start(t0);
  }

  // ---- 効果音メニュー ----

  // 虹の色が何かに当たったときのチャイム(色indexで音程が変わる)
  chime(colorIndex = 0) {
    const freq = PENTATONIC[colorIndex % PENTATONIC.length];
    this._tone({ freq, dur: 0.5, vol: 0.22 });
    this._tone({ freq: freq * 2, dur: 0.35, vol: 0.08, delay: 0.02 });
  }

  // キラキラ(小さな発見)
  sparkle() {
    for (let i = 0; i < 3; i++) {
      this._tone({
        freq: PENTATONIC[4 + i] * 2,
        dur: 0.25,
        vol: 0.1,
        delay: i * 0.07,
        pan: (i - 1) * 0.4,
      });
    }
  }

  // 大発見ファンファーレ(星ゲット)
  fanfare() {
    const seq = [0, 2, 4, 7];
    seq.forEach((n, i) => {
      const f = PENTATONIC[n % PENTATONIC.length] * (n >= 7 ? 2 : 1);
      this._tone({ freq: f, dur: 0.5, vol: 0.2, delay: i * 0.12 });
      this._tone({ freq: f * 1.5, dur: 0.4, vol: 0.07, delay: i * 0.12 + 0.03 });
    });
  }

  // ぽんっ(シャボン玉・タップ)
  pop() {
    this._tone({ freq: 520, dur: 0.12, vol: 0.25, type: 'triangle' });
    this._noise({ dur: 0.08, vol: 0.1, freq: 2500 });
  }

  // ぷくぷく(泡)
  bubble() {
    const f = 300 + Math.random() * 300;
    this._tone({ freq: f, dur: 0.18, vol: 0.14, type: 'sine' });
    this._tone({ freq: f * 1.8, dur: 0.1, vol: 0.05, delay: 0.04 });
  }

  // ぴちょん(水滴)
  drop() {
    if (!this.ctx || this.muted) return;
    const t0 = this.ctx.currentTime;
    const osc = this.ctx.createOscillator();
    const gain = this.ctx.createGain();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(900, t0);
    osc.frequency.exponentialRampToValueAtTime(350, t0 + 0.15);
    gain.gain.setValueAtTime(0.2, t0);
    gain.gain.exponentialRampToValueAtTime(0.001, t0 + 0.3);
    osc.connect(gain).connect(this.master);
    osc.start(t0);
    osc.stop(t0 + 0.35);
  }

  // がーがー(アヒル)
  quack() {
    this._tone({ freq: 280, dur: 0.14, vol: 0.2, type: 'sawtooth' });
    this._tone({ freq: 240, dur: 0.16, vol: 0.16, type: 'sawtooth', delay: 0.15 });
  }

  // しゅーっ(霧吹き)
  spray() {
    this._noise({ dur: 0.35, vol: 0.12, freq: 4000, q: 0.7 });
  }

  // ふわっ(風・カーテン)
  whoosh() {
    this._noise({ dur: 0.5, vol: 0.08, freq: 800, q: 0.5 });
  }

  // ころん(UIタップ)
  tap() {
    this._tone({ freq: 660, dur: 0.15, vol: 0.15, type: 'triangle' });
  }

  // るんるん(花が咲く)
  bloom() {
    [0, 2, 4].forEach((n, i) => {
      this._tone({ freq: PENTATONIC[n] * 2, dur: 0.3, vol: 0.12, delay: i * 0.06 });
    });
  }
}

export const audio = new AudioEngine();
