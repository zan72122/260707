// HUD(スコア・スター・フィーバーゲージ・バナー・タイトル画面)
// スクリーン座標系で描画する

import { TAU, clamp, bell, easeOutBack, font, outlinedText, roundRectPath, starPath, hsl } from '../core/utils.js';
import { drawCloud } from './background.js';

export class Hud {
  constructor() {
    this.bannerQueue = [];
    this.banner = null;
    this.hintAge = 0;
  }

  showBanner(text, color = '#ffde59', life = 1.6) {
    this.bannerQueue.push({ text, color, life });
  }

  update(dt) {
    this.hintAge += dt;
    if (this.banner) {
      this.banner.age += dt;
      if (this.banner.age >= this.banner.life) this.banner = null;
    }
    if (!this.banner && this.bannerQueue.length > 0) {
      this.banner = { ...this.bannerQueue.shift(), age: 0 };
    }
  }

  resetHints() {
    this.hintAge = 0;
  }

  // ===== プレイ中HUD =====
  draw(ctx, view, game, time) {
    const { w } = view;
    const compact = w < 500;
    const panelW = compact ? 168 : 210;
    const panelH = compact ? 46 : 54;
    const x = 10;
    const y = 10;

    // スコアパネル
    ctx.save();
    roundRectPath(ctx, x, y, panelW, panelH, panelH / 2);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
    ctx.lineWidth = 3;
    ctx.strokeStyle = 'rgba(120,80,30,0.4)';
    ctx.stroke();
    // コインアイコン
    const cy = y + panelH / 2;
    const ir = panelH * 0.32;
    ctx.fillStyle = '#ffd94d';
    ctx.strokeStyle = '#e8a325';
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.arc(x + panelH / 2, cy, ir, 0, TAU);
    ctx.fill();
    ctx.stroke();
    ctx.font = font(compact ? 26 : 32);
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    const scoreShown = Math.floor(game.displayScore);
    outlinedText(ctx, String(scoreShown), x + panelH * 0.95, cy + 1, '#5a3d1c', '#ffffff', 5);

    // スター数パネル
    const spW = compact ? 96 : 120;
    roundRectPath(ctx, x, y + panelH + 8, spW, panelH * 0.8, panelH * 0.4);
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.fill();
    ctx.strokeStyle = 'rgba(120,80,30,0.4)';
    ctx.stroke();
    ctx.fillStyle = '#ffd94d';
    ctx.strokeStyle = '#e8a325';
    starPath(ctx, x + panelH * 0.42, y + panelH * 1.48, ir * 0.95, ir * 0.45);
    ctx.fill();
    ctx.stroke();
    outlinedText(ctx, `x${game.stars}`, x + panelH * 0.85, y + panelH * 1.5, '#5a3d1c', '#ffffff', 5);
    ctx.restore();

    // フィーバーゲージ
    if (game.feverTime > 0) {
      const gw = Math.min(w * 0.5, 280);
      const gx = w - gw - 14;
      const gy = 16;
      ctx.save();
      roundRectPath(ctx, gx, gy, gw, 26, 13);
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fill();
      const frac = clamp(game.feverTime / game.feverTotal, 0, 1);
      if (frac > 0.02) {
        roundRectPath(ctx, gx + 3, gy + 3, (gw - 6) * frac, 20, 10);
        const grad = ctx.createLinearGradient(gx, 0, gx + gw, 0);
        for (let i = 0; i <= 6; i++) grad.addColorStop(i / 6, hsl((i * 60 + time * 200) % 360, 95, 62));
        ctx.fillStyle = grad;
        ctx.fill();
      }
      ctx.font = font(17);
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      outlinedText(ctx, 'フィーバー!', gx + gw / 2, gy + 13, '#ffffff', 'rgba(180,60,140,0.9)', 4);
      ctx.restore();
    }

    // バナー(中央のおおきな文字)
    if (this.banner) {
      const b = this.banner;
      const t = b.age / b.life;
      const scale = t < 0.2 ? easeOutBack(t / 0.2) : 1;
      const alpha = t > 0.75 ? 1 - (t - 0.75) / 0.25 : 1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.translate(w / 2, view.h * 0.32);
      ctx.scale(scale, scale);
      ctx.rotate(Math.sin(b.age * 6) * 0.03);
      ctx.font = font(Math.min(56, w * 0.09));
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      outlinedText(ctx, b.text, 0, 0, b.color, 'rgba(90,40,10,0.85)', 10);
      ctx.restore();
    }
  }

