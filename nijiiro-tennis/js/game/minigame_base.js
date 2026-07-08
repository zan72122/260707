// ミニゲーム共通 — 「まとをタップ→キャラが打つ→当たる」の流れ
import * as THREE from 'three';
import { COURT } from '../world/court.js';
import { sfx, voice } from '../core/audio.js';
import { music } from '../core/music.js';
import * as hud from '../screens/hud.js';

const TOTAL_BALLS = 10;
const FLIGHT_TIME = 0.85;
const STAR_3 = 8;
const STAR_2 = 5;

export class MiniGameBase {
  constructor(ctx, { icon }) {
    this.ctx = ctx;
    const { scene, buildChar, playerDef } = ctx;
    this.player = buildChar(playerDef, { facing: -1 });
    this.player.group.position.set(0, 0, COURT.playerZ);
    scene.add(this.player.group);

    this.ball = ctx.ball;
    this.ball.setRainbow(false);
    this.ball.stop();

    this.ballsLeft = TOTAL_BALLS;
    this.hits = 0;
    this.state = 'ready'; // ready | flying | end
    this.flightT = 0;
    this.pendingTarget = null;

    this.bar = hud.miniBar(icon);
    this.bar.set(this.ballsLeft, 0);
    this.homeBtn = hud.homeButton(() => this._exit());
    hud.tapHint(true);

    this._offTap = ctx.input.onTap((tap) => this._onTap(tap));
    music.start('main');
  }

  // サブクラスが実装:タップからターゲットを返す/到着処理/毎フレーム
  pickTarget(_raycaster) { return null; }
  onArrive(_target, _pos) { return false; }
  updateTargets(_dt, _t) {}
  targetAimPos(target) { return target.position.clone(); }

  _onTap(tap) {
    if (this.state !== 'ready') return;
    hud.tapHint(false);
    const target = tap.raycaster ? this.pickTarget(tap.raycaster) : null;
    let aim;
    if (target) {
      aim = this.targetAimPos(target);
    } else if (tap.ground && tap.ground.z < 0) {
      aim = tap.ground.clone().setY(0.4);
    } else return;

    this.pendingTarget = target;
    this.player.swing();
    sfx.hit(this.hits, !!target);
    this.ctx.fx.burst(new THREE.Vector3(0, 1.2, COURT.playerZ - 1), 0xfff176, 14, 5);
    const from = new THREE.Vector3(0, 1.1, COURT.playerZ - 1);
    this.ball.launch(from, aim, FLIGHT_TIME, 'player');
    this.ball.marker.visible = false;
    this.state = 'flying';
    this.flightT = 0;
  }

  _arrive() {
    const pos = this.ball.pos.clone();
    const hit = this.onArrive(this.pendingTarget, pos);
    if (hit) {
      this.hits++;
      voice.nice();
      this.ctx.fx.starBurst(pos, 12);
      this.ctx.fx.confettiRain(pos, 20, 4);
      this.ctx.crowd.setExcitement(0.8);
      hud.bigEmote(['🌟', '🎉', '💮', '✨'][this.hits % 4], 700);
    } else {
      sfx.swishMiss();
    }
    this.pendingTarget = null;
    this.ballsLeft--;
    this.bar.set(this.ballsLeft, this.hits);
    if (this.ballsLeft <= 0) this._end();
    else { this.state = 'ready'; this._readyBall(); }
  }

  _readyBall() {
    this.ball.stop();
    this.ball.pos.set(0, 1.1, COURT.playerZ - 1);
    this.ball.mesh.position.copy(this.ball.pos);
  }

  _end() {
    this.state = 'end';
    music.start('calm');
    const stars = this.hits >= STAR_3 ? 3 : this.hits >= STAR_2 ? 2 : 1;
    sfx.fanfare();
    voice.cheer();
    this.player.celebrate();
    this.ctx.crowd.setExcitement(1);
    for (let i = 0; i < 2; i++)
      setTimeout(() => this.ctx.fx.confettiRain(new THREE.Vector3(0, 3, 4), 40, 14), i * 500);
    hud.resultScreen(stars, stars >= 3 ? '🏆' : '😊', () => this.ctx.onReplay(), () => this._exit());
  }

  _exit() {
    sfx.uiSelect();
    this.ctx.onExit();
  }

  update(dt, t) {
    if (this.state === 'flying') {
      this.flightT += dt;
      if (this.flightT >= FLIGHT_TIME) this._arrive();
    }
    if (this.state === 'ready') {
      this.ball.pos.set(0, 1.1 + Math.sin(t * 4) * 0.12, COURT.playerZ - 1);
      this.ball.mesh.position.copy(this.ball.pos);
    }
    this.updateTargets(dt, t);
    this.player.update(dt);
    this.ctx.crowd.update(dt, t);
    this.ctx.fx.update(dt);
    this.ball.update(dt);
  }

  dispose() {
    this._offTap();
    this.bar.remove();
    this.homeBtn.remove();
    hud.tapHint(false);
    hud.clearOverlay();
    this.ball.stop();
    this.ctx.scene.remove(this.player.group);
  }
}
