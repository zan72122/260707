// まとあて — ぐるぐるまとをタップしてボールをぶつけよう
import * as THREE from 'three';
import { MiniGameBase } from './minigame_base.js';
import { sfx } from '../core/audio.js';

const TARGET_COUNT = 3;
const RESPAWN_SEC = 0.8;

function makeTarget() {
  const g = new THREE.Group();
  const rings = [
    [1.1, 0xff5f7e], [0.78, 0xffffff], [0.5, 0xff5f7e], [0.24, 0xffe14f],
  ];
  rings.forEach(([r, hex], i) => {
    const m = new THREE.Mesh(
      new THREE.CylinderGeometry(r, r, 0.1 + i * 0.02, 24),
      new THREE.MeshLambertMaterial({ color: hex }));
    m.rotation.x = Math.PI / 2;
    m.position.z = i * 0.03;
    m.castShadow = i === 0;
    g.add(m);
  });
  // 支柱
  const pole = new THREE.Mesh(
    new THREE.CylinderGeometry(0.08, 0.1, 1.2, 8),
    new THREE.MeshLambertMaterial({ color: 0xba8a56 }));
  pole.position.y = -1.15;
  g.add(pole);
  return g;
}

export class TargetGame extends MiniGameBase {
  constructor(ctx) {
    super(ctx, { icon: '🎯' });
    this.targets = [];
    for (let i = 0; i < TARGET_COUNT; i++) this._spawnTarget(i);
  }

  _spawnTarget(slot) {
    const g = makeTarget();
    const x = (slot - (TARGET_COUNT - 1) / 2) * 3.4 + (Math.random() - 0.5) * 0.8;
    const z = -6.5 - Math.random() * 3.5;
    g.position.set(x, 1.75, z);
    g.userData.slot = slot;
    g.userData.baseY = 1.75;
    g.userData.phase = Math.random() * Math.PI * 2;
    g.userData.alive = true;
    this.ctx.scene.add(g);
    this.targets.push(g);
    this.ctx.fx.sparkleRing(g.position, 0xff8fc8);
  }

  pickTarget(raycaster) {
    const alive = this.targets.filter((t) => t.userData.alive);
    const hits = raycaster.intersectObjects(alive, true);
    if (hits.length === 0) return null;
    let obj = hits[0].object;
    while (obj.parent && obj.userData.slot === undefined) obj = obj.parent;
    return obj.userData.alive ? obj : null;
  }

  targetAimPos(target) { return target.position.clone(); }

  onArrive(target) {
    if (!target || !target.userData.alive) return false;
    target.userData.alive = false;
    sfx.targetHit();
    // まとが吹き飛ぶ演出
    target.userData.dying = 0;
    const slot = target.userData.slot;
    setTimeout(() => {
      this.ctx.scene.remove(target);
      this.targets = this.targets.filter((t) => t !== target);
      if (this.state !== 'end') this._spawnTarget(slot);
    }, RESPAWN_SEC * 1000);
    return true;
  }

  updateTargets(dt, t) {
    for (const g of this.targets) {
      if (g.userData.alive) {
        g.position.y = g.userData.baseY + Math.sin(t * 1.8 + g.userData.phase) * 0.45;
        g.rotation.z = Math.sin(t * 1.2 + g.userData.phase) * 0.12;
      } else if (g.userData.dying !== undefined) {
        g.userData.dying += dt;
        g.position.y += dt * 6;
        g.rotation.z += dt * 12;
        g.scale.setScalar(Math.max(0.01, 1 - g.userData.dying * 1.6));
      }
    }
  }

  dispose() {
    for (const g of this.targets) this.ctx.scene.remove(g);
    this.targets = [];
    super.dispose();
  }
}
