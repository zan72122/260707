// パーティクル全部盛り — 軌跡・土煙・紙吹雪・星・キラキラ(プール式)
import * as THREE from 'three';

const POOL_SIZE = 420;
const GRAVITY = -9.5;
const RAINBOW = [0xff5f7e, 0xffa14f, 0xffe14f, 0x6fe86f, 0x58c8ff, 0xb98fff];

function makeCircleTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  const grad = g.createRadialGradient(32, 32, 2, 32, 32, 30);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.55, 'rgba(255,255,255,.85)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const tex = new THREE.CanvasTexture(c);
  return tex;
}

function makeStarTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d');
  g.translate(32, 34);
  g.fillStyle = '#fff';
  g.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? 28 : 12;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    g[i === 0 ? 'moveTo' : 'lineTo'](Math.cos(a) * r, Math.sin(a) * r);
  }
  g.closePath(); g.fill();
  return new THREE.CanvasTexture(c);
}

function makeRectTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 32;
  const g = c.getContext('2d');
  g.fillStyle = '#fff';
  g.fillRect(4, 8, 24, 16);
  return new THREE.CanvasTexture(c);
}

class ParticlePool {
  constructor(scene, texture, blending = THREE.NormalBlending) {
    this.geom = new THREE.BufferGeometry();
    this.pos = new Float32Array(POOL_SIZE * 3);
    this.col = new Float32Array(POOL_SIZE * 3);
    this.sizes = new Float32Array(POOL_SIZE);
    this.geom.setAttribute('position', new THREE.BufferAttribute(this.pos, 3));
    this.geom.setAttribute('color', new THREE.BufferAttribute(this.col, 3));
    this.geom.setAttribute('psize', new THREE.BufferAttribute(this.sizes, 1));
    this.mat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending,
      uniforms: { map: { value: texture } },
      vertexShader: `
        attribute float psize; attribute vec3 color; varying vec3 vColor;
        void main() {
          vColor = color;
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          gl_PointSize = psize * (240.0 / -mv.z);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: `
        uniform sampler2D map; varying vec3 vColor;
        void main() {
          vec4 t = texture2D(map, gl_PointCoord);
          if (t.a < 0.03) discard;
          gl_FragColor = vec4(vColor * t.rgb, t.a);
        }`,
    });
    this.points = new THREE.Points(this.geom, this.mat);
    this.points.frustumCulled = false;
    scene.add(this.points);
    this.items = [];
    for (let i = 0; i < POOL_SIZE; i++) {
      this.items.push({ life: 0, ttl: 1, vx: 0, vy: 0, vz: 0, x: 0, y: -999, z: 0,
        size: 1, drag: 0, grav: 0, r: 1, g: 1, b: 1, flutter: 0 });
      this.pos[i * 3 + 1] = -999;
    }
    this._cursor = 0;
  }

  spawn(opt) {
    const p = this.items[this._cursor];
    this._cursor = (this._cursor + 1) % POOL_SIZE;
    Object.assign(p, { life: 0, drag: 0, grav: 0, flutter: 0 }, opt);
    return p;
  }

  update(dt) {
    for (let i = 0; i < POOL_SIZE; i++) {
      const p = this.items[i];
      if (p.life >= p.ttl) { this.pos[i * 3 + 1] = -999; continue; }
      p.life += dt;
      const k = 1 - p.life / p.ttl;
      p.vy += p.grav * dt;
      if (p.drag) { const d = Math.max(0, 1 - p.drag * dt); p.vx *= d; p.vz *= d; }
      if (p.flutter) {
        p.vx += Math.sin(p.life * 9 + i) * p.flutter * dt;
        p.vz += Math.cos(p.life * 7 + i * 2) * p.flutter * dt;
      }
      p.x += p.vx * dt; p.y += p.vy * dt; p.z += p.vz * dt;
      if (p.y < 0.02 && p.grav) { p.y = 0.02; p.vy = 0; p.vx *= 0.9; p.vz *= 0.9; }
      this.pos[i * 3] = p.x; this.pos[i * 3 + 1] = p.y; this.pos[i * 3 + 2] = p.z;
      this.col[i * 3] = p.r; this.col[i * 3 + 1] = p.g; this.col[i * 3 + 2] = p.b;
      this.sizes[i] = p.size * (0.35 + 0.65 * k);
    }
    this.geom.attributes.position.needsUpdate = true;
    this.geom.attributes.color.needsUpdate = true;
    this.geom.attributes.psize.needsUpdate = true;
  }
}

export class ParticleFX {
  constructor(scene) {
    this.glow = new ParticlePool(scene, makeCircleTexture(), THREE.AdditiveBlending);
    this.stars = new ParticlePool(scene, makeStarTexture(), THREE.AdditiveBlending);
    this.confetti = new ParticlePool(scene, makeRectTexture());
    this._col = new THREE.Color();
  }

  _rgb(hex) { this._col.set(hex); return { r: this._col.r, g: this._col.g, b: this._col.b }; }

  update(dt) {
    this.glow.update(dt);
    this.stars.update(dt);
    this.confetti.update(dt);
  }

  // ボールの軌跡(毎フレーム呼ぶ)
  trail(pos, rainbow, tint = 0xfff59d) {
    const c = this._rgb(rainbow ? RAINBOW[(Math.random() * RAINBOW.length) | 0] : tint);
    this.glow.spawn({ x: pos.x, y: pos.y, z: pos.z, ttl: 0.5, size: rainbow ? 1.5 : 1.0,
      vx: (Math.random() - .5) * .4, vy: (Math.random() - .5) * .4, vz: (Math.random() - .5) * .4, ...c });
  }

  // 打球の衝撃(スイング時)
  burst(pos, hex = 0xffee88, n = 14, speed = 5) {
    const c = this._rgb(hex);
    for (let i = 0; i < n; i++) {
      const a = Math.random() * Math.PI * 2, e = Math.random() * Math.PI;
      this.glow.spawn({ x: pos.x, y: pos.y, z: pos.z, ttl: 0.4 + Math.random() * 0.3,
        size: 1.3, drag: 3,
        vx: Math.sin(e) * Math.cos(a) * speed, vy: Math.cos(e) * speed * 0.8,
        vz: Math.sin(e) * Math.sin(a) * speed, ...c });
    }
  }

  // 着地の土煙
  dust(pos) {
    for (let i = 0; i < 10; i++) {
      const a = (i / 10) * Math.PI * 2;
      const s = 0.75 + Math.random() * 0.85;
      this.glow.spawn({ x: pos.x, y: 0.1, z: pos.z, ttl: 0.55, size: 1.7, drag: 2,
        vx: Math.cos(a) * 2.2 * s, vy: 0.9 * s, vz: Math.sin(a) * 2.2 * s,
        r: 0.75, g: 0.9, b: 0.55 });
    }
  }

  // 星の飛び散り(ナイスショット・アイテム)
  starBurst(pos, n = 12) {
    for (let i = 0; i < n; i++) {
      const hex = RAINBOW[i % RAINBOW.length];
      const c = this._rgb(hex);
      const a = Math.random() * Math.PI * 2;
      this.stars.spawn({ x: pos.x, y: pos.y, z: pos.z, ttl: 0.8 + Math.random() * 0.4,
        size: 1.6 + Math.random(), grav: GRAVITY * 0.35, drag: 1,
        vx: Math.cos(a) * (2 + Math.random() * 3.6), vy: 3.2 + Math.random() * 3.2,
        vz: Math.sin(a) * (2 + Math.random() * 3.6), ...c });
    }
  }

  // 紙吹雪(勝利・ポイント演出)
  confettiRain(center, n = 46, spread = 8) {
    for (let i = 0; i < n; i++) {
      const hex = RAINBOW[i % RAINBOW.length];
      const c = this._rgb(hex);
      this.confetti.spawn({
        x: center.x + (Math.random() - .5) * spread,
        y: center.y + 5 + Math.random() * 4,
        z: center.z + (Math.random() - .5) * spread,
        ttl: 2.4 + Math.random() * 1.2, size: 1.3, grav: -1.5, flutter: 9,
        vx: (Math.random() - .5) * 2.2, vy: -0.4, vz: (Math.random() - .5) * 2.2, ...c });
    }
  }

  // キラキラの環(アイテム出現)
  sparkleRing(pos, hex = 0xfff176) {
    const c = this._rgb(hex);
    for (let i = 0; i < 16; i++) {
      const a = (i / 16) * Math.PI * 2;
      this.stars.spawn({ x: pos.x + Math.cos(a) * 0.7, y: pos.y, z: pos.z + Math.sin(a) * 0.7,
        ttl: 0.9, size: 1.2, vy: 2.4, vx: Math.cos(a), vz: Math.sin(a), ...c });
    }
  }
}
