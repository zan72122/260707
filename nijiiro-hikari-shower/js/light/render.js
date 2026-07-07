// 光の描画: 白い光の帯とにじ色の帯(プリズム・光源の描画は別モジュール)
// 通常合成+加算合成の2パスで、明るい背景でも暗い背景でも綺麗に見せる

import { rgba, dist, heartPath, starPath } from '../core/utils.js';
import { drawPrism } from './render_prism.js';
import { drawSource } from './render_sources.js';

// おまつりモード中は色が虹色にくるくる変わる
function rayColor(rig, ray, time, alpha) {
  if (rig.party > 0) {
    const hue = (ray.ci * 51 + time * 260) % 360;
    return `hsla(${hue},95%,66%,${alpha})`;
  }
  return rgba(ray.hex, alpha);
}

export function drawWhiteBeam(ctx, rig, time) {
  const { lightX: lx, lightY: ly, prismX: px, prismY: py } = rig;
  const len = dist(lx, ly, px, py);
  if (len < 10) return;
  const a = Math.atan2(py - ly, px - lx);
  const flicker = rig.sourceType === 'candle' ? Math.sin(time * 11) * 0.18 + Math.sin(time * 23) * 0.1 : 0;
  const ws = rig.widthScale * (1 + flicker * 0.4);
  const w0 = (16 + Math.sin(time * 2.4) * 2.5) * ws;
  const w1 = 30 * ws;
  // 光源と光の色に合わせた色味
  const mono = rig.lightColor.ci >= 0 ? rig.lightColor.hex : null;
  const tint = mono
    ? rgba(mono, 0.5)
    : rig.sourceType === 'candle'
      ? 'rgba(255,214,150,0.5)'
      : rig.sourceType === 'moon'
        ? 'rgba(205,225,255,0.45)'
        : 'rgba(255,255,240,0.5)';
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  ctx.translate(lx, ly);
  ctx.rotate(a);
  const g = ctx.createLinearGradient(0, 0, len, 0);
  g.addColorStop(0, tint);
  g.addColorStop(0.7, tint.replace(/[\d.]+\)$/, '0.32)'));
  g.addColorStop(1, tint);
  ctx.fillStyle = g;
  ctx.beginPath();
  ctx.moveTo(0, -w0 / 2);
  ctx.lineTo(len, -w1 / 2);
  ctx.lineTo(len, w1 / 2);
  ctx.lineTo(0, w0 / 2);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = 'rgba(255,255,255,0.32)';
  ctx.beginPath();
  ctx.moveTo(0, -w0 * 0.16);
  ctx.lineTo(len, -w1 * 0.16);
  ctx.lineTo(len, w1 * 0.16);
  ctx.lineTo(0, w0 * 0.16);
  ctx.closePath();
  ctx.fill();
  // 光のかたち: ハート・ほしが光の中を流れていく
  if (rig.beamShape !== 'line') {
    const step = 62;
    const scroll = (time * 90) % step;
    ctx.fillStyle = mono ? rgba(mono, 0.55) : 'rgba(255,255,255,0.5)';
    for (let d = 30 + scroll; d < len - 10; d += step) {
      const size = (6 + (d / len) * 5) * rig.widthScale;
      if (rig.beamShape === 'heart') heartPath(ctx, d, 0, size);
      else starPath(ctx, d, 0, size, size * 0.45, 5, time * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

export function drawRainbow(ctx, rig, time, alpha = 1) {
  const pulse = 0.88 + Math.sin(time * 3.1) * 0.12;
  drawRainbowPass(ctx, rig, time, 'source-over', 0.34 * alpha * pulse);
  drawRainbowPass(ctx, rig, time, 'lighter', 0.2 * alpha * pulse);
  if (rig.prismType === 'heart' || rig.prismType === 'star') {
    drawShapeStamps(ctx, rig, time, alpha);
  }
}

function drawRainbowPass(ctx, rig, time, composite, baseA) {
  const wavy = rig.prismType === 'broken';
  ctx.save();
  ctx.globalCompositeOperation = composite;
  for (const ray of rig.rays) {
    let travelled = 0;
    for (const s of ray.segs) {
      const segLen = dist(s.x1, s.y1, s.x2, s.y2);
      if (segLen < 4) continue;
      const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      ctx.save();
      ctx.translate(s.x1, s.y1);
      ctx.rotate(a);
      const g = ctx.createLinearGradient(0, 0, segLen, 0);
      g.addColorStop(0, rayColor(rig, ray, time, baseA * 0.6));
      g.addColorStop(0.3, rayColor(rig, ray, time, baseA));
      g.addColorStop(1, rayColor(rig, ray, time, baseA * 0.5));
      ctx.fillStyle = g;
      if (wavy) {
        wavyBandPath(ctx, rig, ray, segLen, travelled, time);
      } else {
        const w0 = rig.bandHalfWidth(travelled) * (ray.wBoost ?? 1);
        const w1 = rig.bandHalfWidth(travelled + segLen) * (ray.wBoost ?? 1);
        ctx.beginPath();
        ctx.moveTo(0, -w0);
        ctx.lineTo(segLen, -w1);
        ctx.lineTo(segLen, w1);
        ctx.lineTo(0, w0);
        ctx.closePath();
      }
      ctx.fill();
      ctx.restore();
      travelled += segLen;
    }
  }
  ctx.restore();
}

// われたプリズム: ぐにゃぐにゃ波打つ帯
function wavyBandPath(ctx, rig, ray, segLen, travelled, time) {
  const N = 10;
  const amp = 13 * rig.widthScale;
  const top = [];
  const bot = [];
  for (let i = 0; i <= N; i++) {
    const x = (segLen * i) / N;
    const d = travelled + x;
    const off = Math.sin(d * 0.03 - time * 4 + ray.ci * 0.8) * amp * Math.min(1, d / 160);
    const w = rig.bandHalfWidth(d) * (ray.wBoost ?? 1);
    top.push([x, off - w]);
    bot.push([x, off + w]);
  }
  ctx.beginPath();
  ctx.moveTo(top[0][0], top[0][1]);
  for (const [x, y] of top) ctx.lineTo(x, y);
  for (let i = bot.length - 1; i >= 0; i--) ctx.lineTo(bot[i][0], bot[i][1]);
  ctx.closePath();
}

// ハート・ほしプリズム: 帯にそって模様がころころ流れる
function drawShapeStamps(ctx, rig, time, alpha) {
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  const step = 92;
  const scroll = (time * 60) % step;
  for (const ray of rig.rays) {
    let travelled = 0;
    for (const s of ray.segs) {
      const segLen = dist(s.x1, s.y1, s.x2, s.y2);
      if (segLen < 20) continue;
      const a = Math.atan2(s.y2 - s.y1, s.x2 - s.x1);
      for (let d = step * 0.6 + scroll; d < segLen; d += step) {
        const x = s.x1 + Math.cos(a) * d;
        const y = s.y1 + Math.sin(a) * d;
        const size = rig.bandHalfWidth(travelled + d) * 1.15;
        const tw = 0.55 + 0.45 * Math.sin(time * 5 + d);
        ctx.fillStyle = rayColor(rig, ray, time, 0.55 * alpha * tw);
        if (rig.prismType === 'heart') heartPath(ctx, x, y, size);
        else starPath(ctx, x, y, size, size * 0.45, 5, time * 1.5 + d);
        ctx.fill();
      }
      travelled += segLen;
    }
  }
  ctx.restore();
}

export function drawRig(ctx, rig, time, rainbowAlpha = 1) {
  drawWhiteBeam(ctx, rig, time);
  drawRainbow(ctx, rig, time, rainbowAlpha);
  drawPrism(ctx, rig, time);
  drawSource(ctx, rig, time);
}
