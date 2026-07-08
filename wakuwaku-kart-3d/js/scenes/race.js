// レースシーン(本体)
import * as THREE from '../../vendor/three.module.min.js';
import { clearUI, RaceHUD } from '../core/hud.js';
import { audio } from '../core/audio.js';
import { input } from '../core/input.js';
import { clamp, damp, TAU, pick, makeRandom } from '../core/utils.js';
import { Track } from '../game/track.js';
import { Scenery } from '../game/scenery.js';
import { ItemField } from '../game/items.js';
import { Effects } from '../game/effects.js';
import { Racer } from '../game/racer.js';
import { CHARACTERS, ITEM_KINDS } from '../game/data.js';

const RACER_COUNT = 6;
const COUNTDOWN_TIME = 3.6;
const KART_COLLIDE_DIST = 3.0;

export class RaceScene {
  constructor(engine, character, courseDef, onFinish) {
    this.engine = engine;
    this.character = character;
    this.courseDef = courseDef;
    this.onFinish = onFinish;
  }

  enter() {
    this.threeScene = new THREE.Scene();
    this.threeScene.fog = new THREE.Fog(this.courseDef.fogColor, 140, 520);
    this.camera = new THREE.PerspectiveCamera(66, this.engine.aspect, 0.1, 2000);

    this.track = new Track(this.courseDef);
    this.threeScene.add(this.track.group);
    this.scenery = new Scenery(this.track, this.courseDef);
    this.threeScene.add(this.scenery.group);
    this.items = new ItemField(this.track, this.threeScene);
    this.effects = new Effects(this.threeScene);

    // ライティング
    this.threeScene.add(new THREE.HemisphereLight(0xd6ecff, 0x8a9a6a, 0.9));
    this.sun = new THREE.DirectionalLight(0xfff4d6, 1.7);
    this.sun.castShadow = true;
    this.sun.shadow.mapSize.set(2048, 2048);
    const sc = this.sun.shadow.camera;
    sc.left = -60; sc.right = 60; sc.top = 60; sc.bottom = -60;
    sc.far = 400;
    this.threeScene.add(this.sun);
    this.threeScene.add(this.sun.target);

    // レーサー(プレイヤー + AI)
    this.racers = [];
    const others = CHARACTERS.filter((c) => c.id !== this.character.id);
    const random = makeRandom(99);
    for (let i = others.length - 1; i > 0; i--) {
      const j = Math.floor(random() * (i + 1));
      [others[i], others[j]] = [others[j], others[i]];
    }
    for (let i = 0; i < RACER_COUNT; i++) {
      const isPlayer = i === 0;
      const c = isPlayer ? this.character : others[i - 1];
      const racer = new Racer(this.track, c, isPlayer, i);
      this.threeScene.add(racer.group);
      this.racers.push(racer);
    }
    this.player = this.racers[0];

    // レース状態
    this.state = 'countdown';
    this.countdown = COUNTDOWN_TIME;
    this.lastCountShown = null;
    this.raceTime = 0;
    this.playerRank = 0;
    this.finishOrder = [];
    this.lastLapShown = 1;
    this.rainbowTimer = 0;

    this.hud = new RaceHUD();
    this.hud.setLap(1, this.courseDef.laps);
    this.hud.setCoins(0);
    this.hud.setRank(RACER_COUNT - 1);

    // カメラ初期位置
    const s = this.track.sampleAt(this.track.totalLength - 20);
    this.camPos = s.position.clone().add(new THREE.Vector3(0, 8, 0)).addScaledVector(s.tangent, -10);
    this.camLook = this.player.pos.clone();

    audio.startEngine();
    audio.startMusic('race');
  }

