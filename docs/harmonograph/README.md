# 光のハーモノグラフ：確認画像

2026-10-22、Windows上のPlaywright Chromiumで、実際の数式から描画して撮影。画像を作品の背景へ貼っていない。画像名はレビュー資料であり、実行時アセットではない。

| 状態 | 画像 |
| --- | --- |
| 初期プリセットの完成形 | [四葉の光冠・1280px](flower-desktop.png) |
| 描画途中・先端の光 | [描画の途中・1280px](drawing-desktop.png) |
| 丸い立体の比較 | [光の繭・1280px](cocoon-desktop.png) |
| 交差する編み目の比較 | [星編みの籠・1280px](basket-desktop.png) |
| 狭幅・DPR 2の完成形 | [375pxの四葉の光冠](flower-mobile-375.png) |
| 3D投影と同じ標本の成分図 | [375pxのz解説](z-guide-mobile-375.png) |

初期視点は少し傾け、奥行きを示す。細線を見失わないよう、ブルームや反射は追加しない。先端は作品の現在の標本点であり、成分図の点も同じ標本に対応する。成分図全体は全時間範囲の標本を最大1,601点へ間引いた表示。

再取得は `npm run test:e2e`。`test-results/harmonograph-{browser}-{width}-{preset}.png` と成分図の画像を出力する。テストでは1280 / 390 / 375px、Chromium / WebKitを確認し、狭幅はDPR 2・タッチ対応コンテキストを使う。描画途中と3D投影を含む全体像は必要に応じて同じ状態にして追加撮影する。実機iPhone Safariの確認画像ではない。
