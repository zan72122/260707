// そめそめ けんびきょう — エントリポイント
// Phaser は vendor/phaser.min.js からグローバル(window.Phaser)で読み込まれる
import { BootScene } from './scenes/boot.js';
import { TitleScene } from './scenes/title.js';
import { GameScene } from './scenes/game.js';
import { MicroscopeScene } from './scenes/microscope.js';

const config = {
  type: Phaser.AUTO,
  parent: 'game',
  backgroundColor: '#0d1b2a',
  // 縦横どちらでも自動でリサイズ。実寸をシーン側でレイアウトする。
  scale: {
    mode: Phaser.Scale.RESIZE,
    autoCenter: Phaser.Scale.CENTER_BOTH,
    width: window.innerWidth,
    height: window.innerHeight,
  },
  render: {
    antialias: true,
    roundPixels: false,
    powerPreference: 'high-performance',
  },
  scene: [BootScene, TitleScene, GameScene, MicroscopeScene],
};

// eslint-disable-next-line no-new
new Phaser.Game(config);
