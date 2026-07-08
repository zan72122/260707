// ゲーム本体(状態管理・物理更新・スコア・フィーバー)

import { clamp, rand, pick, lerp } from '../core/utils.js';
import {
  Ball, Flipper, GRAVITY, collideSegment, BALL_R,
} from '../core/physics.js';
import { audio } from '../core/audio.js';
import {
  buildWalls, buildCoinSpots, FLIPPER_CONF, GATE, LANE, TABLE_H,
  PEGS, SLINGS, BUMPERS, CHEST, ENEMY_PATH,
} from './table.js';
import { Bumper, Sling, Peg, Coin, Enemy } from './objects.js';
import { Chest, StarPickup } from './treasure.js';

const SUBSTEPS = 6;
const LAUNCH_MIN = 620;
const LAUNCH_MAX = 1520;
const MILESTONE = 500;
const FEVER_SECONDS = 14;

const CHEER_WORDS = ['やったね!', 'すごい!', 'ナイス!', 'いいね!', 'わーい!'];
const DRAIN_WORDS = ['どんまい!', 'つぎ いこう!', 'もういっかい!'];

export class Game {
  constructor(input, hud, particles) {
    this.input = input;
    this.hud = hud;
    this.particles = particles;

    this.walls = buildWalls();
    this.flipperL = new Flipper(FLIPPER_CONF.left);
    this.flipperR = new Flipper(FLIPPER_CONF.right);
    this.bumpers = BUMPERS.map((b) => new Bumper(b));
    this.slings = SLINGS.map((s) => new Sling(s));
    this.pegs = PEGS.map((p) => new Peg(p));
    this.coins = buildCoinSpots().map((c) => new Coin(c));
    this.enemies = [new Enemy(ENEMY_PATH, 0), new Enemy(ENEMY_PATH, 1)];
    this.chest = new Chest(CHEST);
    this.starPickups = [];

    this.reset();
  }

  reset() {
    this.score = 0;
    this.displayScore = 0;
    this.stars = 0;
    this.nextMilestone = MILESTONE;
    this.feverTime = 0;
    this.feverTotal = FEVER_SECONDS;
    this.charge = 0;
    this.charging = false;
    this.ballState = 'waiting'; // waiting | live | drained
    this.drainTimer = 0;
    this.wallSfxCd = 0;
    this.chargeSfxCd = 0;
    this.time = 0;
    this.ball = null;
    this.newBall();
  }

  newBall() {
    this.ball = new Ball(LANE.launchX, TABLE_H - 14 - BALL_R);
    this.ball.inLane = true;
    this.ballState = 'waiting';
    this.charge = 0;
    this.charging = false;
  }

  fever() {
    return this.feverTime > 0;
  }

  addScore(n, x, y, label = null) {
    const mult = this.fever() ? 2 : 1;
    const v = n * mult;
    this.score += v;
    if (x != null) {
      this.particles.pop(x, y, label || `+${v}`, {
        color: this.fever() ? '#ffde59' : '#ffffff',
        size: 30 + Math.min(18, v * 0.1),
      });
    }
    while (this.score >= this.nextMilestone) {
      this.nextMilestone += MILESTONE;
      this.hud.showBanner(pick(CHEER_WORDS), '#ffde59');
      this.particles.confetti(300, 380, 34);
      audio.milestone();
    }
  }

  // ===== 入力 =====
  onRelease() {
    if (this.ballState === 'waiting' && this.charging && this.charge > 0.04) {
      const power = LAUNCH_MIN + (LAUNCH_MAX - LAUNCH_MIN) * this.charge;
      this.ball.vy = -power;
      this.ball.vx = 0;
      this.ballState = 'live';
      this.charging = false;
      this.charge = 0;
      audio.launch();
      this.particles.spark(this.ball.x, this.ball.y + 20, 10, '#ffde59', 320);
      this.particles.ring(this.ball.x, this.ball.y, '#ffffff', 50);
    }
  }

