// コイン・アイテムボックス・ダッシュ床・ふうせん
import * as THREE from '../../vendor/three.module.min.js';
import { makeRandom, TAU } from '../core/utils.js';

const COIN_RESPAWN = 4.5;
const BOX_RESPAWN = 3.0;
const PICKUP_RADIUS = 3.2;
const BALLOON_COLORS = [0xff5f7e, 0xffc94a, 0x5fd35f, 0x53b7ff, 0xc07eff];

function makeCoinMesh() {
  const geo = new THREE.CylinderGeometry(1.05, 1.05, 0.22, 18);
  const mat = new THREE.MeshStandardMaterial({
    color: 0xffd21f, roughness: 0.25, metalness: 0.55,
    emissive: 0xaa7700, emissiveIntensity: 0.35,
  });
  const coin = new THREE.Mesh(geo, mat);
  coin.rotation.x = Math.PI / 2;
  const wrap = new THREE.Group();
  wrap.add(coin);
  return wrap;
}

function makeItemBoxMesh() {
  const geo = new THREE.BoxGeometry(2.2, 2.2, 2.2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x66c7ff, roughness: 0.15, metalness: 0.2,
    transparent: true, opacity: 0.82,
    emissive: 0x2255ff, emissiveIntensity: 0.3,
  });
  const box = new THREE.Mesh(geo, mat);
  const inner = new THREE.Mesh(
    new THREE.SphereGeometry(0.7, 12, 10),
    new THREE.MeshBasicMaterial({ color: 0xfff066 }),
  );
  box.add(inner);
  const wrap = new THREE.Group();
  wrap.add(box);
  return wrap;
}

function makeBoostPadMesh(width) {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const g = canvas.getContext('2d');
  const grad = g.createLinearGradient(0, 128, 0, 0);
  grad.addColorStop(0, '#ff9d00');
  grad.addColorStop(1, '#ffe14a');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  g.fillStyle = '#fff';
  // 上向き矢印
  g.beginPath();
  g.moveTo(64, 14); g.lineTo(108, 66); g.lineTo(84, 66);
  g.lineTo(84, 112); g.lineTo(44, 112); g.lineTo(44, 66); g.lineTo(20, 66);
  g.closePath();
  g.fill();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(width, 6),
    new THREE.MeshBasicMaterial({ map: tex, transparent: true, opacity: 0.96 }),
  );
  mesh.rotation.x = -Math.PI / 2;
  return mesh;
}

function makeBalloonMesh(color) {
  const group = new THREE.Group();
  const b = new THREE.Mesh(
    new THREE.SphereGeometry(1.3, 12, 10),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3 }),
  );
  b.scale.y = 1.15;
  group.add(b);
  const knot = new THREE.Mesh(
    new THREE.ConeGeometry(0.25, 0.4, 6),
    new THREE.MeshStandardMaterial({ color }),
  );
  knot.position.y = -1.55;
  group.add(knot);
  return group;
}

export class ItemField {
  constructor(track, threeScene) {
    this.track = track;
    this.scene = threeScene;
    this.coins = [];
    this.boxes = [];
    this.pads = [];
    this.balloons = [];
    const random = makeRandom(4242);
    const L = track.totalLength;

    // コイン: 弧状に並べて8グループ
    for (let gi = 0; gi < 8; gi++) {
      const baseD = (gi + 0.5) / 8 * L;
      const lateralBase = (random() - 0.5) * track.roadHalfWidth * 0.9;
      for (let ci = 0; ci < 5; ci++) {
        const d = baseD + ci * 4;
        const s = track.sampleAt(d);
        const lateral = lateralBase + Math.sin(ci / 4 * Math.PI) * 3 * (random() < 0.5 ? 1 : -1);
        const mesh = makeCoinMesh();
        const p = s.position.clone().addScaledVector(s.left, lateral);
        mesh.position.set(p.x, p.y + 1.6, p.z);
        threeScene.add(mesh);
        this.coins.push({ mesh, active: true, timer: 0, phase: random() * TAU });
      }
    }

    // アイテムボックス: 3か所に横並び3個
    for (let gi = 0; gi < 3; gi++) {
      const d = (gi + 0.35) / 3 * L;
      const s = track.sampleAt(d);
      for (let bi = -1; bi <= 1; bi++) {
        const mesh = makeItemBoxMesh();
        const p = s.position.clone().addScaledVector(s.left, bi * track.roadHalfWidth * 0.5);
        mesh.position.set(p.x, p.y + 1.7, p.z);
        threeScene.add(mesh);
        this.boxes.push({ mesh, active: true, timer: 0, phase: random() * TAU });
      }
    }

    // ダッシュ床: 4か所
    for (let gi = 0; gi < 4; gi++) {
      const d = (gi + 0.7) / 4 * L;
      const s = track.sampleAt(d);
      const mesh = makeBoostPadMesh(track.roadHalfWidth * 1.1);
      mesh.position.copy(s.position);
      mesh.position.y += 0.12;
      mesh.rotation.z = Math.atan2(s.tangent.x, s.tangent.z) + Math.PI;
      threeScene.add(mesh);
      this.pads.push({ mesh, d, cooldowns: new Map() });
    }

    // ふうせん: コース脇に浮かぶ(触れるとパン!)
    for (let i = 0; i < 14; i++) {
      const d = random() * L;
      const s = track.sampleAt(d);
      const side = random() < 0.5 ? 1 : -1;
      const lateral = (track.roadHalfWidth * 0.55 + random() * 3) * side;
      const color = BALLOON_COLORS[i % BALLOON_COLORS.length];
      const mesh = makeBalloonMesh(color);
      const p = s.position.clone().addScaledVector(s.left, lateral);
      mesh.position.set(p.x, p.y + 2.2, p.z);
      threeScene.add(mesh);
      this.balloons.push({ mesh, active: true, timer: 0, phase: random() * TAU, baseY: mesh.position.y });
    }
  }

