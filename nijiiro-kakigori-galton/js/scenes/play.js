// メインのプレイ画面: 粒を落として、かき氷ににじいろの山を作る
import { TAU, clamp, rand, randi, choice, drawBubbleText, drawRainbowText, easeOutBack, roundRect } from '../core/utils.js';
import { audio } from '../core/audio.js';
import { FxSystem } from '../core/fx.js';
import { computeLayout } from '../game/layout.js';
import { Board } from '../game/board.js';
import { Pile } from '../game/pile.js';
import { SYRUPS, syrupColor, rollSpecial, CHEERS } from '../game/palette.js';
import { Background } from '../render/background.js';
import { drawIceDome, drawGlassBowl, drawTable, drawFaucetCloud } from '../render/bowl.js';
import { Mascot } from '../render/mascot.js';
import { drawSyrupButtons, drawMeter, drawIconButton, drawItadakimasuButton, hitCircle, hitRect } from '../render/ui.js';

const POUR_INTERVAL = 0.10;      // 押している間の粒の放出間隔(秒)
const RAINBOW_EVERY = 55;        // 何粒ごとにレインボータイムが来るか
const RAINBOW_DURATION = 2.4;
const EAT_INTERVAL = 0.55;
const FAUCET_SPEED = 9;          // 雲が指を追いかける速さ

export class PlayScene {
  constructor() {
    this.bg = new Background();
    this.board = new Board();
    this.pile = new Pile();
    this.fx = new FxSystem();
    this.mascot = new Mascot();
    this.L = null;
    this.phase = 'play'; // play | full | itadaki | eat | end
    this.phaseT = 0;
    this.selected = 0;
    this.faucetX = 0;
    this.faucetTarget = 0;
    this.pouring = false;
    this.pourT = 0;
    this.grainSeed = 0;
    this.grainCount = 0;
    this.sinceRainbow = 0;
    this.rainbowT = 0;
    this.muted = false;
    this.hintT = 8;
    this.eatT = 0;
    this.spoonAngle = 0;
    this.engine = null;

    this.board.onLand = (d) => this._onLand(d);
    this.board.onPinHit = (pin) => {
      this.fx.sparkle(pin.x, pin.y, (pin.row * 51 + this.grainSeed * 20) % 360, 3, 55);
    };
  }

  onEnter(engine) {
    this.engine = engine;
  }

  onResize(w, h) {
    const L = computeLayout(w, h);
    this.L = L;
    this.bg.setSize(w, h);
    this.board.setLayout(L);
    this.pile.setLayout(L, this.engine ? this.engine.dpr : 1);
    this.faucetX = this.faucetX || w / 2;
    this.faucetTarget = this.faucetTarget || w / 2;
    this.faucetX = clamp(this.faucetX, L.boardX + 30, L.boardX + L.boardW - 30);
    this.faucetTarget = clamp(this.faucetTarget, L.boardX + 30, L.boardX + L.boardW - 30);
    if (L.portrait) {
      this.mascot.setPlace(clamp(w * 0.1, 34, 90), L.bowlBottom - h * 0.045, clamp(h * 0.052, 30, 52));
    } else {
      this.mascot.setPlace(w - L.sideW / 2, L.bowlBottom - h * 0.11, clamp(h * 0.09, 34, 60));
    }
    this.itadakiBtn = {
      x: w / 2,
      y: L.pinTop + (L.pinBottom - L.pinTop) * 0.45,
      w: clamp(Math.min(w * 0.72, 430), 240, 430),
      h: clamp(h * 0.1, 64, 92),
    };
    this.replayBtn = { ...this.itadakiBtn, y: this.itadakiBtn.y + this.itadakiBtn.h * 1.6 };
  }

  // --- 入力 ---

  onDown(x, y) {
    audio.unlock();
    // ミュートボタン
    if (hitCircle(x, y, this.L.muteBtn)) {
      this.muted = !this.muted;
      audio.setMuted(this.muted);
      audio.tap();
      return;
    }
    // シロップボタン
    for (let i = 0; i < SYRUPS.length; i++) {
      if (hitCircle(x, y, this.L.buttons[i])) {
        this.selected = i;
        audio.tap();
        this.fx.sparkle(this.L.buttons[i].x, this.L.buttons[i].y, SYRUPS[i].hue < 0 ? randi(0, 360) : SYRUPS[i].hue, 8, 90);
        return;
      }
    }
    if (this.phase === 'full' && hitRect(x, y, this.itadakiBtn)) {
      this._startItadaki();
      return;
    }
    if (this.phase === 'end' && hitRect(x, y, this.replayBtn)) {
      this._reset();
      return;
    }
    if (this.phase === 'play') {
      this.pouring = true;
      this.faucetTarget = clamp(x, this.L.boardX + 30, this.L.boardX + this.L.boardW - 30);
      this.hintT = Math.min(this.hintT, 1);
      audio.pour();
    }
  }

