// 起動シーン: パーティクル用テクスチャをコード生成してからタイトルへ
export class BootScene extends Phaser.Scene {
  constructor() { super('Boot'); }

  create() {
    this.makeSoftCircle('spark', 32, 0xffffff);
    this.makeSoftCircle('dye', 40, 0xffffff);
    this.makeStar('star', 40);
    this.makeBubble('bubble', 40);
    this.scene.start('Title');
  }

  // ふんわり発光する丸
  makeSoftCircle(key, size, color) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const r = size / 2;
    for (let i = r; i > 0; i--) {
      const a = Math.pow(i / r, 2);
      g.fillStyle(color, (1 - a) * 0.9 + 0.05);
      g.fillCircle(r, r, i);
    }
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // きらめく星(4方向のスパーク)
  makeStar(key, size) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const c = size / 2;
    g.fillStyle(0xffffff, 1);
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = (i / 8) * Math.PI * 2;
      const rr = i % 2 === 0 ? c : c * 0.32;
      const x = c + Math.cos(a) * rr;
      const y = c + Math.sin(a) * rr;
      if (i === 0) g.moveTo(x, y); else g.lineTo(x, y);
    }
    g.closePath();
    g.fillPath();
    g.generateTexture(key, size, size);
    g.destroy();
  }

  // 泡(水洗い用)
  makeBubble(key, size) {
    const g = this.make.graphics({ x: 0, y: 0 }, false);
    const r = size / 2;
    g.fillStyle(0xffffff, 0.25);
    g.fillCircle(r, r, r * 0.9);
    g.lineStyle(2, 0xffffff, 0.8);
    g.strokeCircle(r, r, r * 0.88);
    g.fillStyle(0xffffff, 0.9);
    g.fillCircle(r * 0.65, r * 0.6, r * 0.22);
    g.generateTexture(key, size, size);
    g.destroy();
  }
}
