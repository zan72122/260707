// メインのプレイ画面: シロップをタンクにためて、レバーを引いてじゃらじゃらGO!
import { TAU, clamp, rand, randi, choice, drawBubbleText } from '../core/utils.js';
import { audio } from '../core/audio.js';
import { FxSystem } from '../core/fx.js';
import { computeLayout } from '../game/layout.js';
import { Physics } from '../game/physics.js';
import { Hopper } from '../game/hopper.js';
import { Slots } from '../game/slots.js';
import { SYRUPS, syrupColor, rollSpecial, CHEERS, GOLD_EVERY } from '../game/palette.js';
import { Background } from '../render/background.js';
import { drawTable, drawStall, drawTankBack, drawTankFront, drawPins, drawCup, drawDividers, drawLever } from '../render/machine.js';
import { drawBallFast, drawGiantBerry } from '../render/grain.js';
import { Mascot } from '../render/mascot.js';
import { drawSyrupButtons, drawMeter, drawIconButton, drawItadakimasuButton, drawArrowHint, hitCircle, hitRect } from '../render/ui.js';
import { updateEat, drawFinishOverlay, drawSpoon } from './finish.js';

const POUR_RATE = 44;           // 注ぎの個数/秒
const MIN_GO = 40;              // GOできる最小の玉数
const MAX_FLOW_RATE = 62;       // レバー全開時の放出個数/秒
const MAX_REMOVED_PINS = 6;     // ピンいたずらで外せる本数
const GUST_TIME = 1.4;          // うちわの風の長さ(秒)
const GIANT_CHANCE_PER_SEC = 0.09;

export class PlayScene {
  constructor() {
    this.bg = new Background();
    this.physics = new Physics();
    this.hopper = new Hopper();
    this.slots = new Slots();
    this.fx = new FxSystem();
    this.mascot = new Mascot();
    this.L = null;
    this.engine = null;

    this.phase = 'make'; // make | full | itadaki | eat | end
    this.phaseT = 0;
    this.selected = 0;
    this.pourPtr = null;
    this.pourAcc = 0;
    this.pourIndex = 0;
    this.goldCountdown = GOLD_EVERY;
    this.leverPtr = null;
    this.leverRatio = 0;
    this.gachaned = false;
    this.rumbled = false;
    this.flowAcc = 0;
    this.flowStarted = false;
    this.settledSinceRidge = 0;
    this.gustT = 0;
    this.gustDir = 1;
    this.shakeT = 0;
    this.eatT = 0;
    this.spoonAngle = 0;
    this.fpsEma = 60;
    this.target = 300;

    this.hooks = {
      floorY: (slot) => this.slots.floorY(slot),
      onPinHit: (pin, b) => {
        audio.pinDing(pin.row);
        if (Math.random() < 0.25) this.fx.sparkle(pin.x, pin.y, b.hue, 2, 45);
      },
      onSettle: (b, slot) => this._onSettle(b, slot),
    };
    this.slots.onRidgeSlot = (i, h01) => {
      audio.ridgeBell(i, h01);
      const x = this.L.slotX(i) + this.L.slotW / 2;
      this.fx.sparkle(x, this.slots.floorY(i) - 8, randi(0, 360), 6, 90);
    };
    this.slots.onRidgeDone = () => this._onRidgeDone();
  }

  onEnter(engine) { this.engine = engine; }

  onResize(w, h) {
    const L = computeLayout(w, h);
    this.L = L;
    this.bg.setSize(w, h);
    // 飛んでいる玉はいったんタンクの先頭へ戻す(レイアウト替えで迷子にしない)
    const flying = this.physics.balls.splice(0).map((b) => ({ hue: b.hue, kind: b.kind, golden: b.golden }));
    this.physics.giant = null;
    this.physics.setLayout(L);
    this.hopper.setLayout(L, this.engine ? this.engine.dpr : 1);
    if (flying.length) {
      this.hopper.queue.unshift(...flying.reverse());
      this.hopper._rebake();
    }
    this.slots.setLayout(L, this.engine ? this.engine.dpr : 1);
    this.target = this.slots.targetCount();
    this.mascot.setPlace(L.mascot.x, L.mascot.y, L.mascot.s);
    const btnY = L.pinTop + (L.slotTop - L.pinTop) * 0.42;
    this.itadakiBtn = {
      x: L.cx, y: btnY,
      w: clamp(Math.min(L.boardW * 0.9, 420), 220, 420),
      h: clamp(h * 0.095, 58, 88),
    };
    this.replayBtn = { ...this.itadakiBtn, y: btnY + this.itadakiBtn.h * 1.55 };
  }

