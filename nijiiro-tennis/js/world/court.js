// 草原コート — 芝・ホワイトライン・ネット・ピンクのふち
import * as THREE from 'three';

export const COURT = {
  halfW: 5,     // コート半幅 (x)
  halfL: 11,    // コート半長 (z)
  netH: 1.0,
  playerZ: 8.6,
  cpuZ: -8.6,
};

function grassTexture() {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d');
  g.fillStyle = '#58c14f';
  g.fillRect(0, 0, 256, 256);
  // 芝の刈り込みストライプ
  for (let i = 0; i < 8; i++) {
    if (i % 2 === 0) continue;
    g.fillStyle = 'rgba(255,255,255,.07)';
    g.fillRect(0, i * 32, 256, 32);
  }
  // ノイズで芝の質感
  for (let i = 0; i < 2600; i++) {
    const v = Math.random();
    g.fillStyle = v > 0.5 ? 'rgba(255,255,150,.09)' : 'rgba(20,90,30,.12)';
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 3);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function lineMesh(w, l, x, z) {
  const m = new THREE.Mesh(
    new THREE.PlaneGeometry(w, l),
    new THREE.MeshLambertMaterial({ color: 0xffffff }));
  m.rotation.x = -Math.PI / 2;
  m.position.set(x, 0.015, z);
  m.receiveShadow = true;
  return m;
}

export function buildCourt(scene) {
  const g = new THREE.Group();
  const { halfW, halfL, netH } = COURT;

  // 大地(周囲の草原)
  const ground = new THREE.Mesh(
    new THREE.CircleGeometry(90, 48),
    new THREE.MeshLambertMaterial({ color: 0x6cd35f }));
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.05;
  ground.receiveShadow = true;
  g.add(ground);

  // コート面(芝テクスチャ)
  const court = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 2 + 3, halfL * 2 + 4),
    new THREE.MeshLambertMaterial({ map: grassTexture() }));
  court.rotation.x = -Math.PI / 2;
  court.position.y = 0.001;
  court.receiveShadow = true;
  g.add(court);

  // ピンクのふち取り(好きな色対応)
  const rim = new THREE.Mesh(
    new THREE.RingGeometry(0, 1, 4),
    new THREE.MeshLambertMaterial({ color: 0xff8fc8 }));
  rim.geometry = new THREE.PlaneGeometry(halfW * 2 + 5.2, halfL * 2 + 6.2);
  rim.rotation.x = -Math.PI / 2;
  rim.position.y = -0.008;
  rim.receiveShadow = true;
  g.add(rim);

  // ホワイトライン
  const LW = 0.14;
  g.add(lineMesh(halfW * 2, LW, 0, -halfL));       // ベースライン奥
  g.add(lineMesh(halfW * 2, LW, 0, halfL));        // ベースライン手前
  g.add(lineMesh(LW, halfL * 2, -halfW, 0));       // サイド左
  g.add(lineMesh(LW, halfL * 2, halfW, 0));        // サイド右
  g.add(lineMesh(halfW * 2, LW, 0, -halfL / 2));   // サービスライン奥
  g.add(lineMesh(halfW * 2, LW, 0, halfL / 2));    // サービスライン手前
  g.add(lineMesh(LW, halfL, 0, 0));                // センター

  // ネット
  const netGroup = new THREE.Group();
  const netTexC = document.createElement('canvas');
  netTexC.width = 128; netTexC.height = 32;
  const nctx = netTexC.getContext('2d');
  nctx.strokeStyle = 'rgba(255,255,255,.95)';
  nctx.lineWidth = 1.6;
  for (let x = 0; x <= 128; x += 8) { nctx.beginPath(); nctx.moveTo(x, 0); nctx.lineTo(x, 32); nctx.stroke(); }
  for (let y = 0; y <= 32; y += 8) { nctx.beginPath(); nctx.moveTo(0, y); nctx.lineTo(128, y); nctx.stroke(); }
  const netTex = new THREE.CanvasTexture(netTexC);
  netTex.wrapS = THREE.RepeatWrapping; netTex.repeat.x = 4;
  const net = new THREE.Mesh(
    new THREE.PlaneGeometry(halfW * 2 + 1.6, netH),
    new THREE.MeshLambertMaterial({ map: netTex, transparent: true, side: THREE.DoubleSide }));
  net.position.y = netH / 2;
  netGroup.add(net);

  // ネット上端の白帯
  const band = new THREE.Mesh(
    new THREE.BoxGeometry(halfW * 2 + 1.6, 0.09, 0.06),
    new THREE.MeshLambertMaterial({ color: 0xffffff }));
  band.position.y = netH;
  band.castShadow = true;
  netGroup.add(band);

  // ネットポール(ピンク)
  for (const sx of [-1, 1]) {
    const pole = new THREE.Mesh(
      new THREE.CylinderGeometry(0.09, 0.11, netH + 0.15, 10),
      new THREE.MeshLambertMaterial({ color: 0xff7ab8 }));
    pole.position.set(sx * (halfW + 0.9), (netH + 0.15) / 2, 0);
    pole.castShadow = true;
    netGroup.add(pole);
    const ballTop = new THREE.Mesh(
      new THREE.SphereGeometry(0.16, 12, 10),
      new THREE.MeshLambertMaterial({ color: 0xffe14f, emissive: 0x775500 }));
    ballTop.position.set(sx * (halfW + 0.9), netH + 0.22, 0);
    netGroup.add(ballTop);
  }
  g.add(netGroup);

  scene.add(g);
  return g;
}
