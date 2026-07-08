// ゴール後のおいわい画面
import * as THREE from '../../vendor/three.module.min.js';
import { clearUI, el, bigButton } from '../core/hud.js';
import { audio } from '../core/audio.js';
import { buildKart } from '../game/kart.js';
import { Effects } from '../game/effects.js';
import { TAU } from '../core/utils.js';

const RANK_MESSAGES = [
  ['🥇 1い!', 'すごーい! チャンピオン!'],
  ['🥈 2い!', 'やったね! かっこいい!'],
  ['🥉 3い!', 'がんばったね!'],
  ['4い', 'つぎも たのしもう!'],
  ['5い', 'いっぱい はしったね!'],
  ['6い', 'また あそぼうね!'],
];

export class FinishScene {
  constructor(engine, character, rank, coins, onReplay, onMenu) {
    this.engine = engine;
    this.character = character;
    this.rank = Math.max(0, rank);
    this.coins = coins;
    this.onReplay = onReplay;
    this.onMenu = onMenu;
    this.fireworkTimer = 0;
  }

  enter() {
    this.threeScene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(60, this.engine.aspect, 0.1, 1000);

    // 夕焼けのおいわい空
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(400, 20, 14),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x2a3a8a) },
          bottomColor: { value: new THREE.Color(0xff9d6a) },
        },
        vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vPos;
          void main(){ float h = clamp(vPos.y/220.0, 0.0, 1.0); gl_FragColor = vec4(mix(bottomColor, topColor, pow(h,0.8)), 1.0); }`,
      }),
    );
    this.threeScene.add(sky);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(300, 32),
      new THREE.MeshStandardMaterial({ color: 0x4a7a4a, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.threeScene.add(ground);

    this.threeScene.add(new THREE.HemisphereLight(0xaabbff, 0x556644, 0.85));
    const sun = new THREE.DirectionalLight(0xffd6a8, 1.4);
    sun.position.set(-30, 50, 40);
    sun.castShadow = true;
    this.threeScene.add(sun);

    // 表彰台
    const podiumMat = new THREE.MeshStandardMaterial({ color: 0xffd21f, roughness: 0.4 });
    const podium = new THREE.Mesh(new THREE.CylinderGeometry(4.5, 5, 2.2, 24), podiumMat);
    podium.position.y = 1.1;
    podium.castShadow = true;
    podium.receiveShadow = true;
    this.threeScene.add(podium);

    // 勝者のカート
    this.kart = buildKart(this.character);
    this.kart.group.position.y = 2.2;
    this.kart.group.scale.setScalar(1.3);
    this.threeScene.add(this.kart.group);

    this.effects = new Effects(this.threeScene);
    this.camera.position.set(0, 7, 20);
    this.camera.lookAt(0, 4, 0);

    audio.sfxFanfare();
    this.buildUI();
  }

  buildUI() {
    clearUI();
    const wrap = el('div', 'wk-result-wrap');
    const [rankText, message] = RANK_MESSAGES[Math.min(this.rank, RANK_MESSAGES.length - 1)];
    el('div', 'wk-result-rank', wrap, rankText);
    el('div', 'wk-result-msg', wrap, message);
    const starCount = Math.max(1, 3 - this.rank);
    el('div', 'wk-stars', wrap, '⭐'.repeat(starCount + (this.rank === 0 ? 2 : 0)));
    el('div', 'wk-result-msg', wrap, `🪙 コイン ${this.coins}まい`);
    wrap.appendChild(bigButton('🔁 もういちど!', () => {
      audio.sfxTap();
      this.onReplay();
    }, 'green'));
    wrap.appendChild(bigButton('🏠 コースをえらぶ', () => {
      audio.sfxTap();
      this.onMenu();
    }, 'blue'));
  }

  update(dt, time) {
    // カートがくるくる回ってお祝い
    this.kart.group.rotation.y = time * 0.9;
    this.kart.group.position.y = 2.2 + Math.sin(time * 2.2) * 0.25;
    this.kart.driverPivot.position.y = 1.05 + Math.abs(Math.sin(time * 5)) * 0.28;

    // 花火
    this.fireworkTimer -= dt;
    if (this.fireworkTimer <= 0) {
      this.fireworkTimer = 0.55 + Math.random() * 0.5;
      const a = Math.random() * TAU;
      const p = new THREE.Vector3(Math.cos(a) * (14 + Math.random() * 22), 16 + Math.random() * 14, -12 - Math.random() * 26);
      this.effects.firework(p);
    }
    this.effects.confettiRain(new THREE.Vector3(0, 0, 4), 14);
    this.effects.update(dt, this.camera);

    this.camera.position.x = Math.sin(time * 0.25) * 4;
    this.camera.lookAt(0, 4, 0);
  }

  onResize() {
    this.camera.aspect = this.engine.aspect;
    this.camera.fov = this.engine.isPortrait ? 76 : 60;
    this.camera.updateProjectionMatrix();
  }

  exit() {
    clearUI();
  }
}
