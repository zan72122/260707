// Web Audio 効果音 — 外部素材なしで全て合成
const RALLY_SCALE = [0, 2, 4, 7, 9, 12, 14, 16, 19, 21, 24]; // ペンタトニック(半音)
const BASE_NOTE_HZ = 523.25; // C5

let ctx = null;
let master = null;

export function ensureAudio() {
  if (ctx) { if (ctx.state === 'suspended') ctx.resume(); return ctx; }
  const AC = window.AudioContext || window.webkitAudioContext;
  if (!AC) return null;
  ctx = new AC();
  master = ctx.createGain();
  master.gain.value = 0.7;
  const comp = ctx.createDynamicsCompressor();
  master.connect(comp);
  comp.connect(ctx.destination);
  return ctx;
}

export function audioContext() { return ctx; }
export function masterBus() { return master; }

function tone({ freq = 440, type = 'sine', dur = 0.2, vol = 0.3, at = 0,
  slide = 0, attack = 0.005, curve = 'exp' }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  const g = ctx.createGain();
  osc.type = type;
  osc.frequency.setValueAtTime(freq, t0);
  if (slide) osc.frequency.exponentialRampToValueAtTime(Math.max(30, freq + slide), t0 + dur);
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + attack);
  if (curve === 'exp') g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  else g.gain.linearRampToValueAtTime(0, t0 + dur);
  osc.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
}

function noise({ dur = 0.15, vol = 0.2, at = 0, freq = 1400, q = 1 }) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const len = Math.ceil(ctx.sampleRate * dur);
  const buf = ctx.createBuffer(1, len, ctx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ctx.createBufferSource();
  src.buffer = buf;
  const f = ctx.createBiquadFilter();
  f.type = 'bandpass'; f.frequency.value = freq; f.Q.value = q;
  const g = ctx.createGain(); g.gain.value = vol;
  src.connect(f); f.connect(g); g.connect(master);
  src.start(t0);
}

const semiHz = (s) => BASE_NOTE_HZ * Math.pow(2, s / 12);

