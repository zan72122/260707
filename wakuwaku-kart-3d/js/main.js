// エントリーポイント: シーンの組み立てと遷移
import { Engine } from './core/engine.js';
import { input } from './core/input.js';
import { audio } from './core/audio.js';
import { injectStyles } from './core/hud.js';
import { TitleScene } from './scenes/title.js';
import { RaceScene } from './scenes/race.js';
import { FinishScene } from './scenes/finish.js';

injectStyles();

const canvas = document.getElementById('game-canvas');
const engine = new Engine(canvas);
input.attach(document.getElementById('game-root'));
input.onFirstInteraction = () => audio.unlock();

let lastCharacter = null;
let lastCourse = null;

function goTitle() {
  engine.setScene(new TitleScene(engine, startRace));
}

function startRace(character, course) {
  lastCharacter = character;
  lastCourse = course;
  engine.setScene(new RaceScene(engine, character, course, showFinish));
}

function showFinish(rank, coins) {
  engine.setScene(new FinishScene(
    engine, lastCharacter, rank, coins,
    () => startRace(lastCharacter, lastCourse),
    goTitle,
  ));
}

goTitle();
engine.start();
