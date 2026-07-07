// テニスボール — 放物線飛行・バウンド・虹色進化・巨大化
import * as THREE from 'three';

const GRAVITY = 22;
const BALL_RADIUS = 0.30;
const RAINBOW_RALLY = 10; // ラリー10回でレインボーボール
const RAINBOW = [0xff5f7e, 0xffa14f, 0xffe14f, 0x6fe86f, 0x58c8ff, 0xb98fff];

export { BALL_RADIUS, RAINBOW_RALLY };

export class Ball {
  constructor(scene, fx) {
    this.fx = fx;
    this.mesh = new THREE.Mesh(
      new THREE.SphereGeometry(BALL_RADIUS, 18, 14),
      new THREE.MeshLambertMaterial({ color: 0xe8f94e, emissive: 0x333a00 }));
    this.mesh.castShadow = true;
    // ボールの白ライン
    const line = new THREE.Mesh(
      new THREE.TorusGeometry(BALL_RADIUS * 0.98, BALL_RADIUS * 0.09, 6, 20),
      new THREE.MeshBasicMaterial({ color: 0xffffff }));
    line.rotation.x = 0.9;
    this.mesh.add(line);
    scene.add(this.mesh);

    // 落下地点マーカー(タイミングの目印・文字なし)
    this.marker = new THREE.Mesh(
      new THREE.RingGeometry(0.34, 0.52, 24),
      new THREE.MeshBasicMaterial({ color: 0xff8fc8, transparent: true, opacity: 0.75, side: THREE.DoubleSide }));
    this.marker.rotation.x = -Math.PI / 2;
    this.marker.visible = false;
    scene.add(this.marker);

    this.shadowBlob = new THREE.Mesh(
      new THREE.CircleGeometry(BALL_RADIUS * 1.1, 16),
      new THREE.MeshBasicMaterial({ color: 0x1a4a1a, transparent: true, opacity: 0.3 }));
    this.shadowBlob.rotation.x = -Math.PI / 2;
    scene.add(this.shadowBlob);

    this.pos = new THREE.Vector3(3.6, BALL_RADIUS, 6.8);
    this.mesh.position.copy(this.pos);
    this.vel = new THREE.Vector3();
    this.active = false;
    this.bounces = 0;
    this.lastHitBy = null; // 'player' | 'cpu'
    this.rainbow = false;
    this.scale = 1;
    this._rbT = 0;
    this._spin = new THREE.Vector3(3, 5, 2);
    this.onBounce = null;
  }

  setRainbow(on) {
    this.rainbow = on;
    if (!on) {
      this.mesh.material.color.set(0xe8f94e);
      this.mesh.material.emissive.set(0x333a00);
    }
  }

  setGiant(on) {
    this.scale = on ? 2.1 : 1;
  }

  get radius() { return BALL_RADIUS * this.scale; }

  // from から to へ、時間 T で届く打球を発射
  launch(from, to, T, byWho) {
    this.pos.copy(from);
    this.vel.set((to.x - from.x) / T, (to.y - from.y + 0.5 * GRAVITY * T * T) / T, (to.z - from.z) / T);
    this.active = true;
    this.bounces = 0;
    this.lastHitBy = byWho;
    this._landing = to.clone();
    this.marker.position.set(to.x, 0.03, to.z);
  }

  stop() { this.active = false; this.marker.visible = false; }

  update(dt) {
    // 見た目の回転・虹アニメ
    this.mesh.rotation.x += this._spin.x * dt;
    this.mesh.rotation.y += this._spin.y * dt;
    const target = BALL_RADIUS * this.scale / BALL_RADIUS;
    this.mesh.scale.lerp(new THREE.Vector3(target, target, target), dt * 5);
    if (this.rainbow) {
      this._rbT += dt * 4;
      const c = new THREE.Color(RAINBOW[Math.floor(this._rbT) % RAINBOW.length]);
      this.mesh.material.color.lerp(c, dt * 8);
      this.mesh.material.emissive.copy(this.mesh.material.color).multiplyScalar(0.45);
    }

    if (!this.active) {
      this.mesh.position.copy(this.pos);
      this.shadowBlob.visible = false;
      return;
    }

    this.vel.y -= GRAVITY * dt;
    this.pos.addScaledVector(this.vel, dt);

    const r = this.radius;
    if (this.pos.y <= r && this.vel.y < 0) {
      this.pos.y = r;
      this.vel.y = -this.vel.y * 0.62;
      this.vel.x *= 0.8; this.vel.z *= 0.8;
      this.bounces++;
      if (this.fx) this.fx.dust(this.pos);
      if (this.onBounce) this.onBounce(this);
    }

    this.mesh.position.copy(this.pos);
    if (this.fx && (this.rainbow || Math.random() < 0.75))
      this.fx.trail(this.pos, this.rainbow);

    this.shadowBlob.visible = this.pos.y > r + 0.02;
    this.shadowBlob.position.set(this.pos.x, 0.02, this.pos.z);
    const sh = Math.max(0.4, 1.15 - this.pos.y * 0.08) * this.scale;
    this.shadowBlob.scale.setScalar(sh);

    // 落下マーカーの点滅
    if (this.marker.visible) {
      this.marker.material.opacity = 0.45 + Math.sin(performance.now() * 0.012) * 0.3;
      const s = 1 + Math.sin(performance.now() * 0.008) * 0.15;
      this.marker.scale.setScalar(s * this.scale);
    }
  }
}

// 打球目標のばらつきを作るヘルパー
export function scatter(x, z, amount) {
  return new THREE.Vector3(
    x + (Math.random() - 0.5) * amount,
    BALL_RADIUS,
    z + (Math.random() - 0.5) * amount * 0.6);
}