  onMove(x, y) {
    if (this.pouring) {
      this.faucetTarget = clamp(x, this.L.boardX + 30, this.L.boardX + this.L.boardW - 30);
    }
  }

  onUp() {
    this.pouring = false;
  }

  // --- 粒の放出と着地 ---

  _release(xOverride = null, forceRainbow = false) {
    this.grainSeed++;
    const syrup = SYRUPS[this.selected];
    const hue = forceRainbow ? randi(0, 360) : syrupColor(syrup, this.grainSeed);
    const special = rollSpecial();
    this.board.release(xOverride ?? this.faucetX, hue, special);
  }

  _onLand(d) {
    const pos = this.pile.addGrain(d.x, d.hue, d.special ? d.special.kind : null, d.special ? d.special.size : 1);
    this.fx.splash(pos.x, pos.y, d.hue, d.special ? 10 : 5);
    audio.landPop(d.hue);
    this.grainCount++;
    this.sinceRainbow++;

    if (d.special) {
      this.fx.floatText(pos.x, pos.y - 26, d.special.msg, (d.hue + 40) % 360, clamp(this.L.h * 0.032, 20, 30));
      this.fx.confettiBurst(pos.x, pos.y, 10, 150);
      this.mascot.setMood('cheer', 1.2);
    } else if (this.grainCount % 23 === 0) {
      this.fx.floatText(pos.x, pos.y - 24, choice(CHEERS), d.hue, clamp(this.L.h * 0.03, 18, 28));
      this.mascot.setMood('cheer', 1.0);
    }

    if (this.sinceRainbow >= RAINBOW_EVERY && this.rainbowT <= 0 && this.phase === 'play') {
      this.sinceRainbow = 0;
      this.rainbowT = RAINBOW_DURATION;
      audio.rainbowFanfare();
      this.fx.floatText(this.L.w / 2, this.L.pinTop + 30, 'レインボータイム!', randi(0, 360), clamp(this.L.h * 0.045, 26, 40));
      this.mascot.setMood('cheer', RAINBOW_DURATION);
    }

    if (this.phase === 'play' && this.pile.fillRatio() >= 1) this._onFull();
  }

  _onFull() {
    this.phase = 'full';
    this.phaseT = 0;
    this.pouring = false;
    audio.fullChime();
    this.mascot.setMood('cheer', 3);
    this.fx.confettiBurst(this.L.w / 2, this.L.iceTop, 50, 380);
    this.fx.floatText(this.L.w / 2, this.L.iceTop - 40, 'できあがり!', 330, clamp(this.L.h * 0.05, 30, 46));
  }

  _startItadaki() {
    this.phase = 'itadaki';
    this.phaseT = 0;
    audio.itadakimasu();
    this.fx.confettiBurst(this.L.w / 2, this.L.h * 0.4, 40, 320);
  }

  _reset() {
    audio.tap();
    this.pile.reset();
    this.board.drops.length = 0;
    this.fx.clear();
    this.grainCount = 0;
    this.sinceRainbow = 0;
    this.rainbowT = 0;
    this.phase = 'play';
    this.phaseT = 0;
    this.hintT = 5;
    this.mascot.setMood('idle', 0.1);
  }

  // --- 更新 ---

  update(dt, t) {
    this.phaseT += dt;
    this.bg.update(dt);
    this.fx.update(dt);
    this.mascot.update(dt);
    this.hintT -= dt;

    // 雲が指を追いかける
    this.faucetX += (this.faucetTarget - this.faucetX) * Math.min(1, FAUCET_SPEED * dt);

    if (this.phase === 'play') {
      if (this.pouring) {
        this.pourT -= dt;
        while (this.pourT <= 0) {
          this.pourT += POUR_INTERVAL;
          this._release();
        }
      } else {
        this.pourT = 0;
      }
      // レインボータイム: 空から自動で虹の粒が降る
      if (this.rainbowT > 0) {
        this.rainbowT -= dt;
        if (Math.random() < dt * 22) {
          this._release(rand(this.L.boardX + 30, this.L.boardX + this.L.boardW - 30), true);
        }
        if (Math.random() < dt * 6) this.fx.confettiRain(this.L.w, 2);
      }
    }

    this.board.update(dt, (x) => this.pile.surfaceAt(x));

    if (this.phase === 'itadaki' && this.phaseT > 2.3) {
      this.phase = 'eat';
      this.phaseT = 0;
      this.eatT = 0;
      this.mascot.setMood('eat', 999);
    }

    if (this.phase === 'eat') {
      this.eatT -= dt;
      this.spoonAngle = Math.sin(this.phaseT * (Math.PI * 2 / EAT_INTERVAL) * 0.5) * 0.35;
      if (this.eatT <= 0) {
        this.eatT = EAT_INTERVAL;
        const bite = Math.max(10, Math.ceil(this.pile.grains.length / 9));
        const removed = this.pile.eatBite(bite);
        audio.scoop();
        audio.munch();
        if (removed) {
          for (let i = 0; i < Math.min(removed.length, 5); i++) {
            const g = removed[i];
            this.fx.splash(g.x, g.y, g.hue, 4);
          }
        }
        if (this.pile.grains.length === 0) {
          this.phase = 'end';
          this.phaseT = 0;
          audio.fullChime();
          this.mascot.setMood('yum', 4);
          this.fx.confettiBurst(this.L.w / 2, this.L.h * 0.4, 60, 400);
        }
      }
    }

    if (this.phase === 'end' && Math.random() < dt * 3) this.fx.confettiRain(this.L.w, 2);
  }

