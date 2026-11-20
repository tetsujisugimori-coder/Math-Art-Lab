# Stage AH 成果

A. PLAN_ONLY技術的限定PASS。実測開始BLOCKED/APPROVAL_MISSING、PR全体PARTIAL、merge NO。

B. 開始HEAD `47f12bda192d722b348fc371722130901d936c8c`、tree `e17ff930687a13e11e50e790c657eb918ebb8e68`。GitHub/remote/local一致、差分なし。最終HEAD/treeは通常commit/push後のGit/CI/API記録と提出本文へ固定する。

C. 変更はAH専用検証器・fixture・mock config/CI・文書/索引・LOGのみ。製品、原test、5000ms、演算/許容値/初期条件、policy、過去原票に差分なし。

D. 23 sourceと11実行段階をGit blob/SHA/source anchorへ対応付けた。installedと歴史的runtimeを区別し、過去実効設定はNOT_OBTAINED。

E. T0〜T7の候補を固定。T1/T2/T3やT4/T5、T0/T7の重複を明示し、合計一致を仮定しない。T5はmatcher単独費用ではない。

F. wall ms/process CPU us/thread CPU us、supervisor/coordinator/workerを分離。同pid/tidの順序・帰属・CPU非後退を検査。欠測はnull/NOT_OBTAINED、OFF未計測をゼロにしない。

G. body前、throw中、終了後timeout、応答欠落、異常終了、監視/保存失敗、正常終了を分離。timer表示とbody中断を同一視せず、順序/原票が不足ならUNKNOWN。

H. 次工程案は固定OFF→ONの2枠、retry/replacement/reorder0。原5000ms維持、親30000ms/枠・全体90000ms。target checkout47f12bdとAH計画commit/未実装observerを別identityにする。

I. first failure/欠測/source drift/予算/保存不備/未解決anomalyで停止し後続BLOCKED。実装済みなのはsynthetic停止契約。物理監視・終了・flushは未実装なので開始不可。

J. 独立レビューでRED 7+3+1反例を保存しGREEN。従来未対象はNOT_APPLICABLE、AD継続ruleとの差はscopeを明示。

K. 既存178+AH86＝264成功。型/build成功、保存4件/6条件の既存成功をsource不変と証拠照合で維持。新しい実測0。

L. 専用browser-free CIを追加。正式CIは最終HEADの成功/失敗/skipを別記録にする。W/X旧failure保持。

M. Windows新規Stage-AH領域に保全し、別processで集合/数/size/SHAとmanifest自身を照合。確定receiptは最終報告を参照。

N. 独立再レビュー技術的限定PASS。正式CI/保全/投稿はレビュー対象外。

O. 根因UNKNOWN、実時間NOT_COMPARABLE、性能改善/原停止NOT_TESTED。物理observer/supervisor/実行時receipt/独立実行承認は未取得。現判断で起動しない。

P. 次工程には別commitでのobserver/実行gate実装と独立レビュー、固定計画/環境/原証拠/停止機構の照合、live独立承認とAB/ACの別判定が必要。既存PR44/Issue43へUTF-8投稿・API/readback全文一致を保全。Draft維持、auto-merge無効、mergeなし。

2026-11-15 JST

P2修正追記（レビュー5911250527、基準9fb0b1d）：runner FAIL保持とexit0矛盾記録、実行/観測/証拠完全性の分離、timeout begin/decision/endの三点判定と完了不明の保持を追加。先行28反例は12 RED/16 BASELINE_PASS、同反例の修正後28 GREEN、既存264を含む322契約成功。詳細は[p2-review/verification.md](p2-review/verification.md)。実測承認や根因解明ではなく、PLAN_ONLY/実測BLOCKED/APPROVAL_MISSING/承認HOLDを維持する。
