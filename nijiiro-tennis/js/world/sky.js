// 空・虹のアーチ・雲・太陽・丘・木・花 — 草原ステージの背景
import * as THREE from 'three';

const RAINBOW = [0xff5f7e, 0xffa14f, 0xffe14f, 0x6fe86f, 0x58c8ff, 0xb98fff];

function skyDome() {
  const c = document.createElement('canvas');
  c.width = 8; c.height = 256;
  const g = c.getContext('2d');
  const grad = g.createLinearGradient(0, 0, 0, 256);
  grad.addColorStop(0, '#3f9bff');
  grad.addColorStop(0.45, '#8fd0ff');
  grad.addColorStop(0.8, '#ffe9f7');
  grad.addColorStop(1, '#fff6d8');
  g.fillStyle = grad;
  g.fillRect(0, 0, 8, 256);
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  const dome = new THREE.Mesh(
    new THREE.SphereGeometry(150, 24, 16),
    new THREE.MeshBasicMaterial({ map: tex, side: THREE.BackSide, fog: false }));
  return dome;
}

function rainbowArch() {
  const group = new THREE.Group();
  RAINBOW.forEach((hex, i) => {
    const r = 46 - i * 1.7;
    const arc = new THREE.Mesh(
      new THREE.TorusGeometry(r, 0.85, 8, 40, Math.PI),
      new THREE.MeshBasicMaterial({ color: hex, fog: false }));
    arc.position.set(0, 0, -72);
    group.add(arc);
  });
  return group;
}

function cloud(scale = 1) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: 0xffffff, emissive: 0x444444 });
  const blobs = [[0, 0, 0, 2.2], [1.8, 0.3, 0.2, 1.6], [-1.8, 0.2, -0.1, 1.5], [0.6, 0.9, 0, 1.4], [-0.7, 0.8, 0.3, 1.2]];
  for (const [x, y, z, r] of blobs) {
    const m = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), mat);
    m.position.set(x, y, z);
    g.add(m);
  }
  g.scale.setScalar(scale);
  return g;
}

function sun() {
  const g = new THREE.Group();
  const core = new THREE.Mesh(
    new THREE.SphereGeometry(6, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xfff59d, fog: false }));
  g.add(core);
  const halo = new THREE.Mesh(
    new THREE.SphereGeometry(8.5, 20, 16),
    new THREE.MeshBasicMaterial({ color: 0xffe082, transparent: true, opacity: 0.35, fog: false }));
  g.add(halo);
  return g;
}

function hill(x, z, r, hex) {
  const m = new THREE.Mesh(
    new THREE.SphereGeometry(r, 16, 12),
    new THREE.MeshLambertMaterial({ color: hex }));
  m.position.set(x, -r * 0.62, z);
  m.scale.y = 0.6;
  return m;
}

function tree(x, z, s = 1) {
  const g = new THREE.Group();
  const trunk = new THREE.Mesh(
    new THREE.CylinderGeometry(0.28 * s, 0.4 * s, 2.2 * s, 8),
    new THREE.MeshLambertMaterial({ color: 0x9a6a3f }));
  trunk.position.y = 1.1 * s;
  trunk.castShadow = true;
  g.add(trunk);
  const cols = [0x4fc353, 0x63d967, 0x3faf46];
  const puffs = [[0, 3.1, 0, 1.7], [1.1, 2.6, 0.3, 1.2], [-1.1, 2.7, -0.2, 1.25], [0, 4.1, 0, 1.15]];
  puffs.forEach(([px, py, pz, pr], i) => {
    const puff = new THREE.Mesh(
      new THREE.SphereGeometry(pr * s, 10, 8),
      new THREE.MeshLambertMaterial({ color: cols[i % 3] }));
    puff.position.set(px * s, py * s, pz * s);
    puff.castShadow = true;
    g.add(puff);
  });
  g.position.set(x, 0, z);
  return g;
}

