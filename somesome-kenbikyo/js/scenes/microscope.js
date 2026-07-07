// 顕微鏡シーン: 円形視野 + ピント合わせ + 倍率アップ + 細胞ぷるぷる → 「見えた！」
import { audio } from '../core/audio.js';
import { computeLayout, paintBackground } from '../core/layout.js';
import { clamp, mixColor, smoothstep } from '../core/utils.js';
import { Fairy } from '../render/fairy.js';
import { generateSpecimen } from '../game/specimen.js';

export class MicroscopeScene extends Phaser.Scene {
  constructor() { super('Microscope'); }

  init(data) {
    this.stain = data.stain;
    this.seed = data.seed;
  }

  create() {
    this.specimen = generateSpecimen(this.seed);
    this.look = this.stain.computeResult();
    this.focus = 0;      // 0=ぼやけ, 1=くっきり
    this.zoom = 1;       // 1,2,3 倍率
    this.zoomView = 1;   // アニメ用の現在倍率
    this.state = 'focus';
    this.phase = 0;
    this.focusAngle = null;
    this.focusAccum = 0;
    this.revealed = false;

    this.bg = this.add.graphics().setDepth(0);
    this.specG = this.add.graphics().setDepth(5);
    this.vignette = this.add.graphics().setDepth(10);
    this.ringG = this.add.graphics().setDepth(11);

    this.knob = this.add.container(0, 0).setDepth(20);
    this.knobG = this.add.graphics();
    this.knobIcon = this.add.text(0, 0, '🎛️', { fontSize: '30px' }).setOrigin(0.5);
    this.knob.add([this.knobG, this.knobIcon]);

    this.zoomBtn = this.add.container(0, 0).setDepth(20);
    this.zoomG = this.add.graphics();
    this.zoomIcon = this.add.text(0, 0, '🔍', { fontSize: '30px' }).setOrigin(0.5);
    this.zoomLabel = this.add.text(0, 22, '', { fontSize: '16px', color: '#fff', fontStyle: 'bold' }).setOrigin(0.5);
    this.zoomBtn.add([this.zoomG, this.zoomIcon, this.zoomLabel]);

    this.hintText = this.add.text(0, 0, 'ピントを あわせよう', {
      fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#eaf6ff', align: 'center',
      stroke: '#000', strokeThickness: 4,
    }).setOrigin(0.5).setDepth(25);

    this.fairy = new Fairy(this, 0, 0, 48);
    this.fairy.setDepth(22);
    this.fairy.tintTo(this.look.nucleusColor, 0.3);

    this.burst = this.add.particles(0, 0, 'star', {
      lifespan: 1200, speed: { min: 120, max: 380 }, scale: { start: 0.7, end: 0 },
      alpha: { start: 1, end: 0 }, tint: [0xfff3b0, 0x8fd0ff, 0xff9ec4, 0xffffff],
      gravityY: 200, emitting: false,
    }).setDepth(30);

    this.setupInput();
    this.layout();
    this.scale.on('resize', this.layout, this);
    this.cameras.main.fadeIn(500, 5, 12, 22);
  }

  setupInput() {
    // コンテナの当たり判定に頼らず、グローバル入力で座標判定(取りこぼし防止)
    this.panelBtns = [];
    this.input.on('pointerdown', (p) => {
      audio.unlock();
      if (this.state === 'done' && this.panelBtns.length) {
        for (const b of this.panelBtns) {
          const dx = p.x - (this.panel.x + b.x), dy = p.y - (this.panel.y + b.y);
          if (dx * dx + dy * dy <= b.r * b.r * 1.5) { audio.tap(); b.cb(); return; }
        }
        return;
      }
      if (this.hit(p, this.knob, this.knobR)) { this.tapFocus(); return; }
      if (this.hit(p, this.zoomBtn, this.zoomR)) { this.doZoom(); return; }
    });
    this.input.on('pointermove', (p) => {
      if (this.state !== 'focus' || !p.isDown) return;
      const a = Math.atan2(p.y - this.knob.y, p.x - this.knob.x);
      if (this.focusAngle != null) {
        let d = a - this.focusAngle;
        while (d > Math.PI) d -= Math.PI * 2;
        while (d < -Math.PI) d += Math.PI * 2;
        this.focusAccum += Math.abs(d);
        while (this.focusAccum > 0.5) { this.focusAccum -= 0.5; this.tapFocus(0.08); }
      }
      this.focusAngle = a;
    });
    this.input.on('pointerup', () => { this.focusAngle = null; });
  }

