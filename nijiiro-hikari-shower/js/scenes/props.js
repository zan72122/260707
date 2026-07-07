// シーン共有の小物描画: 花・手鏡・霧吹き・ガラスのコップ
// 「白いものに色が染みる」表現のため、色は mixHex で白から徐々に変える

import { TAU, drawGlow, mixHex, rgba, roundRect } from '../core/utils.js';

// 花: petals配列に花びらごとの色(hexまたはnull=白)とbloom(0..1)を持つ
export function drawFlower(ctx, f, time) {
  const sway = Math.sin(time * 1.3 + f.x * 0.02) * 0.05;
  ctx.save();
  ctx.translate(f.x, f.y);
  ctx.rotate(sway);
  // 茎と葉
  ctx.strokeStyle = '#5faa5f';
  ctx.lineWidth = f.size * 0.14;
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(0, f.size * 0.4);
  ctx.quadraticCurveTo(f.size * 0.15, f.size * 1.2, 0, f.size * 1.9);
  ctx.stroke();
  ctx.fillStyle = '#74c274';
  ctx.beginPath();
  ctx.ellipse(f.size * 0.42, f.size * 1.3, f.size * 0.4, f.size * 0.18, -0.5, 0, TAU);
  ctx.fill();

  const bloom = f.bloom ?? 1;
  const open = 0.35 + bloom * 0.65;
  for (let i = 0; i < f.petals.length; i++) {
    const a = (i * TAU) / f.petals.length - Math.PI / 2 + (1 - bloom) * 0.4;
    const hex = f.petals[i];
    const col = hex ? mixHex('#fef9f0', hex, Math.min(1, f.tint?.[i] ?? 1)) : '#fef9f0';
    ctx.fillStyle = col;
    ctx.strokeStyle = 'rgba(190,170,150,0.35)';
    ctx.lineWidth = 1.2;
    ctx.save();
    ctx.rotate(a);
    ctx.beginPath();
    ctx.ellipse(f.size * 0.52 * open, 0, f.size * 0.52 * open, f.size * 0.3 * open, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.restore();
  }
  // 中心
  const cg = ctx.createRadialGradient(0, 0, 0, 0, 0, f.size * 0.3);
  cg.addColorStop(0, '#ffe98f');
  cg.addColorStop(1, '#f2b93d');
  ctx.fillStyle = cg;
  ctx.beginPath();
  ctx.arc(0, 0, f.size * 0.28 * open, 0, TAU);
  ctx.fill();
  if (f.glow > 0) drawGlow(ctx, 0, 0, f.size * 1.6, '#fff2b0', f.glow * 0.5);
  ctx.restore();
}

// 手鏡: {x, y, rot, len} 反射用の線分は mirrorSegment() で取得
export function drawHandMirror(ctx, m, time) {
  ctx.save();
  ctx.translate(m.x, m.y);
  ctx.rotate(m.rot);
  // 柄
  ctx.fillStyle = '#e59ac2';
  roundRect(ctx, -m.len * 0.09, m.len * 0.42, m.len * 0.18, m.len * 0.52, m.len * 0.09);
  ctx.fill();
  // フレーム
  ctx.fillStyle = '#f7bcd9';
  ctx.strokeStyle = '#e07eb0';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.ellipse(0, 0, m.len * 0.42, m.len * 0.5, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  // 鏡面(きらーん)
  const g = ctx.createLinearGradient(-m.len * 0.3, -m.len * 0.4, m.len * 0.3, m.len * 0.4);
  const shift = (Math.sin(time * 1.5) + 1) / 2;
  g.addColorStop(0, '#dff3ff');
  g.addColorStop(Math.max(0.01, shift - 0.12), '#dff3ff');
  g.addColorStop(shift, '#ffffff');
  g.addColorStop(Math.min(0.99, shift + 0.12), '#cfe9fb');
  g.addColorStop(1, '#bcdcf2');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, m.len * 0.34, m.len * 0.42, 0, 0, TAU);
  ctx.fill();
  ctx.restore();
}

// 鏡の反射線分(縦長の鏡面を線分とみなす)
export function mirrorSegment(m) {
  const dx = Math.sin(m.rot);
  const dy = -Math.cos(m.rot);
  const half = m.len * 0.42;
  return {
    ax: m.x - dx * half,
    ay: m.y - dy * half,
    bx: m.x + dx * half,
    by: m.y + dy * half,
  };
}

// 霧吹きボトル
export function drawSprayBottle(ctx, s, squeeze = 0) {
  ctx.save();
  ctx.translate(s.x, s.y);
  ctx.scale(1 - squeeze * 0.08, 1 + squeeze * 0.05);
  const w = s.size;
  // ボトル(すりガラス風)
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, 'rgba(160,220,250,0.85)');
  g.addColorStop(0.5, 'rgba(210,245,255,0.9)');
  g.addColorStop(1, 'rgba(140,205,240,0.85)');
  ctx.fillStyle = g;
  roundRect(ctx, -w / 2, -w * 0.2, w, w * 1.3, w * 0.24);
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.8)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // 水位
  ctx.fillStyle = 'rgba(110,190,240,0.55)';
  roundRect(ctx, -w / 2 + 4, w * 0.35, w - 8, w * 0.68, w * 0.18);
  ctx.fill();
  // ヘッド+ノズル
  ctx.fillStyle = '#ff9ecd';
  roundRect(ctx, -w * 0.3, -w * 0.55, w * 0.6, w * 0.4, w * 0.1);
  ctx.fill();
  ctx.fillStyle = '#e5679f';
  roundRect(ctx, w * 0.24, -w * 0.5, w * 0.34, w * 0.18, w * 0.06);
  ctx.fill();
  ctx.restore();
}