function flowerPatch(x, z, n = 7) {
  const g = new THREE.Group();
  const petalCols = [0xff8fc8, 0xfff176, 0xffffff, 0xb98fff, 0xff9e80];
  for (let i = 0; i < n; i++) {
    const f = new THREE.Group();
    const stemH = 0.4 + Math.random() * 0.3;
    const stem = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, stemH, 5),
      new THREE.MeshLambertMaterial({ color: 0x3faf46 }));
    stem.position.y = stemH / 2;
    f.add(stem);
    const head = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 8, 6),
      new THREE.MeshLambertMaterial({ color: petalCols[(Math.random() * petalCols.length) | 0] }));
    head.position.y = stemH + 0.1;
    head.scale.y = 0.7;
    f.add(head);
    f.position.set(x + (Math.random() - .5) * 3, 0, z + (Math.random() - .5) * 3);
    g.add(f);
  }
  return g;
}

export function buildSky(scene) {
  const g = new THREE.Group();
  g.add(skyDome());
  g.add(rainbowArch());

  const sunMesh = sun();
  sunMesh.position.set(-42, 46, -85);
  g.add(sunMesh);

  const clouds = [];
  const cloudSpecs = [[-30, 26, -60, 2.2], [24, 32, -70, 1.7], [44, 22, -40, 1.4],
    [-48, 20, -20, 1.5], [10, 38, -90, 2.6], [55, 30, 20, 1.6], [-55, 28, 30, 1.8]];
  for (const [x, y, z, s] of cloudSpecs) {
    const c = cloud(s);
    c.position.set(x, y, z);
    c.userData.baseX = x;
    c.userData.speed = 0.3 + Math.random() * 0.5;
    clouds.push(c);
    g.add(c);
  }

  // 遠景の丘
  g.add(hill(-45, -55, 26, 0x5ec95a));
  g.add(hill(40, -62, 30, 0x54bb52));
  g.add(hill(70, -20, 24, 0x66d162));
  g.add(hill(-70, -8, 28, 0x5ec95a));
  g.add(hill(0, -90, 40, 0x4db54e));

  // 木と花(コートの周り)
  const treeSpecs = [[-16, -20, 1.6], [17, -18, 1.4], [-20, -4, 1.3], [21, -2, 1.5],
    [-18, 14, 1.2], [19, 16, 1.3], [-11, -28, 1.8], [12, -27, 1.7]];
  for (const [x, z, s] of treeSpecs) g.add(tree(x, z, s));
  for (const [x, z] of [[-10, 18], [11, 19], [-13, -12], [14, -10], [-9, 4], [10, 6]])
    g.add(flowerPatch(x, z));

  scene.add(g);
  scene.fog = new THREE.Fog(0xcfeaff, 60, 150);

  return {
    group: g,
    update(t) {
      for (const c of clouds) {
        c.position.x = c.userData.baseX + Math.sin(t * 0.04 * c.userData.speed) * 9;
        c.position.y += Math.sin(t * 0.35 + c.userData.baseX) * 0.002;
      }
    },
  };
}

export function buildLights(scene) {
  scene.add(new THREE.AmbientLight(0xcfe8ff, 0.75));
  const hemi = new THREE.HemisphereLight(0xbfe3ff, 0x7ac86c, 0.55);
  scene.add(hemi);
  const sun = new THREE.DirectionalLight(0xfff3d6, 1.9);
  sun.position.set(-14, 26, -10);
  sun.castShadow = true;
  sun.shadow.mapSize.set(1024, 1024);
  sun.shadow.camera.left = -18; sun.shadow.camera.right = 18;
  sun.shadow.camera.top = 20; sun.shadow.camera.bottom = -20;
  sun.shadow.camera.far = 70;
  sun.shadow.bias = -0.002;
  sun.shadow.radius = 4;
  scene.add(sun);
  return sun;
}