  // ===== 更新 =====
  update(dt, time) {
    this.time = time;
    this.displayScore = lerp(this.displayScore, this.score, clamp(dt * 8, 0, 1));
    if (Math.abs(this.displayScore - this.score) < 1) this.displayScore = this.score;
    this.wallSfxCd = Math.max(0, this.wallSfxCd - dt);
    this.chargeSfxCd = Math.max(0, this.chargeSfxCd - dt);

    if (this.feverTime > 0) {
      this.feverTime -= dt;
      if (this.feverTime <= 0) {
        this.feverTime = 0;
        audio.setBgmBoost(false);
        this.hud.showBanner('たのしかったね!', '#ffffff', 1.4);
      }
    }

    // オブジェクトのアニメ更新
    for (const b of this.bumpers) b.update(dt);
    for (const s of this.slings) s.update(dt);
    for (const p of this.pegs) p.update(dt);
    for (const c of this.coins) c.update(dt);
    for (const e of this.enemies) e.update(dt);
    this.chest.update(dt);
    for (let i = this.starPickups.length - 1; i >= 0; i--) {
      const s = this.starPickups[i];
      s.update(dt);
      if (!s.alive) this.starPickups.splice(i, 1);
    }

    // フリッパー
    this.flipperL.update(dt, this.input.leftHeld);
    this.flipperR.update(dt, this.input.rightHeld);

    // チャージ(ボール待機中に押しっぱなし)
    if (this.ballState === 'waiting') {
      if (this.input.anyHeld) {
        this.charging = true;
        this.charge = clamp(this.charge + dt / 1.1, 0, 1);
        if (this.chargeSfxCd <= 0) {
          audio.charge(this.charge);
          this.chargeSfxCd = 0.09;
        }
      } else if (this.charging) {
        this.onRelease();
      }
    }

    // ドレイン後の復活待ち
    if (this.ballState === 'drained') {
      this.drainTimer -= dt;
      if (this.drainTimer <= 0) this.newBall();
      return;
    }

    // 物理
    if (this.ballState === 'live') {
      const h = dt / SUBSTEPS;
      for (let i = 0; i < SUBSTEPS; i++) this.step(h);
      // 残像
      this.ball.trail.push({ x: this.ball.x, y: this.ball.y });
      if (this.ball.trail.length > 10) this.ball.trail.shift();
      // 見た目の回転
      this.ball.angle += (this.ball.vx / this.ball.r) * dt * 0.55;
    }

    // ときどきキラキラ(フィーバー中は多め)
    if (this.fever() && Math.random() < 0.3) {
      this.particles.stars(rand(60, 540), rand(120, 800), 1, '#fff7c2');
    }
  }

  step(h) {
    const ball = this.ball;
    ball.vy += GRAVITY * h;
    ball.limit();
    ball.x += ball.vx * h;
    ball.y += ball.vy * h;

    // レーン内フラグの更新(プレイフィールドへ出たら解除)
    if (ball.inLane && (ball.x < LANE.x1 - ball.r || ball.y < GATE.ay - ball.r - 6)) {
      ball.inLane = false;
    }

    // 壁
    for (const w of this.walls) {
      const hit = collideSegment(ball, w.ax, w.ay, w.bx, w.by, w.rest);
      if (hit && hit.impact > 220 && this.wallSfxCd <= 0) {
        audio.wallHit(clamp(hit.impact / 900, 0, 1));
        this.wallSfxCd = 0.08;
        if (hit.impact > 500) {
          this.particles.spark(ball.x - hit.nx * ball.r, ball.y - hit.ny * ball.r, 4, '#ffffff', 180);
        }
      }
    }

    // ワンウェイゲート(レーンの屋根。場外から落ちてきたときだけ有効)
    if (!ball.inLane && ball.vy > 0) {
      collideSegment(ball, GATE.ax, GATE.ay, GATE.bx, GATE.by, 0.3);
    }

    // レーン底(待機ボール用)
    if (ball.inLane) {
      collideSegment(ball, LANE.x1, TABLE_H - 14, LANE.x2, TABLE_H - 14, 0.25);
      // レーン内で止まったら待機状態に戻す(弱すぎる発射)
      if (this.ballState === 'live' && ball.y > TABLE_H - 90 && Math.abs(ball.vy) < 40) {
        ball.x = LANE.launchX;
        ball.y = TABLE_H - 14 - BALL_R;
        ball.vx = 0;
        ball.vy = 0;
        this.ballState = 'waiting';
      }
    }

    // フリッパー
    for (const fl of [this.flipperL, this.flipperR]) {
      const hit = fl.collide(ball);
      if (hit && hit.flick) {
        audio.flipper();
        this.particles.spark(ball.x, ball.y + 10, 5, '#fff7c2', 220);
      }
    }

    this.collideObjects(ball);

    // ドレイン判定
    if (ball.y > TABLE_H + 40) this.onDrain();
  }

