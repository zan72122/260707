// レンダラ・カメラ・ブルーム合成・リサイズ・自動品質調整
import * as THREE from 'three';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const MAX_PIXEL_RATIO = 2;
const BLOOM_STRENGTH = 0.55;
const BLOOM_RADIUS = 0.6;
const BLOOM_THRESHOLD = 0.82;
const FPS_SAMPLE_FRAMES = 50;
const LOW_FPS_LIMIT = 40;

export class Engine {
  constructor(canvas) {
    this.canvas = canvas;
    this.renderer = new THREE.WebGLRenderer({
      canvas, antialias: true, powerPreference: 'high-performance',
    });
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.12;
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(55, 1, 0.1, 320);

    this.composer = new EffectComposer(this.renderer);
    this.renderPass = new RenderPass(this.scene, this.camera);
    this.bloomPass = new UnrealBloomPass(
      new THREE.Vector2(256, 256), BLOOM_STRENGTH, BLOOM_RADIUS, BLOOM_THRESHOLD);
    this.outputPass = new OutputPass();
    this.composer.addPass(this.renderPass);
    this.composer.addPass(this.bloomPass);
    this.composer.addPass(this.outputPass);

    this.qualityLevel = 2; // 2=高(ブルーム+高解像度) 1=中 0=低
    this._fpsFrames = 0;
    this._fpsTime = 0;
    this._pixelRatio = Math.min(window.devicePixelRatio || 1, MAX_PIXEL_RATIO);

    this._onResize = () => this.resize();
    window.addEventListener('resize', this._onResize);
    window.addEventListener('orientationchange', this._onResize);
    this.resize();
  }

  get aspect() { return this.camera.aspect; }
  get isPortrait() { return this.camera.aspect < 1; }

  resize() {
    const w = window.innerWidth, h = window.innerHeight;
    const pr = this.qualityLevel >= 2 ? this._pixelRatio
      : this.qualityLevel === 1 ? Math.min(this._pixelRatio, 1.5) : 1;
    this.renderer.setPixelRatio(pr);
    this.renderer.setSize(w, h);
    this.composer.setPixelRatio(pr);
    this.composer.setSize(w, h);
    this.camera.aspect = w / h;
    this.camera.updateProjectionMatrix();
    if (this.onViewChange) this.onViewChange();
  }

  // FPS を監視して重い端末では自動で軽量化する
  trackPerformance(dt) {
    this._fpsFrames++;
    this._fpsTime += dt;
    if (this._fpsFrames < FPS_SAMPLE_FRAMES) return;
    const fps = this._fpsFrames / this._fpsTime;
    this._fpsFrames = 0; this._fpsTime = 0;
    if (fps < LOW_FPS_LIMIT && this.qualityLevel > 0) {
      this.qualityLevel--;
      this.bloomPass.enabled = this.qualityLevel >= 1;
      this.renderer.shadowMap.enabled = this.qualityLevel >= 1;
      this.resize();
    }
  }

  render(dt) {
    this.trackPerformance(dt);
    this.composer.render();
  }
}

// カメラを縦横比に合わせてコート全体が見える位置に置く
export function placeMatchCamera(camera, aspect, shake = 0) {
  const portrait = aspect < 1;
  const back = portrait ? 21.5 : 16.5;
  const up = portrait ? 11.5 : 8.2;
  camera.fov = portrait ? 64 : 56;
  camera.position.set(
    Math.sin(shake * 31) * shake * 0.4,
    up + Math.sin(shake * 47) * shake * 0.3,
    back,
  );
  camera.lookAt(0, 0.4, -4);
  camera.updateProjectionMatrix();
}
