# PLAN_ONLY 検証

専用configで既存178件＋AH86件＝264/264成功。原数理test/原停止testを収集しない。新AH workflowは同config、source/計画validate CLI、純粋deny CLIのみ。実測を起動して拒否を試す構成ではない。child_process各APIのspyとgate import closure静的検査でもprocess生成0を確認した。

正常計画PLAN_VALID、実測gate BLOCKED/APPROVAL_MISSING/NOT_TESTED。誤PR/branch、HEAD/tree/source不一致、policy変更、承認欠落/偽造、試行数/順序/timeout/期待値変更、原票/checkpoint/帰属欠落、未実証状態昇格、保存/監視失敗、clock混同、予算超過を拒否する。seal再更新を伴うstop緩和、時計owner、経路/source/actor欠落、VERIFIED昇格、環境やreviewer変更も拒否する。

初回243件成功後、独立レビューで7反例をRED保存（6誤受理とnull例外）。修正後254件成功。追加3反例をRED保存（区間状態/CPU後退/timeout順）、さらに監視失敗併発で既知timeout FAILが消える1反例をRED保存し修正。最終264成功。raw RED/GREENと中間結果は別名で保全し、過去失敗を上書きしない。

従来AH検証器がなかった計画反例はRED NOT_APPLICABLE。旧AD outcomeの非ゼロexitでもcontinueAllowed=trueとなる挙動は、新AHのfirst-failure停止との差として実在の対照を記録するが、ADの歴史的実行FAILをPASSと称さない。

型検査とbuild成功。既存chunk警告保持。製品/原test/reference/AB/AC policy差分0。保存6条件のbit/history一致とAG保存4件の再解析PASSは、既存証拠のread-only照合とsource不変で維持。新しい数理・性能試行は0。

正式CIは通常push後の最終HEADに結び、success/failure/skipを別集計する。W/X旧failureを保持。既存Pagesの通常全単体は新AH専用configとは別scopeで、原停止や追加性能比較の承認ではない。

2026-11-15 JST
