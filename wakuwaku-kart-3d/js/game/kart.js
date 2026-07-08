// カート+キャラクターの3Dモデル生成
import * as THREE from '../../vendor/three.module.min.js';

function makeFaceTexture(isPanda) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  g.clearRect(0, 0, 256, 256);
  // 目
  g.fillStyle = '#222';
  if (isPanda) {
    g.fillStyle = '#333';
    g.beginPath(); g.ellipse(88, 108, 26, 32, -0.3, 0, Math.PI * 2); g.fill();
    g.beginPath(); g.ellipse(168, 108, 26, 32, 0.3, 0, Math.PI * 2); g.fill();
    g.fillStyle = '#fff';
  }
  g.beginPath(); g.arc(92, 108, 12, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(164, 108, 12, 0, Math.PI * 2); g.fill();
  // キラッと光る目のハイライト
  g.fillStyle = isPanda ? '#333' : '#fff';
  g.beginPath(); g.arc(96, 103, 4, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(168, 103, 4, 0, Math.PI * 2); g.fill();
  // ほっぺ
  g.fillStyle = 'rgba(255,130,160,0.55)';
  g.beginPath(); g.arc(64, 142, 16, 0, Math.PI * 2); g.fill();
  g.beginPath(); g.arc(192, 142, 16, 0, Math.PI * 2); g.fill();
  // にっこりお口
  g.strokeStyle = '#663333';
  g.lineWidth = 7;
  g.lineCap = 'round';
  g.beginPath();
  g.arc(128, 130, 26, Math.PI * 0.2, Math.PI * 0.8);
  g.stroke();
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function addEars(head, character, matBody, matAccent) {
  const type = character.earType;
  if (type === 'rabbit') {
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.CapsuleGeometry(0.28, 1.5, 4, 8), matBody);
      ear.position.set(side * 0.45, 1.35, 0);
      ear.rotation.z = -side * 0.18;
      head.add(ear);
      const inner = new THREE.Mesh(new THREE.CapsuleGeometry(0.14, 1.0, 4, 8), matAccent);
      inner.position.z = 0.16;
      ear.add(inner);
    }
  } else if (type === 'cat' || type === 'frog' || type === 'chick') {
    if (type === 'cat') {
      for (const side of [-1, 1]) {
        const ear = new THREE.Mesh(new THREE.ConeGeometry(0.45, 0.75, 4), matBody);
        ear.position.set(side * 0.62, 0.95, 0);
        ear.rotation.z = -side * 0.35;
        head.add(ear);
      }
    } else if (type === 'frog') {
      for (const side of [-1, 1]) {
        const eye = new THREE.Mesh(new THREE.SphereGeometry(0.36, 10, 8), matBody);
        eye.position.set(side * 0.55, 1.0, 0.1);
        head.add(eye);
        const pupil = new THREE.Mesh(
          new THREE.SphereGeometry(0.15, 8, 6),
          new THREE.MeshStandardMaterial({ color: 0x222222 }),
        );
        pupil.position.set(0, 0.08, 0.28);
        eye.add(pupil);
      }
    } else {
      // ひよこ: とさか風の毛
      const tuft = new THREE.Mesh(new THREE.ConeGeometry(0.22, 0.6, 5), matAccent);
      tuft.position.set(0, 1.15, 0);
      head.add(tuft);
      const beak = new THREE.Mesh(new THREE.ConeGeometry(0.2, 0.45, 5), matAccent);
      beak.position.set(0, -0.05, 1.02);
      beak.rotation.x = Math.PI / 2;
      head.add(beak);
    }
  } else if (type === 'panda' || type === 'koala') {
    const earMat = type === 'panda' ? matAccent : matBody;
    const r = type === 'koala' ? 0.55 : 0.42;
    for (const side of [-1, 1]) {
      const ear = new THREE.Mesh(new THREE.SphereGeometry(r, 10, 8), earMat);
      ear.position.set(side * 0.72, 0.85, 0);
      head.add(ear);
      if (type === 'koala') {
        const inner = new THREE.Mesh(new THREE.SphereGeometry(r * 0.55, 8, 6), matAccent);
        inner.position.z = 0.22;
        ear.add(inner);
      }
    }
    if (type === 'koala') {
      const nose = new THREE.Mesh(
        new THREE.SphereGeometry(0.3, 8, 6),
        new THREE.MeshStandardMaterial({ color: 0x44403c, roughness: 0.6 }),
      );
      nose.position.set(0, -0.05, 0.95);
      nose.scale.set(0.7, 1, 0.6);
      head.add(nose);
    }
  }
}