  // --- 入力 ---

  onDown(x, y, id) {
    audio.unlock();
    const L = this.L;
    if (hitCircle(x, y, L.muteBtn)) {
      this.muted = !this.muted;
      audio.setMuted(this.muted);
      audio.tap();
      return;
    }
    for (let i = 0; i < SYRUPS.length; i++) {
      if (hitCircle(x, y, L.buttons[i])) {
        this.selected = i;
        audio.tap();
        this.fx.sparkle(L.buttons[i].x, L.buttons[i].y, SYRUPS[i].hue < 0 ? randi(0, 360) : SYRUPS[i].hue, 8, 90);
        return;
      }
    }
    if (hitCircle(x, y, L.fanBtn)) {
      this.gustDir = -this.gustDir;
      this.gustT = GUST_TIME;
      audio.whoosh();
      this.fx.floatText(L.cx, L.pinTop + 24, 'びゅ~!', 200, clamp(L.h * 0.032, 20, 30));
      return;
    }
    if (this.phase === 'full' && hitRect(x, y, this.itadakiBtn)) { this._startItadaki(); return; }
    if (this.phase === 'end' && hitRect(x, y, this.replayBtn)) { this._reset(); return; }
    if (this.phase !== 'make') return;

    // レバーをつかむ
    const lv = L.lever;
    const ly = lv.topY + (lv.botY - lv.topY) * this.leverRatio;
    if ((x - lv.x) ** 2 + (y - ly) ** 2 < (lv.handleR * 2.1) ** 2) {
      this.leverPtr = id;
      this._setLever(y);
      return;
    }
    // 巨大玉をタップして割る
    const g = this.physics.giant;
    if (g && (x - g.x) ** 2 + (y - g.y) ** 2 < (g.r + 26) ** 2) {
      this._burstGiant();
      return;
    }
    // ピンいたずら(ゲートが閉じていて玉が流れていない時だけ)
    if (this.leverRatio < 0.05 && this.physics.balls.length === 0 && y > L.pinTop - 10 && y < L.slotTop) {
      if (this._togglePin(x, y)) return;
    }
    // タンク周辺の長押しで注ぐ
    if (y < L.throatY + 10 && x > L.boardX - 20 && x < L.boardX + L.boardW + 20) {
      this.pourPtr = id;
      audio.pour();
    }
  }

  onMove(x, y, id) {
    if (id === this.leverPtr) this._setLever(y);
  }

  onUp(x, y, id) {
    if (id === this.leverPtr) this.leverPtr = null;
    if (id === this.pourPtr) this.pourPtr = null;
  }

  _setLever(y) {
    const lv = this.L.lever;
    let r = clamp((y - lv.topY) / (lv.botY - lv.topY), 0, 1);
    if (r > 0.9) r = 1;
    const prev = this.leverRatio;
    this.leverRatio = r;
    if (r >= 0.98 && !this.gachaned) {
      this.gachaned = true;
      audio.gachan();
      this.shakeT = 0.25;
    }
    if (r < 0.5) this.gachaned = false;
    if (prev < 0.06 && r >= 0.06 && this.hopper.count() > 0 && !this.rumbled) {
      this.rumbled = true;
      audio.rumble();
      this.shakeT = Math.max(this.shakeT, 0.18);
    }
  }

  _togglePin(x, y) {
    const L = this.L;
    let best = null, bestD = (L.pinR + 20) ** 2;
    for (const pin of L.pins) {
      const d = (x - pin.x) ** 2 + (y - pin.y) ** 2;
      if (d < bestD) { bestD = d; best = pin; }
    }
    if (!best) return false;
    const removed = this.physics.removedPins;
    if (removed.has(best.idx)) {
      removed.delete(best.idx);
      audio.poko();
      this.fx.sparkle(best.x, best.y, 200, 5, 60);
    } else if (removed.size < MAX_REMOVED_PINS) {
      removed.add(best.idx);
      audio.puni();
      this.fx.splash(best.x, best.y, 200, 6);
      this.fx.floatText(best.x, best.y - 20, 'ぷにっ', 200, 20);
    } else {
      this.fx.floatText(best.x, best.y - 20, 'これいじょう とれないよ', 340, 18);
    }
    return true;
  }