  hit(p, obj, r) {
    const dx = p.x - obj.x, dy = p.y - obj.y;
    return dx * dx + dy * dy <= r * r * 1.5;
  }

  tapFocus(step = 0.12) {
    if (this.state !== 'focus') return;
    this.focus = clamp(this.focus + step);
    audio.focusTune(this.focus);
    this.redrawSpec();
    if (this.focus >= 0.999 && this.state === 'focus') {
      this.state = 'zoom';
      this.hintText.setText('ばいりつを あげよう');
      this.fairy.hidePoint();
      this.fairy.pointAt(this.zoomBtn.x, this.zoomBtn.y, 54);
      this.fairy.cheer();
      audio.praise();
    }
  }

  doZoom() {
    if (this.state !== 'zoom') return;
    if (this.zoom < 3) {
      this.zoom += 1;
      audio.zoomUp();
      this.tweens.add({ targets: this, zoomView: this.zoom, duration: 600, ease: 'Cubic.out', onUpdate: () => this.redrawSpec() });
      this.zoomLabel.setText(`${this.zoom}x`);
      if (this.zoom === 3) { this.time.delayedCall(650, () => this.reveal()); this.fairy.hidePoint(); }
    }
  }

  reveal() {
    if (this.revealed) return;
    this.revealed = true;
    this.state = 'done';
    audio.fanfare();
    this.burst.emitParticleAt(this.fieldX, this.fieldY, 40);
    this.fairy.cheer();
    this.hintText.setText('みえた！');
    this.time.delayedCall(1200, () => this.showResult());
  }

  // ---- 結果パネル ----
  showResult() {
    const L = this.L;
    const stars = this.stain.stars();
    const fb = this.stain.feedback().slice(0, 3);
    this.panel = this.add.container(L.cx, L.h * 1.2).setDepth(40);
    const g = this.add.graphics();
    const pw = Math.min(L.w * 0.86, 460), ph = Math.min(L.h * 0.52, 420);
    g.fillStyle(0x14263a, 0.96); g.fillRoundedRect(-pw / 2, -ph / 2, pw, ph, 24);
    g.lineStyle(4, 0x7fe0ff, 0.8); g.strokeRoundedRect(-pw / 2, -ph / 2, pw, ph, 24);
    this.panel.add(g);
    const title = this.add.text(0, -ph / 2 + 34, `${this.specimen.icon} ${this.specimen.label}`, {
      fontFamily: 'system-ui, sans-serif', fontSize: '26px', color: '#ffffff', fontStyle: 'bold',
    }).setOrigin(0.5);
    const starStr = '⭐'.repeat(stars) + '・'.repeat(3 - stars);
    const starText = this.add.text(0, -ph / 2 + 78, starStr, { fontSize: '40px' }).setOrigin(0.5);
    this.panel.add([title, starText]);
    fb.forEach((t, i) => {
      const row = this.add.text(0, -ph / 2 + 130 + i * 46, `${t.icon}  ${t.jp}`, {
        fontFamily: 'system-ui, sans-serif', fontSize: '20px', color: '#eaf6ff',
      }).setOrigin(0.5);
      this.panel.add(row);
    });
    // もういちど / タイトル
    const again = this.makePanelBtn(-pw * 0.24, ph / 2 - 48, '🔄', 0x3ec16b, () => this.restart());
    const home = this.makePanelBtn(pw * 0.24, ph / 2 - 48, '🏠', 0xf29b3c, () => this.goTitle());
    this.panel.add([again, home]);
    this.tweens.add({ targets: this.panel, y: L.cy, duration: 500, ease: 'Back.out' });
    audio.praise();
  }

  makePanelBtn(x, y, icon, color, cb) {
    const c = this.add.container(x, y);
    const g = this.add.graphics();
    const r = Math.min(this.L.short * 0.09, 46);
    g.fillStyle(color, 1); g.fillCircle(0, 0, r);
    g.fillStyle(0xffffff, 0.3); g.fillEllipse(0, -r * 0.3, r * 1.2, r * 0.7);
    g.lineStyle(4, 0xffffff, 0.9); g.strokeCircle(0, 0, r);
    const t = this.add.text(0, 0, icon, { fontSize: `${r}px` }).setOrigin(0.5);
    c.add([g, t]);
    c.setSize(r * 2, r * 2);
    this.panelBtns.push({ x, y, r, cb });
    return c;
  }

