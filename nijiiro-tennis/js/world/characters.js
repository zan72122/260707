// 選べる4キャラ(うさぎ・くま・ロボ・スライム) — ローポリで丸くてかわいい
import * as THREE from 'three';

export const CHARACTERS = [
  { id: 'usagi', emoji: '🐰', body: 0xffb3d9, belly: 0xfff0f8, accent: 0xff6fb0 },
  { id: 'kuma', emoji: '🐻', body: 0xd99a5b, belly: 0xf7dcae, accent: 0x9a6a3f },
  { id: 'robo', emoji: '🤖', body: 0x7fc8f5, belly: 0xe8f7ff, accent: 0x3a86c8 },
  { id: 'purin', emoji: '🍮', body: 0xffd97a, belly: 0xfff3cf, accent: 0xc98a3a },
];

function lam(hex) { return new THREE.MeshLambertMaterial({ color: hex }); }

function eyes(head, r, y, z) {
  const eyeMat = new THREE.MeshBasicMaterial({ color: 0x2a2233 });
  const hiMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
  for (const sx of [-1, 1]) {
    const e = new THREE.Mesh(new THREE.SphereGeometry(r * 0.16, 8, 6), eyeMat);
    e.position.set(sx * r * 0.42, y, z);
    head.add(e);
    const hi = new THREE.Mesh(new THREE.SphereGeometry(r * 0.055, 6, 4), hiMat);
    hi.position.set(sx * r * 0.42 - r * 0.05, y + r * 0.06, z + r * 0.13);
    head.add(hi);
  }
  // ほっぺ
  const cheekMat = new THREE.MeshBasicMaterial({ color: 0xff9fc2, transparent: true, opacity: 0.85 });
  for (const sx of [-1, 1]) {
    const c = new THREE.Mesh(new THREE.SphereGeometry(r * 0.12, 6, 4), cheekMat);
    c.position.set(sx * r * 0.62, y - r * 0.28, z - r * 0.06);
    c.scale.z = 0.4;
    head.add(c);
  }
  // にっこり口
  const mouth = new THREE.Mesh(
    new THREE.TorusGeometry(r * 0.16, r * 0.035, 6, 10, Math.PI),
    new THREE.MeshBasicMaterial({ color: 0x2a2233 }));
  mouth.position.set(0, y - r * 0.3, z);
  mouth.rotation.z = Math.PI;
  head.add(mouth);
}

function racket(accent) {
  const g = new THREE.Group();
  const handle = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.05, 0.5, 8), lam(0xba8a56));
  handle.position.y = 0.25;
  g.add(handle);
  const rim = new THREE.Mesh(new THREE.TorusGeometry(0.3, 0.05, 8, 18), lam(accent));
  rim.position.y = 0.82;
  g.add(rim);
  const strC = document.createElement('canvas');
  strC.width = strC.height = 64;
  const sctx = strC.getContext('2d');
  sctx.strokeStyle = 'rgba(255,255,255,.95)'; sctx.lineWidth = 2;
  for (let i = 4; i < 64; i += 9) {
    sctx.beginPath(); sctx.moveTo(i, 0); sctx.lineTo(i, 64); sctx.stroke();
    sctx.beginPath(); sctx.moveTo(0, i); sctx.lineTo(64, i); sctx.stroke();
  }
  const strings = new THREE.Mesh(
    new THREE.CircleGeometry(0.28, 16),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(strC), transparent: true, side: THREE.DoubleSide }));
  strings.position.y = 0.82;
  g.add(strings);
  return g;
}

function addTypeParts(kind, head, body, accent, R) {
  if (kind === 'usagi') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.16, R * 0.85, 4, 8), lam(0xffb3d9));
      ear.position.set(sx * R * 0.36, R * 0.95, 0);
      ear.rotation.z = -sx * 0.24;
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.07, R * 0.55, 4, 6), lam(0xfff0f8));
      inner.position.set(sx * R * 0.36, R * 0.95, R * 0.09);
      inner.rotation.z = -sx * 0.24;
      head.add(inner);
    }
  } else if (kind === 'kuma') {
    for (const sx of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(R * 0.28, 8, 6), lam(0xd99a5b));
      ear.position.set(sx * R * 0.6, R * 0.68, 0);
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.SphereGeometry(R * 0.14, 8, 6), lam(0xf7dcae));
      inner.position.set(sx * R * 0.6, R * 0.68, R * 0.16);
      head.add(inner);
    }
    const muzzle = new THREE.Mesh(new THREE.SphereGeometry(R * 0.3, 8, 6), lam(0xf7dcae));
    muzzle.position.set(0, -R * 0.18, R * 0.72);
    muzzle.scale.set(1, 0.75, 0.7);
    head.add(muzzle);
    const nose = new THREE.Mesh(new THREE.SphereGeometry(R * 0.1, 8, 6), lam(0x5a4030));
    nose.position.set(0, -R * 0.08, R * 0.95);
    head.add(nose);
  } else if (kind === 'robo') {
    const ant = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.03, R * 0.6, 6), lam(0x3a86c8));
    ant.position.y = R * 1.05;
    head.add(ant);
    const bulb = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.16, 8, 6),
      new THREE.MeshLambertMaterial({ color: 0xffe14f, emissive: 0xaa8800 }));
    bulb.position.y = R * 1.4;
    head.add(bulb);
    for (const sx of [-1, 1]) {
      const side = new THREE.Mesh(new THREE.CylinderGeometry(R * 0.14, R * 0.14, R * 0.22, 8), lam(0x3a86c8));
      side.rotation.z = Math.PI / 2;
      side.position.set(sx * R * 0.95, 0, 0);
      head.add(side);
    }
    const panel = new THREE.Mesh(new THREE.BoxGeometry(R * 0.5, R * 0.34, R * 0.1), lam(0xe8f7ff));
    panel.position.set(0, 0, R * 0.32);
    body.add(panel);
  } else if (kind === 'purin') {
    const cap = new THREE.Mesh(new THREE.SphereGeometry(R * 0.85, 12, 8), lam(0xa8642f));
    cap.position.y = R * 0.42;
    cap.scale.y = 0.55;
    head.add(cap);
    const cherry = new THREE.Mesh(
      new THREE.SphereGeometry(R * 0.2, 10, 8),
      new THREE.MeshLambertMaterial({ color: 0xff5f7e, emissive: 0x661122 }));
    cherry.position.y = R * 1.0;
    head.add(cherry);
  }
}

