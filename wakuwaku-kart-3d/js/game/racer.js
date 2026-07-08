// カートの走行ロジック(プレイヤー+AI)
import * as THREE from '../../vendor/three.module.min.js';
import { clamp, damp, dampAngle, angleDiff, TAU } from '../core/utils.js';
import { buildKart } from './kart.js';

const PLAYER_MAX_SPEED = 34;
const AI_BASE_SPEED = 27.5;
const ACCEL = 22;
const STEER_RATE = 1.9;
const ASSIST_CENTER_PULL = 0.5;   // 4歳向け: 道の中央へゆるく引き寄せる
const ASSIST_HEADING = 2.2;       // 4歳向け: 進行方向を道なりに補正
const OFFROAD_MARGIN = 1.4;
const BOOST_MULT = 1.55;
const BOOST_TIME = 1.6;
const STAR_TIME = 5.0;
const WALL_BOUNCE = 0.45;

export class Racer {
  constructor(track, character, isPlayer, slotIndex) {
    this.track = track;
    this.character = character;
    this.isPlayer = isPlayer;
    this.model = buildKart(character);
    this.group = this.model.group;

    // スタート位置: プレイヤーは先頭中央、AIは後方に左右2列
    // (中央レーンを空けて、カウントダウン中にカメラが遮られないようにする)
    let row, lateralRatio;
    if (slotIndex === 0) {
      row = 0;
      lateralRatio = 0;
    } else {
      row = Math.ceil(slotIndex / 2);
      lateralRatio = slotIndex % 2 === 1 ? 0.42 : -0.42;
    }
    const startDist = this.track.totalLength - 8 - row * 6.5;
    const s = track.sampleAt(startDist);
    this.pos = s.position.clone().addScaledVector(s.left, lateralRatio * track.roadHalfWidth);
    this.heading = Math.atan2(s.tangent.x, s.tangent.z);
    this.speed = 0;
    this.trackIndexHint = 0;
    // グリッドはスタートラインの手前にあるので、最初のライン通過で lap=1 になる
    this.lap = 0;
    this.prevDistance = startDist;
    this.finished = false;
    this.finishTime = 0;
    this.coins = 0;

    this.boostTimer = 0;
    this.starTimer = 0;
    this.visualTilt = 0;
    this.hopTimer = 0;
    this.airY = 0;
    this.airVel = 0;

    // AI用パラメータ(それぞれ個性を持たせる)
    this.aiTargetLateral = 0;
    this.aiWanderPhase = Math.random() * TAU;
    this.aiSkill = 0.9 + Math.random() * 0.2;

    const loc = track.locate(this.pos.x, this.pos.z, 0);
    this.trackIndexHint = loc.index;
    this.distance = loc.distance;
    this.lateral = loc.lateral;
    this.group.position.copy(this.pos);
    this.group.position.y = loc.roadY;
    this.group.rotation.y = this.heading;
  }

  get totalProgress() {
    return (this.lap - 1) * this.track.totalLength + this.distance;
  }

  get maxSpeed() {
    const base = this.isPlayer ? PLAYER_MAX_SPEED : AI_BASE_SPEED * this.aiSkill;
    let mult = 1;
    if (this.boostTimer > 0) mult *= BOOST_MULT;
    if (this.starTimer > 0) mult *= 1.18;
    return base * mult;
  }

  applyBoost() { this.boostTimer = BOOST_TIME; }
  applyStar() {
    this.starTimer = STAR_TIME;
    this.model.starGlow.visible = true;
  }

