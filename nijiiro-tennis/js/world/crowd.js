// 観客のみんな — ぴょんぴょん跳ねて旗を振って応援
import * as THREE from 'three';

const CROWD_COLORS = [0xffb3d9, 0xffd97a, 0x9fe0ff, 0xc4f7a1, 0xe3baff, 0xffb69e];
const FLAG_COLORS = [0xff5f7e, 0xffe14f, 0x58c8ff, 0x6fe86f, 0xb98fff];

function spectator(hex, withFlag) {
  const g = new THREE.Group();
  const mat = new THREE.MeshLambertMaterial({ color: hex });
  const body = new THREE.Mesh(new THREE.SphereGeometry(0.42, 10, 8), mat);
  body.position.y = 0.42;
  body.scale.y = 1.15;
  g.add(body);
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2233 });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(0.06, 6, 4), eyeMat);
    e.position.set(sx * 0.15, 0.55, 0.36);
    g.add(e);
  }
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(0.08, 0.02, 4, 8, Math.PI),
    eyeMat);
  mouth.position.set(0, 0.42, 0.4);
  mouth.rotation.z = Math.PI;
  g.add(mouth);

  let flag = null;
  if (withFlag) {
    flag = new THREE.Group();
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.025, 0.025, 0.9, 6),
      new THREE.MeshLambertMaterial({ color: 0xffffff }));
    pole.position.y = 0.45;
    flag.add(pole);
    const cloth = new THREE.Mesh(
      new THREE.PlaneGeometry(0.5, 0.34),
      new THREE.MeshLambertMaterial({
        color: FLAG_COLORS[(Math.random() * FLAG_COLORS.length) | 0],
        side: THREE.DoubleSide,
      }));
    cloth.position.set(0.26, 0.72, 0);
    flag.add(cloth);
    flag.position.set(0.45, 0.5, 0);
    g.add(flag);
  }
  return { group: g, flag };
}

export function buildCrowd(scene) {
  const g = new THREE.Group();
  const members = [];

  // 奥ベースライン後方にひな壇風の2列
  const rows = [
    { z: -16.5, y: 0, count: 9, spread: 16 },
    { z: -18.5, y: 0.9, count: 8, spread: 18 },
  ];
  // サイドにも数名
  const sides = [];
  for (let i = 0; i < 4; i++) {
    sides.push({ x: -9.4, z: -9 + i * 4.4 });
    sides.push({ x: 9.4, z: -9 + i * 4.4 });
  }

  let idx = 0;
  const place = (x, y, z) => {
    const withFlag = idx % 3 === 0;
    const s = spectator(CROWD_COLORS[idx % CROWD_COLORS.length], withFlag);
    s.group.position.set(x, y, z);
    s.group.lookAt(0, 0.5, 0);
    s.phase = Math.random() * Math.PI * 2;
    s.speed = 2.1 + Math.random() * 1.6;
    s.baseY = y;
    members.push(s);
    g.add(s.group);
    idx++;
  };

  for (const row of rows) {
    for (let i = 0; i < row.count; i++) {
      const x = (i / (row.count - 1) - 0.5) * row.spread;
      place(x, row.y, row.z);
    }
  }
  for (const p of sides) place(p.x, 0, p.z);

  // ひな壇(ピンクのベンチ)
  const bench = new THREE.Mesh(
    new THREE.BoxGeometry(19, 0.9, 2.4),
    new THREE.MeshLambertMaterial({ color: 0xff9fc8 }));
  bench.position.set(0, 0.45, -18.5);
  g.add(bench);

  scene.add(g);

  let excitement = 0; // 0=ふつう 1=大盛りあがり
  return {
    group: g,
    setExcitement(v) { excitement = v; },
    update(dt, t) {
      const amp = 0.1 + excitement * 0.4;
      for (const s of members) {
        s.group.position.y = s.baseY + Math.abs(Math.sin(t * s.speed + s.phase)) * amp;
        if (s.flag) s.flag.rotation.z = Math.sin(t * (3 + excitement * 5) + s.phase) * (0.35 + excitement * 0.4);
      }
      if (excitement > 0) excitement = Math.max(0, excitement - dt * 0.25);
    },
  };
}
