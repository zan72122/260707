// ゴルトンボード: ピンの配置と、落下する粒の物理シミュレーション
import { TAU, rand, clamp } from '../core/utils.js';
import { audio } from '../core/audio.js';

const BOUNCE_DAMP = 0.45;      // ピン衝突時の反発係数
const SIDE_KICK = 0.55;        // 左右へ分かれる力(ゴルトンらしさの源)
const WALL_DAMP = 0.4;
const MAX_DROPS = 130;

export class Board {
  constructor() {
    this.pins = [];
    this.drops = [];
    this.L = null;
    this.onLand = null;   // (drop) => void  粒が山に着地した時
    this.onPinHit = null; // (pin, drop) => void
  }

  setLayout(L) {
    this.L = L;
    this.pins = [];
    for (let row = 0; row < L.rows; row++) {
      const even = row % 2 === 0;
      const count = even ? L.cols : L.cols - 1;
      const offset = even ? L.pinGapX / 2 : L.pinGapX;
      for (let i = 0; i < count; i++) {
        this.pins.push({
          x: L.boardX + offset + i * L.pinGapX,
          y: L.pinTop + row * L.pinGapY,
          row,
          glow: 0,
          wob: 0,
          wobPhase: rand(0, TAU),
        });
      }
    }
  }

  // 粒を放出する(hueは色相、specialは特別トッピング定義またはnull)
  release(x, hue, special = null) {
    if (this.drops.length >= MAX_DROPS) return;
    const L = this.L;
    const r = L.grainR * (special ? special.size : rand(0.85, 1.12));
    this.drops.push({
      x: clamp(x + rand(-3, 3), L.boardX + r, L.boardX + L.boardW - r),
      y: L.faucetY + 10,
      vx: rand(-14, 14),
      vy: rand(0, 40),
      r,
      hue,
      special,
      rot: rand(0, TAU),
      vr: rand(-3, 3),
      trail: [],
    });
    audio.drop();
  }

  // surfaceAt: x座標での山の表面Y(pileが提供)
  update(dt, surfaceAt) {
    const L = this.L;
    for (const pin of this.pins) {
      pin.glow = Math.max(0, pin.glow - dt * 2.4);
      pin.wob = Math.max(0, pin.wob - dt * 2.0);
    }

    const drops = this.drops;
    for (let i = drops.length - 1; i >= 0; i--) {
      const d = drops[i];
      d.vy = Math.min(d.vy + L.gravity * dt, L.maxFall);
      d.x += d.vx * dt;
      d.y += d.vy * dt;
      d.rot += d.vr * dt;

      // 残像(トレイル)を記録
      d.trail.push(d.x, d.y);
      if (d.trail.length > 10) d.trail.splice(0, 2);

      // 側壁との衝突
      const left = L.boardX + d.r, right = L.boardX + L.boardW - d.r;
      if (d.x < left) { d.x = left; d.vx = Math.abs(d.vx) * WALL_DAMP + 20; }
      else if (d.x > right) { d.x = right; d.vx = -Math.abs(d.vx) * WALL_DAMP - 20; }

      // ピンとの衝突(近傍の段だけ判定)
      if (d.y > L.pinTop - L.pinGapY && d.y < L.pinBottom + L.pinGapY) {
        this._collidePins(d, dt);
      }

      // 山への着地
      const sy = surfaceAt(d.x);
      if (d.y + d.r >= sy && d.vy >= 0) {
        drops.splice(i, 1);
        if (this.onLand) this.onLand(d);
        continue;
      }
      // 画面外への保険
      if (d.y > L.h + 60) drops.splice(i, 1);
    }
  }

  _collidePins(d, dt) {
    const L = this.L;
    const rowGuess = Math.round((d.y - L.pinTop) / L.pinGapY);
    for (const pin of this.pins) {
      if (Math.abs(pin.row - rowGuess) > 1) continue;
      const dx = d.x - pin.x, dy = d.y - pin.y;
      const rr = d.r + L.pinR;
      const d2 = dx * dx + dy * dy;
      if (d2 >= rr * rr || d2 === 0) continue;

      const dist = Math.sqrt(d2);
      const nx = dx / dist, ny = dy / dist;
      // めり込み解消
      d.x = pin.x + nx * rr;
      d.y = pin.y + ny * rr;
      // 法線方向の反射+減衰
      const vDotN = d.vx * nx + d.vy * ny;
      if (vDotN < 0) {
        d.vx -= (1 + BOUNCE_DAMP) * vDotN * nx;
        d.vy -= (1 + BOUNCE_DAMP) * vDotN * ny;
      }
      // 真上から当たった時は左右どちらかへ確率50%で分岐(ゴルトンの核)
      const side = Math.abs(nx) < 0.25 ? (Math.random() < 0.5 ? -1 : 1) : Math.sign(nx);
      d.vx += side * Math.abs(vDotN) * SIDE_KICK + side * 26;
      d.vr = side * rand(2, 6);

      pin.glow = 1;
      pin.wob = 1;
      pin.wobPhase = Math.atan2(dy, dx);
      if (this.onPinHit) this.onPinHit(pin, d);
      audio.pinDing(pin.row);
      break;
    }
  }