  update(dt, time) {
    const raceRunning = this.state === 'racing' || this.state === 'finished';

    // カウントダウン
    if (this.state === 'countdown') {
      this.countdown -= dt;
      const remaining = Math.ceil(this.countdown - 0.6);
      if (this.countdown <= 0.6 && this.lastCountShown !== 0) {
        this.lastCountShown = 0;
        this.hud.showCountdown('GO!');
        audio.sfxCountBeep(true);
        setTimeout(() => this.hud.clearCenter(), 900);
        this.state = 'racing';
      } else if (remaining >= 1 && remaining <= 3 && this.lastCountShown !== remaining) {
        this.lastCountShown = remaining;
        this.hud.showCountdown(String(remaining));
        audio.sfxCountBeep(false);
      }
    }
    if (this.state === 'racing') this.raceTime += dt;

    // レインボーパワー(道幅いっぱい虹色キラキラ+加速)
    if (this.rainbowTimer > 0) {
      this.rainbowTimer -= dt;
      this.player.boostTimer = Math.max(this.player.boostTimer, 0.3);
      if (Math.random() < 0.5) this.effects.starTrail(this.player.pos);
    }

    input.update();
    const playerProgress = this.player.totalProgress;
    for (const racer of this.racers) {
      const steer = racer.isPlayer ? input.steer : 0;
      const bumped = racer.update(dt, time, steer, raceRunning && !racer.finished ? true : raceRunning, playerProgress);
      if (bumped && racer.isPlayer) audio.sfxBump();

      if (raceRunning && !racer.finished) {
        const events = this.items.collect(racer);
        for (const ev of events) this.handleItemEvent(racer, ev);
      }

      // ブースト炎
      if (racer.boostTimer > 0 && Math.random() < 0.8) {
        this.effects.boostFlame(racer.group.position, racer.heading);
      }
      if (racer.starTimer > 0 && Math.random() < 0.6) {
        this.effects.starTrail(racer.group.position);
      }

      // ゴール判定
      if (this.state !== 'countdown' && !racer.finished && racer.lap > this.courseDef.laps) {
        racer.finished = true;
        racer.finishTime = this.raceTime;
        this.finishOrder.push(racer);
        if (racer.isPlayer) this.onPlayerFinish();
      }
    }

    this.resolveKartCollisions();
    this.updateRankAndLap();
    this.items.update(dt, time);
    this.scenery.update(dt, time);
    this.updateCamera(dt);
    this.effects.update(dt, this.camera);

    // ゴール後の紙吹雪
    if (this.state === 'finished') {
      this.effects.confettiRain(this.player.pos, 14);
      this.finishDelay -= dt;
      if (this.finishDelay <= 0) {
        const rank = this.finishOrder.indexOf(this.player);
        this.onFinish(rank, this.player.coins);
        return;
      }
    }

    audio.updateEngine(clamp(this.player.speed / 34, 0, 1));
    this.hud.setSteerHints(input.isTouchingLeft, input.isTouchingRight);
  }

  handleItemEvent(racer, ev) {
    if (ev.type === 'coin') {
      this.effects.coinBurst(ev.position);
      if (racer.isPlayer) {
        audio.sfxCoin();
        this.hud.setCoins(racer.coins);
        racer.speed = Math.min(racer.speed + 1.2, racer.maxSpeed * 1.08);
      }
    } else if (ev.type === 'box') {
      this.effects.boxBurst(ev.position);
      const totalWeight = ITEM_KINDS.reduce((a, k) => a + k.weight, 0);
      let roll = Math.random() * totalWeight;
      let kind = ITEM_KINDS[0];
      for (const k of ITEM_KINDS) {
        roll -= k.weight;
        if (roll <= 0) { kind = k; break; }
      }
      if (racer.isPlayer) {
        audio.sfxItemBox();
        this.hud.showItemToast(kind.label);
      }
      this.applyItem(racer, kind.id);
    } else if (ev.type === 'pad') {
      racer.applyBoost();
      racer.airVel = 6.5;
      if (racer.isPlayer) {
        audio.sfxBoost();
        audio.sfxJump();
      }
    } else if (ev.type === 'balloon') {
      this.effects.balloonPop(ev.position, ev.color);
      if (racer.isPlayer) {
        audio.sfxBalloonPop();
        racer.coins++;
        this.hud.setCoins(racer.coins);
      }
    }
  }

  applyItem(racer, kindId) {
    if (kindId === 'boost') {
      racer.applyBoost();
      if (racer.isPlayer) audio.sfxBoost();
    } else if (kindId === 'star') {
      racer.applyStar();
      if (racer.isPlayer) audio.sfxStar();
    } else if (kindId === 'coins') {
      racer.coins += 5;
      if (racer.isPlayer) {
        audio.sfxCoin();
        this.hud.setCoins(racer.coins);
        this.effects.coinBurst(racer.pos.clone().add(new THREE.Vector3(0, 2, 0)));
      }
    } else if (kindId === 'rainbow') {
      if (racer.isPlayer) {
        this.rainbowTimer = 3.2;
        audio.sfxSparkle();
        audio.sfxBoost();
      } else {
        racer.applyBoost();
      }
    }
  }

