# Stage AP 第2工程B — 実Windows・隔離VM・外部Rの読み取り専用再調査

**総合 PARTIAL。開発Windowsホストの一部を直接確認。分岐Dを適用し、隔離VMと外部Rの配備有無は `UNKNOWN`、実体・管理主体・実効権限の原票は `NOT_OBTAINED`、実体確定は `BLOCKED`。AK01 回復保証は `NONE`。AK02 実体安全は `UNKNOWN`、物理検証は `NOT_TESTED`。**

## 1. 対象と固定版

| 対象 | 開始時に確認した内容 |
|---|---|
| 文書 Draft PR #46 | Open／Draft、`codex/stage-ap-01-readonly-20261119`、HEAD `e320a400ce75454a595034dec6e3002c9adbd70c`、tree `0dd46dc385b5492fb1021ee5be4478c93fbe84ca`、parent `3c98d7d8c65c36e4d5bda91b728b2cff386059e3` |
| 製品 Draft PR #44 | Open／Draft、`feat/017-three-body-dance`、HEAD `bca7eb3abedf51679eaffff2f8eaee15b86b5ab6`、tree `9ede8fb01acb4e45d5c81bd9a17a82709f916f1e` |
| 開始時の割当作業ツリー | clean、detached HEAD `9167e979b3c954e355d67c2b80e01dc4e733d8cc`、tree `2e12fd02349d3307f9d2d3eb8527b7bd570b893a`。管理branchは別の既存作業ツリーにあり、ローカルHEADは `31463c71d2ab96799a7fe29f4ae5dd2511fa32dc`、tree `9238a52c3dcdac3fdbf353c692f1e71a212f9b93`、読取時clean。GitHubでは同branchがその2コミット先にあったため、指定HEADを取得した別のcleanなチェックアウトを提出に使用 |
| 読み取り範囲 | GitHub上のIssue #45と会話、PR #44/#46の概要・会話と関連レビュー、Stage AP第1工程・第2工程A/B、Stage AN/AM設計、中央規約の採用版、指定Windowsホスト上の標準読み取り経路 |