  restart() { this.cameras.main.fadeOut(400, 5, 12, 22); this.time.delayedCall(420, () => this.scene.start('Game')); }
  goTitle() { this.cameras.main.fadeOut(400, 5, 12, 22); this.time.delayedCall(420, () => this.scene.start('Title')); }

  // ---- レイアウト ----
  layout() {
    const L = computeLayout(this.scale.width, this.scale.height);
    this.L = L;
    paintBackground(this.bg, L.w, L.h, 0x0a1420, 0x05080d);
    this.fieldX = L.cx;
    this.fieldY = L.portrait ? L.h * 0.4 : L.h * 0.44;
    this.fieldR = Math.min(L.w, L.h) * (L.portrait ? 0.4 : 0.36);

    // 円形マスク
    if (!this.maskG) this.maskG = this.make.graphics();
    this.maskG.clear();
    this.maskG.fillStyle(0xffffff);
    this.maskG.fillCircle(this.fieldX, this.fieldY, this.fieldR);
    this.specG.setMask(this.maskG.createGeometryMask());

    this.drawVignette();
    const by = L.portrait ? L.h * 0.8 : L.h * 0.82;
    this.knob.setPosition(L.portrait ? L.w * 0.24 : L.w * 0.16, by);
    this.zoomBtn.setPosition(L.portrait ? L.w * 0.76 : L.w * 0.84, by);
    this.drawControls();
    this.hintText.setPosition(L.cx, L.portrait ? L.h * 0.9 : L.h * 0.94).setFontSize(Math.min(L.short * 0.055, 24));
    this.fairy.setPosition(L.cx, by).setDepth(22);
    this.fairy.resize(Math.min(L.short * 0.09, 50));
    if (this.panel) this.panel.setPosition(L.cx, L.cy);
    this.redrawSpec();
    if (this.state === 'focus') this.fairy.pointAt(this.knob.x, this.knob.y, 54);
  }

  drawControls() {
    const r = Math.min(this.L.short * 0.085, 46);
    this.knobR = r; this.zoomR = r;
    [[this.knob, this.knobG, this.knobIcon, 0x5b7fd6], [this.zoomBtn, this.zoomG, this.zoomIcon, 0xf25c9a]].forEach(([c, g, ic]) => {
      c.setSize(r * 2, r * 2);
      g.clear();
      g.fillStyle(0x1d3552, 1); g.fillCircle(0, 0, r);
      g.lineStyle(4, 0xffffff, 0.8); g.strokeCircle(0, 0, r);
      ic.setFontSize(r);
    });
    this.zoomLabel.setPosition(0, r + 6).setFontSize(r * 0.4);
  }

  drawVignette() {
    const L = this.L;
    const g = this.vignette; g.clear();
    // 視野の外を暗くする(接眼レンズ風)
    g.fillStyle(0x05080d, 1);
    g.beginPath();
    g.moveTo(0, 0); g.lineTo(L.w, 0); g.lineTo(L.w, L.h); g.lineTo(0, L.h); g.closePath();
    g.arc(this.fieldX, this.fieldY, this.fieldR, 0, Math.PI * 2, true);
    g.fillPath();
    // 内側のソフトな影
    for (let i = 0; i < 6; i++) {
      g.lineStyle(6 - i, 0x000000, 0.12);
      g.strokeCircle(this.fieldX, this.fieldY, this.fieldR - i * 4);
    }
    const r = this.ringG; r.clear();
    r.lineStyle(Math.max(8, this.fieldR * 0.06), 0x24405e, 1);
    r.strokeCircle(this.fieldX, this.fieldY, this.fieldR + 6);
    r.lineStyle(3, 0x7fe0ff, 0.6);
    r.strokeCircle(this.fieldX, this.fieldY, this.fieldR + 2);
  }

