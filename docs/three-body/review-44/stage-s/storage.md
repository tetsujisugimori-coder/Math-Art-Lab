# 原証拠の保全

既存P/Q/Rの追跡済み資料を変更しない。新規原本は`.three-body-evidence/stage-s/`に保全し、Gitへは小さい要約・索引・source snapshot・代表画像を保存する。原traceはGitへ無条件追加しない。既存原本の削除、LFS、Git履歴書換え、公開範囲変更なし。

旧Qのraw140件と旧Rのraw／trace255件のencoded・decoded SHA、旧R CI ZIP6件とartifact index1,983fileを照合し、不一致0。結果はraw-results/submission/preservation.json。新93rawとtrace87本のencoded／decoded SHA、原summary・画像・manifestのSHAはraw-results/originals.json、reviewコピーのSHAはraw-results/export-index.jsonへ保存する。JSON原文・失敗ログのbyteを改変しない。既知credentialパターンの検査は一般的なDLP保証ではない。

旧ローカル原本・新ローカル原本の独立した遠隔完全複製はNOT_UPLOADED。既存認可済みDrive folderの読取検索を再試行したが、tool unavailableで可用性を確認できなかった。認可のない保存先は作成しない。Actions runtime/results credentialはこのlocal環境にない。CI artifactは別実行の再現原票であり、ローカル原本の複製とは呼ばない。

Actionsは実ID、run ID、実expires_at、API digest、取得／未取得状態、取得ZIP SHA一致を最終PRコメントへ記録する。90日設定を期限後の保存保証としない。各artifact URLまたはgh apiのartifact ZIP endpointから再取得し、記録SHAと照合する。checkpointも残し、未取得ならNOT_DOWNLOADEDを明示する。

kernel ETW、GPU提示、物理入力、実機Safari、読み上げ、低性能実機、完全な累積session、数時間の使用は未検証。これらをPlaywrightの成功で置換しない。