  // --- 玉の流れ ---

  _pourOne() {
    const syrup = SYRUPS[this.selected];
    const special = rollSpecial();
    let golden = false;
    if (--this.goldCountdown <= 0) {
      golden = true;
      this.goldCountdown = GOLD_EVERY + randi(-15, 15);
    }
    const rec = { hue: syrupColor(syrup, this.pourIndex++), kind: special ? special.kind : null, golden };
    if (this.hopper.pour(rec) && this.pourIndex % 9 === 0) audio.pour();
  }

  _onSettle(b, slot) {
    const rec = { hue: b.hue, kind: b.kind, golden: b.golden };
    const p = this.slots.add(slot, rec);
    audio.xylo(slot);
    this.settledSinceRidge++;
    if (Math.random() < 0.22) this.fx.splash(p.x, p.y - 4, b.hue, 3);
    if (b.golden) {
      this.slots.flashSlot(slot);
      audio.goldChime();
      this.fx.confettiBurst(p.x, p.y, 10, 170);
      this.fx.floatText(p.x, p.y - 26, 'きんの たま!', 48, clamp(this.L.h * 0.03, 18, 28));
      this.mascot.setMood('cheer', 1.2);
    } else if (this.slots.total() % 70 === 0) {
      this.fx.floatText(p.x, p.y - 22, choice(CHEERS), b.hue, clamp(this.L.h * 0.028, 16, 26));
      this.mascot.setMood('cheer', 1.0);
    }
  }

  _burstGiant() {
    const g = this.physics.burstGiant();
    if (!g) return;
    audio.bigPop();
    this.shakeT = 0.3;
    this.fx.confettiBurst(g.x, g.y, 26, 260);
    this.fx.floatText(g.x, g.y - 30, 'ぱーん!', 350, clamp(this.L.h * 0.04, 22, 36));
    for (let i = 0; i < 12; i++) {
      const a = rand(0, TAU);
      this.physics.spawn(
        { hue: 350 + randi(-14, 14), kind: null, golden: false },
        g.x + Math.cos(a) * g.r * 0.4, g.y + Math.sin(a) * g.r * 0.4,
        Math.cos(a) * rand(60, 220), Math.sin(a) * rand(60, 220) - 60,
      );
    }
  }

  _onRidgeDone() {
    this.fx.floatText(this.L.cx, this.L.slotTop - 30, 'おやまの かたち!', randi(0, 360), clamp(this.L.h * 0.042, 24, 40));
    this.mascot.setMood('cheer', 2);
    if (this.slots.total() >= this.target) {
      this._onFull();
    } else if (this.hopper.count() < MIN_GO) {
      this.fx.floatText(this.L.cx, this.L.slotTop + 30, 'もっと そそいでみよう!', 200, clamp(this.L.h * 0.03, 18, 28));
    }
  }

  _onFull() {
    this.phase = 'full';
    this.phaseT = 0;
    this.leverRatio = 0;
    audio.fullChime();
    this.mascot.setMood('cheer', 3);
    this.fx.confettiBurst(this.L.cx, this.L.slotTop, 50, 380);
    this.fx.floatText(this.L.cx, this.L.slotTop - 60, 'できあがり!', 330, clamp(this.L.h * 0.05, 30, 46));
  }

  _startItadaki() {
    this.phase = 'itadaki';
    this.phaseT = 0;
    audio.itadakimasu();
    this.fx.confettiBurst(this.L.cx, this.L.h * 0.4, 40, 320);
  }

  _reset() {
    audio.tap();
    this.slots.reset();
    this.hopper.reset();
    this.physics.reset();
    this.fx.clear();
    this.phase = 'make';
    this.phaseT = 0;
    this.pourIndex = 0;
    this.leverRatio = 0;
    this.flowStarted = false;
    this.settledSinceRidge = 0;
    this.mascot.setMood('idle', 0.1);
  }

  // --- 更新 ---

