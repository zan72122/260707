// 文字なしHUD — 星スコア・ラリー数・大きな絵文字演出・ボタン
const hud = () => document.getElementById('hud');
const overlay = () => document.getElementById('overlay');

export function clearHud() { hud().innerHTML = ''; }
export function clearOverlay() { overlay().innerHTML = ''; }

export function el(tag, cls, parent, html) {
  const e = document.createElement(tag);
  if (cls) e.className = cls;
  if (html !== undefined) e.innerHTML = html;
  (parent || hud()).appendChild(e);
  return e;
}

export function button(emoji, cls, onTap, parent) {
  const b = el('button', `btn ${cls || ''}`, parent || hud(), emoji);
  b.addEventListener('pointerdown', (e) => { e.stopPropagation(); onTap(); }, { passive: true });
  return b;
}

// ---- スコアバー(⭐で表現、文字なし) ----
export function scoreBar(playerEmoji, cpuEmoji, winStars) {
  const bar = el('div', 'score-bar');
  el('span', 'score-face', bar, playerEmoji);
  const pStars = el('div', 'score-stars', bar);
  el('span', 'score-vs', bar, '🆚');
  const cStars = el('div', 'score-stars', bar);
  el('span', 'score-face', bar, cpuEmoji);
  const make = (box) => {
    const arr = [];
    for (let i = 0; i < winStars; i++) arr.push(el('span', 'st', box, '⭐'));
    return arr;
  };
  const p = make(pStars), c = make(cStars);
  return {
    set(ps, cs) {
      p.forEach((s, i) => s.classList.toggle('on', i < ps));
      c.forEach((s, i) => s.classList.toggle('on', i < cs));
    },
    remove() { bar.remove(); },
  };
}

// ---- ラリー数バッジ ----
export function rallyBadge() {
  const b = el('div', 'rally-badge', hud(), '🎾0');
  let last = 0;
  return {
    set(n, rainbow) {
      if (n !== last) {
        b.classList.remove('bump');
        void b.offsetWidth;
        b.classList.add('bump');
        last = n;
      }
      b.innerHTML = (rainbow ? '🌈' : '🎾') + n;
      b.classList.toggle('rainbow', rainbow);
    },
    remove() { b.remove(); },
  };
}

// ---- 大きな絵文字演出(ないす!/おしい!も絵文字で) ----
export function bigEmote(emoji, holdMs = 950) {
  const e = el('div', 'big-emote', overlay(), emoji);
  setTimeout(() => e.remove(), holdMs);
  return e;
}

// ---- ホームに戻るボタン ----
export function homeButton(onTap) {
  const b = button('🏠', 'corner-btn blue', onTap);
  return b;
}

// ---- タップ誘導(👆マーク) ----
let hintEl = null;
export function tapHint(show) {
  if (show) {
    if (hintEl && hintEl.isConnected) return;
    hintEl = el('div', 'tap-hint', overlay(), '👆');
  } else if (hintEl) { hintEl.remove(); hintEl = null; }
}

// ---- ミニゲームの残数バー ----
export function miniBar(iconEmoji) {
  const bar = el('div', 'mini-bar');
  el('span', '', bar, iconEmoji);
  const cnt = el('span', 'cnt', bar, '');
  const score = el('span', '', bar, '');
  return {
    set(remaining, got) {
      cnt.textContent = '🎾'.repeat(Math.max(0, remaining)) || '✨';
      score.textContent = got > 0 ? ` ⭐${got}` : '';
    },
    remove() { bar.remove(); },
  };
}

// ---- 結果画面(星1〜3+ポジティブ絵文字) ----
export function resultScreen(stars, big, onReplay, onHome) {
  const sc = el('div', 'screen fade-in', overlay());
  el('div', 'big', sc, `<div style="font-size:clamp(64px,20vmin,190px);
    filter:drop-shadow(0 8px 14px rgba(80,20,80,.35));">${big}</div>`);
  const starBox = el('div', 'result-stars', sc);
  for (let i = 0; i < 3; i++) {
    const s = el('span', '', starBox, i < stars ? '⭐' : '☆');
    s.style.animationDelay = `${0.25 + i * 0.35}s`;
  }
  const row = el('div', 'row', sc);
  button('🔄', 'big green pulse', onReplay, row);
  button('🏠', 'big blue', onHome, row);
  return sc;
}