  collideObjects(ball) {
    // キノコバンパー
    for (const b of this.bumpers) {
      const wasIdle = b.hitT > 0.25;
      const hit = b.tryHit(ball);
      if (hit && wasIdle) {
        audio.bumper();
        this.addScore(5, b.x, b.y - b.r - 12);
        this.particles.stars(b.x, b.y - b.r * 0.4, 4, '#fff7c2');
        this.particles.ring(b.x, b.y, '#ffffff', b.r + 30);
      }
    }
    // スリングのお花
    for (const s of this.slings) {
      const wasIdle = s.hitT > 0.25;
      const hit = s.tryHit(ball);
      if (hit && wasIdle) {
        audio.sling();
        this.addScore(5, s.x, s.y - s.r - 10);
        this.particles.spark(s.x, s.y, 8, '#ff9ecf', 300);
      }
    }
    // ペグ
    for (const p of this.pegs) {
      const wasIdle = p.hitT > 0.25;
      const hit = p.tryHit(ball);
      if (hit && wasIdle && hit.impact > 120) {
        audio.pop();
        this.particles.spark(p.x, p.y, 3, '#ffffff', 150);
      }
    }
    // たからばこ
    {
      const wasIdle = this.chest.hitT > 0.3;
      const res = this.chest.tryHit(ball);
      if (res === 'hit' && wasIdle) {
        audio.chestHit();
        this.particles.spark(this.chest.x, this.chest.y - 20, 6, '#ffd94d', 240);
        this.particles.pop(this.chest.x, this.chest.y - this.chest.r - 16, `あと${this.chest.hp}かい!`, { color: '#ffffff', size: 26 });
      } else if (res === 'open') {
        audio.chestOpen();
        this.addScore(100, this.chest.x, this.chest.y - this.chest.r - 20);
        this.hud.showBanner('スターだ!', '#ffde59');
        this.particles.confetti(this.chest.x, this.chest.y - 30, 20);
        this.starPickups.push(new StarPickup(this.chest.x, this.chest.y - 50));
      }
    }
    // コイン
    for (const c of this.coins) {
      if (c.tryCollect(ball)) {
        audio.coin();
        this.addScore(10, c.x, c.y - 22);
        this.particles.spark(c.x, c.y, 6, '#ffd94d', 220);
      }
    }
    // プニ
    for (const e of this.enemies) {
      if (e.tryBop(ball)) {
        audio.enemyBop();
        this.addScore(50, e.x, e.y - e.r - 14);
        this.particles.stars(e.x, e.y, 7, '#ffb066');
        this.hud.showBanner('ぽよん!', '#ffb066', 1.0);
      }
    }
    // スター
    for (const s of this.starPickups) {
      if (s.tryCollect(ball)) {
        this.stars++;
        this.startFever();
      }
    }
  }

  startFever() {
    this.feverTime = FEVER_SECONDS;
    audio.feverStart();
    audio.setBgmBoost(true);
    this.hud.showBanner('☆ フィーバー!! ☆', '#ffde59', 2.2);
    this.particles.confetti(300, 400, 46);
    this.particles.ring(this.ball.x, this.ball.y, '#ffde59', 130);
  }

  onDrain() {
    if (this.ballState !== 'live') return;
    this.ballState = 'drained';
    this.drainTimer = 1.1;
    audio.drain();
    audio.cheer();
    this.hud.showBanner(pick(DRAIN_WORDS), '#9adcff', 1.2);
    this.particles.bubble(this.ball.x, TABLE_H - 40, 6);
  }
}
