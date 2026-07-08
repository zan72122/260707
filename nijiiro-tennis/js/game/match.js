// ラリーたいせん — 2つの操作モード・ゆる勝敗・約1分ゲーム・アイテム・虹ボール
import * as THREE from 'three';
import { COURT } from '../world/court.js';
import { scatter, RAINBOW_RALLY } from './ball.js';
import { sfx, voice } from '../core/audio.js';
import { music } from '../core/music.js';
import * as hud from '../screens/hud.js';
import { StarItem } from './items.js';

const WIN_STARS = 3;          // 3ポイント先取(約1分)
const PLAYER_REACH = 2.6;     // 当たり判定はおおらかに
const NICE_QUALITY = 0.55;
const PLAYER_SPEED = 8.5;
const CPU_SPEED = 5.2;
const CPU_MISS_BASE = 0.30;   // CPUはよくミスしてくれる
const CPU_MISS_PER_RALLY = 0.05;
const CPU_MISS_MAX = 0.62;
const NICE_MISS_BONUS = 0.3;  // ナイスショットは決まりやすい
const ITEM_INTERVAL_SEC = 7;

export class Match {
  constructor(ctx, { controlMode }) {
    this.ctx = ctx; // { scene, engine, input, fx, ball, crowd, buildChar, playerDef, cpuDef, onExit }
    this.mode = controlMode; // 'timing' | 'move'
    const { scene, buildChar, playerDef, cpuDef } = ctx;

    this.player = buildChar(playerDef, { facing: -1 });
    this.player.group.position.set(0, 0, COURT.playerZ);
    scene.add(this.player.group);
    this.playerPos = new THREE.Vector2(0, COURT.playerZ);
    this.playerTarget = this.playerPos.clone();

    this.cpu = buildChar(cpuDef, { facing: 1 });
    this.cpu.group.position.set(0, 0, COURT.cpuZ);
    scene.add(this.cpu.group);
    this.cpuPos = new THREE.Vector2(0, COURT.cpuZ);
    this.cpuTarget = this.cpuPos.clone();

    this.ball = ctx.ball;
    this.ball.onBounce = (b) => this._onBounce(b);

    this.scoreP = 0; this.scoreC = 0;
    this.rally = 0;
    this.state = 'serve'; // serve | rally | point | end
    this.stateT = 0;
    this.server = 'player';
    this.cpuWillMiss = false;
    this.lastShotNice = false;
    this.fever = 0;
    this.giant = 0;
    this.itemTimer = ITEM_INTERVAL_SEC * 0.6;
    this.item = new StarItem(ctx.scene, ctx.fx);
    this.shake = 0;
    this.finished = false;

    this.scoreUI = hud.scoreBar(playerDef.emoji, cpuDef.emoji, WIN_STARS);
    this.rallyUI = hud.rallyBadge();
    this.homeBtn = hud.homeButton(() => this._exit());
    this.scoreUI.set(0, 0);
    hud.tapHint(true);

    this._offTap = ctx.input.onTap((tap) => this._onTap(tap));
    music.start('main');
    this._resetServe('player');
  }

  // ---------- 入力 ----------
  _onTap(tap) {
    if (this.state === 'end') return;
    // 星アイテムはどちらのモードでも直接タップで取れる
    if (this.item.active && tap.raycaster) {
      const hit = tap.raycaster.intersectObject(this.item.group, true);
      if (hit.length > 0) { this._collectItem(); return; }
    }
    hud.tapHint(false);

    if (this.state === 'serve' && this.server === 'player') { this._playerServe(); return; }
    if (this.state !== 'rally') return;

    if (this.mode === 'move') {
      if (tap.ground) {
        this.playerTarget.set(
          THREE.MathUtils.clamp(tap.ground.x, -COURT.halfW - 1.2, COURT.halfW + 1.2),
          THREE.MathUtils.clamp(tap.ground.z, 2.2, COURT.halfL + 2.5));
        sfx.tap();
      }
      return;
    }
    // タイミングモード:タップ=スイング
    this._trySwing();
  }

  _trySwing() {
    this.player.swing();
    const q = this._hitQuality();
    if (q <= 0) { sfx.swishMiss(); return; }
    this._playerHit(q);
  }

