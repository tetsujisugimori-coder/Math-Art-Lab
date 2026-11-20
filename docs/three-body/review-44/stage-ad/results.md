# Stage AD結果（提出前検証）

総合PARTIAL、製品変更0、browser/CDP/GUI/原停止試験0、性能改善率NOT_TESTED、マージNO。

## ゲートの適用範囲

現行8workflowはAC式とinstall前のpolicy検査を維持。PR44、同PRのbranch変更、対象branchのpush/dispatch、marker削除/改変、現行rerun識別、不完全event、欠落/偽造policyを拒否する。無関係なPR/mainはmock正常対照で許可される。

同じコードを別branch/別PRへ置いた場合、CI識別ゲートは通る。これは承認されたsource/計画を検証するゲートではない。AA原停止入口は非probe呼出しをlaunchBound前に直接拒否し、cohortにはHEAD/tree/plan/source/reviewer/GitHub原記録照合が別途ある。一方、過去のP/Q等の直接入口は一律sandboxではない。すべての診断入口の移植を防げるとは主張しない。今回、他作品CIを止める一律禁止やrepository権限変更は行わない。

旧revisionのworkflow rerunは新commitで保護不能。運用上の再実行禁止と、将来必要なら管理者による権限/実行経路審査を提案するだけで、変更しない。AB/AC policyは不変。監査PASSはこれらの残存リスクを含む適用範囲の確認であり、実行承認ではない。

## 固定timeout試行

4/4完了、2PASS/2FAIL、未実行試行0、置換/retry0。対象2試験の本文・5000ms・許容値は無変更。各fresh Vitest process、単体名選択によりknotで8件、three-bodyで38件は選択外。試験のskip指定追加ではなく、全単体成功とは報告しない。

|試行|結果|親process全体ms|reporter init→collected ms|collected→finished ms|worker hook区間ms|
|---|---|---:|---:|---:|---:|
|ad-knot-off|PASS|8917.226|6374.039|1447.632|NOT_OBTAINED|
|ad-knot-on|PASS|7922.357|5171.212|1664.329|1458.080|
|ad-eight-off|FAIL timeout5000ms|15547.335|4581.457|9767.860|NOT_OBTAINED|
|ad-eight-on|FAIL timeout5000ms|17095.204|5532.271|10610.417|10264.097|

ONの8の字hook区間はprocess CPU user 9343ms / system140ms。同じworker内の差分であり、thread CPUや物理計算だけの時間ではない。試験本体内で計算・assertion・RK4が混在し、その内訳はNOT_OBTAINED。収集前だけが原因という説明ではこの標本を説明できない。knot旧全単体timeoutはこの固定単独窓でNOT_REPRODUCED_IN_FIXED_WINDOW。並列競合・OS・CPU・assertion費用の寄与はUNKNOWN。追加hookの影響を少数試行で定量的に排除しない。

親/runner/workerの時計を無校正で差し引かない。process開始要求→終了は親時計、収集区間はreporter時計、hookはworker時計。正確なspawn受信時刻・計算単独・assertion単独・cleanup単独はNOT_OBTAINED。5000msで同期計算が強制中断されたとはしない。元ACローカル722/724の2timeoutとCI730/730は過去の別結果として保持。

## 診断器の検証履歴

初回サンドボックス準備検査はesbuild読取り拒否、テスト収集なし。ホスト実行の初回は42PASS/3FAIL：it.eachが配列を展開し負対照入力が意図と異なった。原source/stdout/stderrを保存して入力包装を修正し、観測器には不正rows入力の拒否を追加。修正後49/49成功。これは診断器/負対照の修正であり製品改善ではない。

計画・原票・源sourceは新stage-adのみ保存。最終CI、追加契約/型/build/数理照合、保全・投稿読戻しは最終HEADの提出記録で別記する。GUIはNOT_RUN。旧Stage W/X failureを保持する。

独立コードレビューで時計domain欠落の受理、CPU不正値、実行FAILの観測障害による上書き、途中状態保存不足を確認。元観測器・runnerを保存し、domain必須検査、CPU取得状態の分離、execution/observation状態分離、各試行checkpointと後続BLOCKEDを追加した。保存先自体が壊れた場合は例外で停止し、保存成功を主張しない。captureが結果を返す前の例外では実行状態NOT_OBTAINEDとし、未起動と断定しない。

レビュー修正後AA/AB/AC/ADの151契約成功、計画SHA照合追加後AD25件成功。型検査/build成功、数理6条件の全Float64 bit・全履歴hash不一致0。新規計画ファイルだけeol=lfを指定し、OSのcheckout改行変換が原文SHAを変えないようにした。既存原本の改行正規化ではない。

固定4試行は修正前runnerによる原票として不変。そこでは観測欠落/例外は発生せず、明示domainが取得できた。修正後の観測器で新しい再監査を行うが試行は増やさない。取得snapshotは指定テストと観測器・計画のみで、計算module/import closure全体の取得時完全束縛ではない。HEAD/tree/dirtyとGit不変差分は補助証拠であり、後取得ファイルを当時snapshotと扱わない。今後の新試行はsource集合の拡充と別計画が必要。
