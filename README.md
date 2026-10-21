# Math-Art-Lab

数式・幾何構造・動きの組み合わせを研究する実験場。

## Experiment 001: Fractal × Wave

二分岐フラクタルを正弦波で変形するインタラクティブ作品。初期フラクタルは2D平面に生成し、変形により奥行きを与える。ドラッグで回転、ホイールで拡大縮小。分岐深さ・角度・縮小率・振幅・波長・速度を変更可能。

### 実行

```bash
npm ci
npm run dev
```

### テスト

```bash
npm test
npm run typecheck
npm run build
npx playwright install chromium webkit
npm run test:e2e
```

GUIテストはPlaywrightでChromium・WebKitを実行する。Windows / PowerShellで実行ポリシーにより `npm` / `npx` が使えない場合は、`npm.cmd` / `npx.cmd` を使用する。単体テストの対象は `src` 以下とし、GUIテストは別コマンドで実行する。

### GitHub Pagesと自動デプロイ

公開予定URL: https://tetsujisugimori-coder.github.io/Math-Art-Lab/

Node.js 24をCIとローカル検証に使用する。`npm ci` でlockfileに対応する依存をインストールする。開発サーバーは `http://localhost:5173/`。公開用ビルドと同じ成果物をローカル確認する場合は、次の順で実行する。

```bash
npm run build
npm run preview -- --host 127.0.0.1 --port 4174
```

previewの表示先は `http://127.0.0.1:4174/Math-Art-Lab/`。previewを終了してから `npm run test:e2e:production` を実行すると、同じ `dist` を使ってChromium・WebKitの本番スモークテストが動く。テストは専用previewを起動するため、ポート4174を空けておく。単体・開発GUIテストに加え、1280px / 375px / 390pxでアセット読み込み、描画・アニメーション・停止再開・パラメータ・リセット・回転・ズーム・数式同期・通信失敗を確認する。本番テストはビルドを自動実行しないので、変更後は必ず先に `npm run build` を実行する。

