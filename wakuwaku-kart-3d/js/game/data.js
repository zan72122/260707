// キャラクター・コースの定義データ

export const CHARACTERS = [
  {
    id: 'usagi', name: 'うさぎの ミミ', emoji: '🐰',
    bodyColor: 0xffffff, accentColor: 0xffb3cd, kartColor: 0xff5f9e,
    earType: 'rabbit',
  },
  {
    id: 'neko', name: 'ねこの トラ', emoji: '🐱',
    bodyColor: 0xffb763, accentColor: 0xfff3d6, kartColor: 0xffa321,
    earType: 'cat',
  },
  {
    id: 'panda', name: 'ぱんだの モモ', emoji: '🐼',
    bodyColor: 0xffffff, accentColor: 0x2a2a2a, kartColor: 0x39c26d,
    earType: 'panda',
  },
  {
    id: 'kaeru', name: 'かえるの ケロ', emoji: '🐸',
    bodyColor: 0x6fd35f, accentColor: 0xd9ffc9, kartColor: 0x33b1ff,
    earType: 'frog',
  },
  {
    id: 'hiyoko', name: 'ひよこの ピヨ', emoji: '🐥',
    bodyColor: 0xffe066, accentColor: 0xffb03a, kartColor: 0xffd21f,
    earType: 'chick',
  },
  {
    id: 'koala', name: 'こあらの クー', emoji: '🐨',
    bodyColor: 0xb9c2cc, accentColor: 0xe8edf2, kartColor: 0x9a6bff,
    earType: 'koala',
  },
];

// コース制御点は XZ 平面 + y(高低差)。スプラインで閉曲線化する。
export const COURSES = [
  {
    id: 'niji', name: 'にじいろ サーキット', emoji: '🌈',
    desc: 'はじめての コース',
    theme: 'meadow',
    skyTop: 0x4aa8ff, skyBottom: 0xbfe8ff,
    groundColor: 0x69c95b, roadColor: 0x8d7f9e,
    fogColor: 0xbfe8ff,
    roadWidth: 26,
    laps: 3,
    points: [
      [0, 0, 0], [90, 0, -15], [160, 2, -70], [175, 5, -150],
      [120, 8, -215], [30, 6, -235], [-60, 3, -215], [-130, 0, -160],
      [-155, 0, -80], [-120, 0, -15], [-60, 0, 5],
    ],
  },
  {
    id: 'umi', name: 'うみべ ビーチ', emoji: '🏖️',
    desc: 'なみが きらきら',
    theme: 'beach',
    skyTop: 0x3f9fff, skyBottom: 0xffe9c4,
    groundColor: 0xf7dfa0, roadColor: 0xd9b986,
    fogColor: 0xd9ecff,
    roadWidth: 26,
    laps: 3,
    points: [
      [0, 0, 0], [95, 0, 10], [170, 3, -35], [200, 6, -115],
      [160, 9, -190], [70, 10, -230], [-30, 8, -245], [-120, 4, -215],
      [-175, 1, -140], [-160, 0, -60], [-90, 0, -5],
    ],
  },
  {
    id: 'okashi', name: 'おかしの くに', emoji: '🍭',
    desc: 'あまい かおり',
    theme: 'candy',
    skyTop: 0xff9ed2, skyBottom: 0xffe3f2,
    groundColor: 0xffc9e6, roadColor: 0xa5714f,
    fogColor: 0xffd9ec,
    roadWidth: 26,
    laps: 3,
    points: [
      [0, 0, 0], [85, 2, -25], [130, 6, -95], [95, 10, -165],
      [140, 12, -235], [60, 14, -285], [-45, 12, -270], [-105, 8, -205],
      [-80, 5, -130], [-140, 2, -70], [-95, 0, -5],
    ],
  },
];

// アイテムボックスから出るもの(4歳向け: ぜんぶ嬉しいもの)
export const ITEM_KINDS = [
  { id: 'boost', label: '🚀 びゅーん!', weight: 4 },
  { id: 'star', label: '⭐ キラキラスター!', weight: 3 },
  { id: 'coins', label: '🪙 コインいっぱい!', weight: 3 },
  { id: 'rainbow', label: '🌈 にじパワー!', weight: 2 },
];
