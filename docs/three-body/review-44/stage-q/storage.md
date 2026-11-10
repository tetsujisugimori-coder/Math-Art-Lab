# 証拠の保存と期限

既存Stage P約525MBを変更・削除していない。履歴書換え・LFS導入なし。新しいtrace／大きな実験JSONはGitへ追加せず、ローカル`.three-body-evidence/stage-q/`（自動削除なし、Playwright出力清掃と分離）へ保存した。Gitには小さな解析結果、全要求時刻のBrotli圧縮、encoded/decoded SHA256、測定tool版、2枚の画像を10MB以内で保存する。サイズと全ファイルhashは[export-index](raw-results/export-index.json)、原ファイル索引は[local-storage-index](raw-results/local-storage-index.json)。

ローカル原証拠の完全な遠隔複製は **NOT_UPLOADED**。この未完了をCI artifactの別試行で置き換えない。現時点の長期保管先は同workspaceのignoredディレクトリであり、workspace消失リスクが残る。期限前の独立した保存先への複製が必要。ユーザーの既存ファイルやStage Pを削除して容量を作らない。

新CIは早期checkpointと最終rawをartifactへ保存し90日保持を要求する。実際のexpires_atとrun/artifact URL、zip SHA256は**最終HEADのPR検証コメント**を正本とする。リポジトリ上限等で短縮される可能性があり、設定値だけで90日保証とはしない。原証拠は取得後にhash照合してローカルにも保持する。期限切れ後の再実行は追試であって、消失した原標本の代替ではない。

隔離した新規browser profile／localhostだけを測定。既知credential形式の検査は候補0。hardware型番、OS、プロセスID、ローカルpath、画面の作品表示は診断情報として含む。pattern検査は一般的DLP保証ではない。公開する要約・スクリーンショットを点検し、ユーザーの通常browser sessionは採取していない。