`vite.config.ts` はビルドとpreviewの `base` を `/Math-Art-Lab/` とし、開発時だけ `/` を使う。[Viteのプロジェクトサイト用設定](https://vite.dev/guide/static-deploy.html#github-pages)に対応する。本番のJavaScript・CSSは `/Math-Art-Lab/assets/` から読む。`index.html` のソース参照 `/src/main.ts` はViteのビルド対象なので、そのまま保持する。今後ルート絶対パスで画像・データを参照すると公開先で404になり得るため、Viteでのimportや `import.meta.env.BASE_URL` を使う。リポジトリ名・公開先を変える場合はbaseと本番テストのURLも更新する。

初回公開前に、リポジトリ管理者が以下を確認する。

1. **Settings > Pages > Build and deployment > Source** で **GitHub Actions** を選択する。別のスターターワークフローを追加する必要はない。
2. **Settings > Actions > General** で、このリポジトリのActionsと使用する公式 `actions/*` が実行可能になっていることを確認する。
3. **Settings > Environments > github-pages** の公開可能ブランチをmainに限定する。承認ルールがある場合はデプロイ時に承認する。

これらのリポジトリ設定はワークフローから自動変更しない。実装時の読取確認ではPagesは既にGitHub Actions方式、github-pages environmentはmain限定だった。設定を維持している場合、Sourceの再設定は不要。

`.github/workflows/deploy-pages.yml` は以下の動作を行う。

| イベント | 検証 | 公開 |
| --- | --- | --- |
| main向けPR | npm ci → 単体 → 型検査 → ビルド → Chromium / WebKitの開発GUI・本番スモークテスト | 実行しない |
| mainへのpush（PRマージを含む） | 同じ検証 | 検証成功後に実行 |
| Actionsから手動実行、ブランチmain | 同じ検証 | 検証成功後に実行 |
| 手動実行、main以外 | ジョブを実行しない | 実行しない |

検証ジョブの権限は `contents: read`。`pages: write` と `id-token: write` はデプロイジョブだけに付与する。検証済み `dist` をartifact経由で渡し、再ビルドせず `configure-pages` → `upload-pages-artifact` → `deploy-pages` で公開する。デプロイは同時に1件とし、実行中の公開は途中キャンセルしない。公式Actionsは確認した安定版のコミットSHAで固定する。[GitHub公式のカスタムPagesワークフロー](https://docs.github.com/en/pages/getting-started-with-github-pages/using-custom-workflows-with-github-pages)を参照。

手動で再デプロイする場合は、**Actions > GitHub Pages > Run workflow** でブランチ **main** を選ぶ。ワークフローがmainに取り込まれるまでは手動実行のボタンが表示されない場合がある。

公開に失敗した場合はActionsの該当runを開き、最初に失敗したステップを確認する。検証失敗時は公開されない。デプロイ失敗時はSource、environmentのブランチ制限・承認待ち、Pages / OIDC権限、artifactの有無を確認する。公開URLでアセットが404になる場合は `base` と `dist/index.html` の `/Math-Art-Lab/assets/` を確認する。

PRのCI成功は本番公開の成功を意味しない。マージ後にmainのrunで **Validate** と **Deploy to GitHub Pages** が成功したことを確認し、公開予定URLでデスクトップ・モバイルの描画、パラメータ変更と数式同期、リセット、停止再開、回転・ズーム、開発者ツールのエラー・404を受入確認する。

### 数理構造インスペクター

作品右側（モバイルでは作品下）の「パラメータ」「数式・構造」を切り替える。「数式・構造」では二分岐フラクタル、波動変形、合成の順序を確認できる。一般式と現在値の代入式を分け、調整中の値は**太字と背景**で強調する。スライダー側も同じ記号を用い、変更・初期値へのリセットに同期する。通常の数値は固定係数である。

「ⓘ 変数・実装との対応」を開くと、変数の意味とソースコードの対応箇所を確認できる。タブは左右矢印・Home・End、スライダーは矢印キー、詳細はEnter / Spaceで操作する。長い数式は数式領域内で横スクロールできる。横にはみ出す数式だけがTabキーの移動対象になり、フォーカス後に左右矢印キーでスクロールできる。領域幅・文字サイズ・タブ表示・現在値の変化に応じて移動対象を更新する。フォーカス中の数式が領域内に収まった場合はフォーカスを保持し、次のTab移動から通常の順序で進む。一時停止・再開とリセットは両タブで利用できる。リセットは従来どおりパラメータと時刻を初期化し、再生状態・カメラ・回転は維持する。

### 使用数式と実装の対応

`src/fractal.ts` の実際の処理を正本とする。以下の数値は実装の固定係数であり、ユーザーが変更する初期値と区別する。

二分岐フラクタル（`generateTree` / 内部の `grow`）:

```text
Lₙ = L₀ × rⁿ                 L₀ = 1.15（固定）
θ_child = θ_parent ± α
xend = xstart + cos(θ_branch) × Lₙ
yend = ystart + sin(θ_branch) × Lₙ  z = 0
B = 2ᴰ − 1
```

根元は `(0, −2.4, 0)`。`n` は幹を0とする世代で `0 ≤ n < D`。`D` は幹を含む段数、`B` は枝数。各子枝は `heading + p.angle` と `heading - p.angle`、長さは `length * p.shrink` で生成する。子枝同士の開きは `2α`。有限深さで打ち切る自己相似な平面分岐木であり、無限反復した極限図形は計算していない。

`θ_parent`・`θ_child` は選んだ親枝とその子枝の方向角、`θ_branch` は座標を計算する枝自身の方向角（その `grow` 呼び出しの `heading`）である。親の呼び出しでの `heading` が `θ_parent`、子へ渡す `heading ± p.angle` が `θ_child` であり、子の呼び出し内ではその値が `θ_branch` になる。幹の `θ_branch` は固定の `π/2 rad`。同じ世代でも枝の方向角は異なり得るため、方向を世代だけで表す `θₙ` は使わない。一方、同じ世代の枝長は等しいため `Lₙ` の表記を維持する。

波動変形（`deform`）:

```text
φ = 2πd/λ − ωt
E(d) = 1 − exp(−0.8d)
x′ = x + A × E(d) × sin(φ)
y′ = y
z′ = z + 0.5 × A × E(d) × cos(φ)
```

| 記号 | Params / 意味 | 単位 |
| --- | --- | --- |
| D | depth / 幹を含む分岐の段数 | 段 |
| α | angle / 親枝からの方向変化 | rad |
| r | shrink / 子枝の長さの縮小率 | 無次元 |
| A | amplitude / 変位の振幅係数 | 座標単位 |
| λ | wavelength / 累積距離上の波長 | 距離単位 |
| ω | speed / 位相の時間係数 | rad/s |
| d | 変形前の根元から枝に沿った累積距離 | 距離単位 |
| t | アニメーション内の経過時間 | 秒 |
| φ | 位相 | rad |
| E(d) | 根元で0、距離とともに1に近づく包絡 | 無次元 |

`ω` は空間を進む速度そのものではない。`t` は一時停止中は進まず、1フレームの増分は既存実装どおり最大0.05秒。代入式でも `d`・`t`・`n` は未指定なので記号で残す。例として枝長は `Lₙ = 1.15 × 0.72ⁿ` になる。これは**正弦波による幾何学的変形**であり、物理的な波動方程式を数値的に解いたものではない。

### 合成方式

1. `generateTree` が平面上の枝の端点と始点の累積距離を生成する。
2. `sampleTree` が枝の始点・終点を `deform` に渡す。終点の距離は `dend = dstart + ℓ`、`ℓ` は `Math.hypot` で計算した変形前の枝長。再帰生成では `distance + length` を子枝に渡す。
3. 変形後の端点を `Float32Array` に格納し、Three.jsの線分として描画する。

毎フレーム元座標から変形し、前フレームの変形を累積しない。分岐点は座標と累積距離を共有し、浮動小数点丸めを除いて同じ変形を受ける。

### モジュール

- `src/fractal.ts`: 生成・変形の計算。Three.jsに依存しない。
- `src/main.ts`: 描画とUI。
- `src/structures.ts`: 構造ID、分類、数式の表示用ツリー、変数、日本語解説、パラメータ対応、合成方式、ソース参照。Three.js・DOMに依存しない。
- `src/inspector.ts`: ネイティブMathMLによる数式描画。数式・説明をDOMのテキストとして挿入する。
- `src/fractal.test.ts`: 枝数、分岐点接続、有限値。
- `src/structures.test.ts`: 数式定義、代入、パラメータ対応、再帰と変形の整合性、計算への非干渉。
- `e2e/inspector.spec.ts`: 同期、リセット、インジェクション対策、描画操作、モバイル・文字拡大。
- `LOG.md`: 開発履歴と設計判断。現行仕様はこのREADMEに記載する。

### 既知の制約と今後の発展

数式表示は [MathML Core](https://www.w3.org/TR/mathml-core/) の上付き・下付き・分数等を使用する。追加の数式ライブラリは不要だが、MathML対応ブラウザが必要で、数学フォントや支援技術によって見た目・読み上げに差が生じ得る。旧ブラウザ向けの代替表示は未実装。スクリーンリーダーと実機タッチ端末による確認は未実施。

端点間を直線で結ぶため、枝の途中を波形の曲線として細分化しない。数式内の固定係数は生成実装に対応した説明データとして保持している。計算実装を変更するときは数式定義と整合テストも更新する必要がある。数式の任意入力・解析・実行は行わない。

今後は他作品からの構造定義の再利用、異なる構造の合成、Memo Nexus・Calculator Memoとの連携を検討する。汎用数式エンジンや大規模なプラグイン基盤は今回の対象外。

これは静的な枝分かれを数学的な正弦波で変形する試作品であり、物理的な波動方程式の解ではない。完成作品のSites展示、作品定義の永続保存、複合エンジンの一般化は後続課題。