// ---- ゲーム効果音 ----
export const sfx = {
  // ラリーが続くほど音階が上がる「メロディーラリー」
  hit(rallyCount = 0, nice = false) {
    const idx = Math.min(rallyCount, RALLY_SCALE.length - 1);
    const f = semiHz(RALLY_SCALE[idx]);
    noise({ dur: 0.06, vol: 0.25, freq: 2600, q: 0.8 });
    tone({ freq: f, type: 'triangle', dur: 0.3, vol: 0.34 });
    tone({ freq: f * 2, type: 'sine', dur: 0.22, vol: 0.14 });
    if (nice) {
      tone({ freq: f * 1.5, type: 'triangle', dur: 0.3, vol: 0.22, at: 0.06 });
      tone({ freq: f * 2.5, type: 'sine', dur: 0.4, vol: 0.12, at: 0.1 });
    }
  },
  bounce() {
    tone({ freq: 190, type: 'sine', dur: 0.12, vol: 0.25, slide: -80 });
    noise({ dur: 0.05, vol: 0.1, freq: 700 });
  },
  swishMiss() { noise({ dur: 0.25, vol: 0.18, freq: 900, q: 0.6 }); },
  tap() { tone({ freq: 720, type: 'sine', dur: 0.09, vol: 0.25, slide: 260 }); },
  // 星アイテム取得のキラキラアルペジオ
  starGet() {
    [0, 4, 7, 12, 16].forEach((s, i) =>
      tone({ freq: semiHz(s + 12), type: 'sine', dur: 0.22, vol: 0.22, at: i * 0.055 }));
  },
  pointWin() {
    [0, 4, 7, 12].forEach((s, i) =>
      tone({ freq: semiHz(s), type: 'triangle', dur: 0.28, vol: 0.3, at: i * 0.09 }));
    noise({ dur: 0.4, vol: 0.12, freq: 5000, q: 0.4, at: 0.1 });
  },
  pointLose() { // 負けてもかわいく前向きな音
    tone({ freq: semiHz(4), type: 'triangle', dur: 0.2, vol: 0.22 });
    tone({ freq: semiHz(2), type: 'triangle', dur: 0.24, vol: 0.22, at: 0.14 });
    tone({ freq: semiHz(7), type: 'sine', dur: 0.4, vol: 0.18, at: 0.32 });
  },
  fanfare() {
    const seq = [0, 4, 7, 12, 7, 12, 16, 19];
    seq.forEach((s, i) => {
      tone({ freq: semiHz(s), type: 'square', dur: 0.22, vol: 0.13, at: i * 0.11 });
      tone({ freq: semiHz(s + 12), type: 'triangle', dur: 0.22, vol: 0.2, at: i * 0.11 });
    });
    noise({ dur: 0.8, vol: 0.1, freq: 6000, q: 0.3, at: 0.6 });
  },
  pop() { // ふうせん
    tone({ freq: 400, type: 'square', dur: 0.06, vol: 0.2, slide: 500 });
    noise({ dur: 0.12, vol: 0.3, freq: 1800, q: 0.5 });
  },
  targetHit() {
    tone({ freq: semiHz(12), type: 'triangle', dur: 0.15, vol: 0.3 });
    tone({ freq: semiHz(19), type: 'sine', dur: 0.3, vol: 0.2, at: 0.07 });
    noise({ dur: 0.2, vol: 0.15, freq: 4000, q: 0.5 });
  },
  rainbow() { // レインボーボール進化
    for (let i = 0; i < 8; i++)
      tone({ freq: semiHz(i * 3 + 12), type: 'sine', dur: 0.3, vol: 0.16, at: i * 0.05 });
  },
  uiSelect() { tone({ freq: 620, type: 'triangle', dur: 0.12, vol: 0.28, slide: 220 }); },
};

// ---- ボイス風効果音(フォルマント風の「わーい」「おー!」) ----
function voiceSweep(f1, f2, dur, vol, at = 0, vibrato = 6) {
  if (!ctx) return;
  const t0 = ctx.currentTime + at;
  const osc = ctx.createOscillator();
  osc.type = 'sawtooth';
  osc.frequency.setValueAtTime(f1, t0);
  osc.frequency.exponentialRampToValueAtTime(f2, t0 + dur);
  const lfo = ctx.createOscillator();
  const lfoG = ctx.createGain();
  lfo.frequency.value = vibrato; lfoG.gain.value = 14;
  lfo.connect(lfoG); lfoG.connect(osc.frequency);
  const filt = ctx.createBiquadFilter();
  filt.type = 'bandpass'; filt.frequency.value = (f1 + f2) * 1.9; filt.Q.value = 2.2;
  const g = ctx.createGain();
  g.gain.setValueAtTime(0, t0);
  g.gain.linearRampToValueAtTime(vol, t0 + 0.04);
  g.gain.exponentialRampToValueAtTime(0.001, t0 + dur);
  osc.connect(filt); filt.connect(g); g.connect(master);
  osc.start(t0); osc.stop(t0 + dur + 0.05);
  lfo.start(t0); lfo.stop(t0 + dur + 0.05);
}

export const voice = {
  yay() { voiceSweep(340, 520, 0.35, 0.24); voiceSweep(430, 660, 0.4, 0.18, 0.16); },
  ooh() { voiceSweep(300, 420, 0.5, 0.22, 0, 4); },
  nice() { voiceSweep(380, 620, 0.2, 0.24); voiceSweep(560, 420, 0.3, 0.2, 0.16); },
  cheer() {
    for (let i = 0; i < 4; i++)
      voiceSweep(280 + i * 60, 480 + i * 70, 0.35, 0.1, i * 0.06, 5 + i);
  },
};