  update(dt, time) {
    for (const coin of this.coins) {
      if (!coin.active) {
        coin.timer -= dt;
        if (coin.timer <= 0) {
          coin.active = true;
          coin.mesh.visible = true;
        }
        continue;
      }
      coin.mesh.rotation.y = time * 3 + coin.phase;
      coin.mesh.position.y += Math.sin(time * 2.5 + coin.phase) * 0.004;
    }
    for (const box of this.boxes) {
      if (!box.active) {
        box.timer -= dt;
        if (box.timer <= 0) {
          box.active = true;
          box.mesh.visible = true;
        }
        continue;
      }
      box.mesh.rotation.y = time * 1.5 + box.phase;
      box.mesh.rotation.x = Math.sin(time * 0.9 + box.phase) * 0.3;
    }
    for (const balloon of this.balloons) {
      if (!balloon.active) {
        balloon.timer -= dt;
        if (balloon.timer <= 0) {
          balloon.active = true;
          balloon.mesh.visible = true;
          balloon.mesh.scale.setScalar(1);
        }
        continue;
      }
      balloon.mesh.position.y = balloon.baseY + Math.sin(time * 1.6 + balloon.phase) * 0.5;
    }
  }

  // racerに対する当たり判定。イベント名の配列を返す。
  collect(racer) {
    const events = [];
    const rp = racer.pos;

    for (const coin of this.coins) {
      if (!coin.active) continue;
      if (rp.distanceTo(coin.mesh.position) < PICKUP_RADIUS) {
        coin.active = false;
        coin.mesh.visible = false;
        coin.timer = COIN_RESPAWN;
        racer.coins++;
        events.push({ type: 'coin', position: coin.mesh.position.clone() });
      }
    }
    for (const box of this.boxes) {
      if (!box.active) continue;
      if (rp.distanceTo(box.mesh.position) < PICKUP_RADIUS + 0.4) {
        box.active = false;
        box.mesh.visible = false;
        box.timer = BOX_RESPAWN;
        events.push({ type: 'box', position: box.mesh.position.clone() });
      }
    }
    for (const balloon of this.balloons) {
      if (!balloon.active) continue;
      if (rp.distanceTo(balloon.mesh.position) < PICKUP_RADIUS + 0.6) {
        balloon.active = false;
        balloon.mesh.visible = false;
        balloon.timer = 8;
        events.push({ type: 'balloon', position: balloon.mesh.position.clone(), color: balloon.mesh.children[0].material.color.getHex() });
      }
    }
    for (const pad of this.pads) {
      const key = racer;
      const cd = pad.cooldowns.get(key) || 0;
      if (cd > 0) {
        pad.cooldowns.set(key, cd - 1 / 60);
        continue;
      }
      if (rp.distanceTo(pad.mesh.position) < 4.5) {
        pad.cooldowns.set(key, 2);
        events.push({ type: 'pad', position: pad.mesh.position.clone() });
      }
    }
    return events;
  }
}