// ガラスのコップ(水入り)
export function drawGlassCup(ctx, c, time) {
  const w = c.size;
  const h = c.size * 1.25;
  ctx.save();
  ctx.translate(c.x, c.y);
  // ガラス本体
  ctx.beginPath();
  ctx.moveTo(-w / 2, -h / 2);
  ctx.lineTo(-w * 0.4, h / 2);
  ctx.quadraticCurveTo(0, h * 0.58, w * 0.4, h / 2);
  ctx.lineTo(w / 2, -h / 2);
  ctx.closePath();
  const g = ctx.createLinearGradient(-w / 2, 0, w / 2, 0);
  g.addColorStop(0, 'rgba(200,235,255,0.4)');
  g.addColorStop(0.5, 'rgba(255,255,255,0.16)');
  g.addColorStop(1, 'rgba(190,230,255,0.42)');
  ctx.fillStyle = g;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255,255,255,0.85)';
  ctx.lineWidth = 2.5;
  ctx.stroke();
  // 水面(ゆらゆら)
  const lv = -h * 0.08;
  ctx.beginPath();
  ctx.moveTo(-w * 0.44, lv);
  for (let i = 0; i <= 10; i++) {
    const x = -w * 0.44 + (i / 10) * w * 0.88;
    ctx.lineTo(x, lv + Math.sin(time * 3 + i) * 1.6);
  }
  ctx.lineTo(w * 0.4, h / 2);
  ctx.quadraticCurveTo(0, h * 0.58, -w * 0.4, h / 2);
  ctx.closePath();
  ctx.fillStyle = 'rgba(120,200,245,0.4)';
  ctx.fill();
  // ハイライト
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(-w * 0.32, -h * 0.36);
  ctx.lineTo(-w * 0.26, h * 0.3);
  ctx.stroke();
  ctx.restore();
}

// ゆらゆら光模様(コースティクス)を壁や天井に描く
export function drawCaustics(ctx, x, y, w, h, time, hex = '#bfe9ff', alpha = 0.5) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(x, y);
  for (let i = 0; i < 3; i++) {
    const t = time * (1.1 + i * 0.35) + i * 2;
    ctx.strokeStyle = rgba(hex, alpha * (0.55 - i * 0.13));
    ctx.lineWidth = 7 - i * 1.6;
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let j = 0; j <= 22; j++) {
      const px = (j / 22 - 0.5) * w;
      const py = Math.sin(j * 0.65 + t) * h * 0.24 + Math.sin(j * 0.3 - t * 1.4) * h * 0.16;
      if (j === 0) ctx.moveTo(px, py);
      else ctx.lineTo(px, py);
    }
    ctx.stroke();
  }
  ctx.restore();
}
