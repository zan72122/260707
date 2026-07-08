// 空・地面・木・雲などの景観(テーマ別)
import * as THREE from '../../vendor/three.module.min.js';
import { makeRandom, TAU } from '../core/utils.js';

const RAINBOW_COLORS = [0xff5f5f, 0xffa04a, 0xffe14a, 0x5fd35f, 0x4aa8ff, 0x9a6bff];

function gradientSky(topHex, bottomHex) {
  const geo = new THREE.SphereGeometry(900, 24, 16);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    uniforms: {
      topColor: { value: new THREE.Color(topHex) },
      bottomColor: { value: new THREE.Color(bottomHex) },
    },
    vertexShader: `
      varying vec3 vPos;
      void main() {
        vPos = position;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }`,
    fragmentShader: `
      uniform vec3 topColor;
      uniform vec3 bottomColor;
      varying vec3 vPos;
      void main() {
        float h = clamp(vPos.y / 500.0, 0.0, 1.0);
        gl_FragColor = vec4(mix(bottomColor, topColor, pow(h, 0.7)), 1.0);
      }`,
  });
  return new THREE.Mesh(geo, mat);
}

function makeCloud(random) {
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1, flatShading: false });
  const count = 3 + Math.floor(random() * 3);
  for (let i = 0; i < count; i++) {
    const r = 5 + random() * 6;
    const puff = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
    puff.position.set((i - count / 2) * 7, random() * 3, random() * 4 - 2);
    puff.scale.y = 0.65;
    group.add(puff);
  }
  return group;
}

function makeTree(random) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.7, 1, 4, 7),
    new THREE.MeshStandardMaterial({ color: 0x8a5a33, roughness: 0.9 }),
  );
  trunk.position.y = 2;
  trunk.castShadow = true;
  group.add(trunk);
  const leafColor = random() < 0.5 ? 0x3fae4f : 0x59c445;
  const leafMat = new THREE.MeshStandardMaterial({ color: leafColor, roughness: 0.85 });
  const layers = 2 + Math.floor(random() * 2);
  for (let i = 0; i < layers; i++) {
    const r = 3.4 - i * 0.9;
    const cone = new THREE.Mesh(new THREE.ConeGeometry(r, 3.2, 8), leafMat);
    cone.position.y = 4.4 + i * 2.1;
    cone.castShadow = true;
    group.add(cone);
  }
  return group;
}

function makePalm(random) {
  const group = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.5, 0.85, 9, 7),
    new THREE.MeshStandardMaterial({ color: 0xb08050, roughness: 0.9 }),
  );
  trunk.position.y = 4.5;
  trunk.rotation.z = (random() - 0.5) * 0.3;
  trunk.castShadow = true;
  group.add(trunk);
  const leafMat = new THREE.MeshStandardMaterial({ color: 0x3fc45f, roughness: 0.85, side: THREE.DoubleSide });
  for (let i = 0; i < 6; i++) {
    const leaf = new THREE.Mesh(new THREE.ConeGeometry(1.2, 6.5, 4), leafMat);
    const a = (i / 6) * TAU;
    leaf.position.set(Math.cos(a) * 2.4, 9, Math.sin(a) * 2.4);
    leaf.rotation.set(Math.sin(a) * 1.15, 0, -Math.cos(a) * 1.15);
    leaf.castShadow = true;
    group.add(leaf);
  }
  return group;
}

