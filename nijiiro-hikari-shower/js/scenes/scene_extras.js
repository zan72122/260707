// シーン共通のあそび: にじハープ・シェイクおまつり・鏡置き・コンボ発見・
// 長押しダンス・よるの演出。scene_base から呼ばれる関数群

import { audio } from '../core/audio.js';
import { RAINBOW, TAU, rand } from '../core/utils.js';

const HOLD_DANCE_SEC = 0.65;
const SHAKE_FLIPS = 5;
const SHAKE_WINDOW = 1.1;
const MAX_PLACED_MIRRORS = 3;

// にじハープ: 指が新しい色の帯に入るたび音が鳴る
export function harp(scene, p) {
  if (scene._noteCooldown > 0) return;
  const colors = scene.rig.colorsAt(p.x, p.y, 24);
  for (const ci of colors) {
    if (!p.harp.includes(ci)) {
      audio.note(ci);
      scene.engine.particles.noteMark(p.x, p.y, RAINBOW[ci].hex);
      scene._noteCooldown = 0.06;
      break;
    }
  }
  p.harp = colors;
}

// 光源をぶんぶん振るとおまつりモード!
export function trackShake(scene, dx) {
  if (Math.abs(dx) < 3) return;
  const sign = Math.sign(dx);
  if (scene._lastLightDx !== 0 && sign !== scene._lastLightDx) {
    scene._shakeFlips.push(scene.time);
  }
  scene._lastLightDx = sign;
  scene._shakeFlips = scene._shakeFlips.filter((t) => scene.time - t < SHAKE_WINDOW);
  if (scene._shakeFlips.length >= SHAKE_FLIPS && scene.rig.party <= 0) {
    scene._shakeFlips = [];
    scene.rig.startParty();
    audio.party();
    const { W, H } = scene.engine;
    for (let i = 0; i < 40; i++) {
      scene.engine.particles.confetti(rand(0, W), rand(-20, H * 0.3), RAINBOW[(Math.random() * 7) | 0].hex);
    }
    scene.discover('combo-party', 'いろが おまつり!', '#ff8fb3', scene.rig.lightX, scene.rig.lightY);
  }
}

// 鏡ボタン: 3枚まで置ける。4回目でぜんぶかたづけ
export function onMirrorButton(scene) {
  if (scene.placedMirrors.length >= MAX_PLACED_MIRRORS) {
    scene.placedMirrors = [];
    scene.toolbar.mirrorCount = 0;
    return 'かたづけた!';
  }
  const { W, H } = scene.engine;
  const i = scene.placedMirrors.length;
  scene.placedMirrors.push({
    x: W * (0.3 + i * 0.2),
    y: H * 0.42,
    rot: rand(-0.7, 0.7),
    len: 130,
  });
  audio.bell();
  scene.toolbar.mirrorCount = scene.placedMirrors.length;
  return 'かがみ とうじょう!';
}

// 切り替えの組み合わせによる発見
export function checkComboDiscoveries(scene) {
  const rig = scene.rig;
  const { prismX: x, prismY: y } = rig;
  if (rig.lightColor.ci >= 0) {
    scene.discover('combo-mono', 'ひとついろは わかれない!', rig.lightColor.hex, x, y);
  }
  if (rig.sourceType === 'moon') {
    scene.discover('combo-moon', 'よるの ひかりあそび!', '#cfe4ff', rig.lightX, rig.lightY);
  }
  if (rig.prismType === 'marble') {
    scene.discover('combo-marble', 'まんまるの にじ!', '#6fd8ff', x, y);
  }
}

// 長押しダンス: 物を押さえたままにすると踊りだす
export function updateHolds(scene, dt) {
  for (const p of scene.engine.input.pointers.values()) {
    if (p.target !== 'object' || p.danced || p.data?.kind === 'placed-mirror') continue;
    p.holdT = (p.holdT ?? 0) + dt;
    if (p.holdT >= HOLD_DANCE_SEC) {
      p.danced = true;
      audio.jingle();
      for (let i = 0; i < 4; i++) {
        scene.engine.particles.noteMark(p.x + rand(-24, 24), p.y - rand(0, 30), RAINBOW[(Math.random() * 7) | 0].hex);
        scene.engine.particles.heart(p.x, p.y - 10);
      }
      scene.engine.particles.ring(p.x, p.y, '#ffffff', 30);
      scene.objectDance(p.data, p);
    }
  }
}

// おつきさまモード: 部屋がしずかな夜になり、星がまたたく
export function drawNight(ctx, scene) {
  const { W, H } = scene.engine;
  ctx.fillStyle = 'rgba(18,16,64,0.46)';
  ctx.fillRect(0, 0, W, H);
  for (let i = 0; i < 26; i++) {
    const x = (i * 173.7) % W;
    const y = (i * 97.3) % (H * 0.5);
    const tw = 0.25 + 0.55 * Math.abs(Math.sin(scene.time * 1.6 + i * 1.7));
    ctx.fillStyle = `rgba(255,255,230,${tw})`;
    ctx.beginPath();
    ctx.arc(x, y, 1.6 + (i % 3) * 0.7, 0, TAU);
    ctx.fill();
  }
}
