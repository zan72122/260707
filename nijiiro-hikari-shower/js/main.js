// エントリーポイント: エンジンを起動し、全シーンを登録する

import { Engine } from './core/engine.js';
import { MenuScene } from './scenes/menu.js';
import { MorningScene } from './scenes/morning.js';
import { BathScene } from './scenes/bath.js';
import { DressScene } from './scenes/dress.js';
import { GardenScene } from './scenes/garden.js';

const canvas = document.getElementById('game');
const engine = new Engine(canvas);

engine.registerScene('menu', (e) => new MenuScene(e));
engine.registerScene('morning', (e) => new MorningScene(e));
engine.registerScene('bath', (e) => new BathScene(e));
engine.registerScene('dress', (e) => new DressScene(e));
engine.registerScene('garden', (e) => new GardenScene(e));

engine.goto('menu', true);
engine.start();

// ローディング表示をふわっと消す
const boot = document.getElementById('boot');
setTimeout(() => {
  boot.classList.add('hidden');
  setTimeout(() => boot.remove(), 800);
}, 400);