function makeCandy(random) {
  const group = new THREE.Group();
  const kind = random();
  if (kind < 0.4) {
    // ぺろぺろキャンディ
    const stick = new THREE.Mesh(
      new THREE.CylinderGeometry(0.35, 0.35, 7, 6),
      new THREE.MeshStandardMaterial({ color: 0xffffff }),
    );
    stick.position.y = 3.5;
    group.add(stick);
    const colors = [0xff5f9e, 0x4aa8ff, 0xffe14a, 0x5fd35f];
    const candy = new THREE.Mesh(
      new THREE.TorusGeometry(2.2, 1.0, 10, 20),
      new THREE.MeshStandardMaterial({ color: colors[Math.floor(random() * colors.length)], roughness: 0.35 }),
    );
    candy.position.y = 8.5;
    candy.castShadow = true;
    group.add(candy);
  } else if (kind < 0.7) {
    // キャンディケイン風の柱
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.9, 0.9, 8, 8),
      new THREE.MeshStandardMaterial({ color: 0xff6b6b, roughness: 0.4 }),
    );
    pole.position.y = 4;
    pole.castShadow = true;
    group.add(pole);
    const top = new THREE.Mesh(
      new THREE.SphereGeometry(1.8, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.3 }),
    );
    top.position.y = 9;
    top.castShadow = true;
    group.add(top);
  } else {
    // カップケーキ
    const base = new THREE.Mesh(
      new THREE.CylinderGeometry(2.4, 1.7, 3, 12),
      new THREE.MeshStandardMaterial({ color: 0xc98a4b, roughness: 0.7 }),
    );
    base.position.y = 1.5;
    base.castShadow = true;
    group.add(base);
    const cream = new THREE.Mesh(
      new THREE.SphereGeometry(2.3, 12, 10),
      new THREE.MeshStandardMaterial({ color: 0xfff0f5, roughness: 0.5 }),
    );
    cream.position.y = 4;
    cream.scale.y = 0.8;
    cream.castShadow = true;
    group.add(cream);
    const cherry = new THREE.Mesh(
      new THREE.SphereGeometry(0.7, 10, 8),
      new THREE.MeshStandardMaterial({ color: 0xff3355, roughness: 0.3 }),
    );
    cherry.position.y = 6;
    group.add(cherry);
  }
  return group;
}

function makeRainbowArch(radius, tube) {
  const group = new THREE.Group();
  RAINBOW_COLORS.forEach((color, i) => {
    const r = radius - i * tube * 1.9;
    const geo = new THREE.TorusGeometry(r, tube, 8, 40, Math.PI);
    const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.5, emissive: color, emissiveIntensity: 0.18 });
    group.add(new THREE.Mesh(geo, mat));
  });
  return group;
}

function makeHotAirBalloon(color) {
  const group = new THREE.Group();
  const balloon = new THREE.Mesh(
    new THREE.SphereGeometry(7, 14, 12),
    new THREE.MeshStandardMaterial({ color, roughness: 0.5 }),
  );
  balloon.scale.y = 1.15;
  group.add(balloon);
  const basket = new THREE.Mesh(
    new THREE.BoxGeometry(3, 2.4, 3),
    new THREE.MeshStandardMaterial({ color: 0x9a6b3f, roughness: 0.85 }),
  );
  basket.position.y = -10.5;
  group.add(basket);
  return group;
}

