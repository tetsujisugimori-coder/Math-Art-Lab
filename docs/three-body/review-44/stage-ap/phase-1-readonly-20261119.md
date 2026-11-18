# Stage AP 第1工程 — 実Windows・外部R・AK01/AK02 調査

**判定は PARTIAL。開発ホストの棚卸しと静的・mock 検証を完了。隔離VM・外部Rの実原票は NOT_OBTAINED、次工程は BLOCKED。AK01 は OPEN／回復保証 NONE、AK02 は OPEN／実体安全 UNKNOWN／物理検証 NOT_TESTED。**

## A. 調査対象と固定版

Issue #45、Draft PR #44。製品 HEAD `bca7eb3abedf51679eaffff2f8eaee15b86b5ab6`、tree `9ede8fb01acb4e45d5c81bd9a17a82709f916f1e`。正式設計ブランチの読み取り基点は `760928a85ceaec7272a67473c2bc9632cec1c552`、tree `f87b533781dd237214c98a2783edc0222343a5c8`。既存の Stage AO 正式保全 PASS と設計受入 YES を履歴として参照した。適用される AGENTS.md を確認済み。[Issue #45](https://github.com/tetsujisugimori-coder/Math-Art-Lab/issues/45)・[PR #44](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/44)・[Stage AN 現行判定](../stage-an/README.md)

| 参照 | 固定コミット | 主な参照原票 |
|---|---|---|
| AK | `1252a92d2cbdcaf3586922f94d5cfd13a4096fea` | [外部回復](../stage-ak/recovery-architecture.md)・[孤児化](../stage-ak/orphan-prevention.md) |
| AL | `f700e6705dd896037fe6e9d2241f0067fa35efdd` | [AK01/AK02 静的審査](../stage-al/ak01-ak02-preimplementation-review.md) |
| AM | `dff9bcdbaad05a9e5a37514cfc48a14e7a332a03` | [外部R](../stage-am/external-recovery-contract.md)・[Job](../stage-am/job-orphan-safety-contract.md)・[ABI](../stage-am/native-abi-requirements.md) |
| AN | 初版 `4252075c092280e2ccbf6b9f5e9fb7ac96044d91`、訂正 `bee889742a769bc0c5ca680dacec2e3d82d6b6cf` | [環境](../stage-an/environment.md)・[AK01](../stage-an/ak01-conditions.md)・[AK02](../stage-an/ak02-conditions.md)・[有限計画](../stage-an/finite-plan.md)・[実装ゲート](../stage-an/implementation-gate.md) |

## B. 実環境の取得結果

