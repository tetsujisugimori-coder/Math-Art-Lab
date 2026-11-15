# P2-AH01 / P2-AH02 — 修正前に固定する期待結果

基準HEAD `9fb0b1d759b8558f6d3ee30cd607af12ea26f634`、tree `1067bced955ac7aeb8eb439bae128f67542f2f9f`。レビュー5911250527。PLAN_ONLY、実測BLOCKED/APPROVAL_MISSING、承認HOLD。以下を先に固定し、同一fixtureのbefore/afterを保存する。既に正しい既存fieldのケースはREDと呼ばない。追加fieldが旧版にないことだけもREDにはしない。

## P2-AH01

runner FAILは独立した既知の失敗根拠。exit0との矛盾は`contradictions`へ別記録する。観測/保存/原票の問題があってもexecutionOutcome FAILを保持。runner欠測/不正値からPASSを作らない。

|runner・併発条件|executionOutcome|observationOutcome|evidenceCompleteness|
|---|---|---|---|
|FAIL＋exit0|FAIL、RUNNER_FAIL_WITH_ZERO_EXIT|PASS（矛盾の観測自体は成功）|COMPLETE|
|FAIL＋exit非ゼロ|FAIL|PASS|COMPLETE|
|FAIL＋監視失敗|FAIL|FAIL|COMPLETE（原票がそろうfixture）|
|FAIL＋保存失敗|FAIL|FAIL|EVIDENCE_INCOMPLETE|
|FAIL＋原票欠落|FAIL|NOT_OBTAINED|EVIDENCE_INCOMPLETE|
|runner欠測/null＋exit0|UNKNOWN|NOT_OBTAINED|EVIDENCE_INCOMPLETE|
|runner不正値＋exit0|UNKNOWN|FAIL|INVALID|
|PASS＋正常証拠|PASS|PASS|COMPLETE|

`runnerStatusState`はOBSERVED/NOT_OBTAINED/INVALID。証拠完全性はraw/receipt・runner値・必要なbody境界（OFFは親境界）の充足を表し、観測の成否とは別。invalid clock/sourceでも既知runner FAILを消さず、証拠側をINVALIDまたはEVIDENCE_INCOMPLETEとする。物理的な元テストの実行結果ではなくsynthetic分類である。

## P2-AH02

同一worker pid/tid/clockと固定trial/source/plan、seq/clock/CPU順序を確認してから三点を比較する。`timeoutPosition`と`bodyCompletion`を分離する。比較は取得済みeventの順序だけを使い、異process時計を減算しない。

|取得済み順序|classification|timeoutPosition|bodyCompletion|
|---|---|---|---|
|timeout→begin→end|TIMEOUT_BEFORE_BODY|BEFORE_BODY_BEGIN|COMPLETED|
|begin→timeout→end|TIMEOUT_REPORTED_DURING_BODY|BETWEEN_BODY_BEGIN_AND_END|COMPLETED|
|begin→end→timeout|TIMEOUT_AFTER_BODY|AFTER_BODY_END|COMPLETED|
|begin→timeout、end欠測|TIMEOUT_REPORTED_AFTER_BODY_BEGIN|AFTER_BODY_BEGIN|UNKNOWN|
|beginのみ、timeout表示あり、決定event欠測|UNKNOWN|NOT_OBTAINED|UNKNOWN|
|begin欠測、timeoutのみ|UNKNOWN|UNKNOWN|NOT_OBTAINED|
|beginなしでendが存在、重複、逆順、別trial/domain混入|INVALID_CLOCK_EVIDENCE|UNKNOWN|UNKNOWN|

end欠測の行はobservationOutcome NOT_OBTAINED / evidenceCompleteness EVIDENCE_INCOMPLETE / bodyInterval NOT_OBTAINED。開始後にtimeoutが報告された事実を残すが、中断・完了・実行費用は推定しない。決定eventがないときはtimeout表示だけで位置を認定しない。

timerとresolve.elapsedが各1件のdistinct決定eventとして共存する場合、同domainの最初のeventを主分類に使い、全件の位置を`timeoutDecisions`へ保存する。同じ決定event名の重複は拒否。後のeventで最初の開始前報告を隠さない。

従来との差はrunner FAIL保持、開始前の誤DURING修正、終点欠測時の取得済み順序保持、runner/証拠/完了状態の明示。物理observer/supervisor/launcher、元5000ms、数理条件、承認policyは変更しない。

2026-11-15 JST
