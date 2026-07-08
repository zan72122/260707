// コース(道路)の生成と走行位置クエリ
import * as THREE from '../../vendor/three.module.min.js';

const SAMPLE_COUNT = 720;
const ROAD_Y_OFFSET = 0.05;
const CURB_WIDTH = 1.6;

// 道路のテクスチャ(センターライン・端の白線)をCanvasで生成
function makeRoadTexture(roadColorHex) {
  const canvas = document.createElement('canvas');
  canvas.width = 256;
  canvas.height = 256;
  const g = canvas.getContext('2d');
  const c = new THREE.Color(roadColorHex);
  g.fillStyle = `rgb(${c.r * 255 | 0},${c.g * 255 | 0},${c.b * 255 | 0})`;
  g.fillRect(0, 0, 256, 256);
  // アスファルトの粒々
  for (let i = 0; i < 900; i++) {
    const v = Math.random() * 40 - 20;
    g.fillStyle = `rgba(${255 * (v > 0)},${255 * (v > 0)},${255 * (v > 0)},${Math.abs(v) / 200})`;
    g.fillRect(Math.random() * 256, Math.random() * 256, 2, 2);
  }
  // 端の白線
  g.fillStyle = 'rgba(255,255,255,0.9)';
  g.fillRect(8, 0, 10, 256);
  g.fillRect(238, 0, 10, 256);
  // センターの黄色い破線
  g.fillStyle = 'rgba(255,224,80,0.95)';
  g.fillRect(122, 20, 12, 90);
  g.fillRect(122, 150, 12, 90);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function makeCurbTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 64;
  canvas.height = 64;
  const g = canvas.getContext('2d');
  g.fillStyle = '#ff4d4d';
  g.fillRect(0, 0, 64, 32);
  g.fillStyle = '#ffffff';
  g.fillRect(0, 32, 64, 32);
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

function makeCheckerTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 32;
  const g = canvas.getContext('2d');
  for (let x = 0; x < 8; x++) {
    for (let y = 0; y < 2; y++) {
      g.fillStyle = (x + y) % 2 === 0 ? '#111' : '#fff';
      g.fillRect(x * 16, y * 16, 16, 16);
    }
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.wrapS = THREE.RepeatWrapping;
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export class Track {
  constructor(courseDef) {
    this.def = courseDef;
    this.roadHalfWidth = courseDef.roadWidth / 2;
    const pts = courseDef.points.map(([x, y, z]) => new THREE.Vector3(x, y, z));
    this.curve = new THREE.CatmullRomCurve3(pts, true, 'catmullrom', 0.5);

    this.samples = [];
    this.cumDist = new Float32Array(SAMPLE_COUNT + 1);
    let prev = null;
    let dist = 0;
    for (let i = 0; i <= SAMPLE_COUNT; i++) {
      const t = i / SAMPLE_COUNT;
      const p = this.curve.getPointAt(t);
      const tangent = this.curve.getTangentAt(t);
      tangent.y = 0;
      tangent.normalize();
      const left = new THREE.Vector3(tangent.z, 0, -tangent.x);
      if (prev) dist += p.distanceTo(prev);
      this.cumDist[i] = dist;
      this.samples.push({ p, tangent, left });
      prev = p;
    }
    this.totalLength = this.cumDist[SAMPLE_COUNT];
    this.group = new THREE.Group();
    this.buildRoad();
    this.buildCurbs();
    this.buildStartGate();
    this.buildSupports();
  }

  // 高架区間の下に支柱を立てる(道路が宙に浮いて見えないように)
  buildSupports() {
    const mat = new THREE.MeshStandardMaterial({ color: 0xe8e2d8, roughness: 0.8 });
    const step = Math.floor(SAMPLE_COUNT / 48);
    for (let i = 0; i < SAMPLE_COUNT; i += step) {
      const { p, left } = this.samples[i];
      if (p.y < 2.2) continue;
      for (const side of [1, -1]) {
        const x = p.x + left.x * this.roadHalfWidth * 0.62 * side;
        const z = p.z + left.z * this.roadHalfWidth * 0.62 * side;
        const h = p.y + 0.4;
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(1.1, 1.4, h, 8), mat);
        pillar.position.set(x, h / 2 - 0.4, z);
        pillar.castShadow = true;
        this.group.add(pillar);
      }
    }
  }

  buildRoad() {
    const n = SAMPLE_COUNT;
    const positions = new Float32Array((n + 1) * 2 * 3);
    const uvs = new Float32Array((n + 1) * 2 * 2);
    const indices = [];
    const hw = this.roadHalfWidth;
    for (let i = 0; i <= n; i++) {
      const { p, left } = this.samples[i];
      const li = i * 6;
      positions[li] = p.x + left.x * hw;
      positions[li + 1] = p.y + ROAD_Y_OFFSET;
      positions[li + 2] = p.z + left.z * hw;
      positions[li + 3] = p.x - left.x * hw;
      positions[li + 4] = p.y + ROAD_Y_OFFSET;
      positions[li + 5] = p.z - left.z * hw;
      const v = this.cumDist[i] / 18;
      uvs[i * 4] = 0; uvs[i * 4 + 1] = v;
      uvs[i * 4 + 2] = 1; uvs[i * 4 + 3] = v;
      if (i < n) {
        const a = i * 2;
        indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
      }
    }
    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
    geo.setIndex(indices);
    geo.computeVertexNormals();
    const mat = new THREE.MeshStandardMaterial({
      map: makeRoadTexture(this.def.roadColor),
      roughness: 0.92,
      metalness: 0,
    });
    const mesh = new THREE.Mesh(geo, mat);
    mesh.receiveShadow = true;
    this.group.add(mesh);
  }

  buildCurbs() {
    const n = SAMPLE_COUNT;
    const tex = makeCurbTexture();
    for (const side of [1, -1]) {
      const positions = new Float32Array((n + 1) * 2 * 3);
      const uvs = new Float32Array((n + 1) * 2 * 2);
      const indices = [];
      const inner = this.roadHalfWidth;
      const outer = this.roadHalfWidth + CURB_WIDTH;
      for (let i = 0; i <= n; i++) {
        const { p, left } = this.samples[i];
        const li = i * 6;
        positions[li] = p.x + left.x * inner * side;
        positions[li + 1] = p.y + ROAD_Y_OFFSET + 0.06;
        positions[li + 2] = p.z + left.z * inner * side;
        positions[li + 3] = p.x + left.x * outer * side;
        positions[li + 4] = p.y + ROAD_Y_OFFSET + 0.12;
        positions[li + 5] = p.z + left.z * outer * side;
        const v = this.cumDist[i] / 4;
        uvs[i * 4] = 0; uvs[i * 4 + 1] = v;
        uvs[i * 4 + 2] = 1; uvs[i * 4 + 3] = v;
        if (i < n) {
          const a = i * 2;
          if (side === 1) indices.push(a, a + 1, a + 2, a + 1, a + 3, a + 2);
          else indices.push(a, a + 2, a + 1, a + 1, a + 2, a + 3);
        }
      }
      const geo = new THREE.BufferGeometry();
      geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2));
      geo.setIndex(indices);
      geo.computeVertexNormals();
      const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ map: tex, roughness: 0.8 }));
      mesh.receiveShadow = true;
      this.group.add(mesh);
    }
  }

  buildStartGate() {
    const s = this.samples[0];
    const gate = new THREE.Group();
    const postGeo = new THREE.CylinderGeometry(0.8, 1.0, 12, 10);
    const postMat = new THREE.MeshStandardMaterial({ color: 0xff7ab5, roughness: 0.4, emissive: 0xff4488, emissiveIntensity: 0.12 });
    const hw = this.roadHalfWidth + 2;
    for (const side of [1, -1]) {
      const post = new THREE.Mesh(postGeo, postMat);
      post.position.set(s.p.x + s.left.x * hw * side, s.p.y + 6, s.p.z + s.left.z * hw * side);
      post.castShadow = true;
      gate.add(post);
    }
    // チェッカーの横断幕
    const bannerGeo = new THREE.BoxGeometry(hw * 2, 2.4, 0.4);
    const banner = new THREE.Mesh(bannerGeo, new THREE.MeshStandardMaterial({ map: makeCheckerTexture() }));
    banner.position.set(s.p.x, s.p.y + 11.5, s.p.z);
    banner.rotation.y = Math.atan2(s.left.x, s.left.z);
    gate.add(banner);
    // スタートライン(路面)
    const lineGeo = new THREE.PlaneGeometry(this.roadHalfWidth * 2, 3.5);
    const line = new THREE.Mesh(lineGeo, new THREE.MeshStandardMaterial({ map: makeCheckerTexture(), roughness: 0.9 }));
    line.rotation.x = -Math.PI / 2;
    line.rotation.z = Math.atan2(s.left.x, s.left.z) + Math.PI / 2;
    line.position.set(s.p.x, s.p.y + ROAD_Y_OFFSET + 0.02, s.p.z);
    line.receiveShadow = true;
    gate.add(line);
    this.group.add(gate);
  }

  // 距離(m)からコース上の位置情報を取得
  sampleAt(distance) {
    const d = ((distance % this.totalLength) + this.totalLength) % this.totalLength;
    // 二分探索
    let lo = 0, hi = SAMPLE_COUNT;
    while (lo < hi) {
      const mid = (lo + hi) >> 1;
      if (this.cumDist[mid] < d) lo = mid + 1;
      else hi = mid;
    }
    const i1 = Math.max(1, lo);
    const i0 = i1 - 1;
    const segLen = this.cumDist[i1] - this.cumDist[i0] || 1;
    const f = (d - this.cumDist[i0]) / segLen;
    const s0 = this.samples[i0];
    const s1 = this.samples[i1];
    return {
      position: s0.p.clone().lerp(s1.p, f),
      tangent: s0.tangent.clone().lerp(s1.tangent, f).normalize(),
      left: s0.left.clone().lerp(s1.left, f).normalize(),
    };
  }

  // ワールド座標から最寄りのコース位置を検索(hintIdxの近傍から探す)
  locate(x, z, hintIdx) {
    const n = SAMPLE_COUNT;
    let bestIdx = hintIdx;
    let bestDistSq = Infinity;
    const searchRange = 40;
    for (let off = -searchRange; off <= searchRange; off++) {
      const i = ((hintIdx + off) % n + n) % n;
      const p = this.samples[i].p;
      const dx = x - p.x;
      const dz = z - p.z;
      const dSq = dx * dx + dz * dz;
      if (dSq < bestDistSq) {
        bestDistSq = dSq;
        bestIdx = i;
      }
    }
    const s = this.samples[bestIdx];
    const dx = x - s.p.x;
    const dz = z - s.p.z;
    const along = dx * s.tangent.x + dz * s.tangent.z;
    const lateral = dx * s.left.x + dz * s.left.z;
    // 高さは前後サンプルで補間
    const nextIdx = (bestIdx + 1) % n;
    const prevIdx = (bestIdx - 1 + n) % n;
    const yBase = along >= 0
      ? s.p.y + (this.samples[nextIdx].p.y - s.p.y) * Math.min(1, Math.abs(along) / (this.totalLength / n))
      : s.p.y + (this.samples[prevIdx].p.y - s.p.y) * Math.min(1, Math.abs(along) / (this.totalLength / n));
    return {
      index: bestIdx,
      distance: this.cumDist[bestIdx] + along,
      lateral,
      roadY: yBase + ROAD_Y_OFFSET,
      tangent: s.tangent,
      left: s.left,
    };
  }
}
