// キャラえらび — 3Dのキャラを直接タップして選ぶ(文字なし)
import * as THREE from 'three';
import { CHARACTERS, buildCharacter } from '../world/characters.js';
import { sfx, voice } from '../core/audio.js';
import * as hud from './hud.js';

const LINE_Z = 4;
const SPACING = 2.6;

export class CharSelect {
  constructor(ctx, onDone) {
    this.ctx = ctx;
    this.onDone = onDone;
    this.chars = CHARACTERS.map((def, i) => {
      const c = buildCharacter(def, { facing: -1 });
      c.group.position.set((i - (CHARACTERS.length - 1) / 2) * SPACING, 0, LINE_Z);
      ctx.scene.add(c.group);
      return c;
    });
    this.selected = -1;
    this.confirmBtn = null;
    this._offTap = ctx.input.onTap((tap) => this._onTap(tap));
    this._spotlight = new THREE.Mesh(
      new THREE.CircleGeometry(1.15, 24),
      new THREE.MeshBasicMaterial({ color: 0xff8fc8, transparent: true, opacity: 0.55 }));
    this._spotlight.rotation.x = -Math.PI / 2;
    this._spotlight.position.y = 0.05;
    this._spotlight.visible = false;
    ctx.scene.add(this._spotlight);
    hud.tapHint(true);
  }

  _onTap(tap) {
    const groups = this.chars.map((c) => c.group);
    const hits = tap.raycaster.intersectObjects(groups, true);
    if (hits.length === 0) return;
    let obj = hits[0].object;
    while (obj.parent && !groups.includes(obj)) obj = obj.parent;
    const idx = groups.indexOf(obj);
    if (idx < 0) return;
    hud.tapHint(false);
    this.selected = idx;
    sfx.uiSelect();
    voice.yay();
    this.chars[idx].celebrate();
    this.ctx.fx.starBurst(new THREE.Vector3(obj.position.x, 1.6, obj.position.z), 10);
    this._spotlight.visible = true;
    this._spotlight.position.x = obj.position.x;
    this._spotlight.position.z = obj.position.z;
    if (!this.confirmBtn) {
      const wrap = hud.el('div', 'screen', document.getElementById('overlay'));
      wrap.style.justifyContent = 'flex-end';
      wrap.style.paddingBottom = '7vmin';
      this.confirmBtn = wrap;
      hud.button('✔️', 'big green pulse', () => this._confirm(), wrap);
    }
  }

  _confirm() {
    if (this.selected < 0) return;
    sfx.uiSelect();
    const def = this.chars[this.selected].def;
    const others = CHARACTERS.filter((c) => c !== def);
    const cpuDef = others[(Math.random() * others.length) | 0];
    this.onDone(def, cpuDef);
  }

  update(dt, t) {
    this.chars.forEach((c, i) => {
      c.update(dt);
      const sel = i === this.selected;
      const target = sel ? 1.14 : 1;
      c.group.scale.lerp(new THREE.Vector3(target, target, target), dt * 6);
      c.group.rotation.y = Math.sin(t * 0.8 + i * 1.7) * 0.18;
    });
    if (this._spotlight.visible) {
      this._spotlight.material.opacity = 0.4 + Math.sin(t * 6) * 0.2;
    }
    this.ctx.fx.update(dt);
    this.ctx.crowd.update(dt, t);
  }

  dispose() {
    this._offTap();
    for (const c of this.chars) this.ctx.scene.remove(c.group);
    this.ctx.scene.remove(this._spotlight);
    if (this.confirmBtn) this.confirmBtn.remove();
    hud.tapHint(false);
    hud.clearOverlay();
  }
}
