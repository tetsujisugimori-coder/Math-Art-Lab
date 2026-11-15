# 固定仮説と反証・停止条件

|仮説/問い|予定証拠|反証または識別限界|停止条件|
|---|---|---|---|
|body前のcollection/import/setupが失敗位置に関係する|T1/T2/T3、pre-body.failure、元result|body.beginがあれば「未到達」は棄却。各重複区間の純費用は分離不能|必要event/帰属欠落で停止|
|body中の失敗か、終了後のtimeout判断か|T4、body.throw、timer/resolve決定event|正常end→後続決定ならbody-preemption説を棄却。end欠落だけならUNKNOWN|runner失敗/timeoutで残枠BLOCKED|
|matcherに関連する区間が支配的か|T5粗envelopeとcount126520|T5には数理計算が混在し、matcher単独原因は特定不可|count/境界不一致で停止|
|worker/IPC/process異常か監視失敗か|親result、worker応答、signal、監視log|応答欠落だけではcrash/同期占有/IPCを区別不能|応答/監視/保存の失敗は停止|
|観測介入が挙動を変えるか|有限OFF→ONの原Vitest結果と同domain区間|1組のみで統計的効果/改善率は推定しない。OFF失敗ならON未実行|失敗・欠測で打切り、追加対照禁止|

固定提案は2枠 `ah-O1 OFF → ah-O2 ON`。これは次工程用で、今回0枠実行。元sourceと5000ms・期待値を保持する。worker forks/node、1 worker、isolate、fileParallelism=falseを明示するが、歴史的な有効設定とは同一視しない。filtered target実行は通常全file実行とのcollection/context差も残る。

親安全上限30000ms/枠、全体90000ms、retry/replacement/reorder0。開始前にtarget/source/observer/Node binary/installed JS/OS/effective config/plan/raw保存先/承認を固定する。OFF失敗・非ゼロ・signal・timeout・source drift・不明anomaly・必要区間欠測・receipt/保存不備のいずれでも停止し、未実行枠をBLOCKEDとする。想定外の結果でも成功まで繰り返さない。

現在のtargetは47f12bd checkout、AHゲートは別commit、observer実装はNOT_IMPLEMENTED。次工程でこれらの対応と安全終了・flushが証明できなければHOLD。別のsourceが必要なら開始前に新固定計画を独立承認し、開始後の差替えを認めない。本書は開始承認ではない。

既存AGの10段階対応/body-RMS限定PASS、178契約、保存4件再解析、保存6条件bit/history一致を維持。歴史runtime NOT_OBTAINED、実時間NOT_COMPARABLE。根因UNKNOWN、原停止/改善率NOT_TESTED。OS/GC/JITへ残差を推測配分しない。

2026-11-15 JST