| 項目 | 状態 | 読み取り専用で得た結果／欠測理由 |
|---|---|---|
| 開発 Windows ホストと権限 | ACQUIRED | 2026-11-19 07:37 JST、CIM は Windows 11 Home、x64、build 26300、レジストリの UBR 9974。レジストリの `ProductName` は Windows 10 Home 表記。両原票を保存。PowerShell 5.1.26100.9818、通常所有者、Medium、Administrators は deny-only。Hyper-V Administrators の SID を実行トークンに観測せず、VM/R の権限は個別に未取得 |
| ローカル仮想化 | 一部 ACQUIRED、管理経路 NOT_OBTAINED | `HypervisorPresent=True`、`HvHost` Running。検出した `HypervisorPlatform` と `VirtualMachinePlatform` の `InstallState=2`（Disabled）。Hyper-V モジュール検索は空、`vmms` を観測せず、ローカル CIM `root\virtualization\v2` は `0x8004100E`（無効な名前空間）。Get-VM はモジュール欠測で未実施。確認した VirtualBox／VMware のローカル登録痕跡もなし。[Win32_OptionalFeature](https://learn.microsoft.com/en-us/windows/win32/cimwin32prov/win32-optionalfeature)・[Get-VM](https://learn.microsoft.com/en-us/powershell/module/hyper-v/get-vm) |
| 対象隔離VM・管理主体 | NOT_OBTAINED | 利用可能と確認できた候補は0。管理APIでVM一覧を取得できず、対象資産の存在・未配備は UNKNOWN。所有者の未配備確認があれば NOT_PROVISIONED。VM UUID、構成 Generation、回復世代／epoch、イメージ原本と SHA、チェックポイント・rollback 方針、guest OS build/UBR/arch、管理基盤の製品・版・識別子、閲覧権限を未取得 |
| 開発ホスト側のSDK・バイナリ | ACQUIRED | SDK 10.0.26100.0 に JOB_LIST 定義と x64 の Kernel32/UCRT ライブラリを確認。MSVC ツールセット 14.51.36231／14.44.35207 の cl/link、Kernel32/UCRT、Node の7バイナリを直接読み、PE x64・サイズ・SHA-256 を記録。Node 24.20.0、modules 137、N-API 10。PowerShell のハッシュ cmdlet 欠測は先行原票に保持し、Python の読取で補完 |
| 対象guestの Job/ABI・実体 | 環境 NOT_OBTAINED、動的な挙動 UNKNOWN | token/ACL/Job 祖先・limits、guestのSDK/CRT/コンパイラ・リンカ、構造体サイズ／アラインメント・呼出規約、DLL closure、実IPC、時計の主体／単位は未取得。A–G/R の実装バイナリは固定台帳上 NOT_IMPLEMENTED。開発ホスト採取値はホスト専用。[バイナリ台帳](../stage-an/binary-manifest.json) |

未指定のリモート環境や管理エンドポイントへの接続は NOT_TESTED。VM候補・管理主体と閲覧経路が未確定のため、そこで実環境調査を停止した。

## C. AK01 — 外部回復 R（OPEN、保証 NONE）

| 条件 | 必須の独立原票と受入基準 | 反例・拒否条件 |
|---|---|---|
| R 実体・権限・先行登録 | VM外管理ステーションまたはサービス、管理者と操作者、VM限定の既存読取・停止権限、認証の発行／失効、管理先の同定。VM UUID・image SHA・構成と回復世代・epoch を束縛した起動前の外部登録と消費 nonce 原票 | R がゲスト内、誤VM、古い世代、nonce再利用、権限失効、VM rollback が外部台帳も戻す |
| Mの停止／hang検知 | R 自身の単調受信時計、heartbeat sequence、最終受信点、検知理由と時計の頻度・単位を固定。M終了と M hang は別記。heartbeat 欠測なら検知経路を評価 | M内タイマー依存、通信断と M 終了の混同、起点の異なる時計の差引き |
| STOP と独立停止確認 | VM限定・認証済みの送信原票、管理API受付原票、受付後の同一VM・同一世代について独立読取経路で得た新鮮な停止状態を別記。guest EXIT、Job と VM資源の解放も別々に確認 | API受付のみ、古い status、世代不一致、強制電源断で guest EXIT・解放原票が失われる |
| R 故障・共通障害 | R／M の所在と、ネットワーク・管理面・電源・ホスト・ハイパーバイザー・保存系の依存関係を別経路から確認。手動コンソールの管理者と手動介入条件を別途固定 | R停止・hang、管理通信断、ホスト／管理面故障で観測と停止を同時に喪失。自動回復保証 NONE、残り BLOCKED |
| 永続保存と再取得 | ゲスト rollback 外にある、案件承認済みの永続先への原票・receipt、保存時刻・SHA・通番、書き手と独立した読取経路での直接再取得 | 保存中断、書き手しか読めない、存在確認のみ、receipt欠測または世代不一致 |

既存証拠は設計原票と純粋契約。Rの実体・管理主体・権限・検知・停止経路・独立状態観測・永続先はすべて NOT_OBTAINED。共有故障範囲は UNKNOWN。手動介入を有限自動回復に算入しない。[Stage AN のAK01条件](../stage-an/ak01-conditions.md)

## D. AK02 — 生成時 Job 所属と生成者消失（OPEN）

- 仕様上の候補は `CreateProcessW` に `STARTUPINFOEXW`、`EXTENDED_STARTUPINFO_PRESENT`、`PROC_THREAD_ATTRIBUTE_JOB_LIST`、`CREATE_SUSPENDED` を使う方式。Microsoft の JOB_LIST 対応条件は Windows 10／Windows Server 2016 以降。順序付き Job リスト、寿命が有効な属性バッファ、対象guestの階層・limits・権限と実 API 結果を証拠化する。生成後の `AssignProcessToJobObject` への fallback は禁止。生成中の消失や部分失敗の原子的ロールバックは未証明。[UpdateProcThreadAttribute](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute)・[CreateProcessW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)・[生成時 Job 所属](https://devblogs.microsoft.com/oldnewthing/20230209-00/?p=107812/)・[Nested Jobs](https://learn.microsoft.com/en-us/windows/win32/procthread/nested-jobs)
- M（J外）が新規の空 Job J を所有する設計。作成・limits 設定・ACL／最小権限を個別に確かめ、Job handle は非継承で IPC allowlist の外。実際の所有者、継承・複製・別名と最終 close を追跡する。最後の handle が残る反例では `KILL_ON_JOB_CLOSE` による終了を証明できない。作成 API 成否、子の起動個体と保持した process/thread handle、特定Jへの `IsProcessInJob` の API 戻り値と出力 BOOL、`ResumeThread` の旧カウント1を別々に記録。未確認・不一致・失敗で進行を止める。[Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)・[IsProcessInJob](https://learn.microsoft.com/en-us/windows/win32/api/jobapi/nf-jobapi-isprocessinjob)・[ResumeThread](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-resumethread)
- 生成者消失の8境界は Job 前、limits 後、Create 中、Create 戻り、所属確認前、所属確認後／Resume 前、Resume 中、Resume 後。各境界で子の有無、所属、handle 所有、停止可能性、残存状態の原票を要求する。Create 中に原票が取れなければ UNKNOWN。反例は PID 再利用、途中失敗、非対応OS／Job階層、handle 漏れ、Resume失敗、STOP受付のみ。プロセス EXIT は同じ個体を指す保持 handle の独立した終了観測と exit code、資源解放は Job と process/thread handle 等の所有・最終 close と残存の別原票を要する。実挙動は UNKNOWN、取得原票なし、物理検証 NOT_TESTED。[Stage AN のAK02条件](../stage-an/ak02-conditions.md)・[WaitForSingleObject](https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-waitforsingleobject)

## E. 静的検証・独立レビュー・証拠保全

固定 AM/AN の純粋 reducer と同一版の fixture を直接呼び出す mock **25/25 PASS**。対象は API受付のみ、nonce再利用、対象ID・世代・epoch不一致、M/R/管理経路の故障・rollback、保存／再取得失敗、handle漏れ・不適合階層・Resume失敗・PID再利用、生成者消失8境界、時計ドメイン混在。判定は合成入力の範囲に限る。実プロセス／Jobの生成、実VM操作、STOP、故障注入、原停止試験は NOT_TESTED。

別の新規 Codex CLI セッションがローカル原票10件のサイズ・SHA-256を再計算して固定台帳と照合し、mock 参照4ファイルを固定Git版と照合した。独立静的レビューは第1工程の範囲で受入可、阻害所見なし。独立性は同一所有者・ホストでの別セッションに限り `LIMITED_SHARED_OWNER`。ローカル原票台帳の SHA-256 は `79c286d55c22ed14886eb4cccefddd426700d8ff5c5213b3b0e1f69cf3988769`。

証拠を中央規約 v0.2.0 採用版 `4695c3ce2d61e66df0dd36a4312373459e1557d4` に沿って固定。Windows・mock の原票は Level 2 としてローカル専用領域に原バイト・サイズ・SHA-256・時刻・実行主体・コマンド・stdout/stderr/exit を保持。調査結果への影響と権限・機器識別子を含む原票の閲覧範囲に基づく分類。公開する報告文書は Level 1。Stage AP の正式な永続先・保持条件の承認記録は NOT_OBTAINED。そのため AP 原票の正式 CUSTODY_STATUS は BLOCKED、承認保管先からの VERIFICATION_STATUS は NOT_TESTED、ACCEPTANCE_STATUS は BLOCKED。[中央規約](https://github.com/tetsujisugimori-coder/git-preservation-gate/blob/4695c3ce2d61e66df0dd36a4312373459e1557d4/docs/v0.2.0/policy.md)

## F. 次工程と必要な所有者判断

1. 使い捨て隔離VMと管理主体、外部Rの実体と管理主体、既存の読み取り経路・権限を対象限定で指定する。未配備なら所有者がその状態を確認する。VM UUID・イメージ・guest OS・世代と、Rの管理権限および共有障害を先に独立確認する。
2. AP 原票の永続先・保持起算と期限・独立読取主体を承認し、receipt と再取得結果を残す。R運用原票については、ゲスト側の rollback を跨いで保存できる経路と独立読取を別途固定する。
3. 実装限定の可否は、VM/R/ABIの実体・権限、経路・所有者、対象 HEAD/tree と許可パス、独立レビュー、真正な対象限定承認で再判定する。現時点の `IMPLEMENT_ONLY` は承認 NO。資格試験 `QUALIFICATION_RUN` は別の有限計画・安全実証条件・別承認で判定し、現時点は BLOCKED。[実装ゲート](../stage-an/implementation-gate.md)

## G. 総合判定

Stage AP 第1工程 PARTIAL、対象VM／Rの証拠取得と次工程は BLOCKED。既定枠は 5,000／30,000／90,000 ms、既定8スロット順、各≤10,000 ms、再試行・代替0。初回失敗で後続スロットを止める。キャンペーン時計は準備から最終確認までを覆い、間隙・保存・独立再取得・後処理を含む。実環境の総枠と故障時の有限回復は NOT_PROVEN。PR #44 は Open／Draft、Stage AN 総合 PARTIAL。[有限計画](../stage-an/finite-plan.md)
