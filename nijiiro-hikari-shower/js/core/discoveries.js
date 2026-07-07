// 発見システム: 「小さな発見」を記録して星として集める
// localStorageに保存し、次に遊ぶときも覚えている

const STORAGE_KEY = 'nijiiro-hikari-discoveries-v1';

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}');
  } catch (_) {
    return {};
  }
}

function save(data) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (_) { /* プライベートモード等では保存できないが遊べる */ }
}

class DiscoveryStore {
  constructor() {
    this.data = load();
  }

  // 発見済みか
  has(sceneId, key) {
    return !!(this.data[sceneId] && this.data[sceneId][key]);
  }

  // 新しい発見なら true を返す
  unlock(sceneId, key) {
    if (!this.data[sceneId]) this.data[sceneId] = {};
    if (this.data[sceneId][key]) return false;
    this.data[sceneId][key] = true;
    save(this.data);
    return true;
  }

  countIn(sceneId) {
    return this.data[sceneId] ? Object.keys(this.data[sceneId]).length : 0;
  }

  totalCount() {
    let n = 0;
    for (const s of Object.values(this.data)) n += Object.keys(s).length;
    return n;
  }
}

export const discoveries = new DiscoveryStore();
