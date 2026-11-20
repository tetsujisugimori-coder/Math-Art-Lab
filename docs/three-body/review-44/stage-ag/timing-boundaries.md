# 計測区間と時計領域

|区間|開始→終了|主体・単位|含むもの／未取得部分|
|---|---|---|---|
|AE body|entry `const start=stamp()`→IIFE終了直後`const end=stamp()`|child pid/tid、performance.now ms|対象文、loop、hash更新、counts、adapter、ON観測。wrapper定義/hash生成/global counter初期化は開始前、bits/digest/summary整形は終了後|
|ONカテゴリ|meterでfn直前stamp→finally内stamp|同child、wall ms、process/thread CPU user/system us|initialization/Verlet/invariants/assertion/RK4/finalRms。calls++は開始前。Verlet後hash更新はカテゴリ外だがbody内|
|OFFカテゴリ|stampを呼ばずfnを実行|未計測|callsは記録。hash/counter/adapterは残る。観測数0はゼロ費用を意味しない|
|bundle import|bootstrap before-import→after-import|child performance.now ms|bundle評価とadapter module初期化。AST抽出/esbuildは含まない|
|保存近傍|after-body→result-saved|child performance.now ms|after-body log書込み、JSON.stringify/result書込みなど。終点はresult-saved logのat取得、最終log書込み完了そのものではない|
|親process envelope|spawnSync直前performance.now→戻った直後|parent pid、wall ms|child起動・import・body・保存・終了などを含む。stdout/stderr openは開始前。これをbodyやchild CPUと差引き配賦しない|
|元Vitest body/import/cleanup|対応する原票の境界なし|NOT_OBTAINED|test結果のdurationだけを同じ区間・同じ負荷とは扱わない|

stampはperformance.nowを先に取得してからprocess.cpuUsage/threadCpuUsageを読む。wallとCPUの端点は原子的同時snapshotではない。短い区間のCPU量子化や読取り費用をwallとの差からOS待機へ割り当てない。親と子、processとthread、wall msとCPU usは別領域である。

AFの固定許容差で`bodyWallMs = Σ(categoryWallMs) + residual`を検査する。これは保存値の整合式であり、residualの原因内訳は証明しない。loop/hash/observer等が入り得るが、個別の費用配分はUNKNOWN。

原Vitestの5000msは対象テストのdeadline、AEの30000msは親spawnSyncの安全上限。対象と開始終了条件が違う。installed Vitest withTimeoutはtimerと解決時経過時間の双方を扱うため、「同期処理だからtimeoutは生じない」とも断定しない。過去workerの有効設定とイベントループ状態はNOT_OBTAINED。

原VitestとAEの共有計時区間・同一pid/tid・同一collection/worker負荷を示す原本はない。**実時間比較NOT_COMPARABLE**。数値bit一致、AE bodyが5000ms未満、別CIの単体成功はこの判定を変えない。

2026-11-15 JST
