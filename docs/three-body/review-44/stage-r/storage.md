# 原証拠の保存

既存Stage P/QのGit管理証拠とGit履歴を保全する。Stage Rの生データは`.three-body-evidence/stage-r/`、追加解析・実行ログは`stage-r-submission/`に保存し、自動清掃するPlaywright出力と分離した。Gitには小さな要約、source版、原SHA256索引、代表画像を保存する。原データの一覧はraw-results/originals.json、Git保存ファイルはexport-index.jsonで照合する。

既存の遠隔保存先としてoriginのGitHub Actions artifactを確認した。ローカルにはActions runtime upload token/results URLがなく、ローカル原本を同じartifactへ直接複製できていない。既存project保存先の確認にGoogle Drive connectorを試したが、tool unavailable to the modelとなり検索できなかった。保存先の不存在や新規保存先の認可を推定せず、Stage Q原本の遠隔完全複製はNOT_UPLOADEDを維持する。

新CIのartifactはcheckpoint／evidenceと命名する。実際のartifact ID、run ID、expires_at、ZIP SHA256、ダウンロード・照合状態は最終HEADのPR対応記録に保存する。90日という要求設定だけを可用性保証にしない。CI原ZIPを期限前にローカルへ複製し、API digestと展開後artifact-indexを照合する。CIの別実行はローカル原本の複製とは扱わない。

隔離profile／localhostの測定で、hardware、OS、PID、ローカルpath、ブラウザー起動flagを診断情報として含む。既知credential形式のscan件数を要約に記録し、一般的な機密検査保証とはしない。通常のユーザーブラウザーsessionは採取していない。
