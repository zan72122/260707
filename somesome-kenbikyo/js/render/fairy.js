// しずくの妖精「シズク」。半透明のしずくで、いまの液の色にほんのり染まる。
// 指さし+光るハイライトで「つぎhere」を教える。コード描画のみ。
import { mixColor } from '../core/utils.js';

export class Fairy extends Phaser.GameObjects.Container {
  constructor(scene, x, y, size = 60) {
    super(scene, x, y);
    scene.add.existing(this);
    this.baseSize = size;
    this.bodyColor = 0x9fdcff;
    this.aura = scene.add.graphics();
    this.body = scene.add.graphics();
    this.face = scene.add.graphics();
    this.cheek = scene.add.graphics();
    this.add([this.aura, this.body, this.cheek, this.face]);
    this.blinkT = 0;
    this.mood = 'happy';
    this.setSize(size * 2, size * 2.6);

    // ハイライトリング(指さし先)は独立オブジェクト
    this.ring = scene.add.graphics().setDepth(50);
    this.ring.visible = false;
    this.pointer = scene.add.graphics().setDepth(50);
    this.pointer.visible = false;

    this.redraw();
    this.floatTween = scene.tweens.add({
      targets: this, y: y - size * 0.18, duration: 1600,
      yoyo: true, repeat: -1, ease: 'Sine.inOut',
    });
    this.blinkTimer = scene.time.addEvent({
      delay: 2800, loop: true, callback: () => this.blink(),
    });
  }

  resize(size) {
    this.baseSize = size;
    this.setSize(size * 2, size * 2.6);
    this.redraw();
  }

  // 液の色に染まる(setTintToLiquid)
  tintTo(color, t = 0.55) {
    this.bodyColor = mixColor(0x9fdcff, color, t);
    this.redraw();
  }

  redraw(eyeScaleY = 1) {
    const s = this.baseSize;
    const b = this.body; b.clear();
    // オーラ(やわらかい光)
    this.aura.clear();
    this.aura.fillStyle(this.bodyColor, 0.18);
    this.aura.fillCircle(0, s * 0.15, s * 1.35);
    // しずく本体(teardrop)
    b.fillStyle(this.bodyColor, 0.9);
    b.beginPath();
    b.moveTo(0, -s * 1.2);
    b.lineTo(s * 0.82, s * 0.15);
    b.arc(0, s * 0.35, s * 0.9, -0.32, Math.PI + 0.32, false);
    b.closePath();
    b.fillPath();
    // ふちのハイライト
    b.lineStyle(Math.max(2, s * 0.06), 0xffffff, 0.55);
    b.strokePath();
    // つやハイライト
    b.fillStyle(0xffffff, 0.6);
    b.fillEllipse(-s * 0.28, -s * 0.15, s * 0.28, s * 0.42);
    b.fillStyle(0xffffff, 0.35);
    b.fillCircle(s * 0.3, s * 0.35, s * 0.14);

    // ほっぺ
    this.cheek.clear();
    this.cheek.fillStyle(0xff9ec4, 0.55);
    this.cheek.fillCircle(-s * 0.42, s * 0.42, s * 0.14);
    this.cheek.fillCircle(s * 0.42, s * 0.42, s * 0.14);

    // 顔
    const f = this.face; f.clear();
    const ey = s * 0.2;
    const ex = s * 0.34;
    f.fillStyle(0x213b57, 1);
    if (this.mood === 'happy' || this.mood === 'cheer') {
      f.fillEllipse(-ex, ey, s * 0.16, s * 0.22 * eyeScaleY);
      f.fillEllipse(ex, ey, s * 0.16, s * 0.22 * eyeScaleY);
      // きらめき
      f.fillStyle(0xffffff, 0.95);
      f.fillCircle(-ex + s * 0.05, ey - s * 0.06, s * 0.045);
      f.fillCircle(ex + s * 0.05, ey - s * 0.06, s * 0.045);
      // にっこり口
      f.lineStyle(Math.max(2, s * 0.05), 0x213b57, 1);
      f.beginPath();
      if (this.mood === 'cheer') {
        f.arc(0, s * 0.5, s * 0.2, 0.1, Math.PI - 0.1, false);
      } else {
        f.arc(0, s * 0.46, s * 0.16, 0.2, Math.PI - 0.2, false);
      }
      f.strokePath();
    }
  }

  blink() {
    if (!this.scene) return;
    this.scene.tweens.add({
      targets: { v: 1 }, v: 0.1, duration: 90, yoyo: true,
      onUpdate: (tw, t) => this.redraw(t.v),
      onComplete: () => this.redraw(1),
    });
  }

  cheer() {
    this.mood = 'cheer';
    this.redraw();
    this.scene.tweens.add({
      targets: this, scaleX: 1.18, scaleY: 1.18, duration: 260,
      yoyo: true, repeat: 2, ease: 'Sine.inOut',
      onComplete: () => { this.mood = 'happy'; this.redraw(); },
    });
  }

  // 指定座標を指さし、光るハイライトを出す
  pointAt(tx, ty, radius = 60) {
    this.ring.visible = true;
    this.pointer.visible = true;
    if (this._ringTween) this._ringTween.stop();
    this._ringTween = this.scene.tweens.add({
      targets: { r: 0.8 }, r: 1.25, duration: 780, yoyo: true, repeat: -1, ease: 'Sine.inOut',
      onUpdate: (tw, t) => {
        this.ring.clear();
        this.ring.lineStyle(6, 0xffe27a, 0.9);
        this.ring.strokeCircle(tx, ty, radius * t.r);
        this.ring.lineStyle(3, 0xffffff, 0.7);
        this.ring.strokeCircle(tx, ty, radius * t.r * 0.7);
      },
    });
    // しずくから対象へ向かう小さな矢印
    this.pointer.clear();
    const ang = Math.atan2(ty - this.y, tx - this.x);
    const px = this.x + Math.cos(ang) * this.baseSize * 1.2;
    const py = this.y + Math.sin(ang) * this.baseSize * 1.2;
    this.pointer.fillStyle(0xffe27a, 0.95);
    this.pointer.beginPath();
    this.pointer.moveTo(px + Math.cos(ang) * 22, py + Math.sin(ang) * 22);
    this.pointer.lineTo(px + Math.cos(ang + 2.5) * 12, py + Math.sin(ang + 2.5) * 12);
    this.pointer.lineTo(px + Math.cos(ang - 2.5) * 12, py + Math.sin(ang - 2.5) * 12);
    this.pointer.closePath();
    this.pointer.fillPath();
  }

  hidePoint() {
    if (this._ringTween) this._ringTween.stop();
    this.ring.visible = false;
    this.pointer.visible = false;
  }

  destroy(fromScene) {
    if (this.blinkTimer) this.blinkTimer.remove();
    if (this.ring) this.ring.destroy();
    if (this.pointer) this.pointer.destroy();
    super.destroy(fromScene);
  }
}