  update(dt, t) {
    this.phaseT += dt;
    this.bg.update(dt);
    this.fx.update(dt);
    this.mascot.update(dt);
    this.slots.update(dt);
    this.shakeT = Math.max(0, this.shakeT - dt);

    // 負荷に応じて玉の上限を自動調整
    this.fpsEma += (1 / Math.max(dt, 1e-4) - this.fpsEma) * 0.02;
    this.physics.activeCap = this.fpsEma < 32 ? 110 : this.fpsEma < 45 ? 170 : 240;

    if (this.phase === 'make') {
      // 注ぐ
      if (this.pourPtr !== null && !this.hopper.isFull()) {
        this.pourAcc += POUR_RATE * dt;
        while (this.pourAcc >= 1) { this.pourAcc -= 1; this._pourOne(); }
      }
      // レバーとゲート
      this.physics.gateRatio = this.leverRatio;
      // 放出(レバーの深さで速度が変わる)
      if (this.leverRatio > 0.06 && this.hopper.count() > 0) {
        this.flowAcc += this.leverRatio * MAX_FLOW_RATE * dt;
        while (this.flowAcc >= 1 && this.physics.balls.length < this.physics.activeCap) {
          this.flowAcc -= 1;
          const rec = this.hopper.dequeue();
          if (!rec) break;
          this.physics.spawn(rec);
          this.flowStarted = true;
        }
      } else {
        this.flowAcc = 0;
        this.rumbled = this.leverRatio >= 0.06 && this.rumbled;
      }
      // 巨大いちご玉の乱入
      if (this.leverRatio > 0.3 && !this.physics.giant && this.hopper.count() > 50 &&
          this.physics.balls.length > 20 && Math.random() < dt * GIANT_CHANCE_PER_SEC) {
        this.physics.spawnGiant();
        audio.goron();
        this.fx.floatText(this.L.cx, this.L.throatY - 20, 'おおきい いちご!? たっちして わってね!', 350, clamp(this.L.h * 0.028, 16, 26));
      }
      // レバーの自動復帰(流し終わったら)
      if (this.leverPtr === null && this.leverRatio > 0 && this.hopper.count() === 0 && this.physics.balls.length === 0 && !this.physics.giant) {
        this.leverRatio = Math.max(0, this.leverRatio - dt * 2.2);
        if (this.leverRatio === 0) { audio.poko(); this.rumbled = false; }
      }
      // なぞり光の見せ場(流れ終わった直後)
      if (this.flowStarted && !this.slots.ridgeActive && this.physics.balls.length === 0 && !this.physics.giant &&
          (this.hopper.count() === 0 || this.leverRatio < 0.06) && this.settledSinceRidge >= 18) {
        this.flowStarted = false;
        this.settledSinceRidge = 0;
        this.slots.startRidge();
      }
    } else {
      this.physics.gateRatio = 0;
    }

    // うちわの横風
    if (this.gustT > 0) {
      this.gustT -= dt;
      const k = Math.sin(Math.PI * clamp(1 - this.gustT / GUST_TIME, 0, 1));
      this.physics.windAx = this.gustDir * 620 * k;
      if (Math.random() < dt * 30) {
        const x = this.gustDir > 0 ? this.L.boardX + 6 : this.L.boardX + this.L.boardW - 6;
        this.fx.windStreak(x, rand(this.L.throatY, this.L.slotTop), this.gustDir);
      }
    } else {
      this.physics.windAx = 0;
    }

    this.physics.update(dt, this.hooks);
    audio.setJara(clamp(this.physics.movingCount / 80, 0, 1));

    // 冷気の演出
    if (Math.random() < dt * 3) {
      this.fx.mist(rand(this.L.boardX, this.L.boardX + this.L.boardW), this.L.iceY + 4, rand(12, 26));
    }

    if (this.phase === 'itadaki' && this.phaseT > 2.3) {
      this.phase = 'eat';
      this.phaseT = 0;
      this.eatT = 0;
      this.mascot.setMood('eat', 999);
    }
    if (this.phase === 'eat' && updateEat(this, dt)) {
      this.phase = 'end';
      this.phaseT = 0;
    }
    if (this.phase === 'end' && Math.random() < dt * 3) this.fx.confettiRain(this.L.w, 2);
  }

  // --- 描画 ---