// カート全体を作成。戻り値: { group, wheels, driverPivot, starGlow }
export function buildKart(character) {
  const group = new THREE.Group();
  const kartColor = character.kartColor;

  const matKart = new THREE.MeshStandardMaterial({ color: kartColor, roughness: 0.35, metalness: 0.15 });
  const matDark = new THREE.MeshStandardMaterial({ color: 0x333340, roughness: 0.7 });
  const matBody = new THREE.MeshStandardMaterial({ color: character.bodyColor, roughness: 0.65 });
  const matAccent = new THREE.MeshStandardMaterial({ color: character.accentColor, roughness: 0.65 });

  // 車体(丸っこいボディ)
  const body = new THREE.Mesh(new THREE.CapsuleGeometry(0.95, 1.6, 6, 12), matKart);
  body.rotation.x = Math.PI / 2;
  body.position.y = 0.72;
  body.scale.set(1, 1, 0.62);
  body.castShadow = true;
  group.add(body);

  // ノーズ(前の丸い飾り)
  const nose = new THREE.Mesh(new THREE.SphereGeometry(0.55, 12, 10), matAccent);
  nose.position.set(0, 0.72, 1.65);
  nose.castShadow = true;
  group.add(nose);

  // リアウィング
  const wing = new THREE.Mesh(new THREE.BoxGeometry(1.9, 0.14, 0.55), matAccent);
  wing.position.set(0, 1.35, -1.55);
  wing.castShadow = true;
  group.add(wing);
  for (const side of [-1, 1]) {
    const strut = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.55, 0.12), matDark);
    strut.position.set(side * 0.7, 1.05, -1.55);
    group.add(strut);
  }

  // タイヤ
  const wheels = [];
  const wheelGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.42, 14);
  const hubGeo = new THREE.CylinderGeometry(0.24, 0.24, 0.44, 10);
  const hubMat = new THREE.MeshStandardMaterial({ color: 0xffd75e, roughness: 0.4 });
  for (const [x, z] of [[-1.0, 1.05], [1.0, 1.05], [-1.05, -1.15], [1.05, -1.15]]) {
    const wheel = new THREE.Group();
    const tire = new THREE.Mesh(wheelGeo, matDark);
    tire.rotation.z = Math.PI / 2;
    tire.castShadow = true;
    wheel.add(tire);
    const hub = new THREE.Mesh(hubGeo, hubMat);
    hub.rotation.z = Math.PI / 2;
    wheel.add(hub);
    wheel.position.set(x, 0.48, z);
    group.add(wheel);
    wheels.push(wheel);
  }

  // ハンドル
  const wheelBar = new THREE.Mesh(new THREE.TorusGeometry(0.32, 0.07, 8, 16), matDark);
  wheelBar.position.set(0, 1.35, 0.78);
  wheelBar.rotation.x = -0.9;
  group.add(wheelBar);

  // ドライバー(キャラクター)
  const driverPivot = new THREE.Group();
  driverPivot.position.set(0, 1.05, -0.3);
  group.add(driverPivot);

  const torso = new THREE.Mesh(new THREE.SphereGeometry(0.68, 14, 12), matBody);
  torso.position.y = 0.35;
  torso.scale.set(1, 1.1, 0.9);
  torso.castShadow = true;
  driverPivot.add(torso);

  const head = new THREE.Group();
  head.position.y = 1.35;
  driverPivot.add(head);
  const skull = new THREE.Mesh(new THREE.SphereGeometry(0.95, 18, 16), matBody);
  skull.castShadow = true;
  head.add(skull);

  // 顔(テクスチャ板をやや前に)
  const face = new THREE.Mesh(
    new THREE.PlaneGeometry(1.5, 1.5),
    new THREE.MeshBasicMaterial({
      map: makeFaceTexture(character.earType === 'panda'),
      transparent: true,
      depthWrite: false,
    }),
  );
  face.position.set(0, 0.02, 0.9);
  face.rotation.x = -0.06;
  head.add(face);

  addEars(head, character, matBody, matAccent);

  // 手(ハンドルを握る)
  for (const side of [-1, 1]) {
    const arm = new THREE.Mesh(new THREE.CapsuleGeometry(0.16, 0.7, 4, 8), matBody);
    arm.position.set(side * 0.45, 0.55, 0.55);
    arm.rotation.x = 1.15;
    arm.rotation.z = -side * 0.35;
    driverPivot.add(arm);
  }

  // スターパワー用の光(通常は非表示)
  const starGlow = new THREE.Mesh(
    new THREE.SphereGeometry(2.6, 16, 12),
    new THREE.MeshBasicMaterial({ color: 0xfff066, transparent: true, opacity: 0.28, depthWrite: false }),
  );
  starGlow.position.y = 1.2;
  starGlow.visible = false;
  group.add(starGlow);

  // 影用の丸(擬似ソフトシャドウ補助)
  const blob = new THREE.Mesh(
    new THREE.CircleGeometry(1.7, 20),
    new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.18, depthWrite: false }),
  );
  blob.rotation.x = -Math.PI / 2;
  blob.position.y = 0.02;
  group.add(blob);

  return { group, wheels, driverPivot, head, starGlow };
}