  _hitQuality() {
    const b = this.ball;
    if (!b.active || b.lastHitBy === 'player' || b.pos.z < 1.2) return 0;
    const reach = PLAYER_REACH + b.radius + (this.giant > 0 ? 0.5 : 0);
    const d = Math.hypot(b.pos.x - this.playerPos.x, b.pos.z - this.playerPos.y);
    if (d > reach || b.pos.y > 3.4) return 0;
    return 1 - d / reach; // 近いほど高品質
  }

  // ---------- サーブ ----------
  _resetServe(server) {
    this.state = 'serve';
    this.stateT = 0;
    this.server = server;
    this.rally = 0;
    this.rallyUI.set(0, false);
    if (this.fever <= 0) this.ball.setRainbow(false);
    this.ball.stop();
    const z = server === 'player' ? COURT.playerZ - 0.8 : COURT.cpuZ + 0.8;
    this.ball.pos.set(server === 'player' ? this.playerPos.x : this.cpuPos.x, 1.1, z);
    this.ball.mesh.position.copy(this.ball.pos);
  }

  _playerServe() {
    this.player.swing();
    sfx.hit(0, false);
    this._shoot('player', 0.7);
  }

  // ---------- ショット ----------
  _shoot(who, quality) {
    const b = this.ball;
    const nice = who === 'player' && quality > NICE_QUALITY;
    if (who === 'player') {
      const depth = nice ? -COURT.halfL + 1.6 : -COURT.halfL + 3.4;
      const target = scatter((Math.random() - 0.5) * (COURT.halfW * 2 - 2.4), depth, 2.2);
      const T = nice ? 0.85 : 1.25;
      const from = new THREE.Vector3(this.playerPos.x, Math.max(0.9, b.pos.y), this.playerPos.y - 0.5);
      b.launch(from, target, T, 'player');
      b.marker.visible = false;
      this.cpuWillMiss = Math.random() <
        Math.min(CPU_MISS_MAX, CPU_MISS_BASE + this.rally * CPU_MISS_PER_RALLY + (nice ? NICE_MISS_BONUS : 0));
      this.lastShotNice = nice;
      this.cpuTarget.set(target.x + (this.cpuWillMiss ? (Math.random() > 0.5 ? 3.2 : -3.2) : 0), target.z + 1.2);
      this.rally++;
      sfx.hit(this.rally, nice);
      this.ctx.fx.burst(b.pos, nice ? 0xfff176 : 0xffee88, nice ? 22 : 12, nice ? 7 : 5);
      if (nice) {
        this.ctx.fx.starBurst(b.pos, 12);
        hud.bigEmote('🌟');
        voice.nice();
        this.shake = 0.35;
        this.ctx.crowd.setExcitement(0.7);
      }
    } else {
      // CPUのリターン:プレイヤーの近くへ、ゆっくりやさしく
      const aimNearPlayer = this.mode === 'timing' ? 1.6 : 3.4;
      const tx = THREE.MathUtils.clamp(
        this.playerPos.x + (Math.random() - 0.5) * 2 * aimNearPlayer,
        -COURT.halfW + 0.8, COURT.halfW - 0.8);
      const tz = COURT.playerZ - 2.6 + Math.random() * 1.8;
      const target = scatter(tx, tz, 0.8);
      const from = new THREE.Vector3(this.cpuPos.x, 1.1, this.cpuPos.y + 0.5);
      b.launch(from, target, 1.5, 'cpu');
      b.marker.visible = true;
      this.rally++;
      sfx.hit(this.rally, false);
      this.ctx.fx.burst(b.pos, 0xa8d8ff, 10, 4);
    }
    this.rallyUI.set(this.rally, this.rally >= RAINBOW_RALLY);
    if (this.rally === RAINBOW_RALLY && !this.ball.rainbow) {
      this.ball.setRainbow(true);
      sfx.rainbow();
      hud.bigEmote('🌈');
      voice.cheer();
      this.ctx.crowd.setExcitement(1);
      this.ctx.fx.confettiRain(new THREE.Vector3(0, 2, 0), 40, 14);
    }
    this.state = 'rally';
  }

  _playerHit(quality) {
    this._shoot('player', quality);
  }

