// レンダラ・ゲームループ・シーン管理
import * as THREE from '../../vendor/three.module.min.js';

const MAX_PIXEL_RATIO = 2;
const MAX_DELTA = 1 / 20;

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas,
      antialias: true,
      powerPreference: 'high-performance',
    });
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO));
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.1;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = null;       // 現在のゲームシーン(enter/exit/update/threeScene/camera を持つ)
    this.pendingScene = null;
    this.lastTime = 0;
    this.running = false;
    this.onResizeCallbacks = [];

    window.addEventListener('resize', () => this.resize());
    window.addEventListener('orientationchange', () => setTimeout(() => this.resize(), 300));
    this.resize();
  }

  resize() {
    const w = window.innerWidth;
    const h = window.innerHeight;
    this.renderer.setSize(w, h, false);
    this.aspect = w / h;
    this.isPortrait = h > w;
    if (this.scene && this.scene.onResize) this.scene.onResize(w, h);
    for (const cb of this.onResizeCallbacks) cb(w, h);
  }

  setScene(scene) {
    this.pendingScene = scene;
  }

  applyPendingScene() {
    if (!this.pendingScene) return;
    if (this.scene && this.scene.exit) this.scene.exit();
    this.scene = this.pendingScene;
    this.pendingScene = null;
    if (this.scene.enter) this.scene.enter();
    if (this.scene.onResize) this.scene.onResize(window.innerWidth, window.innerHeight);
  }

  start() {
    if (this.running) return;
    this.running = true;
    this.lastTime = performance.now();
    const loop = (time) => {
      if (!this.running) return;
      requestAnimationFrame(loop);
      const dt = Math.min((time - this.lastTime) / 1000, MAX_DELTA);
      this.lastTime = time;
      this.applyPendingScene();
      if (this.scene) {
        this.scene.update(dt, time / 1000);
        if (this.scene.threeScene && this.scene.camera) {
          this.renderer.render(this.scene.threeScene, this.scene.camera);
        }
      }
    };
    requestAnimationFrame(loop);
  }
}
