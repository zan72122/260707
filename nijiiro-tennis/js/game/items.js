// 星アイテム — コートにキラキラ出現、取るとおたのしみ効果
import * as THREE from 'three';

function starShape(size) {
  const shape = new THREE.Shape();
  for (let i = 0; i < 10; i++) {
    const r = i % 2 === 0 ? size : size * 0.45;
    const a = (i / 10) * Math.PI * 2 - Math.PI / 2;
    const x = Math.cos(a) * r, y = Math.sin(a) * r;
    if (i === 0) shape.moveTo(x, y); else shape.lineTo(x, y);
  }
  shape.closePath();
  return shape;
}

export class StarItem {
  constructor(scene, fx) {
    this.scene = scene;
    this.fx = fx;
    this.group = new THREE.Group();
    const geo = new THREE.ExtrudeGeometry(starShape(0.55), { depth: 0.18, bevelEnabled: true, bevelSize: 0.06, bevelThickness: 0.06 });
    this.star = new THREE.Mesh(geo,
      new THREE.MeshLambertMaterial({ color: 0xffe14f, emissive: 0xdd9900 }));
    this.star.castShadow = true;
    this.group.add(this.star);
    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.7, 0.9, 24),
      new THREE.MeshBasicMaterial({ color: 0xfff176, transparent: true, opacity: 0.5, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2;
    ring.position.y = -1.0;
    this.group.add(ring);
    this.ring = ring;
    this.group.visible = false;
    scene.add(this.group);
    this.active = false;
    this.pos = new THREE.Vector3();
    this._sparkleT = 0;
  }

  spawn(x, z) {
    this.pos.set(x, 1.1, z);
    this.group.position.copy(this.pos);
    this.group.visible = true;
    this.active = true;
    if (this.fx) this.fx.sparkleRing(this.pos);
  }

  collect() {
    if (this.fx) this.fx.starBurst(this.pos, 14);
    this.active = false;
    this.group.visible = false;
  }

  update(dt, t) {
    if (!this.active) return;
    this.star.rotation.y += dt * 2.4;
    this.group.position.y = this.pos.y + Math.sin(t * 3) * 0.18;
    this.ring.material.opacity = 0.35 + Math.sin(t * 5) * 0.2;
    this._sparkleT += dt;
    if (this._sparkleT > 0.5) {
      this._sparkleT = 0;
      if (this.fx) this.fx.trail(this.group.position, true);
    }
  }

  dispose() {
    this.scene.remove(this.group);
  }
}