  resolveKartCollisions() {
    for (let i = 0; i < this.racers.length; i++) {
      for (let j = i + 1; j < this.racers.length; j++) {
        const a = this.racers[i];
        const b = this.racers[j];
        const dx = b.pos.x - a.pos.x;
        const dz = b.pos.z - a.pos.z;
        const dSq = dx * dx + dz * dz;
        if (dSq < KART_COLLIDE_DIST * KART_COLLIDE_DIST && dSq > 0.001) {
          const d = Math.sqrt(dSq);
          const push = (KART_COLLIDE_DIST - d) / 2;
          const nx = dx / d;
          const nz = dz / d;
          a.pos.x -= nx * push; a.pos.z -= nz * push;
          b.pos.x += nx * push; b.pos.z += nz * push;
          if ((a.isPlayer || b.isPlayer) && push > 0.25) audio.sfxBump();
        }
      }
    }
  }

  updateRankAndLap() {
    // 順位: 走行距離の多い順
    const sorted = [...this.racers].sort((a, b) => {
      const af = a.finished ? -a.finishTime : -Infinity;
      const bf = b.finished ? -b.finishTime : -Infinity;
      if (a.finished || b.finished) {
        if (a.finished && b.finished) return af - bf === 0 ? 0 : (a.finishTime - b.finishTime);
        return a.finished ? -1 : 1;
      }
      return b.totalProgress - a.totalProgress;
    });
    const rank = sorted.indexOf(this.player);
    if (rank !== this.playerRank) {
      this.playerRank = rank;
      this.hud.setRank(rank);
    }
    // ラップ表示
    const lap = clamp(this.player.lap, 1, this.courseDef.laps);
    if (lap !== this.lastLapShown && !this.player.finished) {
      this.lastLapShown = lap;
      this.hud.setLap(lap, this.courseDef.laps);
      audio.sfxLap();
      if (lap === this.courseDef.laps) this.hud.showBanner('さいごの しゅう!', true);
      else this.hud.showBanner(`${lap} しゅうめ!`);
    }
  }

  onPlayerFinish() {
    this.state = 'finished';
    this.finishDelay = 3.4;
    this.hud.showBanner('ゴール!! 🏁', true);
    audio.sfxFanfare();
    audio.stopMusic();
    for (let i = 0; i < 8; i++) {
      setTimeout(() => {
        const p = this.player.pos.clone();
        p.x += (Math.random() - 0.5) * 30;
        p.y += 10 + Math.random() * 12;
        p.z += (Math.random() - 0.5) * 30;
        this.effects.firework(p);
      }, i * 320);
    }
  }

  updateCamera(dt) {
    const p = this.player;
    const isPortrait = this.engine.isPortrait;
    const back = isPortrait ? 11 : 12.5;
    const height = isPortrait ? 6.4 : 5.2;
    const forward = new THREE.Vector3(Math.sin(p.heading), 0, Math.cos(p.heading));
    const targetPos = p.group.position.clone()
      .addScaledVector(forward, -back)
      .add(new THREE.Vector3(0, height, 0));
    const lambda = 4.5;
    this.camPos.x = damp(this.camPos.x, targetPos.x, lambda, dt);
    this.camPos.y = damp(this.camPos.y, targetPos.y, lambda, dt);
    this.camPos.z = damp(this.camPos.z, targetPos.z, lambda, dt);
    // カメラが地面や道路より下に潜らないように
    const camLoc = this.track.locate(this.camPos.x, this.camPos.z, p.trackIndexHint);
    this.camPos.y = Math.max(this.camPos.y, camLoc.roadY + 2.5);
    this.camera.position.copy(this.camPos);

    const lookTarget = p.group.position.clone().addScaledVector(forward, 6).add(new THREE.Vector3(0, 1.6, 0));
    this.camLook.lerp(lookTarget, 1 - Math.exp(-6 * dt));
    this.camera.lookAt(this.camLook);

    // 太陽(影)をプレイヤー付近に追従
    this.sun.position.set(p.pos.x + 60, 110, p.pos.z + 40);
    this.sun.target.position.set(p.pos.x, 0, p.pos.z);
  }

  onResize() {
    this.camera.aspect = this.engine.aspect;
    this.camera.fov = this.engine.isPortrait ? 80 : 66;
    this.camera.updateProjectionMatrix();
  }

  exit() {
    clearUI();
    audio.stopEngine();
    audio.stopMusic();
  }
}