export class Scenery {
  constructor(track, courseDef) {
    this.group = new THREE.Group();
    this.animated = [];
    const random = makeRandom(courseDef.id.length * 7919 + 13);

    this.group.add(gradientSky(courseDef.skyTop, courseDef.skyBottom));

    // 地面(巨大な円盤)
    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(850, 48),
      new THREE.MeshStandardMaterial({ color: courseDef.groundColor, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.position.y = -0.4;
    ground.receiveShadow = true;
    this.group.add(ground);

    // 太陽(にこにこ)
    const sun = new THREE.Mesh(
      new THREE.SphereGeometry(24, 16, 12),
      new THREE.MeshBasicMaterial({ color: 0xfff2a8 }),
    );
    sun.position.set(280, 260, -420);
    this.group.add(sun);

    // 雲
    for (let i = 0; i < 16; i++) {
      const cloud = makeCloud(random);
      const a = random() * TAU;
      const r = 220 + random() * 380;
      cloud.position.set(Math.cos(a) * r, 70 + random() * 90, Math.sin(a) * r);
      cloud.scale.setScalar(1.4 + random() * 2.2);
      this.animated.push({ node: cloud, kind: 'cloud', speed: 1.2 + random() * 2, baseX: cloud.position.x });
      this.group.add(cloud);
    }

    // 遠くの丘
    for (let i = 0; i < 10; i++) {
      const a = random() * TAU;
      const r = 420 + random() * 260;
      const hillColor = new THREE.Color(courseDef.groundColor).offsetHSL(random() * 0.04 - 0.02, 0, -0.06 + random() * 0.1);
      const hill = new THREE.Mesh(
        new THREE.SphereGeometry(70 + random() * 90, 14, 10),
        new THREE.MeshStandardMaterial({ color: hillColor, roughness: 1 }),
      );
      hill.position.set(Math.cos(a) * r, -35, Math.sin(a) * r);
      hill.scale.y = 0.55;
      this.group.add(hill);
    }

    // 熱気球
    for (let i = 0; i < 5; i++) {
      const balloon = makeHotAirBalloon(RAINBOW_COLORS[i % RAINBOW_COLORS.length]);
      const a = random() * TAU;
      const r = 150 + random() * 250;
      balloon.position.set(Math.cos(a) * r, 90 + random() * 60, Math.sin(a) * r);
      balloon.scale.setScalar(1.2 + random());
      this.animated.push({ node: balloon, kind: 'balloon', phase: random() * TAU, baseY: balloon.position.y });
      this.group.add(balloon);
    }

    // コース沿いの装飾(テーマ別)
    const decorate = courseDef.theme === 'beach' ? makePalm : (courseDef.theme === 'candy' ? makeCandy : makeTree);
    const count = 64;
    for (let i = 0; i < count; i++) {
      const d = (i / count) * track.totalLength + random() * 8;
      const s = track.sampleAt(d);
      const side = random() < 0.5 ? 1 : -1;
      const offset = track.roadHalfWidth + 8 + random() * 30;
      const decoObj = decorate(random);
      decoObj.position.copy(s.position).addScaledVector(s.left, offset * side);
      // 地形は平坦なので、装飾は必ず地面(y=0)に置く(高架区間で浮かないように)
      decoObj.position.y = 0;
      decoObj.rotation.y = random() * TAU;
      const sc = 0.8 + random() * 0.7;
      decoObj.scale.setScalar(sc);
      this.group.add(decoObj);
    }

    // 虹のアーチをコース上に配置(スタート以外の3か所)
    for (let i = 1; i <= 3; i++) {
      const d = (i / 4) * track.totalLength;
      const s = track.sampleAt(d);
      const arch = makeRainbowArch(track.roadHalfWidth + 8, 1.1);
      arch.position.copy(s.position);
      arch.position.y += 0.5;
      // トーラスの面法線(+Z)を進行方向に向け、カートがくぐれる向きにする
      arch.rotation.y = Math.atan2(s.tangent.x, s.tangent.z);
      this.group.add(arch);
    }

    // ビーチテーマは海を追加
    if (courseDef.theme === 'beach') {
      const sea = new THREE.Mesh(
        new THREE.RingGeometry(430, 900, 48),
        new THREE.MeshStandardMaterial({ color: 0x2f9fdf, roughness: 0.25, metalness: 0.1 }),
      );
      sea.rotation.x = -Math.PI / 2;
      sea.position.y = -0.2;
      this.group.add(sea);
      this.animated.push({ node: sea, kind: 'sea' });
    }
  }

  update(dt, time) {
    for (const item of this.animated) {
      if (item.kind === 'cloud') {
        item.node.position.x += item.speed * dt;
        if (item.node.position.x > 700) item.node.position.x = -700;
      } else if (item.kind === 'balloon') {
        item.node.position.y = item.baseY + Math.sin(time * 0.5 + item.phase) * 6;
      } else if (item.kind === 'sea') {
        item.node.position.y = -0.2 + Math.sin(time * 0.8) * 0.15;
      }
    }
  }
}