  update(dt, time, steerInput, raceRunning, playerProgress) {
    if (this.boostTimer > 0) this.boostTimer -= dt;
    if (this.starTimer > 0) {
      this.starTimer -= dt;
      if (this.starTimer <= 0) this.model.starGlow.visible = false;
      else {
        const hue = (time * 2) % 1;
        this.model.starGlow.material.color.setHSL(hue, 0.9, 0.72);
      }
    }

    let steer = steerInput;
    if (!this.isPlayer) steer = this.aiSteer(dt, time, playerProgress);

    // 加速(自動)
    const target = raceRunning ? this.maxSpeed : 0;
    if (this.speed < target) this.speed = Math.min(target, this.speed + ACCEL * dt);
    else this.speed = damp(this.speed, target, 2.2, dt);

    // オフロード減速(4歳向けにゆるく)
    const halfRoad = this.track.roadHalfWidth;
    const offroad = Math.abs(this.lateral) > halfRoad - OFFROAD_MARGIN;
    if (offroad && this.starTimer <= 0) this.speed = Math.min(this.speed, this.maxSpeed * 0.62);

    // ステアリング
    const speedFactor = clamp(this.speed / PLAYER_MAX_SPEED, 0, 1);
    this.heading -= steer * STEER_RATE * (0.45 + 0.55 * speedFactor) * dt;

    // 走行アシスト: 進行方向を道なりへ、位置を中央へ
    const loc = this.track.locate(this.pos.x, this.pos.z, this.trackIndexHint);
    this.trackIndexHint = loc.index;
    const roadHeading = Math.atan2(loc.tangent.x, loc.tangent.z);
    const assistStrength = this.isPlayer ? (1 - Math.abs(steer)) : 1;
    this.heading = dampAngle(this.heading, roadHeading, ASSIST_HEADING * assistStrength, dt);
    // 道から出そうな時だけ中央へ引く
    const edgeRatio = clamp((Math.abs(loc.lateral) - halfRoad * 0.55) / (halfRoad * 0.45), 0, 1);
    if (edgeRatio > 0) {
      const pull = ASSIST_CENTER_PULL * edgeRatio * assistStrength * this.speed * dt;
      this.pos.addScaledVector(loc.left, -Math.sign(loc.lateral) * pull);
    }

    // 前進
    const forward = new THREE.Vector3(Math.sin(this.heading), 0, Math.cos(this.heading));
    this.pos.addScaledVector(forward, this.speed * dt);

    // 壁(コース外周)で優しく跳ね返す
    const loc2 = this.track.locate(this.pos.x, this.pos.z, this.trackIndexHint);
    this.trackIndexHint = loc2.index;
    const wallLimit = halfRoad + 2.2;
    let bumped = false;
    if (Math.abs(loc2.lateral) > wallLimit) {
      const over = Math.abs(loc2.lateral) - wallLimit;
      this.pos.addScaledVector(loc2.left, -Math.sign(loc2.lateral) * (over + 0.05));
      this.speed *= (1 - WALL_BOUNCE * 0.5);
      const inward = angleDiff(this.heading, Math.atan2(loc2.tangent.x, loc2.tangent.z));
      this.heading += inward * 0.35;
      bumped = true;
    }
    this.lateral = loc2.lateral;

    // 周回判定
    const L = this.track.totalLength;
    if (this.prevDistance > L * 0.8 && loc2.distance < L * 0.2) this.lap++;
    else if (this.prevDistance < L * 0.2 && loc2.distance > L * 0.8) this.lap = Math.max(0, this.lap - 1);
    this.prevDistance = loc2.distance;
    this.distance = loc2.distance;

    // ジャンプ(ダッシュ床など)
    if (this.airVel !== 0 || this.airY > 0) {
      this.airVel -= 55 * dt;
      this.airY += this.airVel * dt;
      if (this.airY <= 0) {
        this.airY = 0;
        this.airVel = 0;
      }
    }

    this.updateVisual(dt, time, steer, loc2, bumped);
    return bumped;
  }

  aiSteer(dt, time, playerProgress) {
    // ラバーバンド: プレイヤーとの差でスピード調整(4歳向け: 勝ちやすく)
    if (playerProgress !== undefined) {
      const gap = this.totalProgress - playerProgress;
      if (gap > 30) this.aiSkill = damp(this.aiSkill, 0.62, 1.2, dt);
      else if (gap > 8) this.aiSkill = damp(this.aiSkill, 0.8, 1.2, dt);
      else if (gap < -70) this.aiSkill = damp(this.aiSkill, 1.18, 1.2, dt);
      else this.aiSkill = damp(this.aiSkill, 0.95, 0.8, dt);
    }
    // 先読みポイントへ向かう
    const ahead = this.track.sampleAt(this.distance + 14 + this.speed * 0.3);
    this.aiTargetLateral = Math.sin(time * 0.35 + this.aiWanderPhase) * this.track.roadHalfWidth * 0.4;
    const targetPos = ahead.position.clone().addScaledVector(ahead.left, this.aiTargetLateral);
    const desired = Math.atan2(targetPos.x - this.pos.x, targetPos.z - this.pos.z);
    const diff = angleDiff(this.heading, desired);
    return clamp(-diff * 2.2, -1, 1);
  }

  updateVisual(dt, time, steer, loc, bumped) {
    this.group.position.set(this.pos.x, loc.roadY + this.airY, this.pos.z);
    this.group.rotation.y = this.heading;

    // カーブで車体を傾ける
    this.visualTilt = damp(this.visualTilt, steer * 0.16, 8, dt);
    this.group.rotation.z = this.visualTilt;

    // タイヤ回転
    const spin = this.speed * dt / 0.48;
    for (const wheel of this.model.wheels) wheel.rotation.x += spin;

    // キャラクターの弾み
    const bounce = Math.sin(time * 10 + this.aiWanderPhase) * 0.035 * clamp(this.speed / 20, 0, 1);
    this.model.driverPivot.position.y = 1.05 + bounce + (bumped ? 0.1 : 0);
    this.model.head.rotation.z = damp(this.model.head.rotation.z, steer * 0.22, 6, dt);
  }
}
