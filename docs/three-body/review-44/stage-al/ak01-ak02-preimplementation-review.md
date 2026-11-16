# Stage AL — P2-AK01 / P2-AK02 実装前審査（静的レビュー）
審査日: 2026-11-16 JST
対象: Issue #43 / Draft PR #44 / 隔離branch `codex/stage-al-publication-plan-20261116`
AK固定HEAD `1252a92d2cbdcaf3586922f94d5cfd13a4096fea`
AK固定tree `96f3981c65d1cbbf361884cc571b88b9eeec65c5`
基準PR #44 HEAD `bca7eb3abedf51679eaffff2f8eaee15b86b5ab6`

## A. 判定（実物なしの静的仕様審査）
**総合 PARTIAL、設計原則限定PASS、AK01/02 OPEN、物理実装 APPROVAL_MISSING、実行・資格 BLOCKED、原Vitest NOT_TESTED、PR #44 Draft/merge NO。**
本審査はAK28のGitHub実物、レビューv4、safety-contractおよびMicrosoft公式API仕様を確認した、実装前静的審査である。物理原票・VM/R/Job挙動を確認していない。従前の独立レビューv4を物理安全証明へ拡張しない。

## B. 判定根拠
- `docs/three-body/review-44/stage-ak/recovery-architecture.md` (Git blob `8e1518372848e9dbb0b652bbd8ea6783d8ed2dc4`)
- `docs/three-body/review-44/stage-ak/orphan-prevention.md` (blob `293c5af9c308d9d9d654f3b7ad7428e28e7a1263`)
- `docs/three-body/review-44/stage-ak/safety-contract.json` (blob `057ac9e63c7acd57a8bd69ff3edc9f9f9652d0fa`)
- `interfaces-and-acceptance.md`, `budgets-and-approval.md`, `environment-and-binary-ledger.md`, `review-v4-manifest.json`, `source-binding.json`, `docs/three-body/review-44/stage-al/publication-and-approval-plan.md`
- 公式仕様:
  - https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute
  - https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects
  - https://learn.microsoft.com/en-us/windows/win32/procthread/nested-jobs
  - https://learn.microsoft.com/en-us/windows/win32/api/profileapi/nf-profileapi-queryperformancecounter
  - https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes
  - https://devblogs.microsoft.com/oldnewthing/20230209-00/?p=107812

## C. 新規P2-AL01: Native M(C/D/E)の時計・CPU計測仕様がNode APIのまま
`safety-contract.json.components[C,D,E]` は `M native monitor EXE outside J`, 同一native processとするのに、`clock.wall = performance.now milliseconds`, `clock.cpu = process.cpuUsage microseconds` と明記している。これらはNode/JavaScript側のAPIであり、通常の独立native C++ EXEの仕様として成立しない。C/D/Eの実装者が代替APIと時計domainを推測すると、timeout・exit・証拠の帰属を誤る。
**修正要求:** Node側(A/B/F/G等)のclock契約とnative M側のclock契約を分離する。Mのmonotonic wall intervalは候補 `QueryPerformanceCounter` + `QueryPerformanceFrequency`、CPUは候補 `GetProcessTimes` / 必要なthread APIを指定し、返却型、単位、epoch、frequency、生カウンタ、起点、失敗状態とclock-domain IDを固定。M/R/guestの時計間で差を取らない。CLOCK_MISMATCH、clock discontinuity、missing samples、CPUとwall取り違えを拒否する静的/mock反例を追加し、同じ反例でGREENを確認する。AK原本28ファイルは上書きせず、次版の別ファイルまたは新stage仕様として修正する。修正後の独立再レビューが必要。
**判定:** P2-AL01 OPEN、物理nativeソース実装前の仕様修正必須。

## D. P2-AK01 外部回復R
**設計方向: 限定PASS。実際の回復保証: NONE、OPEN。**
Mはguest内・J外、Rはguest OS外の管理station+hypervisor管理endpoint、Hは有限時間保証のない手動主体。STOP request / accepted / fresh VM stopped / guest exit / resource release / external ledger durableは別証拠。VM強制停止はguest内handle閉鎖や正常終了を自動証明しない。管理station・host/hypervisor・管理経路の故障を跨ぐ自動保証もない。
必要な実体:
1. 実在する使い捨てVM image SHA/UUID/generation、hypervisor UUIDと操作対象の一致
2. R station識別、稼働主体・所有者・監督責任、独立した管理ネットワーク/console、heartbeat/clockの主体
3. management endpoint/commandの具体種別、相互認証、VM限定ACL、資格情報の安全な保管/失効/再発行（公開manifestに秘密を書かない）
4. guestより先にR enroll、target capabilityとnonce/epoch/replay防止、guestの停止要求欠測やMのhangをR自身が観測/判定する経路
5. deadlineごとに独立監視して「命令送信」「管理API受付」「実VM停止」「外部raw/receipt永続化」の個別判定。timeoutで締切延長・偽のEXITはしない
6. R自身のhang、station/network/management/host故障は `guarantee NONE / UNKNOWN / BLOCK_REMAINING`。Hは自動回復とは数えない
7. 固定milestone候補(資格5/6/8/9/10秒、AH25/26/28/29/30秒)は未承認の仮配置。実費用・成否・90000ms総枠を証明するまで試験の設定ではない
合成反例案: M heartbeat欠測、guest通信断、古いVM generation、別VM UUID、nonce再利用、権限拒否、管理API受付のみ、stale status、R停止、guest raw喪失、外部ledger失敗、VM rollback。unknown は保全し、実験開始拒否。

