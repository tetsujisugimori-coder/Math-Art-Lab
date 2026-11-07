# 検証記録 — 第16作「協力の格子」

## 基点・作業範囲

2026-11-07 JST開始。最新main `550a2f921958377eefa49e1c35bb0d45701ee3eb`、PR #40はMERGED。
専用branch `feat/016-cooperation-lattice`、Issue #41に依頼全文を記録。
既存15作品のモデル・テストの期待値を変更せず、作品選択肢を追加。
Pagesの公開条件・deploy依存関係は保持。CIに開発／本番E2Eの証拠保存のみ追加。

## 実行履歴

| 実行 | 結果 | 証拠 |
| --- | --- | --- |
| 初回npm ci | PowerShellのnpm.ps1実行制限で起動せず。npm.cmdで成功 | 作業記録 |
| サンドボックス内単体／ビルド | esbuildの親ディレクトリ読取Access denied、検証開始前に失敗 | evidence/unit.log、build.log |
| 通常環境の全単体・型・ビルド | 383件成功、型成功、build成功 | evidence/unit-unsandboxed.log、typecheck.log、build-unsandboxed.log |
| 追加E2E初回 | 設定・比較の近傍値が文字列で型不一致、複数失敗を確認して明示中断。全30件完走と扱わない | evidence/e2e-development-initial-interrupted.log、initial-failures/ |
| 近傍値修正後の追加開発E2E | Chromium/WebKit計30/30成功（1.4分）、retry/新規skipなし | evidence/e2e-development-r2.log、screenshots/ |
| 最終版全単体・型・ビルド | 383/383成功、型成功、build成功 | evidence/unit-final.log、typecheck-final.log、build-final.log |
| 最終版追加開発E2E（34件へ拡充） | Chromium/WebKit計34/34成功（2.3分）、retry/skipなし | evidence/e2e-development-final.log、screenshots-final/ |
| CI：既存を含む開発全回帰 | 556成功＋既存の手動撮影用2skip（18.9分） | evidence/ci-code-42382186369.log |
| CI：既存を含む本番全回帰 | 434/434成功（10.9分） | 同上 |
| GitHub CI：製品コードHEAD b9b7e77 | Validate成功。単体383・型・buildも成功。PRのDeployは条件どおり非実行 | evidence/ci-code-42382186369.json |
| Windows補助全回帰 | 444/558件目付近で明示中断。CI全件成功を確認したため、重複実行を終了。完走成功には数えない。ローカル全件本番は未開始 | evidence/full-development.log、full-regression-exits.json |
| Windows追加本番E2E | Chromium/WebKit計34/34成功（1.9分）、retry/skipなし | evidence/e2e-production-final.log、production-additional-exit.json |

初回E2Eの原因はモデルではなく、フォームから近傍を読んだ際に数値変換対象へ含めなかったこと。
通常の設定適用と比較開始の両方を修正。既存期待値やtimeoutを緩和せず、同じテストで再確認。
その後、平均利得の独立再計算・DPR2タッチ・全比較パラメータ操作を追加。

[製品コードCI run 42382186369](https://github.com/tetsujisugimori-coder/Math-Art-Lab/actions/runs/42382186369) は2026-11-08 00:05 JSTに全必須工程を完了。
既存skipは `e2e/wave-capture.spec.ts` の `WAVE_CAPTURE` を要求する手動撮影ケースの両browser分。
本作のskip・retryは追加していない。全件開発／本番の実検証はUbuntu 24.04のChromium／WebKit。
Windowsの追加34件（開発／本番）は別実行として扱い、Windows全件完走を主張しない。
CIのPNG等は [同runのartifact](https://github.com/tetsujisugimori-coder/Math-Art-Lab/actions/runs/42382186369/artifacts/13578164158)（14日保存）にも保存。
artifactのID・サイズ・SHA256は evidence/ci-code-artifacts.json、検証ソースのSHA256は evidence/test-inputs.json に記録。
検証結果だけを追記した最終HEADのCI確定結果は、[Draft PR #42](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/42) の検証コメントを参照。
Windows再撮影PNGのうち既存最終PNGと完全一致するものはSHA256を照合し、
full-development-screenshots/index.json、production-screenshots/index.jsonから同じ画像を参照。
異なるPNGは再撮影フォルダ内に保持。各索引には実際の撮影時刻・SHA256・参照先を保存。

## 単体・ブラウザ検証内容

4利得、固定／周期×4／8近傍、自己対戦除外、合計／平均、PD分類。
手計算した同期更新、逆順走査の同一結果、旧配列の不変性、同点処理、極端なFermi指数。
seed 0／1／uint32最大、突然変異0／1、人数保存・実配列と協力率の一致。
戦略変更数・平均利得・空間統計、比較の初期配列とseed、履歴上限、数値不正と初期化。

ブラウザはCanvas実画素からC/Dを読み、C数・協力率・時系列端点・選択住民得点・戦略別平均利得を独立照合。
開始／停止／1世代／初期化、6プリセット候補と明示適用、未適用入力保持、Fermi、全比較条件。
4段階教材と記号、Escape、キーボード、行列選択、作品往復でタイマー破棄。
375／390／768／1280px×ライト／ダーク×Chromium／WebKit、ページ横スクロールなし、リサイズ時の状態保持。
DPR2・タップ・reduced-motion変更時停止を別ケースで確認。

## 長期実行・コスト

`node --expose-gc tools/cooperation-audit.mjs`：30×30・Fermi・μ=.01で11,000世代。
人数900を保存、history600、initial900、decisions900。GC後heapは1000世代時16,059,392B→11000世代時16,005,432B。
追加10,000世代約1659ms、最大80×80の100世代約118ms（当該Windows/Node 24.20.0の単発測定）。
これはモデルのみの測定で、ブラウザheap・実機スマートフォン・バッテリー・描画性能の証明ではない。
再現可能なJSONを evidence/model-stress.json に保存。

## 残る限界とレビュー

- 実機iPhone/Android、VoiceOver/NVDA等の支援ソフトによる操作評価は未実施。
- ブラウザの長時間heapプロファイルは未取得。データ構造とモデルの長期測定により上限を確認。
- 比較は一度に1項目。任意の複数条件比較・CSV出力・共有URL・音・装飾演出は範囲を広げず省略。
- 最大C集団と境界の定義は近傍・境界に依存。比較値だけから因果を断定できない。
- 最良模倣の同点優先は行列方向に依存する。画面とモデル資料へ明記。
- Viteの大きなbundle警告は保持。既存Three.js作品を含む共通bundleを本作で再設計しない。
- 本記録は実装者の自己検証。独立レビューは未実施。Draftを維持し、merge／auto-mergeしない。