  // --- 描画 ---

  draw(ctx, t) {
    const L = this.L;
    this.bg.draw(ctx, t);
    drawTable(ctx, L);
    drawGlassBowl(ctx, L, t);
    drawIceDome(ctx, L, (u) => this.pile.groundAt(u), t);
    this.pile.draw(ctx);
    this.board.drawPins(ctx, t);

    // シロップの雲(食べ始めたら退場)
    if (this.phase === 'play' || this.phase === 'full') {
      const syrup = SYRUPS[this.selected];
      drawFaucetCloud(ctx, L, this.faucetX, syrup.hue, this.pouring, t);
    }

    this.board.drawDrops(ctx, t);
    this.mascot.draw(ctx, t);

    // 食べる演出のスプーン
    if (this.phase === 'eat') this._drawSpoon(ctx, t);

    this.fx.draw(ctx, t);

    // --- UI ---
    drawSyrupButtons(ctx, L, this.selected, t);
    drawMeter(ctx, L, this.pile.fillRatio(), t);
    drawIconButton(ctx, L.muteBtn, this.muted ? '🔇' : '🔊', t);

    if (this.phase === 'play' && this.hintT > 0 && this.grainCount === 0) {
      ctx.globalAlpha = Math.min(1, this.hintT);
      const hy = L.pinTop + (L.pinBottom - L.pinTop) * 0.4;
      drawBubbleText(ctx, 'ゆびで タッチして', L.w / 2, hy, clamp(L.h * 0.036, 20, 32), '#4a7a9b');
      drawBubbleText(ctx, 'つぶを おとしてね!', L.w / 2, hy + clamp(L.h * 0.05, 28, 44), clamp(L.h * 0.036, 20, 32), '#4a7a9b');
      ctx.globalAlpha = 1;
    }

    if (this.phase === 'full') {
      drawItadakimasuButton(ctx, this.itadakiBtn, this.phaseT * 1.4, t);
    }

    if (this.phase === 'itadaki') {
      const k = easeOutBack(Math.min(1, this.phaseT * 1.8));
      ctx.save();
      ctx.translate(L.w / 2, L.h * 0.34);
      ctx.scale(k, k);
      ctx.font = `${clamp(L.h * 0.1, 56, 110)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText('🙏', 0, -clamp(L.h * 0.085, 46, 90));
      drawRainbowText(ctx, 'いただきます!', 0, clamp(L.h * 0.03, 16, 34), clamp(L.w * 0.085, 30, 64), t * 120);
      ctx.restore();
    }

    if (this.phase === 'end') {
      drawRainbowText(ctx, 'ごちそうさまでした!', L.w / 2, this.itadakiBtn.y - this.itadakiBtn.h, clamp(L.w * 0.07, 26, 56), t * 120);
      this._drawReplayButton(ctx, t);
    }
  }

  _drawSpoon(ctx, t) {
    const L = this.L;
    // 山の一番高い所を探す
    let topY = L.rimY, topX = L.bowlCx;
    for (let i = 0; i < this.pile.ncol; i++) {
      const u = (i + 0.5) / this.pile.ncol;
      const y = this.pile.groundAt(u) - this.pile.heights[i];
      if (y < topY) { topY = y; topX = L.bowlCx - L.bowlW / 2 + u * L.bowlW; }
    }
    const s = clamp(L.bowlW * 0.09, 30, 60);
    const dig = Math.max(0, Math.sin(this.phaseT * (Math.PI * 2 / EAT_INTERVAL))) * s * 0.5;
    ctx.save();
    ctx.translate(topX + s * 1.2, topY - s * 1.1 + dig);
    ctx.rotate(-0.7 + this.spoonAngle);
    // 柄
    ctx.fillStyle = '#f4a83c';
    ctx.strokeStyle = '#c67f1e';
    ctx.lineWidth = 2;
    roundRect(ctx, -s * 0.09, -s * 1.9, s * 0.18, s * 1.6, s * 0.09);
    ctx.fill();
    ctx.stroke();
    // すくう部分
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

  _drawReplayButton(ctx, t) {
    const b = this.replayBtn;
    const pulse = 1 + Math.sin(t * 4.5) * 0.04;
    const k = easeOutBack(Math.min(1, this.phaseT * 1.5));
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
}