  // ---------- バウンド・ポイント判定 ----------
  _onBounce(b) {
    sfx.bounce();
    if (this.state !== 'rally') return;
    if (b.bounces >= 2) {
      if (b.pos.z > 0.5) this._point('cpu');
      else if (b.pos.z < -0.5) this._point('player');
      else this._point(b.lastHitBy === 'player' ? 'player' : 'cpu');
    }
  }

  _point(winner) {
    if (this.state !== 'rally') return;
    this.state = 'point';
    this.stateT = 0;
    this.ball.marker.visible = false;
    if (winner === 'player') {
      this.scoreP++;
      hud.bigEmote('😊⭐');
      sfx.pointWin();
      voice.yay();
      this.player.celebrate();
      this.ctx.crowd.setExcitement(1);
      this.ctx.fx.confettiRain(new THREE.Vector3(this.playerPos.x, 1, this.playerPos.y - 4), 40, 9);
      this.ctx.fx.starBurst(new THREE.Vector3(this.playerPos.x, 1.6, this.playerPos.y), 10);
    } else {
      this.scoreC++;
      hud.bigEmote('💪😊'); // おしい!もういっかい!
      sfx.pointLose();
      voice.ooh();
      this.cpu.celebrate();
    }
    this.scoreUI.set(this.scoreP, this.scoreC);
  }

  _endMatch() {
    this.state = 'end';
    this.finished = true;
    music.setFever(false);
    music.start('calm');
    const won = this.scoreP > this.scoreC;
    hud.tapHint(false);
    if (won) {
      sfx.fanfare();
      voice.cheer();
      this.player.celebrate();
      this.ctx.crowd.setExcitement(1);
      const stars = this.scoreC === 0 ? 3 : this.scoreC === 1 ? 3 : 2;
      for (let i = 0; i < 3; i++)
        setTimeout(() => this.ctx.fx.confettiRain(new THREE.Vector3(0, 3, 4), 46, 16), i * 500);
      hud.resultScreen(stars, '🏆', () => this._replay(), () => this._exit());
    } else {
      sfx.pointLose();
      setTimeout(() => voice.yay(), 500);
      hud.resultScreen(1, '💪😊', () => this._replay(), () => this._exit());
    }
  }

  _replay() {
    sfx.uiSelect();
    this.ctx.onReplay();
  }

  _exit() {
    sfx.uiSelect();
    this.ctx.onExit();
  }

  // ---------- アイテム ----------
  _collectItem() {
    this.item.collect();
    sfx.starGet();
    voice.yay();
    const effect = Math.random() < 0.5 ? 'giant' : 'fever';
    if (effect === 'giant') {
      this.giant = 10;
      this.ball.setGiant(true);
      hud.bigEmote('🎾✨');
    } else {
      this.fever = 8;
      this.ball.setRainbow(true);
      music.setFever(true);
      hud.bigEmote('🌈🎉');
      this.ctx.crowd.setExcitement(1);
      this.ctx.fx.confettiRain(new THREE.Vector3(0, 2, 2), 36, 12);
    }
  }

