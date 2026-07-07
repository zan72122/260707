// にじいろテニス — 起動と画面遷移の司令塔
import * as THREE from 'three';
import { Engine, placeMatchCamera } from './core/engine.js';
import { Input } from './core/input.js';
import { ParticleFX } from './core/particles.js';
import { ensureAudio } from './core/audio.js';
import { music } from './core/music.js';
import { buildCourt } from './world/court.js';
import { buildSky, buildLights } from './world/sky.js';
import { buildCrowd } from './world/crowd.js';
import { buildCharacter } from './world/characters.js';
import { Ball } from './game/ball.js';
import { Match } from './game/match.js';
import { TargetGame } from './game/target_game.js';
import { BalloonGame } from './game/balloon_game.js';
import { CharSelect } from './screens/charselect.js';
import { showTitle, showModeMenu, showControlMenu } from './screens/title.js';
import { clearHud, clearOverlay } from './screens/hud.js';

const canvas = document.getElementById('gl');
const engine = new Engine(canvas);
const input = new Input(canvas, engine.camera);
const fx = new ParticleFX(engine.scene);

buildLights(engine.scene);
buildCourt(engine.scene);
const sky = buildSky(engine.scene);
const crowd = buildCrowd(engine.scene);
const ball = new Ball(engine.scene, fx);

// ---- 画面状態 ----
let state = 'title';
let screen = null;   // dispose() を持つ現在の画面
let game = null;     // update()/dispose() を持つ現在のゲーム
let playerDef = null;
let cpuDef = null;
let lastGame = null; // リプレイ用 { mode, controlMode }

const camPos = new THREE.Vector3(13, 7, 15);
const camLook = new THREE.Vector3(0, 1, -2);
const wantPos = new THREE.Vector3();
const wantLook = new THREE.Vector3();

function setState(next) {
  if (screen) { screen.dispose(); screen = null; }
  if (game) { game.dispose(); game = null; }
  clearOverlay();
  clearHud();
  camPos.copy(engine.camera.position);
  state = next;

  if (next === 'title') {
    music.stop();
    screen = showTitle(() => {
      ensureAudio();
      music.start('main');
      setState('select');
    });
  } else if (next === 'select') {
    screen = new CharSelect(gameCtx(), (p, c) => {
      playerDef = p; cpuDef = c;
      setState('menu');
    });
  } else if (next === 'menu') {
    music.start('main');
    screen = showModeMenu((mode) => {
      if (mode === 'rally') setState('control');
      else startGame(mode, null);
    });
  } else if (next === 'control') {
    screen = showControlMenu((controlMode) => startGame('rally', controlMode));
  }
}

function gameCtx() {
  return {
    scene: engine.scene, engine, input, fx, ball, crowd,
    buildChar: buildCharacter,
    playerDef, cpuDef,
    onExit: () => setState('menu'),
    onReplay: () => startGame(lastGame.mode, lastGame.controlMode),
  };
}

function startGame(mode, controlMode) {
  if (screen) { screen.dispose(); screen = null; }
  if (game) { game.dispose(); game = null; }
  clearOverlay();
  clearHud();
  lastGame = { mode, controlMode };
  state = 'game';
  const ctx = gameCtx();
  if (mode === 'rally') game = new Match(ctx, { controlMode });
  else if (mode === 'target') game = new TargetGame(ctx);
  else game = new BalloonGame(ctx);
}

// ---- カメラ演出 ----
function updateCamera(dt, t) {
  if (state === 'game') {
    const shake = game && game.shake ? game.shake : 0;
    placeMatchCamera(engine.camera, engine.camera.aspect, shake);
    return;
  }
  if (state === 'select') {
    wantPos.set(Math.sin(t * 0.22) * 1.2, 3.1, 11.2);
    wantLook.set(0, 1.3, 4);
  } else { // title / menu / control
    const a = t * 0.06;
    wantPos.set(Math.sin(a) * 15, 7.5 + Math.sin(t * 0.3) * 0.6, Math.cos(a) * 15 + 4);
    wantLook.set(0, 1.2, -2);
  }
  camPos.lerp(wantPos, Math.min(1, dt * 2.2));
  camLook.lerp(wantLook, Math.min(1, dt * 2.2));
  engine.camera.position.copy(camPos);
  engine.camera.lookAt(camLook);
}

// ---- メインループ ----
const clock = new THREE.Clock();
let bootHidden = false;

function loop() {
  requestAnimationFrame(loop);
  const dt = Math.min(0.05, clock.getDelta());
  const t = clock.elapsedTime;

  sky.update(t);
  if (game) game.update(dt, t);
  else if (screen && screen.update) { screen.update(dt, t); ball.update(dt); }
  else { crowd.update(dt, t); fx.update(dt); ball.update(dt); }

  updateCamera(dt, t);
  engine.render(dt);

  if (!bootHidden) {
    bootHidden = true;
    document.getElementById('boot').classList.add('hide');
  }
}

setState('title');
loop();

// iOSでスリープ復帰後に音が止まる対策
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) ensureAudio();
});
