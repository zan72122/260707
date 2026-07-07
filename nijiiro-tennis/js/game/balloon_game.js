// ふうせんわり — ふわふわ浮かぶふうせんをタップしてパン!
import * as THREE from 'three';
import { MiniGameBase } from './minigame_base.js';
import { sfx } from '../core/audio.js';

const BALLOON_COUNT = 4;
const COLORS = [0xff6fb0, 0xffe14f, 0x58c8ff, 0x6fe86f, 0xb98fff, 0xffa14f];
const RESPAWN_SEC = 0.7;

function makeBalloon(hex) {
  const g = new THREE.Group();
  const body = new THREE.Mesh(
    new THREE.SphereGeometry(0.85, 14, 12),
    new THREE.MeshLambertMaterial({ color: hex, emissive: new THREE.Color(hex).multiplyScalar(0.12) }));
  body.scale.y = 1.15;
  body.castShadow = true;
  g.add(body);
  const knot = new THREE.Mesh(
    new THREE.ConeGeometry(0.16, 0.25, 8),
    new THREE.MeshLambertMaterial({ color: hex }));
  knot.position.y = -1.05;
  knot.rotation.x = Math.PI;
  g.add(knot);
  const string = new THREE.Mesh(
    new THREE.CylinderGeometry(0.015, 0.015, 1.6, 4),
    new THREE.MeshBasicMaterial({ color: 0xffffff }));
  string.position.y = -1.95;
  g.add(string);
  // 光沢ハイライト
  const hi = new THREE.Mesh(
    new THREE.SphereGeometry(0.22, 8, 6),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7 }));
  hi.position.set(-0.3, 0.35, 0.6);
  g.add(hi);
  return g;
}

export class BalloonGame extends MiniGameBase {
  constructor(ctx) {
    super(ctx, { icon: '🎈' });
    this.balloons = [];
    for (let i = 0; i < BALLOON_COUNT; i++) this._spawnBalloon(i);
  }

  _spawnBalloon(slot) {
    const hex = COLORS[(Math.random() * COLORS.length) | 0];
    const g = makeBalloon(hex);
    const x = (slot - (BALLOON_COUNT - 1) / 2) * 2.9 + (Math.random() - 0.5) * 1;
    const z = -5.5 - Math.random() * 4;
    const y = 2.4 + Math.random() * 1.6;
    g.position.set(x, y, z);
    g.userData = { slot, baseX: x, baseY: y, phase: Math.random() * Math.PI * 2,
      speed: 0.7 + Math.random() * 0.8, alive: true, hex };
    this.ctx.scene.add(g);
    this.balloons.push(g);
    this.ctx.fx.sparkleRing(g.position, hex);
  }

  pickTarget(raycaster) {
    const alive = this.balloons.filter((b) => b.userData.alive);
    const hits = raycaster.intersectObjects(alive, true);
    if (hits.length === 0) return null;
    let obj = hits[0].object;
    while (obj.parent && obj.userData.slot === undefined) obj = obj.parent;
    return obj.userData.alive ? obj : null;
  }

  // 飛行中もふわふわ動くので、到着時の実位置に照準
  targetAimPos(target) {
    const p = target.position.clone();
    p.x = target.userData.baseX + Math.sin((performance.now() / 1000 + 0.85) * target.userData.speed + target.userData.phase) * 1.1;
    return p;
  }

  onArrive(target, pos) {
    // ふうせんは「近く」に当たれば OK(おおらか判定)
    let hit = target && target.userData.alive ? target : null;
    if (!hit) {
      for (const b of this.balloons) {
        if (b.userData.alive && b.position.distanceTo(pos) < 1.6) { hit = b; break; }
      }
    }
    if (!hit) return false;
    hit.userData.alive = false;
    sfx.pop();
    this.ctx.fx.burst(hit.position, hit.userData.hex, 24, 7);
    const slot = hit.userData.slot;
    this.ctx.scene.remove(hit);
    this.balloons = this.balloons.filter((b) => b !== hit);
    setTimeout(() => { if (this.state !== 'end') this._spawnBalloon(slot); }, RESPAWN_SEC * 1000);
    return true;
  }

  updateTargets(dt, t) {
    for (const b of this.balloons) {
      const u = b.userData;
      b.position.x = u.baseX + Math.sin(t * u.speed + u.phase) * 1.1;
      b.position.y = u.baseY + Math.sin(t * u.speed * 1.4 + u.phase * 2) * 0.5;
      b.rotation.z = Math.sin(t * u.speed + u.phase) * 0.12;
    }
  }

  dispose() {
    for (const b of this.balloons) this.ctx.scene.remove(b);
    this.balloons = [];
    super.dispose();
  }
}
