// パーティクルエフェクト(キラキラ・紙吹雪・ブースト炎・花火)
import * as THREE from '../../vendor/three.module.min.js';
import { TAU } from '../core/utils.js';

const MAX_PARTICLES = 600;
const GRAVITY = -18;

export class Effects {
  constructor(threeScene) {
    this.scene = threeScene;
    this.pool = [];
    this.active = [];
    const geo = new THREE.PlaneGeometry(0.55, 0.55);
    for (let i = 0; i < MAX_PARTICLES; i++) {
      const mat = new THREE.MeshBasicMaterial({
        color: 0xffffff, transparent: true, opacity: 1,
        depthWrite: false, side: THREE.DoubleSide,
      });
      const mesh = new THREE.Mesh(geo, mat);
      mesh.visible = false;
      threeScene.add(mesh);
      this.pool.push(mesh);
    }
  }

  spawn({ position, color = 0xffffff, count = 10, speed = 6, up = 5, life = 0.8, size = 1, gravity = 1, spread = 1 }) {
    for (let i = 0; i < count; i++) {
      const mesh = this.pool.pop();
      if (!mesh) return;
      mesh.visible = true;
      mesh.position.copy(position);
      mesh.material.color.setHex(color);
      mesh.material.opacity = 1;
      const s = size * (0.6 + Math.random() * 0.8);
      mesh.scale.setScalar(s);
      const a = Math.random() * TAU;
      const r = Math.random() * speed * spread;
      this.active.push({
        mesh,
        vx: Math.cos(a) * r,
        vy: up * (0.4 + Math.random() * 0.9),
        vz: Math.sin(a) * r,
        life: life * (0.7 + Math.random() * 0.6),
        maxLife: life,
        spin: (Math.random() - 0.5) * 10,
        gravity,
      });
    }
  }

  sparkle(position, baseColor = 0xffe14a) {
    this.spawn({ position, color: baseColor, count: 8, speed: 4, up: 6, life: 0.6, size: 0.8 });
  }

  coinBurst(position) {
    this.spawn({ position, color: 0xffd21f, count: 10, speed: 5, up: 7, life: 0.7 });
    this.spawn({ position, color: 0xffffff, count: 4, speed: 3, up: 5, life: 0.5, size: 0.6 });
  }

  boxBurst(position) {
    const colors = [0xff5f7e, 0xffe14a, 0x5fd35f, 0x53b7ff, 0xc07eff];
    for (const c of colors) this.spawn({ position, color: c, count: 5, speed: 6, up: 8, life: 0.9 });
  }

  balloonPop(position, color) {
    this.spawn({ position, color, count: 16, speed: 7, up: 4, life: 0.7, size: 0.9 });
  }

  boostFlame(position, heading) {
    const back = new THREE.Vector3(-Math.sin(heading), 0.4, -Math.cos(heading));
    const p = position.clone().addScaledVector(back, 1.8);
    p.y += 0.7;
    this.spawn({ position: p, color: 0xff9d00, count: 3, speed: 2, up: 2, life: 0.35, size: 1.1, gravity: 0.15 });
    this.spawn({ position: p, color: 0xffe14a, count: 2, speed: 1.5, up: 1.6, life: 0.3, size: 0.8, gravity: 0.15 });
  }

  starTrail(position) {
    const hue = Math.random();
    const color = new THREE.Color().setHSL(hue, 0.9, 0.65).getHex();
    const p = position.clone();
    p.y += 1 + Math.random() * 1.5;
    this.spawn({ position: p, color, count: 2, speed: 2, up: 2.5, life: 0.55, size: 0.9, gravity: 0.2 });
  }

  firework(position) {
    const hue = Math.random();
    const c1 = new THREE.Color().setHSL(hue, 0.95, 0.62).getHex();
    const c2 = new THREE.Color().setHSL((hue + 0.35) % 1, 0.95, 0.7).getHex();
    this.spawn({ position, color: c1, count: 26, speed: 12, up: 6, life: 1.4, size: 1.3, gravity: 0.5, spread: 1 });
    this.spawn({ position, color: c2, count: 18, speed: 8, up: 4, life: 1.2, size: 1, gravity: 0.5, spread: 1 });
  }

  confettiRain(center, radius) {
    const colors = [0xff5f7e, 0xffe14a, 0x5fd35f, 0x53b7ff, 0xc07eff, 0xffffff];
    for (let i = 0; i < 6; i++) {
      const p = center.clone();
      p.x += (Math.random() - 0.5) * radius * 2;
      p.z += (Math.random() - 0.5) * radius * 2;
      p.y += 12 + Math.random() * 6;
      this.spawn({
        position: p, color: colors[Math.floor(Math.random() * colors.length)],
        count: 2, speed: 1.5, up: -1, life: 2.2, size: 1, gravity: 0.16,
      });
    }
  }

  update(dt, camera) {
    for (let i = this.active.length - 1; i >= 0; i--) {
      const pt = this.active[i];
      pt.life -= dt;
      if (pt.life <= 0) {
        pt.mesh.visible = false;
        this.pool.push(pt.mesh);
        this.active.splice(i, 1);
        continue;
      }
      pt.vy += GRAVITY * pt.gravity * dt;
      pt.mesh.position.x += pt.vx * dt;
      pt.mesh.position.y += pt.vy * dt;
      pt.mesh.position.z += pt.vz * dt;
      pt.mesh.rotation.z += pt.spin * dt;
      pt.mesh.material.opacity = Math.min(1, pt.life / (pt.maxLife * 0.4));
      if (camera) pt.mesh.quaternion.copy(camera.quaternion);
    }
  }
}
