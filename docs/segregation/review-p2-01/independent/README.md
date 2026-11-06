# P2-01 独立補助確認（範囲限定）

実装担当とは別の担当が、製品ソース・E2Eを編集せず確認した。これは最終HEAD全体の独立再レビュー完了ではなく、原因の読み取り確認と、数式コンポーネントの別経路実行である。

## 原因の独立確認

元の製品ソースを保持したLinux診断run `42232933530` のjobログをGitHub APIで直接読み、親担当が保存したJSONとも照合した。WebKitの375px・light/dark・20判断・比較ON・root200%では、innerWidth=375、root/body scrollWidth=386。一般式のMathMLは幅354.90625px、左31px、右385.90625pxであった。

MathMLの親 `.sm-formula` は幅343px、clientWidth340、scrollWidth367、overflow visible。その外側の「モデルの読み方」sectionは幅343px、scrollWidth370、overflow visible、mainは幅375px、scrollWidth386。MathML末端の右385.90625pxと文書の386pxが対応する。一方、Canvas・設定・統計を含む `.sm-layout` はscrollWidth343pxで、この突出の伝播元ではない。

比較表はLinux/WebKitで幅425.640625pxだが、343pxの `.sm-table-wrap` のoverflow:autoに収まる。Linux/Chromiumでは表がさらに大きい431.3125pxでもroot375pxだった。表がviewport外に見えるというDOM候補一覧だけで、文書全体の突出原因とは判定できない。

元のCSSはMathMLをmax-content幅・overflow visibleで配置していた。Windows/WebKitでは式幅300.234375pxで、同じ200%でも文書375pxに収まった。Linuxでは355px近い固有幅になり、局所領域のないまま文書へ突出したという、環境差を含む因果解釈は実測値と整合する。

## 修正の静的確認

- 数式だけを `.sm-math-scroll` に入れ、max-width:100%とoverflow-x:autoを設ける変更は、字を縮小せずに原因要素のoverflowを局所化している。
- tabindex=0、名前付きregion、focus-visibleの枠、左右キーの説明があり、重要な式を単に隠す対策ではない。
- 比較表の既存スクロールにもtabindexと名前を加えた。これはMathMLのroot原因とは別の、比較値の到達性を保つ補助対応である。
- Canvas描画幅は親border-boxからclientWidthへ変更されている。従来の343px描画/341px表示領域という2px超過に直接対応し、数学的状態・移動規則・乱数には触れていない。Canvasの実画素・操作の全体回帰は親担当の試験対象で、ここでは実行していない。

## 別経路の実行結果

`independent-check.mjs` は実際の `src/style.css`、`src/segregation.css`、`src/segregation-view.ts` から一般式を抽出し、Playwrightのpage.setContentで実行する。既存アプリE2Eやそのヘルパーはimportしない。

Windows 11（OS報告10.0.26300）、Node v24.20.0、Playwright1.58.2のChromium/WebKit。375px × light/dark × 100/200/300% × 両エンジンの **12/12成功**。300%はWindowsでも横スクロールを発生させる追加stressで、Linux/WebKit200%の代替にはしない。

| エンジン | 文字倍率 | 数式幅 | 数式font-size | 文書幅 | 右キー到達 | 左キー復帰 |
| --- | --- | --- | --- | --- | --- | --- |
| Chromium | 100% | 154.6875px | 22.4px | 375px | スクロール不要 | 0px |
| Chromium | 200% | 309.78125px | 44.8px | 375px | スクロール不要 | 0px |
| Chromium | 300% | 462.59375px | 67.2px | 375px | scrollLeft147px、末尾θ表示 | 0px |
| WebKit | 100% | 151.109375px | 約22.4px | 375px | スクロール不要 | 0px |
| WebKit | 200% | 300.234375px | 約44.8px | 375px | スクロール不要 | 0px |
| WebKit | 300% | 449.375px | 約67.2px | 375px | scrollLeft133px、末尾θ表示 | 0px |

両テーマで同じ測定値。Tabキーによるフォーカス、3pxのfocus枠、root/body/mainにhidden/clipがないこと、MathMLの上下がregion内に収まることを確認した。300%の左右キーは実際のキーボードイベントを使い、scrollLeftをプログラムで設定していない。開始画像・末尾画像を目視し、文字の拡大を維持して読めることも確認した。

MathMLのマークアップは元 `caa3f0a` と完全一致（SHA-256 `dd6e7a6afd90e86842450d0967c9bab2a4d233f72b7dead143a8579aa81584ab`）。実行前後のview/CSS/global CSSのLF正規化hashは不変。詳細と環境・ソースhashは `summary.json`、各ケースJSON、PNGに保存した。

## 未確認・判定の限界

Linuxの修正後200%ブラウザ再実行、アプリ全体の操作、表の実キーボード移動、Canvasの全画素、全作品CI、実機・支援技術はこの担当の独立実行では **NOT_TESTED**。原因と局所修正の妥当性、Windowsの孤立コンポーネント12条件については確認済みだが、最終HEAD全体のマージ判定には最新CIと独立再レビューが必要。

確認日時：2026-11-06 23:29 JST。
