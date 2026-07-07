// エントリポイント: エンジンを起動してタイトル→プレイへ
import { Engine } from './core/engine.js';
import { TitleScene } from './scenes/title.js';
import { PlayScene } from './scenes/play.js';

const canvas = document.getElementById('game');
const engine = new Engine(canvas);

const play = new PlayScene();
const title = new TitleScene(() => engine.setScene(play));

engine.setScene(title);
engine.start();
