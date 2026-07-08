// ポインタ入力 — タップ位置の取得と3Dレイキャスト
import * as THREE from 'three';

export class Input {
  constructor(canvas, camera) {
    this.canvas = canvas;
    this.camera = camera;
    this.raycaster = new THREE.Raycaster();
    this.ndc = new THREE.Vector2();
    this.groundPlane = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
    this._handlers = new Set();
    this._onDown = (e) => {
      const t = e.changedTouches ? e.changedTouches[0] : e;
      this._emit(t.clientX, t.clientY);
      e.preventDefault();
    };
    canvas.addEventListener('pointerdown', this._onDown, { passive: false });
  }

  onTap(fn) { this._handlers.add(fn); return () => this._handlers.delete(fn); }

  _emit(cx, cy) {
    const rect = this.canvas.getBoundingClientRect();
    this.ndc.set(((cx - rect.left) / rect.width) * 2 - 1, -((cy - rect.top) / rect.height) * 2 + 1);
    this.raycaster.setFromCamera(this.ndc, this.camera);
    const groundPoint = new THREE.Vector3();
    const hitGround = this.raycaster.ray.intersectPlane(this.groundPlane, groundPoint);
    for (const fn of this._handlers) fn({ ndc: this.ndc.clone(), ground: hitGround ? groundPoint.clone() : null, raycaster: this.raycaster });
  }

  // タップでオブジェクト群との交差を判定
  pickObjects(raycaster, objects) {
    return raycaster.intersectObjects(objects, true);
  }

  clear() { this._handlers.clear(); }
}