  draw(ctx, t) {
    const L = this.L;
    ctx.save();
    if (this.shakeT > 0) {
      const s = this.shakeT * 14;
      ctx.translate(rand(-s, s), rand(-s, s));
    }
    this.bg.draw(ctx, t);
    drawTable(ctx, L);
    drawStall(ctx, L, t);
    drawCup(ctx, L, t);
    this.slots.draw(ctx, t);
    drawDividers(ctx, L);
    drawTankBack(ctx, L);
    this.hopper.draw(ctx, t, this.leverRatio > 0.06 && this.hopper.count() > 0);
    this._drawPourStream(ctx, t);
    drawTankFront(ctx, L, this.phase === 'make' ? this.leverRatio : 0, t);
    drawPins(ctx, L, this.physics.pinGlow, this.physics.removedPins, t);
    if (this.physics.giant) {
      const g = this.physics.giant;
      drawGiantBerry(ctx, g.x, g.y, g.r, g.wob, t);
    }
    for (const b of this.physics.balls) {
      drawBallFast(ctx, b.x, b.y, b.r, b.hue, b.golden ? 'gold' : b.kind, b.x * 0.1, t);
    }
    drawLever(ctx, L, this.phase === 'make' ? this.leverRatio : 0, this.phase === 'make' && this.hopper.count() >= MIN_GO, t);
    this.mascot.draw(ctx, t);
    if (this.phase === 'eat') drawSpoon(this, ctx, t);
    this.fx.draw(ctx, t);
    this._drawUI(ctx, t);
    ctx.restore();
  }

  _drawPourStream(ctx, t) {
    if (this.pourPtr === null || this.phase !== 'make' || this.hopper.isFull()) return;
    const L = this.L;
    const syrup = SYRUPS[this.selected];
    const x0 = L.cx;
    const y0 = L.tank.y - 16;
    const y1 = Math.min(this.hopper.heapTopY(), L.tankBottom - 4);
    // 注ぎ中のボトル
    ctx.save();
    ctx.translate(x0 + L.tank.w * 0.18, y0 - 8);
    ctx.rotate(2.4 + Math.sin(t * 10) * 0.06);
    ctx.font = `${clamp(L.tank.h * 0.55, 26, 44)}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(syrup.label, 0, 0);
    ctx.restore();
    // 玉の流れ
    for (let i = 0; i < 6; i++) {
      const u = ((t * 3.2 + i / 6) % 1);
      const y = y0 + (y1 - y0) * u;
      const hue = syrup.hue < 0 ? (this.pourIndex * 16 + i * 40) % 360 : syrup.hue;
      drawBallFast(ctx, x0 + Math.sin(i * 9 + t * 8) * 3, y, L.ballR * 0.8, hue, null);
    }
  }

  _drawUI(ctx, t) {
    const L = this.L;
    drawSyrupButtons(ctx, L, this.selected, t);
    drawMeter(ctx, L, this.slots.total() / this.target, t);
    drawIconButton(ctx, L.muteBtn, this.muted ? '🔇' : '🔊', t);
    drawIconButton(ctx, L.fanBtn, '💨', t);

    if (this.phase === 'make' && !this.slots.ridgeActive) {
      const idle = this.physics.balls.length === 0 && !this.flowStarted;
      if (this.hopper.count() < MIN_GO && idle && this.pourPtr === null && this.slots.total() === 0) {
        drawArrowHint(ctx, L.cx - L.tank.w * 0.34, L.tankBottom + 42, -Math.PI / 2, t);
        drawBubbleText(ctx, 'ぼとるを えらんで たんくを ながおし!', L.cx, L.tankBottom + 78, clamp(L.h * 0.028, 15, 26), '#4a7a9b');
      } else if (this.hopper.count() >= MIN_GO && this.leverRatio < 0.05 && idle) {
        drawArrowHint(ctx, L.lever.x - L.lever.handleR * 2.4, (L.lever.topY + L.lever.botY) / 2, Math.PI / 2, t);
        drawBubbleText(ctx, 'あかい ればーを したに ひっぱって GO!', L.cx, L.throatY + 26, clamp(L.h * 0.028, 15, 26), '#c2385a');
      }
    }
    if (this.phase === 'full') drawItadakimasuButton(ctx, this.itadakiBtn, this.phaseT * 1.4, t);
    drawFinishOverlay(this, ctx, t);
  }
}
