# Stage AG 検証結果

ローカル最終候補は専用configで178/178成功：AE44、AE evidence23、AF67の既存134件と、AG44件。原`three-body.test.ts`はinclude対象外。新しいsource/claims故障25件と保存原票コピー4件を全拒否、正常static/historical対照を受理。故障注入はmemoryまたは隔離コピーのみ。追加測定0。

初期164件成功→W/X状態検証追加で165件成功→独立レビュー3指摘のRED（0成功/3失敗）を保存→修正後168件成功→個別metadata/proof/状態検査を加え177件成功。これは実装追加によるmock回帰であり、性能試行のretryではない。初期正常系で引用符canonical化差によりFAILを観測し修正した記録も保存し、誤PASSのREDとは区別する。

RED/GREENの詳細は[red-green.json](red-green.json)。旧抽出関数のガードが未検査のwrapper等を受理したことと、AFのraw監査全体の性能/欠測判定を混同しない。独立レビューの3反例は実在する新AG検証器の修正前誤PASSを再現したもの。

`node node_modules/typescript/bin/tsc --noEmit`成功。`npm.cmd run build`（tsc+vite build）成功。既存500kB chunk警告は保持。製品・原数理テスト・reference・5000ms・policy差分なし。既存6条件bit/history hash照合は保存済みAF証拠の6/6一致とsource無変更から確認し、追加大規模数理試行を行わない。

ゲート静的監査PASS。新CIは既存AE browser-free jobへAG専用configとstatic CLIを追加し、pathsだけを拡張。AE/AF契約を除外しない。PR44のruntime拒否と既存browser経路の禁止条件を保持。正式CIは通常pushによる最終HEADの結果を別receiptへ固定し、success/failure/skipを分ける。workflow手動起動はしない。

保存済み4試行の再解析は`historical-final.json`に別保存。AEの実行/観測PASSと現在のPOSTHOC照合PASSは別属性であり、runtime NOT_OBTAINEDを変更しない。旧W/Xログは[prior-evidence.json](prior-evidence.json)に内容と取得元descriptorを結び、W BLOCKED、X FAIL、欠落INDEX_MISSINGを保持する。ログの後続importを旧原本の完全取得とは称さない。

2026-11-15 22:00 JST

初回正式CI（3e3a230）はsuccess4/failure4/skip7。W/Xに加え、混在改行のraw descriptorを再構成できずPagesとAE正常対照が失敗した。失敗を保存し、保存rawBase64のsize/SHA検証とcheckout論理一致を分離する修正を追加。隔離LF checkoutを受理し偽rawを拒否する対照を加え、178件成功。workflow再実行はせず、新commitの通常CIと区別する。

追加節をPowerShellからPython stdinへ渡した際に日本語が疑問符へ置換されたことを提出前に検出した。破損文書を別保存し、Unicodeを保持する経路で修正した。破損本文はPR/Issueへ投稿していない。UTF-8原文・API応答・再取得本文の照合を提出時に実施する。
