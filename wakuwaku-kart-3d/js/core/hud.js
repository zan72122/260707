// DOMベースのUIレイヤー(タイトル・HUD・カウントダウン等)
// 4歳向け: 大きくて丸い、ひらがな中心のUI

const ui = document.getElementById('ui-layer');

export function clearUI() {
  ui.innerHTML = '';
}

export function el(tag, className, parent, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  (parent || ui).appendChild(node);
  return node;
}

export function bigButton(label, onClick, className = '') {
  const btn = el('button', `wk-btn ${className}`);
  btn.textContent = label;
  const handler = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onClick();
  };
  btn.addEventListener('pointerdown', handler);
  return btn;
}

export function injectStyles() {
  if (document.getElementById('wk-hud-style')) return;
  const style = document.createElement('style');
  style.id = 'wk-hud-style';
  style.textContent = `
  .wk-btn {
    pointer-events: auto;
    border: none;
    border-radius: 999px;
    padding: 4vmin 9vmin;
    font-size: 6.5vmin;
    font-weight: 900;
    font-family: inherit;
    color: #fff;
    background: linear-gradient(180deg, #ffb340, #ff7a1c);
    box-shadow: 0 1.4vmin 0 #d95c00, 0 2vmin 3vmin rgba(0,0,0,0.25);
    cursor: pointer;
    letter-spacing: 0.06em;
    transition: transform 0.08s;
    text-shadow: 0 2px 4px rgba(0,0,0,0.25);
  }
  .wk-btn:active { transform: translateY(0.9vmin) scale(0.98); box-shadow: 0 0.5vmin 0 #d95c00; }
  .wk-btn.green { background: linear-gradient(180deg, #6fe06f, #2fae3f); box-shadow: 0 1.4vmin 0 #1d8030, 0 2vmin 3vmin rgba(0,0,0,0.25); }
  .wk-btn.green:active { box-shadow: 0 0.5vmin 0 #1d8030; }
  .wk-btn.blue { background: linear-gradient(180deg, #66c7ff, #2e8fef); box-shadow: 0 1.4vmin 0 #1a63c0, 0 2vmin 3vmin rgba(0,0,0,0.25); }
  .wk-btn.blue:active { box-shadow: 0 0.5vmin 0 #1a63c0; }

  .wk-title-wrap {
    position: absolute; inset: 0;
    display: flex; flex-direction: column; align-items: center; justify-content: center;
    gap: 4vmin; pointer-events: none;
  }
  .wk-title-wrap > * { pointer-events: auto; }
  .wk-game-title {
    font-size: 11vmin; font-weight: 900; color: #fff; text-align: center; line-height: 1.15;
    text-shadow: 0 0.8vmin 0 #e0508c, 0 1.6vmin 2.4vmin rgba(0,0,0,0.35);
    -webkit-text-stroke: 0.45vmin #ff66a3;
    animation: wk-bounce 2s ease-in-out infinite;
    pointer-events: none;
  }
  .wk-subtitle { font-size: 4vmin; color: #fff; font-weight: 700; text-shadow: 0 2px 6px rgba(0,0,0,0.4); pointer-events: none; }
  @keyframes wk-bounce { 0%,100% { transform: translateY(0) rotate(-1.5deg); } 50% { transform: translateY(-1.6vmin) rotate(1.5deg); } }

  .wk-select-title {
    position: absolute; top: max(3vmin, env(safe-area-inset-top)); left: 0; right: 0;
    text-align: center; font-size: 7vmin; font-weight: 900; color: #fff;
    text-shadow: 0 0.6vmin 0 rgba(0,0,0,0.2), 0 1vmin 2vmin rgba(0,0,0,0.3);
    pointer-events: none;
  }
  .wk-card-row {
    position: absolute; inset: 0; display: flex; flex-wrap: wrap;
    align-items: center; justify-content: center; gap: 3.5vmin; padding: 14vmin 3vmin 6vmin;
    pointer-events: none;
  }
  .wk-card {
    pointer-events: auto; border: none; border-radius: 4vmin;
    width: min(36vmin, 42vw); padding: 2.5vmin 1vmin 2vmin;
    display: flex; flex-direction: column; align-items: center; gap: 1.2vmin;
    background: rgba(255,255,255,0.92);
    box-shadow: 0 1vmin 0 rgba(0,0,0,0.15), 0 2vmin 4vmin rgba(0,0,0,0.2);
    cursor: pointer; font-family: inherit;
    transition: transform 0.1s;
  }
  .wk-card:active { transform: scale(0.95); }
  .wk-card .emoji { font-size: 13vmin; line-height: 1; }
  .wk-card .name { font-size: 4.6vmin; font-weight: 900; color: #4a3a2a; }
  .wk-card .desc { font-size: 3vmin; font-weight: 700; color: #9a8a7a; }

  .wk-hud-top {
    position: absolute; top: max(2vmin, env(safe-area-inset-top)); left: 3vmin; right: 3vmin;
    display: flex; justify-content: space-between; align-items: flex-start; pointer-events: none;
  }
  .wk-pill {
    background: rgba(255,255,255,0.88); border-radius: 999px;
    padding: 1.4vmin 3.4vmin; font-size: 4.6vmin; font-weight: 900; color: #4a3a2a;
    box-shadow: 0 0.6vmin 1.5vmin rgba(0,0,0,0.2);
    display: flex; align-items: center; gap: 1.5vmin; white-space: nowrap;
  }
  .wk-pill.rank { font-size: 6vmin; color: #ff6d1f; }
  .wk-hud-center {
    position: absolute; inset: 0; display: flex; align-items: center; justify-content: center;
    pointer-events: none; flex-direction: column; gap: 2vmin;
  }
  .wk-countdown {
    font-size: 24vmin; font-weight: 900; color: #fff;
    text-shadow: 0 1vmin 0 #e0508c, 0 2vmin 3vmin rgba(0,0,0,0.4);
    -webkit-text-stroke: 0.6vmin #ff66a3;
    animation: wk-pop 0.9s ease-out;
  }
  @keyframes wk-pop { 0% { transform: scale(2.4); opacity: 0; } 30% { transform: scale(1); opacity: 1; } 100% { transform: scale(0.92); opacity: 0.95; } }
  .wk-banner {
    font-size: 10vmin; font-weight: 900; color: #fff; text-align: center;
    text-shadow: 0 0.8vmin 0 #2fae3f, 0 1.6vmin 2.4vmin rgba(0,0,0,0.35);
    -webkit-text-stroke: 0.45vmin #2fae3f;
    animation: wk-pop 1.2s ease-out;
  }
  .wk-banner.pink { text-shadow: 0 0.8vmin 0 #e0508c, 0 1.6vmin 2.4vmin rgba(0,0,0,0.35); -webkit-text-stroke: 0.45vmin #ff66a3; }

  .wk-steer-hint {
    position: absolute; bottom: max(4vmin, env(safe-area-inset-bottom)); width: 22vmin; height: 22vmin;
    display: flex; align-items: center; justify-content: center;
    font-size: 11vmin; border-radius: 50%;
    background: rgba(255,255,255,0.35); color: rgba(255,255,255,0.95);
    text-shadow: 0 0.5vmin 1vmin rgba(0,0,0,0.3);
    pointer-events: none; transition: background 0.15s, transform 0.15s;
  }
  .wk-steer-hint.left { left: 4vmin; }
  .wk-steer-hint.right { right: 4vmin; }
  .wk-steer-hint.active { background: rgba(255,214,0,0.75); transform: scale(1.12); }

  .wk-result-wrap {
    position: absolute; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; gap: 3vmin; pointer-events: none;
  }
  .wk-result-wrap > * { pointer-events: auto; }
  .wk-result-rank {
    font-size: 20vmin; font-weight: 900; color: #ffd700; line-height: 1;
    text-shadow: 0 1vmin 0 #cf8f00, 0 2vmin 4vmin rgba(0,0,0,0.4);
    animation: wk-bounce 1.6s ease-in-out infinite; pointer-events: none;
  }
  .wk-result-msg { font-size: 7vmin; font-weight: 900; color: #fff; text-shadow: 0 0.6vmin 1.5vmin rgba(0,0,0,0.45); pointer-events: none; }
  .wk-stars { font-size: 9vmin; letter-spacing: 1vmin; pointer-events: none; animation: wk-pop 1s ease-out; }

  .wk-item-toast {
    position: absolute; top: 22vmin; left: 0; right: 0; text-align: center;
    font-size: 7vmin; font-weight: 900; color: #fff; pointer-events: none;
    text-shadow: 0 0.6vmin 0 rgba(0,0,0,0.25), 0 1.2vmin 2vmin rgba(0,0,0,0.35);
    animation: wk-toast 1.6s ease-out forwards;
  }
  @keyframes wk-toast {
    0% { transform: scale(0.3) translateY(3vmin); opacity: 0; }
    20% { transform: scale(1.15) translateY(0); opacity: 1; }
    75% { transform: scale(1) translateY(-1vmin); opacity: 1; }
    100% { transform: scale(0.9) translateY(-4vmin); opacity: 0; }
  }
  .wk-fade-in { animation: wk-fadein 0.5s ease-out; }
  @keyframes wk-fadein { from { opacity: 0; } to { opacity: 1; } }
  `;
  document.head.appendChild(style);
}

