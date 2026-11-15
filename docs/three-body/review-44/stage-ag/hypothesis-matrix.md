# 原因候補と証拠強度

|仮説・主張|既存証拠|判定できる範囲|残る限界|
|---|---|---|---|
|AEの4試行間で数値が異なった|保存bit/reference bit/history/count一致|当該4原票について反証|元Vitestの全実行一般までは証明しない|
|AE OFFには観測介入がない|entryのhash、counter、adapter、meter calls|sourceから反証|各介入の純粋な費用は未測定|
|AEは元Vitestのcollection/workerを再現する|AST抽出、esbuild、fresh Nodeと原runnerの差|sourceから反証|過去worker有効設定・費用はNOT_OBTAINED|
|同じ数値なので実行負荷・deadlineも同じ|計時範囲・5000/30000・matcher context差|推論を棄却、NOT_COMPARABLE|原テストと共有時計がない|
|AEの全4試行が失敗した|cohort/checkpoint/result/clockの実行・観測PASS|保存済み4件について反証|原Vitest PASSや原停止成功ではない|
|RK4が元timeoutの単独原因|AEのRK4区間は存在|UNKNOWN|元Vitest RK4の同区間実測なし。AE値を5000msから差引かない|
|Vitest collection/transform/import/setup/cleanupが原因|sourceではAEと差がある|原因候補、確定不可|過去原Vitestの区間原票なし。deadline内外を推測しない|
|matcher context、worker隔離、GC/JIT、OS scheduling、Node native差が原因|実行経路差と未束縛部分がある|区別できない候補、順位付けなし|再現可能な因果対照なし。OS待機への残差配賦禁止|
|W/X failureは同じ原timeoutの再現|W source互換制約、X Locator identity診断失敗と索引欠落|根因同一性を支持しない|W BLOCKED、X FAIL、原停止再現NOT_TESTEDを保持|

根本原因はUNKNOWN。数値の再計算・原票の再解析は新しい時間計測ではない。性能改善率NOT_TESTED、原停止試験NOT_TESTED。

次工程で実測を必要とするなら、仮説を「同じ固定checkout・同じNode/worker条件で原Vitestの特定区間に費用がある」と限定し、計画に試行数・ON/OFF介入・時計境界・原本の実行時receiptを先に固定する。反証条件は想定区間の増加が再現しないこと、停止条件は失敗/欠測/source drift/固定予算到達。AB/ACの独立承認を事前に取得し、retry/replacementやdeadline変更で埋めない。これは提案であり実行承認ではない。今回の追加実測は0。

2026-11-15 JST
