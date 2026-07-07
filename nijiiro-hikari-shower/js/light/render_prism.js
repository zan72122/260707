// プリズムの描画: さんかく・ビーだま・ダイヤ・ハート・ほし・われた の6種類

import { TAU, drawGlow, heartPath, starPath } from '../core/utils.js';

const GLASS_STROKE = 'rgba(255,255,255,0.95)';

function glassGradient(ctx, s) {
  const grad = ctx.createLinearGradient(-s, -s, s, s);
  grad.addColorStop(0, 'rgba(235,250,255,0.92)');
  grad.addColorStop(0.45, 'rgba(190,225,255,0.65)');
  grad.addColorStop(0.55, 'rgba(255,220,250,0.6)');
  grad.addColorStop(1, 'rgba(210,235,255,0.88)');
  return grad;
}

export function drawPrism(ctx, rig, time) {
  const { prismX: x, prismY: y, prismSize: s, prismRot: rot } = rig;
  ctx.save();
  ctx.translate(x, y);

  const glowR = s * (2.2 + rig.glow * 1.2 + Math.sin(time * 2) * 0.15);
  drawGlow(ctx, 0, 0, glowR, '#bde5ff', 0.3 + rig.glow * 0.3);

  ctx.rotate(rot);
  ctx.fillStyle = glassGradient(ctx, s);
  ctx.strokeStyle = GLASS_STROKE;
  ctx.lineWidth = 3;
  ctx.lineJoin = 'round';

  switch (rig.prismType) {
    case 'marble': {
      ctx.beginPath();
      ctx.arc(0, 0, s, 0, TAU);
      ctx.fill();
      ctx.stroke();
      // ビー玉のうずまき
      ctx.strokeStyle = 'rgba(255,255,255,0.55)';
      ctx.lineWidth = s * 0.13;
      ctx.beginPath();
      ctx.arc(0, 0, s * 0.5, time, time + 2.4);
      ctx.stroke();
      break;
    }
    case 'diamond': {
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(s * 0.8, 0);
      ctx.lineTo(0, s);
      ctx.lineTo(-s * 0.8, 0);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
      // カット面
      ctx.strokeStyle = 'rgba(255,255,255,0.6)';
      ctx.lineWidth = 1.6;
      ctx.beginPath();
      ctx.moveTo(0, -s);
      ctx.lineTo(0, s);
      ctx.moveTo(-s * 0.8, 0);
      ctx.lineTo(s * 0.8, 0);
      ctx.stroke();
      break;
    }
    case 'heart': {
      heartPath(ctx, 0, s * 0.18, s * 1.05);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'star': {
      starPath(ctx, 0, 0, s * 1.1, s * 0.52);
      ctx.fill();
      ctx.stroke();
      break;
    }
    case 'broken': {
      drawTriangle(ctx, s);
      // ひび割れ
      ctx.strokeStyle = 'rgba(120,160,200,0.85)';
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(-s * 0.1, -s * 0.7);
      ctx.lineTo(s * 0.12, -s * 0.2);
      ctx.lineTo(-s * 0.14, s * 0.15);
      ctx.lineTo(s * 0.1, s * 0.55);
      ctx.stroke();
      break;
    }
    default:
      drawTriangle(ctx, s);
  }

  // 内側のキラッと感 + 走るハイライト
  ctx.globalCompositeOperation = 'lighter';
  const hl = (time * 0.6) % 1;
  drawGlow(ctx, (hl - 0.5) * s * 1.4, (0.5 - hl) * s * 0.9, s * 0.5, '#ffffff', 0.5);
  ctx.restore();
}

function drawTriangle(ctx, s) {
  const tri = [];
  for (let i = 0; i < 3; i++) {
    const a = -Math.PI / 2 + (i * TAU) / 3;
    tri.push({ x: Math.cos(a) * s, y: Math.sin(a) * s });
  }
  ctx.beginPath();
  ctx.moveTo(tri[0].x, tri[0].y);
  ctx.lineTo(tri[1].x, tri[1].y);
  ctx.lineTo(tri[2].x, tri[2].y);
  ctx.closePath();
  ctx.fill();
  ctx.stroke();
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.fillStyle = 'rgba(255,255,255,0.28)';
  ctx.beginPath();
  ctx.moveTo(tri[0].x, tri[0].y);
  ctx.lineTo(0, 0);
  ctx.lineTo(tri[1].x, tri[1].y);
  ctx.closePath();
  ctx.fill();
  ctx.restore();
}
