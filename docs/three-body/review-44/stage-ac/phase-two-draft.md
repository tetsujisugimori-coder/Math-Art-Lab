# Stage AC第2段階案 — DRAFT / BLOCKED

実行許可はない。PR44・branch・ref禁止とAB policy trustedReviewerIds=[] / executionAuthorized=false、original非probe禁止を保持する。

次工程で事前に新しい実行HEAD/tree、診断source-set SHA、計画SHAを固定してcommitする。Windows/Node/Playwright/WebKitの実versionはその環境から取得して固定し、未取得値は補完しない。新ID案はac2-original-v / ac2-original-w、各1件、V→W、新鮮browser、再試行・置換なし。今回またはY/Z/AAの失敗・未実行とは別試行とする。

原試験本文・操作順・30秒/5秒/200ms条件は変更しない。click要求/return/operation ID、capture、pause入口/出口、playing/timer、内部step/DOM、wait要求/return、200ms後stateと最終journalの区間を取得する。時計domain間は評価区間だけを記録し、未校正の厳密同時刻を主張しない。

開始条件：今回のP2-AB05/06再レビュー、空/破損/不一致を拒否するsource・計画・証拠監査、正常UTF-8投稿と読戻し、原artifactと展開集合照合、ローカル2失敗の扱いの明示、認可された独立レビュアーによるGitHub原記録のPASS/YESと明示実行承認。その後に別途審査したcommitでCI/直接入口ゲートを変更する。本文marker削除だけでは再開できない。

観測器・環境・source・証拠・終了処理のいずれかが不完全なら残りをBLOCKEDとして停止する。全試行完了または上限到達でも停止。原bytes、復元byte一致、集合/サイズ/SHA、process終了値、欠測を保存し、新規承認済み領域へコピー後、別processで再検証する。今回のレビューはこの実行承認を代行しない。
