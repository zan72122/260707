// タイトル&シーンえらび画面
// ふわふわ動く虹とプリズム、大きなカードで4歳児にもわかりやすく

import { audio } from '../core/audio.js';
import { discoveries } from '../core/discoveries.js';
import { RAINBOW, TAU, rand, starPath } from '../core/utils.js';
import { MENU_FONT, drawMenuSky, drawBigRainbow, drawTitle, drawSceneCard } from './menu_view.js';

const SCENES = [
  { id: 'morning', label: 'あさの まどべ', icon: 'window', hue: '#ffd76e', bg: ['#ffe9b8', '#ffc98a'] },
  { id: 'bath', label: 'おふろの にじあわ', icon: 'duck', hue: '#8ee3f7', bg: ['#c9f2fb', '#8fd6ee'] },
  { id: 'dress', label: 'にじいろ ドレスこうぼう', icon: 'dress', hue: '#ffa8d3', bg: ['#ffe0ef', '#ffb3d9'] },
  { id: 'garden', label: 'あめあがりの にわ', icon: 'flower', hue: '#9fe8a0', bg: ['#dcf7d8', '#a8e8a5'] },
];

const STAR_COUNT = 40;

export class MenuScene {
  constructor(engine) {
    this.engine = engine;
    this.time = 0;
    this.cards = [];
    this.pressed = null;
    this._onDown = (p) => this._down(p);
    this._onUp = (p) => this._up(p);
    engine.input.on('down', this._onDown);
    engine.input.on('up', this._onUp);
    this._stars = [];
    for (let i = 0; i < STAR_COUNT; i++) {
      this._stars.push({ x: Math.random(), y: Math.random() * 0.55, s: rand(1, 3), tw: rand(0, TAU) });
    }
  }

  exit() {
    const L = this.engine.input.listeners;
    L.down.splice(L.down.indexOf(this._onDown), 1);
    L.up.splice(L.up.indexOf(this._onUp), 1);
  }

  layout(W, H) {
    const portrait = H > W;
    const cols = portrait ? 2 : 4;
    const rows = portrait ? 2 : 1;
    const areaTop = portrait ? H * 0.42 : H * 0.48;
    const gap = 18;
    const cw = Math.min((W - gap * (cols + 1)) / cols, portrait ? 240 : 250);
    const ch = Math.min((H - areaTop - gap * (rows + 1)) / rows, portrait ? 220 : 250);
    const totalW = cols * cw + (cols - 1) * gap;
    const x0 = (W - totalW) / 2;
    this.cards = SCENES.map((s, i) => {
      const col = i % cols;
      const row = (i / cols) | 0;
      return {
        ...s,
        x: x0 + col * (cw + gap),
        y: areaTop + row * (ch + gap),
        w: cw,
        h: ch,
        phase: i * 1.7,
      };
    });
  }

  _down(p) {
    for (const c of this.cards) {
      if (p.x > c.x && p.x < c.x + c.w && p.y > c.y && p.y < c.y + c.h) {
        this.pressed = c;
        audio.tap();
        return;
      }
    }
  }

  _up(p) {
    const c = this.pressed;
    this.pressed = null;
    if (c && p.x > c.x - 20 && p.x < c.x + c.w + 20 && p.y > c.y - 20 && p.y < c.y + c.h + 20) {
      audio.sparkle();
      this.engine.particles.burst(p.x, p.y, c.hue, 16, 140);
      this.engine.goto(c.id);
    }
  }

  update(dt) {
    this.time += dt;
    if (Math.random() < dt * 3) {
      const { W, H } = this.engine;
      this.engine.particles.twinkle(rand(0, W), rand(0, H * 0.4), RAINBOW[(Math.random() * 7) | 0].hex, rand(2, 5));
    }
  }

  draw(ctx) {
    const { W, H } = this.engine;
    const t = this.time;
    drawMenuSky(ctx, W, H, t, this._stars);
    drawBigRainbow(ctx, W, H, t);
    drawTitle(ctx, W, H, t);
    for (const c of this.cards) drawSceneCard(ctx, c, t, this.pressed === c);

    // 合計スター
    const total = discoveries.totalCount();
    if (total > 0) {
      ctx.save();
      ctx.fillStyle = '#ffd76e';
      ctx.shadowColor = '#ffd76e';
      ctx.shadowBlur = 10;
      starPath(ctx, W / 2 - 34, H - 30, 13, 5.8);
      ctx.fill();
      ctx.shadowColor = 'transparent';
      ctx.fillStyle = '#fff';
      ctx.font = `bold 20px ${MENU_FONT}`;
      ctx.textAlign = 'left';
      ctx.textBaseline = 'middle';
      ctx.fillText(`はっけん ${total}こ`, W / 2 - 14, H - 29);
      ctx.restore();
    }
  }
}
