// タイトル画面 + キャラクター/コース選択(同じ3D背景を使い回す)
import * as THREE from '../../vendor/three.module.min.js';
import { clearUI, el, bigButton } from '../core/hud.js';
import { audio } from '../core/audio.js';
import { CHARACTERS, COURSES } from '../game/data.js';
import { buildKart } from '../game/kart.js';
import { TAU } from '../core/utils.js';

export class TitleScene {
  constructor(engine, onStartRace) {
    this.engine = engine;
    this.onStartRace = onStartRace;
    this.phase = 'title';
    this.selectedCharacter = null;
    this.musicStarted = false;
  }

  enter() {
    this.threeScene = new THREE.Scene();
    this.threeScene.fog = new THREE.Fog(0xbfe8ff, 120, 400);
    this.camera = new THREE.PerspectiveCamera(60, this.engine.aspect, 0.1, 1000);

    // 空(グラデーション背景)
    const sky = new THREE.Mesh(
      new THREE.SphereGeometry(500, 20, 14),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: {
          topColor: { value: new THREE.Color(0x4aa8ff) },
          bottomColor: { value: new THREE.Color(0xcdefff) },
        },
        vertexShader: 'varying vec3 vPos; void main(){ vPos = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }',
        fragmentShader: `uniform vec3 topColor; uniform vec3 bottomColor; varying vec3 vPos;
          void main(){ float h = clamp(vPos.y/280.0, 0.0, 1.0); gl_FragColor = vec4(mix(bottomColor, topColor, pow(h,0.7)), 1.0); }`,
      }),
    );
    this.threeScene.add(sky);

    const ground = new THREE.Mesh(
      new THREE.CircleGeometry(480, 40),
      new THREE.MeshStandardMaterial({ color: 0x69c95b, roughness: 1 }),
    );
    ground.rotation.x = -Math.PI / 2;
    ground.receiveShadow = true;
    this.threeScene.add(ground);

    this.threeScene.add(new THREE.HemisphereLight(0xcfe8ff, 0x7dbb6a, 0.95));
    const sun = new THREE.DirectionalLight(0xfff4d6, 1.6);
    sun.position.set(40, 70, 30);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.left = -40;
    sun.shadow.camera.right = 40;
    sun.shadow.camera.top = 40;
    sun.shadow.camera.bottom = -40;
    this.threeScene.add(sun);

    // ぐるぐる走るデモカート
    this.demoKarts = [];
    CHARACTERS.slice(0, 4).forEach((c, i) => {
      const kart = buildKart(c);
      kart.group.scale.setScalar(1.35);
      this.threeScene.add(kart.group);
      this.demoKarts.push({ kart, phase: (i / 4) * TAU });
    });

    // ふわふわの雲
    this.clouds = [];
    for (let i = 0; i < 8; i++) {
      const cloud = new THREE.Group();
      const mat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 1 });
      for (let j = 0; j < 4; j++) {
        const puff = new THREE.Mesh(new THREE.SphereGeometry(4 + Math.random() * 4, 10, 8), mat);
        puff.position.set((j - 1.5) * 5, Math.random() * 2, 0);
        puff.scale.y = 0.6;
        cloud.add(puff);
      }
      cloud.position.set((Math.random() - 0.5) * 400, 45 + Math.random() * 45, -80 - Math.random() * 160);
      cloud.userData.speed = 1.5 + Math.random() * 2;
      this.threeScene.add(cloud);
      this.clouds.push(cloud);
    }

    this.camera.position.set(0, 9, 26);
    this.camera.lookAt(0, 3, 0);
    this.showTitleUI();
  }

  showTitleUI() {
    this.phase = 'title';
    clearUI();
    const wrap = el('div', 'wk-title-wrap');
    el('div', 'wk-game-title', wrap, 'わくわく\nカート 3D').style.whiteSpace = 'pre-line';
    el('div', 'wk-subtitle', wrap, 'みんなで レースだ!');
    wrap.appendChild(bigButton('▶ すたーと!', () => {
      audio.unlock();
      audio.sfxTap();
      if (!this.musicStarted) {
        audio.startMusic('title');
        this.musicStarted = true;
      }
      this.showCharacterUI();
    }, 'green'));
  }

  showCharacterUI() {
    this.phase = 'chara';
    clearUI();
    el('div', 'wk-select-title', undefined, 'だれで はしる?');
    const row = el('div', 'wk-card-row');
    for (const c of CHARACTERS) {
      const card = el('button', 'wk-card', row);
      el('div', 'emoji', card, c.emoji);
      el('div', 'name', card, c.name);
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        audio.sfxItemBox();
        this.selectedCharacter = c;
        this.showCourseUI();
      });
    }
  }

  showCourseUI() {
    this.phase = 'course';
    clearUI();
    el('div', 'wk-select-title', undefined, 'どこを はしる?');
    const row = el('div', 'wk-card-row');
    for (const course of COURSES) {
      const card = el('button', 'wk-card', row);
      el('div', 'emoji', card, course.emoji);
      el('div', 'name', card, course.name);
      el('div', 'desc', card, course.desc);
      card.addEventListener('pointerdown', (e) => {
        e.preventDefault();
        audio.sfxFanfare();
        audio.stopMusic();
        this.onStartRace(this.selectedCharacter, course);
      });
    }
  }

  update(dt, time) {
    // デモカートが円を描いて走る
    for (const item of this.demoKarts) {
      const a = time * 0.55 + item.phase;
      const r = 13;
      item.kart.group.position.set(Math.cos(a) * r, 0, Math.sin(a) * r - 2);
      item.kart.group.rotation.y = -a - Math.PI / 2 + Math.PI;
      for (const wheel of item.kart.wheels) wheel.rotation.x += dt * 12;
      item.kart.driverPivot.position.y = 1.05 + Math.sin(time * 9 + item.phase) * 0.05;
    }
    for (const cloud of this.clouds) {
      cloud.position.x += cloud.userData.speed * dt;
      if (cloud.position.x > 240) cloud.position.x = -240;
    }
    this.camera.position.x = Math.sin(time * 0.12) * 3;
    this.camera.lookAt(0, 3.5, 0);
  }

  onResize() {
    this.camera.aspect = this.engine.aspect;
    // 縦画面ではカメラを引いて全体が見えるように
    this.camera.fov = this.engine.isPortrait ? 78 : 60;
    this.camera.updateProjectionMatrix();
  }

  exit() {
    clearUI();
  }
}
