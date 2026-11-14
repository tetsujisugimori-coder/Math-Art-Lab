# 第2段階固定準備：DRAFT / BLOCKED

本計画は実行承認ではない。参照実行候補HEADは07f2eae71b5980d6aff23874745452aa41dc8b5c、treeは87f0a5fb13e4adb77d7fcdb1fcb1e9181bcd8a70。既存診断入口のsource-setを外部manifestに束縛する。現在の入口は実測を拒否するため、この候補をそのまま実行できない。入口・ゲートを変更する次のcommitでは新HEAD/tree/source-set/計画manifestの再固定と再審査が必須。Stage AD最終HEADを参照候補HEADと取り違えない。

新規ID案 ad2-original-v / ad2-original-w、各1件、V→W、fresh browser。旧Stage Y/Z/AAは置換しない。原テストの本文・操作順・30秒/5秒/200msは変更しない。観測器適合の再確認が必要なら、実行前の別計画でOFF/ON各1件を明記し、承認なしに追加しない。

環境はWindows限定。今回のメタデータ観測はWindows kernel 10.0.26300、Node v24.20.0、Playwright package 1.58.2、package定義WebKit revision 2248 / version 26.0。ブラウザーを起動せず読んだ定義であり、実ブラウザーbinaryの実行version・SHA・動作適合はUNKNOWN。次回実行環境の完全一致を今回保証しない。取得できない項目はUNKNOWN/BLOCKED。

click要求/return・operation ID、capture、pause入口/出口、playing、timer、内部step、DOM step、wait-issued/returned、200ms後state、最後のjournal、cleanupを取得する。同一時計の順序と区間のみ評価する。異なるprocess/clockの対応は校正区間と誤差を保存し、未校正なら厳密対応NOT_OBTAINED。待機要求200msと実際の待機区間を分ける。

必須条件：原ZIP/展開集合/manifest/SHA、ソースHEAD/tree/blob/実行snapshot、観測器の正常・故障対照、全必須監査PASS、計画SHAとsource-set SHAに束縛された独立レビュアーのGitHub原記録、明示実行承認。現在executionAuthorized=false / trustedReviewerIds=[]は不変。今回レビュー5906925661は承認ではない。将来のゲート変更は独立した変更として審査する。

不足・矛盾・source drift・観測器/環境/終了処理/証拠の不備で残りをBLOCKEDとして停止。実行済みFAILは証拠不足で上書きしない。追加・置換・成功までのretryは禁止。全2試行または停止条件で終了。

原票・source snapshot・raw stdout/stderr・exit・画像/trace（承認された範囲のみ）・manifest/indexを新規領域へ保存する。元sourceの復元byte一致を確認し、集合/サイズ/SHAと別processの読戻しを実施。旧6原本NOT_OBTAINED、全履歴LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS、REMOTE_BACKUP_NOT_UPLOADEDを維持する。

計画自身のSHAはこのファイルに埋め込まず、phase-two-manifest.jsonに保存する。計画固定は実測開始を許可しない。
