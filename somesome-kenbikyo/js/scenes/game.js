// 染色工程シーン: スライドを液につけて染めていく。工程ごとに操作が変わる。
import { audio } from '../core/audio.js';
import { computeLayout, paintBackground } from '../core/layout.js';
import { clamp, rand } from '../core/utils.js';
import { Fairy } from '../render/fairy.js';
import { drawJar } from '../render/vessels.js';
import { drawSlideGlass, drawTissueMacro } from '../render/slide.js';
import { StainState, IDEAL } from '../game/stain.js';
import { STEPS, RATES } from '../game/steps.js';

export class GameScene extends Phaser.Scene {
  constructor() { super('Game'); }

  create() {
    this.seed = (Math.random() * 1e9) | 0;
    this.stain = new StainState(rand(0.55, 1.0));
    this.stepIndex = 0;
    this.phase = 0;
    this.coverAlpha = 0;
    this.filling = false;
    this.lastAngle = null;
    this.turnAccum = 0;
    this.shakeDir = 0;
    this.shakeX = null;

    this.bg = this.add.graphics().setDepth(0);
    this.jarG = this.add.graphics().setDepth(4);
    this.slideG = this.add.graphics().setDepth(10);
    this.tissueG = this.add.graphics().setDepth(11);
    this.gaugeG = this.add.graphics().setDepth(15);

    this.progressG = this.add.graphics().setDepth(30);
    this.progIcons = [];
    STEPS.forEach((s) => {
      const t = this.add.text(0, 0, s.icon, { fontSize: '22px' }).setOrigin(0.5).setDepth(31);
      this.progIcons.push(t);
    });

    this.stepIcon = this.add.text(0, 0, '', { fontSize: '46px' }).setOrigin(0.5).setDepth(32);
    this.hintText = this.add.text(0, 0, '', {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#eaf6ff',
      align: 'center', stroke: '#123a63', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(32);

    this.fairy = new Fairy(this, 0, 0, 52);
    this.fairy.setDepth(20);

    this.makeNextButton();

    // パーティクル
    this.splash = this.add.particles(0, 0, 'dye', {
      lifespan: 700, speed: { min: 60, max: 180 }, angle: { min: 200, max: 340 },
      scale: { start: 0.5, end: 0 }, alpha: { start: 0.9, end: 0 },
      gravityY: 400, emitting: false,
    }).setDepth(12);
    this.bubbles = this.add.particles(0, 0, 'bubble', {
      lifespan: 900, speedY: { min: -120, max: -60 }, speedX: { min: -40, max: 40 },
      scale: { start: 0.3, end: 0.6 }, alpha: { start: 0.7, end: 0 }, emitting: false,
    }).setDepth(12);
    this.sparkles = this.add.particles(0, 0, 'star', {
      lifespan: 800, speed: { min: 30, max: 90 }, scale: { start: 0.5, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xfff3b0, 0x8fd0ff, 0xff9ec4], emitting: false,
    }).setDepth(18);

    this.input.on('pointerdown', this.onDown, this);
    this.input.on('pointerup', this.onUp, this);
    this.input.on('pointermove', this.onMove, this);

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.cameras.main.fadeIn(400, 5, 12, 22);
    this.enterStep(0);
  }

  makeNextButton() {
    this.nextBtn = this.add.container(0, 0).setDepth(40);
    this.nextG = this.add.graphics();
    this.nextLabel = this.add.text(0, 0, '✓', {
      fontSize: '40px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.nextBtn.add([this.nextG, this.nextLabel]);
    this.nextBtn.setSize(96, 96);
    this.nextBtn.setInteractive(new Phaser.Geom.Circle(0, 0, 48), Phaser.Geom.Circle.Contains);
    this.nextBtn.on('pointerdown', (p, lx, ly, ev) => { ev.stopPropagation(); this.advance(); });
    this.nextBtn.visible = false;
  }

  // ---- レイアウト ----
  layout() {
    const L = computeLayout(this.scale.width, this.scale.height);
    this.L = L;
    paintBackground(this.bg, L.w, L.h, 0x1b4a72, 0x0d1b2a);

    // 工程の進み(上部の点)
    const n = STEPS.length;
    const pad = L.w * 0.08;
    const gap = (L.w - pad * 2) / (n - 1);
    this.progY = L.safeTop + 26;
    this.progIcons.forEach((t, i) => {
      t.setPosition(pad + gap * i, this.progY).setFontSize(Math.min(L.w * 0.05, 24));
    });

    // ビーカーと道具の中心
    const workY = L.portrait ? L.h * 0.44 : L.h * 0.46;
    this.jarW = Math.min(L.short * 0.5, 260);
    this.jarH = this.jarW * 1.15;
    this.jarX = L.cx;
    this.jarY = workY;
    this.slideW = this.jarW * 0.42;
    this.slideH = this.jarH * 1.5;
    this.slideRestY = this.jarY - this.jarH * 0.15; // 液につかった位置
    this.slideUpY = this.jarY - this.jarH * 0.9;     // 引き上げた位置

    // 上のアイコン・ヒント
    this.stepIcon.setPosition(L.cx, this.progY + Math.min(L.w * 0.09, 46));
    this.stepIcon.setFontSize(Math.min(L.w * 0.11, 52));
    this.hintText.setPosition(L.cx, this.stepIcon.y + Math.min(L.w * 0.07, 40));
    this.hintText.setFontSize(Math.min(L.short * 0.05, 22));

    // しずくの妖精と ✓ ボタン
    const by = L.portrait ? L.h * 0.86 : L.h * 0.82;
    this.fairy.setPosition(L.portrait ? L.w * 0.22 : L.w * 0.16, by);
    this.fairy.resize(Math.min(L.short * 0.11, 60));
    this.nextX = L.portrait ? L.w * 0.8 : L.w * 0.86;
    this.nextY = by;
    this.nextBtn.setPosition(this.nextX, this.nextY);
    this.drawNextButton();

    if (this.slideY == null) this.slideY = this.slideUpY;
    this.redrawAll();
  }

  drawNextButton() {
    const r = Math.min(this.L.short * 0.09, 52);
    this.nextBtn.setSize(r * 2, r * 2);
    this.nextBtn.input.hitArea.setTo(0, 0, r);
    const g = this.nextG; g.clear();
    g.fillStyle(0x1a7a3a, 0.4); g.fillCircle(0, 6, r);
    g.fillStyle(0x3ec16b, 1); g.fillCircle(0, 0, r);
    g.fillStyle(0xffffff, 0.3); g.fillEllipse(0, -r * 0.3, r * 1.2, r * 0.7);
    g.lineStyle(4, 0xffffff, 0.9); g.strokeCircle(0, 0, r);
    this.nextLabel.setFontSize(r * 0.9);
  }

  // ---- 工程の開始 ----
  enterStep(i) {
    this.stepIndex = i;
    const step = STEPS[i];
    this.step = step;
    this.filling = false;
    this.turnAccum = 0;
    this.lastAngle = null;
    this.shakeX = null;
    this.stepIcon.setText(step.icon);
    this.hintText.setText(step.hint);
    this.nextBtn.visible = step.type !== 'scope';
    this.tweens.add({ targets: this.nextBtn, scaleX: 1, scaleY: 1, duration: 1 });

    if (step.liquid) this.fairy.tintTo(step.liquid.deep, 0.5);
    else this.fairy.tintTo(0x9fdcff, 0);

    // スライドを液につける(チャポン)
    if (step.type === 'scope') {
      this.slideY = this.slideUpY;
      this.pointScopeTarget();
    } else if (step.type === 'cover') {
      this.slideY = this.slideUpY;
      this.fairy.pointAt(this.jarX, this.slideY, this.slideW * 0.8);
    } else {
      this.dipSlide();
    }
    this.updateProgress();
    this.redrawAll();
  }

  dipSlide() {
    this.slideY = this.slideUpY;
    this.tweens.add({
      targets: this, slideY: this.slideRestY, duration: 420, ease: 'Back.in',
      onUpdate: () => this.redrawSlide(),
      onComplete: () => {
        audio.chapon();
        this.emitSplash();
        this.guideInteraction();
      },
    });
  }

  guideInteraction() {
    const s = this.step;
    if (s.type === 'longpress' || s.type === 'mix') this.fairy.pointAt(this.jarX, this.jarY, this.jarW * 0.55);
    else if (s.type === 'shake') this.fairy.pointAt(this.jarX, this.slideY - this.slideH * 0.1, this.slideW);
    else if (s.type === 'soak') this.fairy.pointAt(this.jarX, this.jarY, this.jarW * 0.55);
  }

  pointScopeTarget() {
    this.fairy.pointAt(this.jarX, this.jarY, this.jarW * 0.5);
  }

  updateProgress() {
    this.progIcons.forEach((t, i) => {
      t.setScale(i === this.stepIndex ? 1.35 : 1);
      t.setAlpha(i < this.stepIndex ? 0.5 : i === this.stepIndex ? 1 : 0.7);
    });
    const g = this.progressG; g.clear();
    if (this.progIcons.length < 2) return;
    const x0 = this.progIcons[0].x, x1 = this.progIcons[this.progIcons.length - 1].x;
    g.lineStyle(4, 0xffffff, 0.25);
    g.lineBetween(x0, this.progY, x1, this.progY);
    const done = this.stepIndex / (STEPS.length - 1);
    g.lineStyle(6, 0xffd66b, 0.9);
    g.lineBetween(x0, this.progY, x0 + (x1 - x0) * done, this.progY);
  }

  // ---- 入力 ----
  isInJar(x, y) {
    return Math.abs(x - this.jarX) < this.jarW * 0.8 && Math.abs(y - this.jarY) < this.jarH * 1.1;
  }

  onDown(p) {
    audio.unlock();
    const s = this.step;
    if (!s) return;
    if (s.type === 'scope') { if (this.isInJar(p.x, p.y)) this.gotoScope(); return; }
    if (s.type === 'cover') { if (this.isInJar(p.x, p.y)) this.doCover(); return; }
    if (!this.isInJar(p.x, p.y)) return;
    if (s.type === 'longpress') { this.filling = true; }
    else if (s.type === 'mix') { this.lastAngle = Math.atan2(p.y - this.jarY, p.x - this.jarX); }
    else if (s.type === 'shake') { this.shakeX = p.x; }
  }

  onUp() { this.filling = false; this.lastAngle = null; this.shakeX = null; }

  onMove(p) {
    const s = this.step;
    if (!s || !p.isDown) return;
    if (s.type === 'mix' && this.isInJar(p.x, p.y)) {
      const a = Math.atan2(p.y - this.jarY, p.x - this.jarX);
      if (this.lastAngle != null) {
        let d = a - this.lastAngle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.turnAccum += Math.abs(d);
        if (this.turnAccum > Math.PI / 2) {
          this.turnAccum -= Math.PI / 2;
          this.addParam(RATES.mixPerTurn);
          audio.swirl();
          this.emitBubbles(1);
        }
      }
      this.lastAngle = a;
    } else if (s.type === 'shake' && this.isInJar(p.x, p.y)) {
      if (this.shakeX != null) {
        const dir = Math.sign(p.x - this.shakeX);
        if (dir !== 0 && dir !== this.shakeDir && Math.abs(p.x - this.shakeX) > this.jarW * 0.12) {
          this.shakeDir = dir;
          this.addParam(RATES.shakePerSwing);
          audio.swish();
          this.emitBubbles(2);
        }
        this.shakeX = p.x;
      }
    }
  }

  addParam(delta) {
    const key = this.step.param;
    if (!key) return;
    this.stain[key] = clamp(this.stain[key] + delta, 0, 1.2);
    this.checkZone();
    this.redrawSlide();
  }

  // idealレンジに入ったら ✓ を光らせて誘導
  checkZone() {
    const key = this.step.param;
    if (!key || !IDEAL[key]) return;
    const [lo, hi] = IDEAL[key];
    const v = this.stain[key];
    if (v >= lo && v <= hi && !this._readyPulse) {
      this._readyPulse = true;
      this.fairy.hidePoint();
      this.fairy.pointAt(this.nextX, this.nextY, 56);
      this.fairy.cheer();
      this.tweens.add({ targets: this.nextBtn, scaleX: 1.15, scaleY: 1.15, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      audio.sparkle();
    }
  }

  advance() {
    audio.tap();
    this._readyPulse = false;
    this.tweens.killTweensOf(this.nextBtn);
    this.nextBtn.setScale(1);
    this.fairy.hidePoint();
    // 引き上げ
    const finish = () => {
      if (this.stepIndex < STEPS.length - 1) this.enterStep(this.stepIndex + 1);
    };
    if (this.step.liquid && this.step.type !== 'cover') {
      this.tweens.add({ targets: this, slideY: this.slideUpY, duration: 380, ease: 'Sine.out', onUpdate: () => this.redrawSlide(), onComplete: finish });
    } else finish();
  }

  doCover() {
    audio.chapon();
    this.emitSplash();
    this.tweens.add({ targets: this, coverAlpha: 1, duration: 600, onUpdate: () => this.redrawSlide() });
    this.fairy.hidePoint();
    this.fairy.pointAt(this.nextX, this.nextY, 56);
    this.fairy.cheer();
    audio.sparkle();
  }

  gotoScope() {
    audio.zoomUp();
    this.fairy.hidePoint();
    this.cameras.main.fadeOut(500, 5, 12, 22);
    this.time.delayedCall(520, () => {
      this.scene.start('Microscope', { stain: this.stain, seed: this.seed });
    });
  }

  // ---- 更新 ----
  update(time, delta) {
    this.phase += delta * 0.004;
    if (this.jarG && this.step && this.step.liquid) this.redrawJar();
    const dt = delta / 1000;
    if (this.filling && this.step && this.step.type === 'longpress') {
      this.addParam(RATES.longpress * dt);
      audio.soakTick(clamp(this.stain[this.step.param]));
      if (Math.random() < 0.3) this.emitSparkleAtSlide();
    }
    if (this.step && this.step.type === 'soak') {
      const prev = this.stain.blue;
      this.stain.blue = clamp(this.stain.blue + RATES.soak * dt, 0, 1.2);
      if (Math.floor(prev * 6) !== Math.floor(this.stain.blue * 6)) { audio.sparkle(); this.emitSparkleAtSlide(); }
      if (prev < 0.6 && this.stain.blue >= 0.6) audio.transform();
      this.checkZone();
      this.redrawSlide();
    }
  }

  // ---- 描画 ----
  redrawAll() { this.redrawJar(); this.redrawSlide(); }

  redrawJar() {
    if (!this.step || !this.step.liquid) { this.jarG.clear(); this.gaugeG.clear(); return; }
    drawJar(this.jarG, this.jarX, this.jarY, this.jarW, this.jarH, this.step.liquid, 0.72, this.phase);
    this.drawGauge();
  }

  drawGauge() {
    const g = this.gaugeG; g.clear();
    const key = this.step && this.step.param;
    if (!key || !IDEAL[key]) return;
    const w = this.jarW * 0.9, h = Math.min(this.L.short * 0.04, 20);
    const x = this.jarX - w / 2, y = this.jarY + this.jarH * 0.62;
    g.fillStyle(0x0d1b2a, 0.6); g.fillRoundedRect(x, y, w, h, h / 2);
    const [lo, hi] = IDEAL[key];
    g.fillStyle(0x3ec16b, 0.5); g.fillRect(x + w * lo, y, w * (hi - lo), h);
    const v = clamp(this.stain[key], 0, 1);
    g.fillStyle(this.step.liquid.deep, 1); g.fillRoundedRect(x, y, w * v, h, h / 2);
    g.lineStyle(3, 0xffffff, 0.8); g.strokeRoundedRect(x, y, w, h, h / 2);
  }

  redrawSlide() {
    drawSlideGlass(this.slideG, this.jarX, this.slideY, this.slideW, this.slideH, this.coverAlpha);
    const look = this.stain.computeResult();
    const tissueY = this.slideY + this.slideH * 0.28;
    drawTissueMacro(this.tissueG, this.jarX, tissueY, this.slideW * 0.42, look, this.seed, this.phase);
  }

  emitSplash() {
    if (this.step && this.step.liquid) this.splash.setParticleTint(this.step.liquid.light);
    this.splash.emitParticleAt(this.jarX, this.jarY - this.jarH * 0.15, 14);
  }
  emitBubbles(n) { this.bubbles.emitParticleAt(this.jarX + rand(-this.jarW * 0.3, this.jarW * 0.3), this.jarY, n); }
  emitSparkleAtSlide() { this.sparkles.emitParticleAt(this.jarX + rand(-this.slideW * 0.4, this.slideW * 0.4), this.slideY + this.slideH * 0.28, 2); }
}
