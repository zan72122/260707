// 光線の計算: プリズムの種類・光の色・虹つかみ(ベンド)・鏡の反射を反映して
// rig.rays = [{ci, hex, segs:[{x1,y1,x2,y2,dx,dy}], wBoost}] を作る

import { RAINBOW, TAU } from '../core/utils.js';

const MAX_BOUNCE = 2;

// 光線(p + t*d)と線分(a→b)の交差判定
function raySegHit(px, py, dx, dy, ax, ay, bx, by) {
  const sx = bx - ax;
  const sy = by - ay;
  const denom = dx * sy - dy * sx;
  if (Math.abs(denom) < 1e-9) return null;
  const t = ((ax - px) * sy - (ay - py) * sx) / denom;
  const u = ((ax - px) * dy - (ay - py) * dx) / denom;
  if (t > 8 && u >= 0 && u <= 1) {
    return { t, x: px + dx * t, y: py + dy * t };
  }
  return null;
}

function traceRay(rig, px, py, dx, dy, maxLen) {
  const segs = [];
  let x = px;
  let y = py;
  let dirX = dx;
  let dirY = dy;
  let remaining = maxLen;
  for (let bounce = 0; bounce <= MAX_BOUNCE; bounce++) {
    let bestT = remaining;
    let bestMirror = null;
    let bestHit = null;
    for (const m of rig.mirrors) {
      const hit = raySegHit(x, y, dirX, dirY, m.ax, m.ay, m.bx, m.by);
      if (hit && hit.t < bestT) {
        bestT = hit.t;
        bestMirror = m;
        bestHit = hit;
      }
    }
    const ex = x + dirX * bestT;
    const ey = y + dirY * bestT;
    segs.push({ x1: x, y1: y, x2: ex, y2: ey, dx: dirX, dy: dirY });
    if (!bestMirror) break;
    const mx = bestMirror.bx - bestMirror.ax;
    const my = bestMirror.by - bestMirror.ay;
    const len = Math.hypot(mx, my) || 1;
    let nx = -my / len;
    let ny = mx / len;
    if (nx * dirX + ny * dirY > 0) {
      nx = -nx;
      ny = -ny;
    }
    const dot = dirX * nx + dirY * ny;
    dirX = dirX - 2 * dot * nx;
    dirY = dirY - 2 * dot * ny;
    x = bestHit.x + dirX * 2;
    y = bestHit.y + dirY * 2;
    remaining -= bestT;
    if (remaining <= 20) break;
  }
  return segs;
}

// 帯1本ぶん: 出発点 + 方向。ベンド中は指の位置を経由する
function buildBand(rig, cx, cy, angle, lateral) {
  const ox = cx + Math.cos(angle + Math.PI / 2) * lateral;
  const oy = cy + Math.sin(angle + Math.PI / 2) * lateral;
  if (rig.bendT > 0.03) {
    // プリズム → つかんだ指(色ごとに少し横へずらす) → そのまま先へ
    const bx = rig.bendX + Math.cos(angle + Math.PI / 2) * lateral * 1.6;
    const by = rig.bendY + Math.sin(angle + Math.PI / 2) * lateral * 1.6;
    // ベンドの効き具合で直線とブレンド
    const t = rig.bendT;
    const straightX = ox + Math.cos(angle) * 320;
    const straightY = oy + Math.sin(angle) * 320;
    const viaX = straightX + (bx - straightX) * t;
    const viaY = straightY + (by - straightY) * t;
    const d2x = viaX - ox;
    const d2y = viaY - oy;
    const len = Math.hypot(d2x, d2y) || 1;
    const seg1 = { x1: ox, y1: oy, x2: viaX, y2: viaY, dx: d2x / len, dy: d2y / len };
    const rest = traceRay(rig, viaX, viaY, d2x / len, d2y / len, rig.beamLength - len);
    return [seg1, ...rest];
  }
  return traceRay(rig, ox, oy, Math.cos(angle), Math.sin(angle), rig.beamLength);
}

// プリズムの種類ごとの射出方向リストを作る
function bandAngles(rig, bandCount) {
  const base = rig.exitAngle();
  const mid = (bandCount - 1) / 2;
  const type = rig.prismType;
  const out = []; // [{angle, lateral, ci}]
  if (type === 'marble') {
    // ビー玉: 全方向へ放射状の丸い虹
    for (let ci = 0; ci < bandCount; ci++) {
      out.push({ ci, angle: rig.prismRot * 2 + (ci * TAU) / bandCount, lateral: 0 });
    }
    return out;
  }
  if (type === 'diamond') {
    // ダイヤ: 4方向に分裂した虹
    for (let k = 0; k < 4; k++) {
      for (let ci = 0; ci < bandCount; ci++) {
        out.push({
          ci,
          angle: base + (k * Math.PI) / 2 + (ci - mid) * rig.spread * 0.55,
          lateral: (ci - mid) * rig.prismSize * 0.18,
        });
      }
    }
    return out;
  }
  // さんかく・ハート・ほし・われた: 扇形ファン
  for (let ci = 0; ci < bandCount; ci++) {
    out.push({
      ci,
      angle: base + (ci - mid) * rig.spread,
      lateral: (ci - mid) * rig.prismSize * 0.3,
    });
  }
  return out;
}

export function computeRays(rig) {
  const rays = [];
  const mono = rig.lightColor.ci; // -1なら虹、0以上なら単色
  if (mono >= 0) {
    // 単色の光はプリズムを通しても分かれない(大発見!)
    const type = rig.prismType;
    const dirs = type === 'marble'
      ? [0, 1, 2, 3].map((k) => rig.prismRot * 2 + (k * TAU) / 4)
      : type === 'diamond'
        ? [0, 1, 2, 3].map((k) => rig.exitAngle() + (k * Math.PI) / 2)
        : [rig.exitAngle()];
    for (const a of dirs) {
      rays.push({ ci: mono, hex: RAINBOW[mono].hex, wBoost: 2.4, segs: buildBand(rig, rig.prismX, rig.prismY, a, 0) });
    }
    return rays;
  }
  for (const b of bandAngles(rig, RAINBOW.length)) {
    rays.push({
      ci: b.ci,
      hex: RAINBOW[b.ci].hex,
      wBoost: 1,
      segs: buildBand(rig, rig.prismX, rig.prismY, b.angle, b.lateral),
    });
  }
  return rays;
}
