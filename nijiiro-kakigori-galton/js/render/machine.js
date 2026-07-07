// お祭りのかき氷マシン(屋台)の描画
import { TAU, clamp, rand, roundRect, drawBubbleText } from '../core/utils.js';

// 木のテーブル(最下段)
export function drawTable(ctx, L) {
  const y = L.cupBottom - 2;
  const g = ctx.createLinearGradient(0, y, 0, L.h);
  g.addColorStop(0, '#e8b878');
  g.addColorStop(0.25, '#d9a05e');
  g.addColorStop(1, '#c08a4a');
  ctx.fillStyle = g;
  ctx.fillRect(0, y, L.w, L.h - y);
  ctx.strokeStyle = 'rgba(150,100,50,0.25)';
  ctx.lineWidth = 2;
  const n = Math.ceil(L.w / 90);
  for (let i = 0; i <= n; i++) {
    const x = i * 90 + 20;
    ctx.beginPath();
    ctx.moveTo(x, y + 4);
    ctx.quadraticCurveTo(x + 25, (y + L.h) / 2, x - 10, L.h);
    ctx.stroke();
  }
}

// 屋台の骨組み: ひさし(赤白テント)・柱・ちょうちん
export function drawStall(ctx, L, t) {
  const aw = L.awningH;
  // 柱
  const postW = clamp(L.boardW * 0.03, 8, 16);
  for (const x of [L.boardX - postW * 0.6, L.boardX + L.boardW - postW * 0.4]) {
    const g = ctx.createLinearGradient(x, 0, x + postW, 0);
    g.addColorStop(0, '#b07840');
    g.addColorStop(0.5, '#d99c5e');
    g.addColorStop(1, '#9a6534');
    ctx.fillStyle = g;
    ctx.fillRect(x, aw * 0.7, postW, L.cupBottom - aw * 0.7);
  }
  // ひさし(スカラップの赤白ストライプ)
  const scallops = Math.max(6, Math.round(L.w / 74));
  const sw = L.w / scallops;
  for (let i = 0; i < scallops; i++) {
    ctx.fillStyle = i % 2 === 0 ? '#ff6b6b' : '#fff6ec';
    ctx.beginPath();
    ctx.rect(i * sw, 0, sw + 0.5, aw * 0.62);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(i * sw + sw / 2, aw * 0.62, sw / 2, 0, Math.PI);
    ctx.fill();
  }
  ctx.fillStyle = 'rgba(160,40,40,0.25)';
  ctx.fillRect(0, 0, L.w, 3);
  // ちょうちん
  const n = L.portrait ? 2 : 4;
  for (let i = 0; i < n; i++) {
    const x = L.w * ((i + 0.5) / n) + (i % 2 ? 30 : -30);
    if (Math.abs(x - L.cx) < L.tank.w * 0.62) continue; // タンクと重ねない
    drawLantern(ctx, x, aw * 0.8, clamp(L.w * 0.028, 13, 22), t + i * 1.7);
  }
}