  // ---------- 毎フレーム ----------
  update(dt, t) {
    const { fx, crowd } = this.ctx;
    this.stateT += dt;
    this.shake = Math.max(0, this.shake - dt * 1.4);

    // アイテムの出現・接触取得
    if (this.state === 'rally' || this.state === 'serve') {
      this.itemTimer -= dt;
      if (this.itemTimer <= 0 && !this.item.active) {
        this.item.spawn((Math.random() - 0.5) * 7, 3.4 + Math.random() * 4.4);
        this.itemTimer = ITEM_INTERVAL_SEC;
      }
    }
    this.item.update(dt, t);
    if (this.item.active &&
        Math.hypot(this.item.pos.x - this.playerPos.x, this.item.pos.z - this.playerPos.y) < 1.5)
      this._collectItem();

    // 効果時間の管理
    if (this.giant > 0) { this.giant -= dt; if (this.giant <= 0) this.ball.setGiant(false); }
    if (this.fever > 0) {
      this.fever -= dt;
      if (this.fever <= 0) {
        music.setFever(false);
        if (this.rally < RAINBOW_RALLY) this.ball.setRainbow(false);
      }
    }

    // プレイヤー移動
    if (this.mode === 'timing' && this.ball.active && this.ball.lastHitBy === 'cpu') {
      // 自動追尾:落下点へ
      const lz = THREE.MathUtils.clamp(this.ball.marker.position.z, 3, COURT.halfL + 1.5);
      this.playerTarget.set(
        THREE.MathUtils.clamp(this.ball.marker.position.x, -COURT.halfW - 1, COURT.halfW + 1), lz);
    }
    this._moveEntity(this.playerPos, this.playerTarget, PLAYER_SPEED, dt, this.player);
    this.player.group.position.x = this.playerPos.x;
    this.player.group.position.z = this.playerPos.y;

    // 移動モード:近くに来たら自動スイング
    if (this.mode === 'move' && this.state === 'rally') {
      const q = this._hitQuality();
      if (q > 0 && this.ball.vel.z > -2) { this.player.swing(); this._playerHit(Math.max(q, 0.4)); }
    }

    // CPU移動と返球
    if (this.ball.active && this.ball.lastHitBy === 'player') {
      if (!this.cpuWillMiss) this.cpuTarget.set(this.ball._landing.x, Math.min(this.ball._landing.z - 0.6, -2.5));
      const reach = 2.1 + this.ball.radius;
      const d = Math.hypot(this.ball.pos.x - this.cpuPos.x, this.ball.pos.z - this.cpuPos.y);
      if (this.state === 'rally' && d < reach && this.ball.pos.z < -1.5 && !this.cpuWillMiss) {
        this.cpu.swing();
        this._shoot('cpu', 0.5);
      } else if (this.cpuWillMiss && d < reach + 1.4 && this.ball.pos.z < -3 && Math.random() < 0.1) {
        this.cpu.swing(); // 空振りのおとぼけ
      }
    }
    this._moveEntity(this.cpuPos, this.cpuTarget, CPU_SPEED, dt, this.cpu);
    this.cpu.group.position.x = this.cpuPos.x;
    this.cpu.group.position.z = this.cpuPos.y;

    // 状態遷移
    if (this.state === 'serve') {
      if (this.server === 'cpu' && this.stateT > 1.4) {
        this.cpu.swing();
        this._shoot('cpu', 0.5);
      }
      if (this.server === 'player') {
        this.ball.pos.x = this.playerPos.x;
        this.ball.pos.z = this.playerPos.y - 0.8;
        this.ball.pos.y = 1.1 + Math.sin(t * 4) * 0.12;
        this.ball.mesh.position.copy(this.ball.pos);
        if (this.stateT > 1.2) hud.tapHint(true);
      }
    } else if (this.state === 'rally') {
      // 見のがし(コート外へ出た)判定
      const b = this.ball;
      if (b.pos.z > COURT.playerZ + 4.5) this._point('cpu');
      else if (b.pos.z < COURT.cpuZ - 5) this._point('player');
    } else if (this.state === 'point' && this.stateT > 1.6) {
      if (this.scoreP >= WIN_STARS || this.scoreC >= WIN_STARS) this._endMatch();
      else this._resetServe(this.scoreP + this.scoreC > 0 &&
        (this.scoreP + this.scoreC) % 2 === 1 ? 'cpu' : 'player');
    }

    this.player.update(dt);
    this.cpu.update(dt);
    crowd.update(dt, t);
    fx.update(dt);
    this.ball.update(dt);
  }

  _moveEntity(pos, target, speed, dt, char) {
    const dx = target.x - pos.x, dz = target.y - pos.y;
    const d = Math.hypot(dx, dz);
    if (d > 0.08) {
      const step = Math.min(d, speed * dt);
      pos.x += (dx / d) * step;
      pos.y += (dz / d) * step;
      char.setMoving(Math.min(1, d));
    } else char.setMoving(0);
  }

  dispose() {
    this._offTap();
    this.scoreUI.remove();
    this.rallyUI.remove();
    this.homeBtn.remove();
    hud.tapHint(false);
    hud.clearOverlay();
    this.item.dispose();
    this.ball.setRainbow(false);
    this.ball.setGiant(false);
    this.ball.stop();
    this.ball.onBounce = null;
    music.setFever(false);
    this.ctx.scene.remove(this.player.group);
    this.ctx.scene.remove(this.cpu.group);
  }
}
