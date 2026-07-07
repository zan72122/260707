// タイトル画面とメニュー(あそびかた・そうさ の選択) — アイコン中心
import * as hud from './hud.js';
import { sfx } from '../core/audio.js';

const LOGO_TEXT = 'にじいろテニス';
const LOGO_COLORS = ['#ff5f7e', '#ffa14f', '#ffd24f', '#6fce5f', '#58c8ff', '#b98fff', '#ff8fc8'];

export function showTitle(onPlay) {
  const sc = hud.el('div', 'screen fade-in', document.getElementById('overlay'));
  const logo = hud.el('div', 'logo', sc);
  [...LOGO_TEXT].forEach((ch, i) => {
    const s = document.createElement('span');
    s.textContent = ch;
    s.style.color = LOGO_COLORS[i % LOGO_COLORS.length];
    s.style.animationDelay = `${i * 0.12}s`;
    logo.appendChild(s);
  });
  hud.el('div', '', sc, `<div style="font-size:clamp(30px,8vmin,64px);
    filter:drop-shadow(0 4px 8px rgba(80,20,80,.3));">🎾🌈⭐</div>`);
  hud.button('▶️', 'huge gold pulse', () => { sfx.uiSelect(); onPlay(); }, sc);
  return { dispose() { sc.remove(); } };
}

// あそびかた選択:🎾ラリー / 🎯まとあて / 🎈ふうせん
export function showModeMenu(onPick) {
  const sc = hud.el('div', 'screen fade-in', document.getElementById('overlay'));
  const row = hud.el('div', 'row', sc);
  hud.button('🎾', 'huge green pulse', () => { sfx.uiSelect(); onPick('rally'); }, row);
  hud.button('🎯', 'big gold', () => { sfx.uiSelect(); onPick('target'); }, row);
  hud.button('🎈', 'big blue', () => { sfx.uiSelect(); onPick('balloon'); }, row);
  return { dispose() { sc.remove(); } };
}

// そうさ選択:👆タイミングでスイング / 👣タップで移動
export function showControlMenu(onPick) {
  const sc = hud.el('div', 'screen fade-in', document.getElementById('overlay'));
  const row = hud.el('div', 'row', sc);
  const mk = (emoji, cls, mode) => {
    const wrap = hud.el('div', '', row);
    wrap.style.display = 'flex';
    wrap.style.flexDirection = 'column';
    wrap.style.alignItems = 'center';
    wrap.style.gap = '1.4vmin';
    hud.button(emoji, `huge ${cls}`, () => { sfx.uiSelect(); onPick(mode); }, wrap);
    hud.el('div', '', wrap, `<span style="font-size:clamp(22px,5vmin,42px);">${mode === 'timing' ? '👆🎾' : '👣🏃'}</span>`);
  };
  mk('👆', 'gold pulse', 'timing');
  mk('👣', 'blue pulse', 'move');
  return { dispose() { sc.remove(); } };
}