  // ---- 標本の描画 ----
  redrawSpec() {
    const g = this.specG; g.clear();
    const cx = this.fieldX, cy = this.fieldY;
    const scale = this.fieldR * this.zoomView;
    const look = this.look;
    // 視野の地色
    g.fillStyle(look.bgColor, 1);
    g.fillCircle(cx, cy, this.fieldR);
    const sharp = smoothstep(this.focus);
    const blurK = 1 + (1 - sharp) * 0.8;      // ぼやけ時は大きく薄く
    const wob = this.state === 'done' ? 1 : this.zoom >= 2 ? 0.4 : 0;

    this.specimen.cells.forEach((c, idx) => {
      const wx = Math.sin(this.phase * 2 + idx) * 0.01 * wob;
      const wy = Math.cos(this.phase * 2.3 + idx) * 0.01 * wob;
      const px = cx + (c.x + wx) * scale * 0.5;
      const py = cy + (c.y + wy) * scale * 0.5;
      const r = c.r * scale * 0.5 * blurK;
      if (r < 0.5) return;
      // 細胞質
      const cyto = c.isRed ? mixColor(look.cytoColor, 0xd83b4a, 0.5) : look.cytoColor;
      g.fillStyle(cyto, look.cytoAlpha * (0.5 + sharp * 0.5));
      this.blob(g, px, py, r, c.wobble);
      if (c.hasWall && sharp > 0.4) {
        g.lineStyle(Math.max(1, r * 0.08), mixColor(look.cytoColor, 0x8a5a3a, 0.4), 0.5 * sharp);
        this.blobStroke(g, px, py, r, c.wobble);
      }
      // 核
      if (c.nucleusR > c.r * 0.05) {
        const nr = c.nucleusR * scale * 0.5 * blurK;
        const nx = cx + c.nx * scale * 0.5, ny = cy + c.ny * scale * 0.5;
        g.fillStyle(look.nucleusColor, look.nucleusAlpha * (0.55 + sharp * 0.45));
        g.fillCircle(nx, ny, nr);
        if (this.specimen.hiddenFace === idx && sharp > 0.6 && this.zoom >= 2) this.drawFace(g, nx, ny, nr);
      }
    });
    // ぼやけの白いモヤ
    if (sharp < 1) { g.fillStyle(0xffffff, (1 - sharp) * 0.28); g.fillCircle(cx, cy, this.fieldR); }
    // 濁り
    if (look.hazeAlpha > 0.02) { g.fillStyle(0xf2f4ee, clamp(look.hazeAlpha)); g.fillCircle(cx, cy, this.fieldR); }
    // ムラ
    if (look.muraAmount > 0.05) {
      for (let i = 0; i < 4; i++) {
        g.fillStyle(0x8098c0, look.muraAmount * 0.12);
        g.fillEllipse(cx + Math.sin(i * 2 + this.seed) * this.fieldR * 0.4, cy + Math.cos(i * 3) * this.fieldR * 0.4, this.fieldR * 0.7, this.fieldR * 0.25);
      }
    }
    // 明るいふち(照明)
    g.fillStyle(0xffffff, 0.06); g.fillCircle(cx - this.fieldR * 0.3, cy - this.fieldR * 0.3, this.fieldR * 0.5);
  }

  blob(g, x, y, r, wobble) {
    g.beginPath();
    const n = wobble.length;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2;
      const rr = r * wobble[i % n];
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.fillPath();
  }
  blobStroke(g, x, y, r, wobble) {
    g.beginPath();
    const n = wobble.length;
    for (let i = 0; i <= n; i++) {
      const a = (i / n) * Math.PI * 2; const rr = r * wobble[i % n];
      const px = x + Math.cos(a) * rr, py = y + Math.sin(a) * rr;
      if (i === 0) g.moveTo(px, py); else g.lineTo(px, py);
    }
    g.closePath(); g.strokePath();
  }
  drawFace(g, x, y, r) {
    g.fillStyle(0xffffff, 0.95);
    g.fillCircle(x - r * 0.35, y - r * 0.1, r * 0.18);
    g.fillCircle(x + r * 0.35, y - r * 0.1, r * 0.18);
    g.fillStyle(0x102030, 1);
    g.fillCircle(x - r * 0.32, y - r * 0.08, r * 0.09);
    g.fillCircle(x + r * 0.38, y - r * 0.08, r * 0.09);
  }

  update(time, delta) {
    this.phase += delta * 0.004;
    if (this.state === 'done' || this.zoom >= 2) this.redrawSpec();
  }
}
