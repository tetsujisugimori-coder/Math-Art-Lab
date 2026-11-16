# Stage AL — 安全な成果公開経路と物理実装承認境界（PLAN_ONLY）
2026-11-16 JST / PR #44 / Issue #43

## 0. 結論と変更制約
**総合 PARTIAL。提出計画の静的監査は限定PASS。AK28原本のGit版固定はBLOCKED／原バイト未取得。物理実装・実行・原Vitest・資格試験は未承認。**
この文書だけを、既存PR headと異なる隔離branch `codex/stage-al-publication-plan-20261116` に保存する。PR #44、main、既存workflow/policy/依存/製品/原テストを変更しない。新規PR、merge、workflow_dispatch、rerun、AK成果の代理生成は行わない。

基準PR #44: `feat/017-three-body-dance`, HEAD `bca7eb3abedf51679eaffff2f8eaee15b86b5ab6`, tree `9ede8fb01acb4e45d5c81bd9a17a82709f916f1e`, Draft。レビュー: https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/44#pullrequestreview-5920066214

## 1. 既存18 workflowの静的起動監査
固定HEADの `.github/workflows/` にある18本を個別に取得した。17本は `pull_request: branches: [main]` のみ。1本 `deploy-pages.yml` は `pull_request: [main]`, `push: [main]`, `workflow_dispatch` を受ける。確認範囲で `pull_request_target`・`workflow_run`・`create`・他branchを対象とするpush・scheduleの定義なし。リポジトリrulesets一覧は0件（閲覧できた範囲）。
- PR #44 の既存head `feat/017-three-body-dance` を更新すると、Pages Validateがpaths制限なしで起動する。同workflowの `Unit tests: npm test` は条件なし、`package.json` では `npm test = vitest run src`。ブラウザー禁止用 `if` はこのstepを守らない。既存Pages run 43852850574でも Unit testsは成功実行、browser E2Eはskip。
- 従ってPR #44 head・mainへのpush/merge、PR #44のbase変更、workflow再実行をこの工程で行わない。`[skip ci]` 等の無検証回避策は禁止。
- この隔離branchにはmain向けPRを作らない。現行18 YAMLのイベント条件に限れば、このbranchへのdocs新規commitは上記Unit testsを起動しない。**外部アプリ/webhook、後日のworkflow変更、API権限制約を含めた一般的な非起動保証ではない**。実操作後にrun一覧とPR headを再取得し、想定外起動があれば即HOLDする。
- 将来AK28原本をGitに掲載する候補はこの別branchへのbyte-for-byte移送である。PR #44への取込みやmain向けPRは原Vitest許可/保護条件の別承認まで禁止。追加PRが必要ならbase/headとworkflowの条件を再固定して審査する。

## 2. AK原本・Git版固定の成立条件
AKはlocal未commitの新規28ファイルであり、このGitHubセッションからWindows `C:\Users\tetsu\Dev-Artifact-Archive\Math-Art-Lab\PR-44\Stage-AK-20261116\` のraw bytesを取得できない。基準Git treeに `docs/three-body/review-44/stage-ak/` と `src/three-body-stage-ak.test.js` は未収録（404）。**原本取得やハッシュ再計算、Git版固定の完了を宣言しない。**
報告値の照合ターゲット（未独立再検証）:
- snapshot source manifest SHA256 `c2db6be693ce9b9c5eaf9fdf91fa6330cf3ab0d6927a60de62620647469d64fb`
- `01-local` 116 payload、`02-submission` 135 payload、最終manifest SHA256 `a324d1b5114397778ff7d252af0306f2482af446fd0b27a36b6b21bf77eb636d`
- 変更対象: `docs/three-body/review-44/stage-ak/` 23ファイル、`tools/three-body-stage-ak-{contract,audit,fixtures,tests.config}.mjs`、`src/three-body-stage-ak.test.js`。既存tracked差分なし。
成立基準: 取得元原本とGit掲載rawをファイル集合、path、size、SHA256、Git blob、tree、manifest自身で独立プロセス比較し、rawと最終receiptを保全。欠落・不一致・読み戻し不可はBLOCKED/FAIL。元の保管物は削除・上書きしない。Windows保存の報告だけからGit SHAを推定しない。28ファイルの原バイト取得なしで掲載しない。

## 3. 物理実装限定の承認境界（現時点 APPROVAL_MISSING）
Stage AKで固定されたA〜G七部品とguest外の回復主体Rのみを将来の「実装限定」審査対象とする。ただし、AK原本が見られない現状では各pathの正確なallowlistと固有ABI契約をこちらから再認証できないため、実装許可を出さない。
候補の後続承認は以下を**別々に**明示すること:
1. `PUBLICATION`: AK28の原本を隔離branchへ転送・独立照合する許可。既存PRへのpush/mergeを含めない。
2. `IMPLEMENT_ONLY`: 実ファイルの変更path、固定版、native compiler/SDK/runtime/ABI、VM image/UUID、アカウント/ACL、R責任者と管理経路を指定したうえで、物理部品の**コード実装のみ**を許可。プロセス起動やJob操作は許可しない。
3. `QUALIFICATION_RUN`: AK01/02独立閉鎖審査、使い捨てWindows VM、有限試行数/clock/timeout/故障時STOP・保存が成立後、具体的試行IDを別途承認。
4. `ORIGINAL_VITEST_OR_STOP`: 原Vitest実行・原停止・性能計測を独立に承認。上記三承認から自動付与しない。

## 4. 独立閉鎖審査の入口と反例
**P2-AK01 外部回復R**: VM/Hypervisorの識別とcapability、guest/monitorとは独立した管理権限・時計・ledgerを原証拠と結び付ける。停止命令・受付・対象VM実停止・guest終了・資源解放・保存永続化を分割。guest通信断/kernel hang/monitor hang/R経路障害/管理権限拒否を区別。管理経路の成立が未証明なら保証NONE。
**P2-AK02 Job孤児化**: creation-time Job list/API仕様だけで安全成立とはしない。creator喪失タイミング、割当直前/直後、nested Job、権限/ハンドル喪失、所有者/M実体、creation identity、未所属processと資源解放の証拠を要求。KILL_ON_JOB_CLOSEで未所属processの保護を主張せず、PID名kill/無関係process停止/暗黙のhandle継承は禁止。
独立レビューにGit HEAD/tree・物理バイナリSHA/source-to-binary receipt・ABI/依存DLL・VM/権限・syntheticとphysical原票の区別を要求。UNKNOWN/NOT_OBTAINED/NOT_TESTEDをPASSに昇格しない。

## 5. 当工程の受入結果・次の停止点
- 既存18 workflowとPages・package定義: **STATIC_VERIFIED**。
- 新しい隔離branchの利用: **PLAN-ONLY**, ユーザーの既存PR headは不変。新しいPR作成なし。
- AK28原本 Git版固定: **BLOCKED_SOURCE_NOT_ACCESSIBLE**。
- AK01 / AK02: **OPEN**。
- VM/R/ABI実物: **NOT_OBTAINED**、物理7部品: **NOT_IMPLEMENTED**。
- 実装承認: **APPROVAL_MISSING**、資格: **BLOCKED**、原Vitest: **NOT_TESTED**。
- 旧W/X failure、旧原本欠落、根因UNKNOWN、実時間NOT_COMPARABLE、性能改善率NOT_TESTEDを保持。PR #44 Draft/merge NO。