第2工程Bの初回はGitHub資料による調査で、この追補は実Windowsでの追加観測を記録する。第1工程および第2工程A/B初回のファイルは当時の記録として参照した。[Issue #45](https://github.com/tetsujisugimori-coder/Math-Art-Lab/issues/45)・[Draft PR #46](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/46)・[Draft PR #44](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/44)・[第2工程B初回](phase-2b-vm-r-inventory-20261119.md)・[初回レビュー](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/46#pullrequestreview-5967942408)

## 2. 実Windowsの直接観測と第1工程との差分

実行主体は通常権限のCodex CLI用Windowsサンドボックスアカウント `CodexSandboxOffline`。Windows PowerShell 5.1.26100.9818を使用。2026-11-19 10:34:39〜10:37:43 JST（ホストの時計）に読み取った。第1工程は通常所有者のMediumトークンで、Administratorsはdeny-onlyだった。今回のトークンもMediumで実効Administratorsはfalse、AdministratorsとHyper-V Administratorsのグループは出力に現れず、`whoami /priv` が返した特権は `SeChangeNotifyPrivilege`（Enabled）の1件。昇格は実施していない。

| 項目 | 今回の結果 | 第1工程との差分 |
|---|---|---|
| OS edition/build/UBR/architecture | ローカルレジストリで `EditionID=Core`（Home）、`ProductName=Windows 10 Home`、`DisplayVersion=26H2`、`InstallationType=Client`、build `26300`、UBR `9974`。ランタイムでOS・PowerShellプロセスとも X64、OS Version `10.0.26300.0` | build／UBR／x64とレジストリ製品名は一致。第1工程のCIM captionはWindows 11 Home。今回のCIM captionはアクセス拒否で `NOT_OBTAINED` |
| ホスト仮想化 | `HvHost` はSCMで RUNNING。仮想化・`Vid` のレジストリ登録あり。CIM、WMIおよび `systeminfo` の読取が拒否され、`HypervisorPresent`、CPUの仮想化属性、Hypervisor Platform／Virtual Machine Platformほかの機能有効状態は `NOT_OBTAINED` | `HvHost` の稼働は一致。第1工程の `HypervisorPresent=True` と2機能のDisabledは当時の観測。今回の直接再取得は欠測 |
| Hyper-V管理 | 可視のモジュールなし。SCMで `vmms`・`vmcompute` は `1060`。ローカルCIM管理名前空間は `0x8004100E`。管理コンソール／VMConnectは既定位置で未検出。ローカルVM一覧取得は失敗 | 第1工程のHyper-Vモジュール未検出、`vmms` 未観測、無効な管理名前空間と整合 |
| VirtualBox／VMware等 | 可視のコマンド、既定実行ファイル、対象HKLM登録、HKLMの32/64-bitアンインストール登録、指定サービスに該当なし。現トークンのプロファイル下の所定VM台帳は未検出。PATHから確認できた候補のコマンドは `wsl.exe` のみ。現プロファイルのWSL登録キーは未検出 | VirtualBox／VMwareの可視登録未検出は従前と整合。SCM、可視コマンド、現プロファイルの確認を追加 |
| 管理主体・台帳・権限 | リポジトリの既知のAP・AN/AM資料、Issue・PR・レビュー、Stage APのIssue/PR検索、指定のホスト側読み取り範囲から、対象VM/Rの管理者による資産台帳、既存の委任、管理URL、対象VMのロールを取得できず | 第1工程・第2工程B初回の欠測が続いている。ローカルのSCMおよびレジストリの照会権を取得できた |

この表の観測対象は開発側Windowsと当該実行主体。対象guestの識別子、OS、ABI、Job階層、tokenを取得した行はない。[第1工程](phase-1-readonly-20261119.md)・[Stage ANの環境台帳](../stage-an/environment.md)

### コマンド・出力台帳（非機密要約）

以下の時刻はすべて2026-11-19 JST、実行主体は上記と同じ。標準出力はフィールド投影または集計、標準エラーはメッセージ・分類・コードの要約。空欄相当を `∅` で示す。PowerShell cmdletにはプロセス終了コードがないため、捕捉した照会結果を `q=0`（完了）／`q=1`（エラー）で記録した。ネイティブコマンドは観測した `$LASTEXITCODE` を記載する。

| ID・時刻 | 実行した読み取り | stdout（投影） | stderr／終了 |
|---|---|---|---|
| H01 10:34:39.025 | `Get-CimInstance -ClassName Win32_OperatingSystem` | ∅ | PermissionDenied、`0x80041003`、q=1 |
| H02 10:34:39.211 | `Get-ItemProperty -LiteralPath 'HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion'` | `Core`、`Windows 10 Home`、`26H2`、`Client`、`26300`、`9974` | ∅、q=0 |
| H03 10:34:39.234 | `WindowsIdentity.GetCurrent()`、`WindowsPrincipal.IsInRole(Administrator)`、`whoami.exe /groups /fo csv /nh`、`$PSVersionTable.PSVersion`、`Get-UICulture` | `CodexSandboxOffline`、Admin=false、Medium、対象2グループ観測なし、PS 5.1.26100.9818、ja-JP | ∅、q=0、whoami exit 0 |
| H04 10:34:39.290 | `Get-CimInstance -ClassName Win32_ComputerSystem`、続けて `Win32_Processor` を照会するブロック | ∅、先行照会の失敗でCPU照会未到達 | PermissionDenied、`0x80041003`、q=1 |
| H05 10:34:39.303 | `Get-Module -ListAvailable -Name Hyper-V` | ∅ | ∅、q=0 |
| H06 10:34:39.319 | `Get-CimInstance -ClassName Win32_Service -Filter <対象サービス名のOR>` | ∅ | PermissionDenied、`0x80041003`、q=1。補助H14あり |
| H07 10:34:39.322 | `Get-CimInstance -ClassName Win32_OptionalFeature -Filter <Hyper-V・WHP・VMP・WSL・Containers>` | ∅ | PermissionDenied、`0x80041003`、q=1 |
| H08 10:34:39.336 | `Get-CimClass -Namespace 'root\virtualization\v2' -ClassName Msvm_ComputerSystem` | ∅ | MetadataError、`0x8004100E`（無効な名前空間）、q=1 |
| H09 10:34:39.342 | `Get-CimInstance -Namespace 'root\virtualization\v2' -ClassName Msvm_ComputerSystem -Filter "Caption='Virtual Machine'"` | ∅、一覧未取得 | MetadataError、`0x8004100E`、q=1 |
| H10 10:34:39.350 | `Get-Command -Name <Hyper-V・VBox・VMware・WSL・Docker・Podman・az・aws・gcloud・govc> -ErrorAction SilentlyContinue` | `wsl.exe`（Application） | 未解決名の出力を抑制、q=0 |
| H11 10:34:39.783 | `Test-Path -LiteralPath <Oracle/VMware製品とApp PathsのHKLMキー>`、`Get-ItemProperty -Path <Uninstall各ルートの子> -ErrorAction SilentlyContinue` | 製品・App Pathsの指定8キーはfalse、該当アンインストール名なし | 未解決パスの出力を抑制、q=0。補助H18あり |
| H12 10:34:40.017 | `Test-Path -LiteralPath <既定の管理ツール・VM台帳・WSL登録>` | `virtmgmt.msc`、`vmconnect.exe`、`VBoxManage.exe`、`vmrun.exe`、既定Hyper-V VM構成ディレクトリ、現プロファイルの `VirtualBox.xml`、`inventory.vmls`、`HKCU\…\Lxss` はfalse | ∅、q=0 |
| H13 10:35:33.280 | `RuntimeInformation.OSArchitecture`、`RuntimeInformation.ProcessArchitecture`、`Environment.Is64BitOperatingSystem`、`Environment.OSVersion` | X64、X64、true、10.0.26300.0 | ∅、q=0 |
| H14 10:35:33.358 | `sc.exe query <サービス名>`（各名を個別に照会） | `HvHost` RUNNING。下記の他12件はSCMの `1060` | ∅。HvHost exit 0、他12件は各exit 1060 |
| H15 10:35:33.527、10:36:59.452 | `Get-WmiObject -Class Win32_ComputerSystem -Property HypervisorPresent` | ∅ | GetWMIManagementException、再照会で `AccessDenied`、q=1 |
| H16 10:35:33.589、10:36:59.560 | `Get-WmiObject -Class Win32_OptionalFeature -Filter <Hyper-V・WHP・VMP・WSL>` | ∅ | GetWMIManagementException、再照会で `AccessDenied`、q=1 |
| H17 10:35:33.597 | `whoami.exe /priv /fo csv /nh` | `SeChangeNotifyPrivilege` Enabled 1件 | ∅、exit 0、q=0 |
| H18 10:35:33.619 | `Get-ChildItem -LiteralPath <Uninstallルート>` と `GetValue('DisplayName')` | HKLM 32/64-bit両方に該当名0件。現プロファイルのHKCUパスは未検出 | ∅、q=0 |
| H19 10:36:20.893、10:36:59.441 | `pwsh.exe -NoLogo -NoProfile -NonInteractive -Command <X86Base.CpuId(1,0)のECX bit31投影>`、`Test-Path -LiteralPath <ProgramFiles>/PowerShell/7/pwsh.exe` | 先行起動なし、既定パスfalse | `ResourceUnavailable`／ファイルアクセス不可、先行シェルexit 1。後続パス照会完了 |
| H20 10:37:21.085、10:37:43.153 | `systeminfo.exe /FO LIST` | 仮想化の該当行 ∅ | `ERROR: Access denied`、各exit 1 |
| H21 10:37:21.447 | `Test-Path -LiteralPath <VirtualizationおよびServices下の対象キー>` | `Virtualization`、`HvHost`、`Vid` はtrue。 `vmms`、`vmcompute`、`WinHvPlatform` はfalse | ∅、q=0 |

H14のexit 1060は `vmms`、`vmcompute`、`hns`、`VMAuthdService`、`VMwareHostd`、`VBoxSDS`、`VBoxDrv`、`VBoxSup`、`com.docker.service`、`WslService`、`LxssManager`、`ServerManagementGateway`。この結果が及ぶのは照会したサービス名とローカルSCM。未取得の各管理環境の状態は `UNKNOWN`。

## 3. VM候補と外部R、管理権限

| 優先 | 対象 | 結果 |
|---|---|---|
| C1 | 別の既存管理ホスト上の隔離Windows VM | `UNKNOWN`。管理者による資産指定、台帳、管理ホストおよび既存閲覧ロールが `NOT_OBTAINED`。対象外ホストの探索・接続は実施せず |
| C2 | 既存の管理サービス付き隔離Windows VM | `UNKNOWN`。サービス、契約範囲、資産ID、管理主体、既存の閲覧ロールが `NOT_OBTAINED` |
| C3 | 開発Windows上のローカルVM | `UNKNOWN`。ローカルCIM管理経路が無効で一覧未取得。他製品も照会範囲内で管理経路未特定。開発ホストとの共通故障リスクがあるため安全実証用の採用対象外 |
| R | 対象guestの外から停止を管理する回復コントローラー | `UNKNOWN`。実行場所・管理者・運用責任者・guest外の配置・対象VMとの束縛・閲覧/STOPの権限・停止管理APIを示す既存実体原票はいずれも `NOT_OBTAINED` |

VMの所有者・管理主体、UUID、構成generationと回復epoch、hypervisor製品・版・管理基盤識別子、guest OS edition/build/UBR/architecture、imageの出所と原本SHA-256、snapshot/rollback方針、VM単位の実効閲覧権限、最新の電源状態を確認する既存の閲覧APIは全件 `NOT_OBTAINED`。正規管理主体が確認した範囲・日時・根拠付きの未配備証明は取得できず、`NOT_PROVISIONED` の判定条件は未充足。

Rについて、認証方式の概要、VM単位のread/status・STOPロールと実効権限、状態の鮮度・世代・取得経路、管理ネットワーク・電源・管理ホスト・hypervisor・認証基盤・保存先の依存関係、R停止／hangまたは管理面故障時に利用できる独立回復経路、原票保存・独立再取得の経路が未取得。共通故障の範囲は `UNKNOWN`、Rおよび管理基盤故障時の自動回復保証は `NONE`。管理API受付は要求の受理を示す段階で、実停止の判定には同一UUID・generation・epochの新鮮な状態を独立した閲覧経路で取得する条件が残る。認証情報・トークン・秘密鍵の取得なし。実STOP・実VM停止確認は `NOT_TESTED`。[Stage AM 外部R契約](../stage-am/external-recovery-contract.md)・[Stage AN AK01条件](../stage-an/ak01-conditions.md)

## 4. AK01・AK02の不足原票

### AK01 — OPEN、RECOVERY_GUARANTEE=NONE

| 段階 | 必要な証拠と現状 |
|---|---|
| Rの実体と権限 | guest外のR、管理主体、VM限定の実効ロール、起動前登録、UUID・image・generation・epoch、rollback外での消費nonceと失効確認。実原票 `NOT_OBTAINED` |
| heartbeat | R側の単調受信時計と単位、通番・最終受信・検知理由、M終了／hang／通信断の区別。原票 `NOT_OBTAINED`、実観測 `NOT_TESTED` |
| STOP要求 | 対象と世代に束縛された認証済み要求・送信記録。実権限 `NOT_OBTAINED`、送信 `NOT_TESTED` |
| API受付 | 受付応答、相関ID、同一対象との照合。APIと原票 `NOT_OBTAINED` |
| 独立した新鮮なVM停止状態 | 受付後に別の既存読取経路で得た同一VM・同一世代の観測日時と実電源状態。経路と原票 `NOT_OBTAINED`、実停止 `NOT_TESTED` |
| guest process EXIT | 保持handleで同一の起動個体の終了・exit codeを独立に観測。原票 `NOT_OBTAINED`、実測 `NOT_TESTED` |
| 資源解放 | Job／process／thread handleの最終close・残存、VM資源の解放を個別確認。原票 `NOT_OBTAINED`、実測 `NOT_TESTED` |
| 保存と再取得 | guestのrollback範囲外にある承認済み保存先、receipt、原bytes、独立閲覧経路。既存Rに紐付く原票 `NOT_OBTAINED` |

R自身が故障した場合の独立した自動回復経路が確認できるまで、有限自動回復は `NOT_PROVEN`。別権限の手動コンソール介入は自動回復の時間枠に算入しない。[外部R契約](../stage-am/external-recovery-contract.md)・[有限計画](../stage-an/finite-plan.md)

### AK02 — OPEN、PHYSICAL_SAFETY=UNKNOWN、NOT_TESTED

- Microsoftの仕様で `PROC_THREAD_ATTRIBUTE_JOB_LIST` はWindows 10／Windows Server 2016以降。候補は `CreateProcessW` に `STARTUPINFOEXW`、`EXTENDED_STARTUPINFO_PRESENT`、生成時 `JOB_LIST` と `CREATE_SUSPENDED` を指定する構成。対象guestの実OS・ABI・SDK/CRT/DLL closure・API対応・現tokenは `NOT_OBTAINED`。公開仕様は対象guestでの生成時封じ込めや部分失敗時の原子性を証明しない。[UpdateProcThreadAttribute](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute)・[CreateProcessW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw)
- 既存Job祖先と順序、limits、ACL、breakaway条件、Jの所有者と `KILL_ON_JOB_CLOSE`、非継承、複製・別名、最後のhandle closeを確認する。作成API結果、原childの生成個体、特定Jへの所属、Resumeを別原票にする。現時点は `NOT_OBTAINED`。生成後の `AssignProcessToJobObject` へのfallback禁止を維持。[Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects)・[Nested Jobs](https://learn.microsoft.com/en-us/windows/win32/procthread/nested-jobs)・[Stage AM Job契約](../stage-am/job-orphan-safety-contract.md)
- 生成者消失の8境界は **Job作成前、limits設定後、CreateProcess内、Create戻り、所属確認前、所属確認後・Resume前、Resume内、Resume後**。全境界の孤児process有無は `UNKNOWN`、物理検証は `NOT_TESTED`。生成中の消失では所属・原子性が欠測なら `UNKNOWN` を維持。PID再利用の可能性を除ける保持handleで原process EXITとexit codeを同定し、Job／process／thread handleその他の資源解放を独立確認する。今回この原票は未取得。[Stage AN AK02条件](../stage-an/ak02-conditions.md)

## 5. 保全・監査と所有者の次判断

| 対象 | CUSTODY_STATUS | VERIFICATION_STATUS | INDEPENDENCE_STATUS | ACCEPTANCE_STATUS |
|---|---|---|---|---|
| 第1工程の固定10件・79,422 bytes | PASS | PASS | LIMITED_SHARED_OWNER | PASS |
| 今回のWindowsコマンド原票（Level 2相当の実測・エラー原出力） | BLOCKED | NOT_TESTED | BLOCKED（承認先からの別経路再取得なし） | BLOCKED |

第2工程Aの承認は固定10件の対象、分類、保存先、操作範囲、保持・削除条件を特定している。今回の原出力は権限・機器識別などを含み得る実環境観測で、その固定集合の外。新規の正式保存、転送、原bytesの固定、独立再取得は未実施。上記の公開用Level 1報告には調査結果の非機密要約を記載し、生のトークン出力、機器識別情報、非公開経路を含めていない。この報告のGitHub再取得は文書の読戻しで、Level 2原票の保全監査は別途未実施。[第2工程Aの保全報告](phase-2a-custody-20261119.md)・[中央規約v0.2.0](https://github.com/tetsujisugimori-coder/git-preservation-gate/blob/4695c3ce2d61e66df0dd36a4312373459e1557d4/docs/v0.2.0/policy.md)・[承認再利用条件](https://github.com/tetsujisugimori-coder/git-preservation-gate/blob/4695c3ce2d61e66df0dd36a4312373459e1557d4/docs/v0.2.0/authorization-and-rescue.md)

1. 所有者または所管管理者がC1を優先し、必要ならC2から候補1台と対になる外部Rを指定する。管理主体、資産台帳の範囲・確認時刻、既存のVM単位read-only経路と実効ロール、Rの運用担当・管理権限仕様・独立状態閲覧経路を提示する。未配備を回答する場合は、確認主体・対象台帳範囲・日時・根拠原票を提示する。
2. 新規実環境原票の永続保存が必要なら、対象・分類、保存先、操作者と許可操作、ACL・独立読取主体、保持起算と期間、移動／削除条件を案件別に承認する。その後、承認範囲の読み取りを改めて実施し、保存receipt・サイズ・SHA-256・全バイト照合を記録する。R運用原票の保存について、guest rollbackの影響を受けない経路を確認する。
3. 分岐Dのため未配備時の比較・費用見積りを伴う構築設計案は条件未成立。VMだけ確認されRの不存在が正式に確認された場合はR設計を別工程にする。VM・Rとも正式に未配備と確認された場合は、環境候補、費用、権限、共通故障境界を比較する設計を別工程で行い、構築・設定には別承認を要する。
4. **`IMPLEMENT_ONLY=NO`、`QUALIFICATION_RUN=BLOCKED`**。VM/Rの操作、STOP、Job・試験用process生成、物理故障注入、性能・資格試験は `NOT_TESTED`。従前の有限計画（5,000／30,000／90,000 ms、既定8スロット、各10秒以内、再試行0）の実環境での成立は未証明。[実装ゲート](../stage-an/implementation-gate.md)・[有限計画](../stage-an/finite-plan.md)