// レース中HUD
export class RaceHUD {
  constructor() {
    this.root = el('div', 'wk-fade-in');
    this.top = el('div', 'wk-hud-top', this.root);
    this.rankPill = el('div', 'wk-pill rank', this.top, '');
    this.lapPill = el('div', 'wk-pill', this.top, '');
    this.coinPill = el('div', 'wk-pill', this.top, '');
    this.center = el('div', 'wk-hud-center', this.root);
    this.hintLeft = el('div', 'wk-steer-hint left', this.root, '⬅');
    this.hintRight = el('div', 'wk-steer-hint right', this.root, '➡');
  }

  setRank(rankIndex) {
    const medals = ['🥇', '🥈', '🥉', '', '', ''];
    const labels = ['1い', '2い', '3い', '4い', '5い', '6い'];
    this.rankPill.textContent = `${medals[rankIndex] || '🏁'} ${labels[rankIndex] || ''}`;
  }

  setLap(lap, total) {
    this.lapPill.textContent = `🏁 ${Math.min(lap, total)} / ${total}`;
  }

  setCoins(n) {
    this.coinPill.textContent = `🪙 ${n}`;
  }

  setSteerHints(leftActive, rightActive) {
    this.hintLeft.classList.toggle('active', leftActive);
    this.hintRight.classList.toggle('active', rightActive);
  }

  showCountdown(text) {
    this.center.innerHTML = '';
    el('div', 'wk-countdown', this.center, text);
  }

  showBanner(text, pink = false) {
    this.center.innerHTML = '';
    const b = el('div', `wk-banner${pink ? ' pink' : ''}`, this.center, text);
    setTimeout(() => { if (b.parentNode) b.remove(); }, 1800);
  }

  clearCenter() {
    this.center.innerHTML = '';
  }

  showItemToast(text) {
    const t = el('div', 'wk-item-toast', this.root, text);
    setTimeout(() => t.remove(), 1700);
  }
}