  drawPins(ctx, t) {
    const L = this.L;
    for (const pin of this.pins) {
      const wobX = Math.cos(pin.wobPhase) * pin.wob * 2.5 * Math.sin(t * 24);
      const wobY = Math.sin(pin.wobPhase) * pin.wob * 2.5 * Math.sin(t * 24);
      const x = pin.x + wobX, y = pin.y + wobY;
      const r = L.pinR * (1 + pin.glow * 0.35);

      // 光った時の後光
      if (pin.glow > 0.02) {
        const g = ctx.createRadialGradient(x, y, 0, x, y, r * 3.2);
        g.addColorStop(0, `hsla(${(pin.row * 51 + t * 90) % 360} 90% 70% / ${pin.glow * 0.55})`);
        g.addColorStop(1, 'hsla(0 0% 100% / 0)');
        ctx.fillStyle = g;
        ctx.beginPath();
        ctx.arc(x, y, r * 3.2, 0, TAU);
        ctx.fill();
      }

      // 氷の結晶のようなピン本体
      const body = ctx.createRadialGradient(x - r * 0.35, y - r * 0.35, r * 0.1, x, y, r);
      body.addColorStop(0, '#ffffff');
      body.addColorStop(0.55, '#dff3ff');
      body.addColorStop(1, '#9fd4f2');
      ctx.fillStyle = body;
      ctx.beginPath();
      ctx.arc(x, y, r, 0, TAU);
      ctx.fill();
      ctx.strokeStyle = 'rgba(120,180,220,0.55)';
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // ハイライト
      ctx.fillStyle = 'rgba(255,255,255,0.9)';
      ctx.beginPath();
      ctx.arc(x - r * 0.32, y - r * 0.35, r * 0.26, 0, TAU);
      ctx.fill();
    }
  }

  drawDrops(ctx, t) {
    for (const d of this.drops) {
      // 残像
      const n = d.trail.length / 2;
      for (let i = 0; i < n - 1; i++) {
        const a = (i + 1) / n;
        ctx.globalAlpha = a * 0.22;
        ctx.fillStyle = `hsl(${d.hue} 85% 62%)`;
        ctx.beginPath();
        ctx.arc(d.trail[i * 2], d.trail[i * 2 + 1], d.r * a * 0.8, 0, TAU);
        ctx.fill();
      }
      ctx.globalAlpha = 1;
      drawGrain(ctx, d.x, d.y, d.r, d.hue, d.special ? d.special.kind : null, d.rot, t);
    }
  }
}

// 粒1個の描画(通常のシロップ玉/特別トッピング)
export function drawGrain(ctx, x, y, r, hue, kind, rot = 0, t = 0) {
  ctx.save();
  ctx.translate(x, y);
  if (kind === 'star') {
    ctx.rotate(rot);
    const g = ctx.createRadialGradient(0, 0, 0, 0, 0, r * 1.3);
    g.addColorStop(0, '#fff8d0');
    g.addColorStop(1, '#ffd93b');
    ctx.fillStyle = g;
    starShape(ctx, r * 1.25);
    ctx.fill();
    ctx.strokeStyle = '#e8a90c';
    ctx.lineWidth = Math.max(1, r * 0.14);
    ctx.stroke();
  } else if (kind === 'heart') {
    ctx.rotate(Math.sin(rot) * 0.3);
    ctx.fillStyle = '#ff6f9c';
    heartShape(ctx, r * 1.1);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.55)';
    ctx.beginPath();
    ctx.arc(-r * 0.35, -r * 0.4, r * 0.28, 0, TAU);
    ctx.fill();
  } else if (kind === 'cherry') {
    ctx.strokeStyle = '#3f9d4b';
    ctx.lineWidth = Math.max(1.5, r * 0.16);
    ctx.beginPath();
    ctx.moveTo(0, -r * 0.2);
    ctx.quadraticCurveTo(r * 0.5, -r * 1.3, r * 0.1, -r * 1.6);
    ctx.stroke();
    const g = ctx.createRadialGradient(-r * 0.3, -r * 0.3, 0, 0, 0, r);
    g.addColorStop(0, '#ff8f8f');
    g.addColorStop(1, '#d81f3e');
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r * 0.95, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(-r * 0.3, -r * 0.35, r * 0.22, 0, TAU);
    ctx.fill();
  } else if (kind === 'candy') {
    ctx.rotate(rot);
    ctx.fillStyle = `hsl(${(t * 60) % 360} 80% 78%)`;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.strokeStyle = `hsl(${(t * 60 + 180) % 360} 75% 55%)`;
    ctx.lineWidth = Math.max(1.5, r * 0.22);
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.arc(0, 0, r * (0.28 + i * 0.3), i, i + 2.2);
      ctx.stroke();
    }
  } else {
    // 通常のシロップ玉(つやつやのゼリー風)
    const g = ctx.createRadialGradient(-r * 0.35, -r * 0.4, r * 0.1, 0, 0, r);
    g.addColorStop(0, `hsl(${hue} 90% 82%)`);
    g.addColorStop(0.65, `hsl(${hue} 85% 60%)`);
    g.addColorStop(1, `hsl(${hue} 80% 46%)`);
    ctx.fillStyle = g;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(-r * 0.32, -r * 0.4, r * 0.26, r * 0.18, -0.6, 0, TAU);
    ctx.fill();
  }
  ctx.restore();
}

function starShape(ctx, R) {
  ctx.beginPath();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? R : R * 0.45;
    const a = -Math.PI / 2 + (i * Math.PI) / 5;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
}

function heartShape(ctx, s) {
  ctx.beginPath();
  ctx.moveTo(0, s * 0.9);
  ctx.bezierCurveTo(-s * 1.3, 0, -s * 0.9, -s, 0, -s * 0.35);
  ctx.bezierCurveTo(s * 0.9, -s, s * 1.3, 0, 0, s * 0.9);
  ctx.closePath();
}
