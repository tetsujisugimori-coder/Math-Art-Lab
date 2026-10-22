# 数式ビジュアル解説の確認画像

2026-10-22、WindowsのPlaywright Chromiumで取得。数値は停止時刻に依存する。

- [1280px：親方向から各αの弧](desktop-heading.png)
- [390px：全端点の包絡](mobile-390-envelope.png)
- [375px：z変位と回転導線](mobile-375-displacement.png)
- [回転後：z成分の代表例](rotated-z.png)

画像は実座標の縮尺を保っている。小さい変位では矢印も小さく、数値説明と回転・拡大を併用する。正面ではz方向が視線と重なる。撮影はデスクトップブラウザであり、実機iPhone Safariの確認画像ではない。

再取得は `npm run test:e2e`。`test-results/*-visual.png` にChromium / WebKit、各幅の画像が出力される。通常のテスト成果物はgit管理しない。レビュー用に選んだこの4枚だけを保存する。
