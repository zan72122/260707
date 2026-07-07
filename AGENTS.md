# AGENTS.md

## Cursor Cloud specific instructions

### プロジェクト概要
- 本リポジトリの実体は `nijiiro-hikari-shower/` にある単一の静的ブラウザゲーム「にじいろ ひかりシャワー」です(HTML + CSS + Vanilla JS / Canvas 2D)。
- 依存ライブラリ・パッケージマネージャ・ビルド・テスト・Lint 設定はありません(`package.json` やロックファイルは存在しません)。

### 起動方法(必須)
- ES Modules(`<script type="module">`)を使うため、`file://` では動作しません。必ず HTTP サーバー経由で配信してください。
- 起動コマンド(README の通り): `cd nijiiro-hikari-shower && python3 -m http.server 8000` → ブラウザで `http://localhost:8000` を開く。
- Python 3 は VM にプリインストール済みです(追加インストール不要)。

### 動作確認のポイント(非自明な挙動)
- メニューから4つのシーンを選択して遊びます。コア機能は「おひさま/プリズムをドラッグ→虹の帯を小物(花・コップ・スプーン等)に当てる→発見スター(各シーン6こ)が増える」ことです。
- 発見スターは `localStorage` に保存され、次回以降も引き継がれます。クリーンな状態から確認したい場合はブラウザの localStorage をクリアしてください(発見済みだと星カウンタが 0/6 から始まりません)。
