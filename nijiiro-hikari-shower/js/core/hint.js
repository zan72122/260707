// おてほんヒント: しばらく操作がないと「ここを触ってみて」と光る指マークが出る

import { TAU, drawGlow, ease } from './utils.js';

const IDLE_DELAY = 9; // 何秒さわらないとヒントが出るか
const TARGET_INTERVAL = 4; // 次のおすすめ場所へ移るまでの秒数

export class Hint {
  constructor(engine, targetsFn) {
    this.engine = engine;
    this.targetsFn = targetsFn; // () => [{x, y}]
    this.idleT = 0;
    this.showT = 0;
    this.targetIndex = 0;
    this.cycleT = 0;
  }

  // なにか操作があったら呼ぶ
  poke() {
    this.idleT = 0;
    this.showT = 0;
  }

  update(dt) {
    this.idleT += dt;
    if (this.idleT < IDLE_DELAY) return;
    this.showT = Math.min(1, this.showT + dt * 2);
    this.cycleT += dt;
    if (this.cycleT > TARGET_INTERVAL) {
      this.cycleT = 0;
      this.targetIndex++;
    }
  }

  draw(ctx) {
    if (this.showT <= 0.01) return;
    const targets = this.targetsFn();
    if (!targets.length) return;
    const t = targets[this.targetIndex % targets.length];
    const time = this.engine.time;
    const bounce = Math.abs(Math.sin(time * 3.2)) * 16;
    const a = ease.outCubic(this.showT);

    ctx.save();
    ctx.globalAlpha = a;
    // ターゲットのまわりが光る
    const pulse = 1 + Math.sin(time * 4) * 0.15;
    drawGlow(ctx, t.x, t.y, 66 * pulse, '#fff6b0', 0.55);
    ctx.strokeStyle = 'rgba(255,255,255,0.9)';
    ctx.lineWidth = 3.5;
    ctx.setLineDash([10, 9]);
    ctx.lineDashOffset = -time * 26;
    ctx.beginPath();
    ctx.arc(t.x, t.y, 46 * pulse, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);

    // 指マーク(ターゲットの右下からちょんちょんつつく)
    const hx = t.x + 44 + bounce * 0.6;
    const hy = t.y + 52 + bounce;
    this._drawHand(ctx, hx, hy);
    ctx.restore();
  }

  _drawHand(ctx, x, y) {
    ctx.save();
    ctx.translate(x, y);
    ctx.rotate(-0.6);
    ctx.shadowColor = 'rgba(30,15,60,0.4)';
    ctx.shadowBlur = 8;
    ctx.shadowOffsetY = 3;
    ctx.fillStyle = '#ffffff';
    ctx.strokeStyle = '#e8b3cf';
    ctx.lineWidth = 2.5;
    // てのひら
    ctx.beginPath();
    ctx.ellipse(0, 14, 15, 17, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();
    // ひとさしゆび
    ctx.beginPath();
    ctx.moveTo(-6, 2);
    ctx.lineTo(-6, -22);
    ctx.arc(0, -22, 6, Math.PI, 0);
    ctx.lineTo(6, 2);
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
    // にぎった指のライン
    ctx.strokeStyle = 'rgba(230,170,200,0.55)';
    ctx.lineWidth = 2;
    for (let i = 0; i < 3; i++) {
      ctx.beginPath();
      ctx.moveTo(2 + i * 4.5, 4);
      ctx.lineTo(2 + i * 4.5, 12);
      ctx.stroke();
    }
    ctx.restore();
  }
}