function drawLantern(ctx, x, y, r, t) {
  const sway = Math.sin(t * 1.7) * 0.12;
  ctx.save();
  ctx.translate(x, y);
  ctx.rotate(sway);
  ctx.strokeStyle = '#7a5230';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(0, -r * 0.9);
  ctx.lineTo(0, 0);
  ctx.stroke();
  const g = ctx.createRadialGradient(-r * 0.3, r * 0.6, r * 0.2, 0, r, r * 1.3);
  g.addColorStop(0, '#ffb0a0');
  g.addColorStop(0.6, '#ff5d4d');
  g.addColorStop(1, '#d63a2e');
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.ellipse(0, r, r * 0.85, r, 0, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = 'rgba(140,30,20,0.5)';
  ctx.lineWidth = 1;
  for (let i = -2; i <= 2; i++) {
    ctx.beginPath();
    ctx.ellipse(0, r, r * 0.85 * Math.abs(i) / 2.6 + r * 0.12, r, 0, 0, TAU);
    ctx.stroke();
  }
  ctx.fillStyle = '#f5d76e';
  ctx.fillRect(-r * 0.3, 0, r * 0.6, r * 0.16);
  ctx.fillRect(-r * 0.3, r * 1.92, r * 0.6, r * 0.16);
  ctx.restore();
}

// タンクの背面ガラスと漏斗の本体(玉より奥)
export function drawTankBack(ctx, L) {
  const T = L.tank;
  const g = ctx.createLinearGradient(T.x, 0, T.x + T.w, 0);
  g.addColorStop(0, 'rgba(190,230,250,0.5)');
  g.addColorStop(0.5, 'rgba(235,250,255,0.28)');
  g.addColorStop(1, 'rgba(180,225,248,0.5)');
  ctx.fillStyle = g;
  roundRect(ctx, T.x, T.y, T.w, T.h + 4, 10);
  ctx.fill();
  // 漏斗の内側
  ctx.fillStyle = 'rgba(205,235,252,0.45)';
  ctx.beginPath();
  ctx.moveTo(T.x, L.tankBottom);
  ctx.lineTo(T.x + T.w, L.tankBottom);
  ctx.lineTo(L.cx + L.throatHalf, L.throatY);
  ctx.lineTo(L.cx - L.throatHalf, L.throatY);
  ctx.closePath();
  ctx.fill();
}

// タンクの前面ガラス・フレーム・ゲートの扉(玉より手前)
export function drawTankFront(ctx, L, gateRatio, t) {
  const T = L.tank;
  // ガラスの反射
  ctx.strokeStyle = 'rgba(255,255,255,0.7)';
  ctx.lineWidth = clamp(T.w * 0.015, 2.5, 5);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(T.x + T.w * 0.09, T.y + T.h * 0.16);
  ctx.quadraticCurveTo(T.x + T.w * 0.05, T.y + T.h * 0.55, T.x + T.w * 0.12, T.y + T.h * 0.85);
  ctx.stroke();
  // タンク枠
  ctx.strokeStyle = 'rgba(120,180,215,0.95)';
  ctx.lineWidth = 3;
  roundRect(ctx, T.x, T.y, T.w, T.h + 4, 10);
  ctx.stroke();
  // 上ふち(金属)
  const rim = ctx.createLinearGradient(0, T.y - 6, 0, T.y + 4);
  rim.addColorStop(0, '#cfe8f7');
  rim.addColorStop(1, '#8fc3e2');
  ctx.fillStyle = rim;
  roundRect(ctx, T.x - 6, T.y - 7, T.w + 12, 10, 5);
  ctx.fill();
  // 漏斗の縁
  ctx.strokeStyle = 'rgba(120,180,215,0.95)';
  ctx.lineWidth = 3.5;
  ctx.beginPath();
  ctx.moveTo(T.x, L.tankBottom);
  ctx.lineTo(L.cx - L.throatHalf, L.throatY);
  ctx.moveTo(T.x + T.w, L.tankBottom);
  ctx.lineTo(L.cx + L.throatHalf, L.throatY);
  ctx.stroke();
  // ゲートの扉(左から閉じる金属プレート)
  const doorW = (1 - gateRatio) * L.throatHalf * 2;
  const doorH = clamp(L.ballR * 1.1, 5, 10);
  if (doorW > 1) {
    const dg = ctx.createLinearGradient(0, L.throatY - doorH / 2, 0, L.throatY + doorH / 2);
    dg.addColorStop(0, '#e9f5fc');
    dg.addColorStop(0.5, '#9fc9e4');
    dg.addColorStop(1, '#6f9fc0');
    ctx.fillStyle = dg;
    roundRect(ctx, L.cx - L.throatHalf, L.throatY - doorH / 2, doorW, doorH, 3);
    ctx.fill();
    ctx.strokeStyle = 'rgba(70,110,140,0.7)';
    ctx.lineWidth = 1.5;
    ctx.stroke();
  }
  // 喉の口金
  ctx.fillStyle = 'rgba(120,180,215,0.9)';
  for (const s of [-1, 1]) {
    ctx.beginPath();
    ctx.arc(L.cx + s * L.throatHalf, L.throatY, 4, 0, TAU);
    ctx.fill();
  }
}

// 氷結晶のピンの森(外れたピンは点線ソケット)
export function drawPins(ctx, L, glow, removedSet, t) {
  for (const pin of L.pins) {
    if (removedSet.has(pin.idx)) {
      ctx.strokeStyle = 'rgba(130,180,215,0.5)';
      ctx.lineWidth = 1.5;
      ctx.setLineDash([3, 3]);
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, L.pinR, 0, TAU);
      ctx.stroke();
      ctx.setLineDash([]);
      continue;
    }
    const gv = glow[pin.idx];
    const r = L.pinR * (1 + gv * 0.4);
    if (gv > 0.03) {
      const g = ctx.createRadialGradient(pin.x, pin.y, 0, pin.x, pin.y, r * 3);
      g.addColorStop(0, `hsla(${(pin.row * 40 + t * 90) % 360} 90% 70% / ${gv * 0.5})`);
      g.addColorStop(1, 'hsla(0 0% 100% / 0)');
      ctx.fillStyle = g;
      ctx.beginPath();
      ctx.arc(pin.x, pin.y, r * 3, 0, TAU);
      ctx.fill();
    }
    const body = ctx.createRadialGradient(pin.x - r * 0.3, pin.y - r * 0.3, r * 0.1, pin.x, pin.y, r);
    body.addColorStop(0, '#ffffff');
    body.addColorStop(0.55, '#dff3ff');
    body.addColorStop(1, '#9fd4f2');
    ctx.fillStyle = body;
    ctx.beginPath();
    ctx.arc(pin.x, pin.y, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,180,220,0.5)';
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// 氷のカップ(スロットの土台になる大きなガラス皿と氷)
export function drawCup(ctx, L, t) {
  // ガラス皿の背面
  ctx.fillStyle = 'rgba(215,242,254,0.4)';
  roundRect(ctx, L.boardX - 6, L.slotTop - 4, L.boardW + 12, L.cupBottom - L.slotTop + 4, 8);
  ctx.fill();
  // 氷の床
  const iceG = ctx.createLinearGradient(0, L.iceY, 0, L.cupBottom);
  iceG.addColorStop(0, '#ffffff');
  iceG.addColorStop(0.5, '#eefaff');
  iceG.addColorStop(1, '#d5eefb');
  ctx.fillStyle = iceG;
  ctx.fillRect(L.boardX - 2, L.iceY, L.boardW + 4, L.cupBottom - L.iceY);
  // 氷のもこもこ(前面の縁)
  ctx.fillStyle = 'rgba(255,255,255,0.95)';
  const puffs = Math.max(7, Math.round(L.boardW / 46));
  for (let i = 0; i < puffs; i++) {
    const x = L.boardX + ((i + 0.5) / puffs) * L.boardW;
    const r = (L.boardW / puffs) * 0.62;
    ctx.beginPath();
    ctx.arc(x, L.iceY + r * 0.15, r, 0, TAU);
    ctx.fill();
  }
  // 氷のきらめき
  ctx.fillStyle = 'rgba(180,225,248,0.85)';
  for (let i = 0; i < 12; i++) {
    const u = (i * 0.383) % 1;
    const x = L.boardX + u * L.boardW;
    const y = L.iceY + ((i * 0.617) % 1) * (L.cupBottom - L.iceY) * 0.8 + 4;
    const tw = 0.5 + 0.5 * Math.sin(t * 2.2 + i * 1.7);
    ctx.globalAlpha = 0.3 + tw * 0.4;
    const s = 1.4 + tw * 1.4;
    ctx.fillRect(x - s / 2, y - s * 1.5, s, s * 3);
    ctx.fillRect(x - s * 1.5, y - s / 2, s * 3, s);
  }
  ctx.globalAlpha = 1;
}

// 透明な仕切り板(玉より手前にうっすら)
export function drawDividers(ctx, L) {
  for (let k = 1; k < L.nSlots; k++) {
    const x = L.boardX + k * L.slotW;
    const g = ctx.createLinearGradient(x - 2, 0, x + 2, 0);
    g.addColorStop(0, 'rgba(200,235,252,0.15)');
    g.addColorStop(0.5, 'rgba(255,255,255,0.55)');
    g.addColorStop(1, 'rgba(200,235,252,0.15)');
    ctx.fillStyle = g;
    ctx.fillRect(x - 2, L.slotTop, 4, L.iceY - L.slotTop);
    ctx.fillStyle = 'rgba(160,210,240,0.8)';
    ctx.beginPath();
    ctx.arc(x, L.slotTop, 2.6, 0, TAU);
    ctx.fill();
  }
  // 皿の前面ガラス光
  ctx.strokeStyle = 'rgba(255,255,255,0.5)';
  ctx.lineWidth = 2.5;
  ctx.beginPath();
  ctx.moveTo(L.boardX + 8, L.slotTop + 8);
  ctx.quadraticCurveTo(L.boardX + 4, (L.slotTop + L.iceY) / 2, L.boardX + 10, L.iceY - 6);
  ctx.stroke();
}

// 大きな赤レバー(引き下げるとゲートが開く)
export function drawLever(ctx, L, ratio, ready, t) {
  const lv = L.lever;
  const y = lv.topY + (lv.botY - lv.topY) * ratio;
  // GO!の光(準備完了時)
  if (ready) {
    const a = 0.4 + 0.3 * Math.sin(t * 6);
    const g = ctx.createRadialGradient(lv.x, y, 0, lv.x, y, lv.handleR * 2.6);
    g.addColorStop(0, `rgba(255,230,90,${a})`);
    g.addColorStop(1, 'rgba(255,230,90,0)');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(lv.x, y, lv.handleR * 2.6, 0, TAU);
    ctx.fill();
  }
  // レール
  ctx.strokeStyle = 'rgba(110,80,50,0.85)';
  ctx.lineWidth = clamp(lv.handleR * 0.36, 7, 13);
  ctx.lineCap = 'round';
  ctx.beginPath();
  ctx.moveTo(lv.x, lv.topY);
  ctx.lineTo(lv.x, lv.botY);
  ctx.stroke();
  ctx.strokeStyle = 'rgba(240,215,180,0.9)';
  ctx.lineWidth = clamp(lv.handleR * 0.16, 3, 6);
  ctx.beginPath();
  ctx.moveTo(lv.x, lv.topY);
  ctx.lineTo(lv.x, lv.botY);
  ctx.stroke();
  // 下向き矢印(引く方向のガイド)
  ctx.fillStyle = 'rgba(255,255,255,0.85)';
  const ay = lv.botY + lv.handleR * 0.9;
  ctx.beginPath();
  ctx.moveTo(lv.x - lv.handleR * 0.42, ay - lv.handleR * 0.3);
  ctx.lineTo(lv.x + lv.handleR * 0.42, ay - lv.handleR * 0.3);
  ctx.lineTo(lv.x, ay + lv.handleR * 0.32);
  ctx.closePath();
  ctx.fill();
  // 赤いボールハンドル
  const hg = ctx.createRadialGradient(lv.x - lv.handleR * 0.3, y - lv.handleR * 0.35, lv.handleR * 0.15, lv.x, y, lv.handleR);
  hg.addColorStop(0, '#ff9d9d');
  hg.addColorStop(0.6, '#ff4d5e');
  hg.addColorStop(1, '#c92338');
  ctx.fillStyle = hg;
  ctx.beginPath();
  ctx.arc(lv.x, y, lv.handleR, 0, TAU);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.stroke();
  drawBubbleText(ctx, 'GO!', lv.x, y + 1, lv.handleR * 0.72, '#ffffff', 'rgba(150,20,40,0.9)', 0.18);
}
