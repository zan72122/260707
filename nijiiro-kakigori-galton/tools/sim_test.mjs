// ヘッドレス物理シミュレーションテスト(node tools/sim_test.mjs)
// 玉がゲート→漏斗→ピンの森→スロットまで到達し、分布ができることを検証する
const noop = () => {};
const ctxStub = new Proxy({}, {
  get: (o, k) => {
    if (k === 'canvas') return { width: 0, height: 0 };
    return (...args) => {
      if (k === 'createLinearGradient' || k === 'createRadialGradient' || k === 'createConicGradient') {
        return { addColorStop: noop };
      }
      if (k === 'measureText') return { width: 10 };
      return undefined;
    };
  },
  set: () => true,
});
globalThis.document = {
  createElement: () => ({
    width: 0, height: 0,
    getContext: () => ctxStub,
  }),
};
globalThis.window = { AudioContext: undefined };
globalThis.performance = globalThis.performance || { now: () => Date.now() };

const { computeLayout } = await import('../js/game/layout.js');
const { Physics } = await import('../js/game/physics.js');
const { Slots } = await import('../js/game/slots.js');

function run(w, h, label) {
  const L = computeLayout(w, h);
  const physics = new Physics();
  physics.setLayout(L);
  const slots = new Slots();
  slots.setLayout(L, 1);
  physics.gateRatio = 1;

  let settled = 0;
  let pinHits = 0;
  const hooks = {
    floorY: (s) => slots.floorY(s),
    onPinHit: () => pinHits++,
    onSettle: (b, s) => { slots.add(s, { hue: b.hue, kind: b.kind, golden: b.golden }); settled++; },
  };

  const TARGET = slots.targetCount();
  const TOTAL = 380;
  let spawned = 0;
  const dt = 1 / 60;
  let frames = 0;
  let distAtTarget = null;
  while ((spawned < TOTAL || physics.balls.length > 0) && frames < 60 * 90) {
    frames++;
    // レバー全開相当の放出
    if (spawned < TOTAL) {
      if (physics.balls.length < physics.activeCap && physics.spawn({ hue: (spawned * 16) % 360 })) spawned++;
    }
    physics.update(dt, hooks);
    slots.update(dt);
    if (!distAtTarget && settled >= TARGET) distAtTarget = slots.records.map((r) => r.length);
  }

  const dist = slots.records.map((r) => r.length);
  const lost = spawned - settled - physics.balls.length;
  console.log(`[${label}] ${w}x${h} ballR=${L.ballR.toFixed(1)} throat=${(L.throatHalf * 2).toFixed(1)} rows=${L.pinRows}`);
  console.log(`  spawned=${spawned} settled=${settled} inFlight=${physics.balls.length} lost=${lost} pinHits=${pinHits} frames=${frames}`);
  console.log(`  target=${TARGET} できあがり時=[${(distAtTarget || []).join(', ')}]`);
  console.log(`  さいご(380個)   =[${dist.join(', ')}]`);
  if (lost > 0) console.log('  !! 玉が消えています');
  if (settled === 0) console.log('  !! 1個も着地していません');
}

run(390, 780, 'portrait-phone');
run(330, 510, 'portrait-small(test window)');
run(768, 1024, 'portrait-ipad');
run(1024, 768, 'landscape-ipad');
