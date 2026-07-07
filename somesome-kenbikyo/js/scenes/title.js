// タイトル画面: 大きなスタートボタンとしずくの妖精
import { audio } from '../core/audio.js';
import { computeLayout, paintBackground } from '../core/layout.js';
import { Fairy } from '../render/fairy.js';

export class TitleScene extends Phaser.Scene {
  constructor() { super('Title'); }

  create() {
    this.bg = this.add.graphics();
    this.deco = this.add.graphics();
    this.titleText = this.add.text(0, 0, 'そめそめ\nけんびきょう', {
      fontFamily: 'system-ui, "Hiragino Maru Gothic ProN", sans-serif',
      fontSize: '48px', color: '#ffffff', align: 'center', fontStyle: 'bold',
      stroke: '#2b3f8f', strokeThickness: 8,
    }).setOrigin(0.5);
    this.sub = this.add.text(0, 0, '🔬 いろで みる ちいさな せかい 🔬', {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#cdeaff',
    }).setOrigin(0.5);

    this.fairy = new Fairy(this, 0, 0, 64);

    // スタートボタン
    this.btn = this.add.container(0, 0);
    this.btnG = this.add.graphics();
    this.btnLabel = this.add.text(0, 0, '▶ はじめる', {
      fontFamily: 'system-ui, sans-serif', fontSize: '30px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    this.btn.add([this.btnG, this.btnLabel]);
    this.btn.setSize(240, 88);
    // 画面のどこをタップしても始められる(4歳向け・入力の取りこぼし防止)
    this.started = false;
    this.input.on('pointerdown', () => this.start());

    this.tweens.add({ targets: this.btn, scaleX: 1.06, scaleY: 1.06, duration: 900, yoyo: true, repeat: -1, ease: 'Sine.inOut' });

    // ふわふわ舞う染料のしずく
    this.floaters = this.add.particles(0, 0, 'dye', {
      x: { min: 0, max: this.scale.width }, y: this.scale.height + 20,
      lifespan: 6000, speedY: { min: -40, max: -70 },
      scale: { start: 0.5, end: 0.2 }, alpha: { start: 0.5, end: 0 },
      tint: [0x5b7fd6, 0xf25c9a, 0x8fd0ff], frequency: 500, quantity: 1,
    });

    this.layout();
    this.scale.on('resize', this.layout, this);
    this.cameras.main.fadeIn(400, 5, 12, 22);
  }

  start() {
    if (this.started) return;
    this.started = true;
    audio.unlock();
    audio.praise();
    this.tweens.add({
      targets: this.btn, scaleX: 0.92, scaleY: 0.92, duration: 90, yoyo: true,
      onComplete: () => {
        this.cameras.main.fadeOut(300, 5, 12, 22);
        this.time.delayedCall(320, () => this.scene.start('Game'));
      },
    });
  }

  layout() {
    const L = computeLayout(this.scale.width, this.scale.height);
    paintBackground(this.bg, L.w, L.h, 0x123a63, 0x0d1b2a);
    const ts = Math.min(L.short * 0.12, 62);
    this.titleText.setFontSize(ts).setPosition(L.cx, L.h * (L.portrait ? 0.22 : 0.2));
    this.titleText.setStroke('#2b3f8f', Math.max(4, ts * 0.14));
    this.sub.setFontSize(Math.min(L.short * 0.045, 22)).setPosition(L.cx, this.titleText.y + ts * 1.2);
    this.fairy.setPosition(L.cx, L.h * (L.portrait ? 0.52 : 0.52));
    this.fairy.resize(Math.min(L.short * 0.12, 72));
    this.btn.setPosition(L.cx, L.h * (L.portrait ? 0.78 : 0.82));
    this.drawButton(L);
    if (this.floaters) this.floaters.setPosition(0, 0);
  }

  drawButton(L) {
    const w = Math.min(L.short * 0.6, 300), h = Math.min(L.short * 0.2, 96);
    this.btn.setSize(w, h);
    this.btn.input.hitArea.setTo(-w / 2, -h / 2, w, h);
    const g = this.btnG; g.clear();
    g.fillStyle(0x2b3f8f, 0.4); g.fillRoundedRect(-w / 2, -h / 2 + 6, w, h, h / 2);
    g.fillStyle(0xff7fb0, 1); g.fillRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    g.fillStyle(0xffffff, 0.35); g.fillRoundedRect(-w / 2 + 8, -h / 2 + 6, w - 16, h * 0.35, h * 0.3);
    g.lineStyle(4, 0xffffff, 0.9); g.strokeRoundedRect(-w / 2, -h / 2, w, h, h / 2);
    this.btnLabel.setFontSize(Math.min(h * 0.4, 34));
  }
}