// キャラを生成。update(dt) で待機バウンド、swing() でラケットを振る
export function buildCharacter(def, { facing = -1 } = {}) {
  const g = new THREE.Group();
  const R = 0.62;

  const body = new THREE.Mesh(new THREE.SphereGeometry(R, 14, 12), lam(def.body));
  body.position.y = R * 0.95;
  body.scale.set(1, 1.06, 0.94);
  body.castShadow = true;
  g.add(body);

  const belly = new THREE.Mesh(new THREE.SphereGeometry(R * 0.72, 12, 10), lam(def.belly));
  belly.position.set(0, R * 0.85, R * 0.28);
  belly.scale.set(0.85, 0.95, 0.7);
  g.add(belly);

  const head = new THREE.Mesh(new THREE.SphereGeometry(R * 0.88, 14, 12), lam(def.body));
  head.position.y = R * 2.28;
  head.castShadow = true;
  g.add(head);
  eyes(head, R * 0.88, R * 0.1, R * 0.78);
  addTypeParts(def.id, head, body, def.accent, R * 0.88);

  // 足
  for (const sx of [-1, 1]) {
    const foot = new THREE.Mesh(new THREE.SphereGeometry(R * 0.3, 8, 6), lam(def.accent));
    foot.position.set(sx * R * 0.42, R * 0.14, R * 0.1);
    foot.scale.set(1, 0.6, 1.3);
    foot.castShadow = true;
    g.add(foot);
  }

  // 腕+ラケット(利き腕)
  const arm = new THREE.Group();
  arm.position.set(R * 0.92, R * 1.25, 0);
  const armMesh = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.16, R * 0.5, 4, 8), lam(def.body));
  armMesh.position.y = -R * 0.28;
  arm.add(armMesh);
  const rk = racket(def.accent);
  rk.position.set(0, -R * 0.62, 0);
  rk.rotation.z = Math.PI;
  rk.rotation.x = -0.5;
  arm.add(rk);
  arm.rotation.z = -0.85;
  g.add(arm);

  // 反対の腕
  const arm2 = new THREE.Mesh(new THREE.CapsuleGeometry(R * 0.16, R * 0.5, 4, 8), lam(def.body));
  arm2.position.set(-R * 0.95, R * 1.1, 0);
  arm2.rotation.z = 0.75;
  g.add(arm2);

  g.rotation.y = facing < 0 ? 0 : Math.PI;

  const state = { t: Math.random() * 10, swingT: 1, moveAmount: 0, happyT: 1 };
  return {
    group: g,
    def,
    swing() { state.swingT = 0; },
    celebrate() { state.happyT = 0; },
    setMoving(v) { state.moveAmount = v; },
    update(dt) {
      state.t += dt;
      state.swingT = Math.min(1, state.swingT + dt * 3.2);
      state.happyT = Math.min(1, state.happyT + dt * 0.9);
      // 待機バウンド+走りアニメ
      const runBounce = Math.abs(Math.sin(state.t * 11)) * 0.16 * state.moveAmount;
      const idleBounce = Math.sin(state.t * 3.2) * 0.035;
      let jump = 0;
      if (state.happyT < 1) jump = Math.abs(Math.sin(state.happyT * Math.PI * 4)) * 0.55;
      g.position.y = runBounce + idleBounce + jump;
      g.rotation.z = Math.sin(state.t * 11) * 0.05 * state.moveAmount;
      head.rotation.z = Math.sin(state.t * 2.1) * 0.06;
      // スイング(0→1で振り抜き)
      const s = state.swingT;
      const wind = s < 0.25 ? -s * 4 : (s < 0.6 ? -1 + ((s - 0.25) / 0.35) * 2.4 : 1.4 - (s - 0.6) * 3.5);
      arm.rotation.z = -0.85 - wind * 0.9;
      arm.rotation.y = wind * 0.7;
    },
  };
}
