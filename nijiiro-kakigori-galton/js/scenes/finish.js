// 「いただきます」から「ごちそうさま」までの演出(play.jsから委譲される)
import { TAU, clamp, drawBubbleText, drawRainbowText, easeOutBack, roundRect } from '../core/utils.js';
import { audio } from '../core/audio.js';

export const EAT_INTERVAL = 0.55;

// eatフェーズの更新。食べ終わったら true を返す
export function updateEat(scene, dt) {
  scene.eatT -= dt;
  scene.spoonAngle = Math.sin(scene.phaseT * (Math.PI * 2 / EAT_INTERVAL) * 0.5) * 0.35;
  if (scene.eatT > 0) return false;
  scene.eatT = EAT_INTERVAL;
  const bite = Math.max(12, Math.ceil(scene.slots.total() / 9));
  const removed = scene.slots.eatBite(bite);
  audio.scoop();
  audio.munch();
  if (removed) {
    for (let i = 0; i < Math.min(removed.length, 5); i++) {
      scene.fx.splash(removed[i].x, removed[i].y, removed[i].hue, 4);
    }
  }
  if (scene.slots.total() === 0) {
    audio.fullChime();
    scene.mascot.setMood('yum', 4);
    scene.fx.confettiBurst(scene.L.cx, scene.L.h * 0.4, 60, 400);
    return true;
  }
  return false;
}

// いただきます/ごちそうさまのオーバーレイ
export function drawFinishOverlay(scene, ctx, t) {
  const L = scene.L;
  if (scene.phase === 'itadaki') {
    const k = easeOutBack(Math.min(1, scene.phaseT * 1.8));
    ctx.save();
    ctx.translate(L.cx, L.h * 0.34);
    ctx.scale(k, k);
    ctx.font = `${clamp(L.h * 0.1, 56, 110)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText('🙏', 0, -clamp(L.h * 0.085, 46, 90));
    drawRainbowText(ctx, 'いただきます!', 0, clamp(L.h * 0.03, 16, 34), clamp(L.boardW * 0.11, 30, 64), t * 120);
    ctx.restore();
  }
  if (scene.phase === 'end') {
    drawRainbowText(ctx, 'ごちそうさまでした!', L.cx, scene.itadakiBtn.y - scene.itadakiBtn.h, clamp(L.boardW * 0.085, 24, 56), t * 120);
    drawReplayButton(scene, ctx, t);
  }
}

// 食べる時のスプーン(いちばん高い柱をすくう)
export function drawSpoon(scene, ctx, t) {
  const L = scene.L;
  let topY = L.iceY, topX = L.cx;
  for (let i = 0; i < L.nSlots; i++) {
    const y = scene.slots.floorY(i);
    if (y < topY) { topY = y; topX = L.slotX(i) + L.slotW / 2; }
  }
  const s = clamp(L.boardW * 0.09, 30, 60);
  const dig = Math.max(0, Math.sin(scene.phaseT * (Math.PI * 2 / EAT_INTERVAL))) * s * 0.5;
  ctx.save();
  ctx.translate(topX + s * 1.2, topY - s * 1.1 + dig);
  ctx.rotate(-0.7 + scene.spoonAngle);
  ctx.fillStyle = '#f4a83c';
  ctx.strokeStyle = '#c67f1e';
  ctx.lineWidth = 2;
  roundRect(ctx, -s * 0.09, -s * 1.9, s * 0.18, s * 1.6, s * 0.09);
  ctx.fill();
  ctx.stroke();
  const g = ctx.createRadialGradient(-s * 0.1, -s * 0.1, s * 0.05, 0, 0, s * 0.42);
  g.addColorStop(0, '#ffe9c4');
  g.addColorStop(1, '#f4a83c');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, 0, s * 0.34, s * 0.44, 0, 0, TAU);
  ctx.fill();
  ctx.stroke();
  ctx.restore();
}

function drawReplayButton(scene, ctx, t) {
  const b = scene.replayBtn;
  const pulse = 1 + Math.sin(t * 4.5) * 0.04;
  const k = easeOutBack(Math.min(1, scene.phaseT * 1.5));
  const w = b.w * 0.82 * pulse * k, h = b.h * 0.9 * pulse * k;
  if (w < 4) return;
  ctx.save();
  ctx.translate(b.x, b.y);
  const g = ctx.createLinearGradient(0, -h / 2, 0, h / 2);
  g.addColorStop(0, '#7fd4ff');
  g.addColorStop(1, '#3ba7e8');
  ctx.fillStyle = g;
  roundRect(ctx, -w / 2, -h / 2, w, h, h / 2);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 5;
  ctx.stroke();
  drawBubbleText(ctx, '🔁 もういっかい!', 0, 0, h * 0.4, '#ffffff', 'rgba(30,100,160,0.9)', 0.16);
  ctx.restore();
}