  // フリッパー操作ヒント(さいしょは目立つ・だんだん薄く)
  drawTouchHints(ctx, view, leftHeld, rightHeld) {
    const { w, h } = view;
    const strong = clamp(1 - (this.hintAge - 9) / 4, 0, 1);
    const base = 0.25 + strong * 0.5;
    const r = Math.min(w, h) * 0.085;
    const pulse = 1 + Math.sin(this.hintAge * 4) * 0.06 * (strong + 0.2);
    const items = [
      { x: r * 1.5, held: leftHeld, label: 'ひだり' },
      { x: w - r * 1.5, held: rightHeld, label: 'みぎ' },
    ];
    ctx.save();
    for (const it of items) {
      const y = h - r * 1.6;
      const sc = it.held ? 0.9 : pulse;
      ctx.globalAlpha = it.held ? 0.9 : base;
      ctx.translate(it.x, y);
      ctx.scale(sc, sc);
      ctx.fillStyle = it.held ? 'rgba(255,222,89,0.95)' : 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.lineWidth = 5;
      ctx.strokeStyle = 'rgba(230,120,60,0.9)';
      ctx.stroke();
      // 手のひらマーク
      ctx.font = `${Math.round(r * 0.85)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('👆', 0, -r * 0.08);
      ctx.font = font(Math.round(r * 0.34));
      outlinedText(ctx, it.label, 0, r * 0.55, '#8a4a1a', '#ffffff', 4);
      ctx.setTransform(view.dpr, 0, 0, view.dpr, 0, 0);
    }
    ctx.restore();
  }

  // 発射のうながし(テーブル座標で表示するため呼び出し側でtransform済み)
  drawLaunchPrompt(ctx, x, y, time, charging, charge) {
    ctx.save();
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    if (!charging) {
      const bob = Math.sin(time * 3.4) * 8;
      ctx.font = font(30);
      outlinedText(ctx, 'ながおしして', x, y - 118 + bob, '#ffffff', 'rgba(230,90,40,0.95)', 7);
      outlinedText(ctx, 'はなすと ポン!', x, y - 82 + bob, '#ffffff', 'rgba(230,90,40,0.95)', 7);
      // 下向き矢印
      ctx.fillStyle = '#ffde59';
      ctx.strokeStyle = 'rgba(230,90,40,0.95)';
      ctx.lineWidth = 4;
      const ay = y - 40 + bob * 0.6;
      ctx.beginPath();
      ctx.moveTo(x, ay + 18);
      ctx.lineTo(x - 16, ay - 6);
      ctx.lineTo(x - 6, ay - 6);
      ctx.lineTo(x - 6, ay - 22);
      ctx.lineTo(x + 6, ay - 22);
      ctx.lineTo(x + 6, ay - 6);
      ctx.lineTo(x + 16, ay - 6);
      ctx.closePath();
      ctx.fill();
      ctx.stroke();
    } else {
      // チャージメーター
      const mw = 26;
      const mh = 150;
      const mx = x - 70;
      const my = y - 200;
      roundRectPath(ctx, mx, my, mw, mh, 13);
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.fill();
      const fh = (mh - 6) * charge;
      if (fh > 4) {
        roundRectPath(ctx, mx + 3, my + mh - 3 - fh, mw - 6, fh, 10);
        const g = ctx.createLinearGradient(0, my + mh, 0, my);
        g.addColorStop(0, '#6fd66f');
        g.addColorStop(0.6, '#ffde59');
        g.addColorStop(1, '#ff6a5e');
        ctx.fillStyle = g;
        ctx.fill();
      }
      ctx.font = font(26);
      const wob = 1 + charge * 0.15 + Math.sin(time * 20) * charge * 0.05;
      ctx.save();
      ctx.translate(x - 57, y - 230);
      ctx.scale(wob, wob);
      outlinedText(ctx, 'ぐーっ…', 0, 0, '#ffffff', 'rgba(230,90,40,0.95)', 6);
      ctx.restore();
    }
    ctx.restore();
  }

  // ===== タイトル画面 =====
  drawTitle(ctx, view, time) {
    const { w, h } = view;
    ctx.save();
    // ふんわり暗く
    ctx.fillStyle = 'rgba(40,90,160,0.25)';
    ctx.fillRect(0, 0, w, h);

    const cx = w / 2;
    const cy = h * 0.34;
    const s = Math.min(w, h);

    // 浮かぶ雲
    ctx.fillStyle = 'rgba(255,255,255,0.9)';
    drawCloud(ctx, cx - s * 0.33 + Math.sin(time * 0.5) * 10, cy - s * 0.18, s * 0.05);
    drawCloud(ctx, cx + s * 0.35 + Math.sin(time * 0.4 + 2) * 12, cy - s * 0.1, s * 0.06);

    // ロゴ
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    const logoSize = Math.min(w * 0.11, 64);
    ctx.save();
    ctx.translate(cx, cy - logoSize * 0.8);
    ctx.rotate(Math.sin(time * 1.2) * 0.02);
    ctx.font = font(logoSize);
    outlinedText(ctx, 'コロコロ★', 0, 0, '#ffde59', 'rgba(200,60,30,0.95)', logoSize * 0.22);
    ctx.font = font(logoSize * 1.06);
    outlinedText(ctx, 'ボールランド', 0, logoSize * 1.15, '#ffffff', 'rgba(60,130,220,0.95)', logoSize * 0.22);
    ctx.restore();

    // はねるボール
    const bounce = Math.abs(Math.sin(time * 2.6));
    const by = cy + logoSize * 2.6 - bounce * s * 0.06;
    const br = s * 0.05;
    ctx.fillStyle = 'rgba(40,90,160,0.25)';
    ctx.beginPath();
    ctx.ellipse(cx, cy + logoSize * 2.6 + br, br * (0.7 + bounce * 0.3), br * 0.25, 0, 0, TAU);
    ctx.fill();
    const grad = ctx.createRadialGradient(cx - br * 0.3, by - br * 0.3, br * 0.2, cx, by, br * 1.2);
    grad.addColorStop(0, '#ff8a7e');
    grad.addColorStop(1, '#e03c30');
    ctx.fillStyle = grad;
    ctx.beginPath();
    const sq = 1 - (1 - bounce) * 0.15;
    ctx.ellipse(cx, by, br / sq, br * sq, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = 'rgba(255,255,255,0.85)';
    ctx.beginPath();
    ctx.ellipse(cx - br * 0.35, by - br * 0.4, br * 0.25, br * 0.15, -0.5, 0, TAU);
    ctx.fill();

    // スタートボタン
    const pw = Math.min(w * 0.62, 360);
    const ph = 74;
    const px = cx - pw / 2;
    const py = h * 0.68;
    const pulse = 1 + Math.sin(time * 3.5) * 0.04;
    ctx.save();
    ctx.translate(cx, py + ph / 2);
    ctx.scale(pulse, pulse);
    roundRectPath(ctx, -pw / 2, -ph / 2, pw, ph, ph / 2);
    const bg = ctx.createLinearGradient(0, -ph / 2, 0, ph / 2);
    bg.addColorStop(0, '#ffb84d');
    bg.addColorStop(1, '#ff8a3d');
    ctx.fillStyle = bg;
    ctx.fill();
    ctx.lineWidth = 6;
    ctx.strokeStyle = '#ffffff';
    ctx.stroke();
    ctx.font = font(Math.min(34, pw * 0.1));
    outlinedText(ctx, 'タップで はじめる!', 0, 2, '#ffffff', 'rgba(180,80,20,0.9)', 6);
    ctx.restore();

    // まわりのおほしさま
    for (let i = 0; i < 6; i++) {
      const a = time * 0.7 + (i / 6) * TAU;
      const sx = cx + Math.cos(a) * s * 0.42;
      const sy = h * 0.5 + Math.sin(a * 1.3) * s * 0.3;
      const tw = 0.5 + 0.5 * Math.sin(time * 4 + i * 2);
      ctx.globalAlpha = 0.3 + tw * 0.6;
      ctx.fillStyle = '#fff7c2';
      starPath(ctx, sx, sy, 8 + tw * 5, 4 + tw * 2.4);
      ctx.fill();
    }
    ctx.restore();
  }
}