## E. P2-AK02 creation-time Jobと孤児化
**設計方向: 限定PASS。実体の孤児化防止証明: NOT_TESTED、OPEN。**
旧 `CREATE_SUSPENDED -> AssignProcessToJobObject -> ResumeThread` にはcreation-to-assignment窓がある。候補 `STARTUPINFOEXW/EXTENDED_STARTUPINFO_PRESENT/PROC_THREAD_ATTRIBUTE_JOB_LIST/CREATE_SUSPENDED` はOSがプロセス作成時にJobを設定する手法。MicrosoftはJOB_LISTがWindows10+/Server2016+で使用可能と説明する。ただし当該VMの階層/ACL/API返却/creator死/全rollbackをこれだけで証明しない。後割当方式へのsilent fallbackは禁止。
実装前に固定すべきもの:
1. M一つがC/D/Eを内包し、Job J作成・制限設定・handles所有・停止の責務を持つ。MはJ外、P/WはJ内。独立Rが先にenroll済みでなければlaunchしない
2. Job create / KILL_ON_JOB_CLOSE制限設定の返却、要求access bits、job祖先/階層・nested orderを明示。名前/PIDで無関係processへ操作しない
3. `InitializeProcThreadAttributeList` / `UpdateProcThreadAttribute(JOB_LIST)` / `CreateProcessW` の成功/失敗、作成した実process/thread handle、生成時刻、job membership、resume実結果を各別のreceiptへ。失敗時に復旧不明なら `UNCONFIRMED/BLOCKED`
4. `PROC_THREAD_ATTRIBUTE_HANDLE_LIST` 使用時、対象IPC handlesのみinherit可能 + `bInheritHandles=TRUE` を確認。Job handleは非継承かつリスト外。Job handle重複・漏れがあると最後のclose条件を満たさない可能性
5. creatorがAPI返却前・後、membership確認前・resume前に失われた場合、job内と未確認のprocessを区別。所属不明から「安全に回収済み」と認定しない。RのVM停止保証とは別の証拠
6. 観測できない親Job/ACL/Job limitまたは初回Job handle所有者が一致しない場合は作成・resumeを拒否。STOP ACK と EXIT と releaseは別状態
合成反例案: creator crash timing before/after create, JOB_LIST失敗、Job membership欠測、別incarnation/PID再利用、nested-job失敗、JOB handle意図しないinherit、last-handle-close未確認、resume失敗、STOP ACKのみ、他VM対象の停止要求。最初のfailからremaining BLOCKED。

## F. 実装と資格の承認境界（実装前審査で完了できる範囲）
**当審査で許容:** AK原本のread-only対照、上記P2-AL01の仕様補訂、新規docs/静的/mock契約・反例、source/expected set/approval matrix整備、別担当再レビュー。これらを現在の隔離branchにのみ記録し、原Vitestが起動しないかpush前に確認する。
**別の明示承認が必要:** C/D/E native source、A/B/F/G runtime、R management実装、build/依存導入、既存policy/workflow変更、実VM設定/認証/権限付与。
**引き続き禁止:** 実process/Job作成・停止、VM起動や強制停止、物理故障注入、有限資格試験、原Vitest/原停止・性能試験、PR44既存headへのpush、main merge、auto-merge。
**実装着手の受入基準:** P2-AL01補訂の独立静的レビューがPASS、A-G/Rのpath allowlistと責任主体が確定、原本/版/承認権限と実行禁止ゲートが固定されること。AK01/02の実世界閉鎖とその独立検証は資格開始前に別判定。VM/管理主体未取得なら本工程では `NO IMPLEMENT_ONLY APPROVAL` 継続。

## G. 保存する既知限界
AK28のGit移送PASSは実装保証ではない。旧P2-AK01/P2-AK02 OPEN、Windows隔離VM/R/ABI/管理ACL NOT_OBTAINED、物理A-G/R NOT_IMPLEMENTED、旧W/X failures、旧6本原票NOT_OBTAINED、根因UNKNOWN、実時間NOT_COMPARABLE、改善率NOT_TESTED、原Vitest原停止NOT_TESTEDを維持。
