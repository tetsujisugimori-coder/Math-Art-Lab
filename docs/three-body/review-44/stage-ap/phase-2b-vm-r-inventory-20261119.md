# Stage AP 第2工程B — 隔離Windows VM／外部Rの実体候補調査（初回、GitHub原票による読み取り専用）

**現行判定（2026-11-19 JST）：PARTIAL／実VM候補の実体確定 BLOCKED／外部Rの実体確定 BLOCKED／物理実行 NOT_TESTED。VM/R原票 NOT_OBTAINED、配備有無 UNKNOWN。**

> この記録は GitHub に存在する第1工程の読み取り専用取得原票と固定設計資料を独立して再読した結果である。今回の接続から所有者の開発Windows、仮想化管理画面、VM、外部R、管理API、資産台帳、権限情報へは直接アクセスできなかった。以下の「取得済み」は**第1工程の既存原票の再読**を指し、第2工程Bで現物を新規取得したことを意味しない。

## 対象と変更禁止境界

- リポジトリ：`tetsujisugimori-coder/Math-Art-Lab`、Issue #45、文書 Draft PR #46（`codex/stage-ap-01-readonly-20261119`）。調査起点の文書HEAD `31463c71d2ab96799a7fe29f4ae5dd2511fa32dc`、第1工程固定HEAD `16a9f698d7333337a8a35d67c984fa22fa0be573`／tree `2bd6b2affb49ba0314d7dbb11375c44e8e14888b`。製品 Draft PR #44 の固定HEAD `bca7eb3abedf51679eaffff2f8eaee15b86b5ab6`。
- 第1工程 Level 2 原票10件（79,422 bytes）は Stage AP 第2工程A で保存・別CLI再取得照合済みの `PASS`。保存先での再保存・上書き・移動・削除は行わない。詳細は [第2工程Aの保全報告](phase-2a-custody-20261119.md)。
- 許可範囲：GitHub掲載済みの設計、既存原票の読み取りと、文書への追記のみ。Windows・VM・外部Rの新しい実機操作を行わない。
- 未承認操作：VM作成／起動／停止／snapshot、管理APIへのSTOP、Job/process生成、ACL・権限・credential・設定の変更、故障注入、性能・資格試験。実装承認 `IMPLEMENT_ONLY=NO`、資格試験 `QUALIFICATION_RUN=BLOCKED` を維持。

## 1. 第1工程の原票から再確認できた事実

| 対象 | 既存原票での観測 | 第2工程Bでの実体確認 |
|---|---|---|
| 開発Windowsホスト | 第1工程で Windows 11 Home x64／build 26300／UBR 9974、通常ユーザートークンを記録 | **今回の新規直接取得なし**。VM guestのOSではない |
| ローカル仮想化 | `HypervisorPresent=True` と `HvHost` Runningの表示。調査当時 `HypervisorPlatform`／`VirtualMachinePlatform` は Disabled、Hyper-V管理module／vmms／CIM `root\\virtualization\\v2` 利用不可。VirtualBox／VMware登録痕跡なし | **管理可能な対象VMを確認できない**。ハイパーバイザーの存在表示を対象VM存在の根拠としない |
| VM資産と管理者 | 固定可能なVM候補、管理主体、適切な既存読み取り経路は第1工程で0件 | 実VMの存在は `UNKNOWN`、識別情報 `NOT_OBTAINED`。**未配備を意味しない** |
| VM guest OS | build／UBR／architecture、image hash、snapshot方針、epoch／generation、UUID | `NOT_OBTAINED` |
| 外部R | VM外の実装・実行主体、API、管理認証と実際のSTOP権限の証拠なし | `NOT_OBTAINED`。VM外の設計案が存在しても実体確定ではない |
| 外部Rの故障境界 | R停止／hang、制御面・ネットワーク・ホスト・電源・保存先の共通障害 | `UNKNOWN`。AK01自動有限回復保証 `NONE` |
| guest側 Job／ABI | 開発ホストのSDK 10.0.26100.0とx64バイナリの静的棚卸しは既存 | guestのJob、token、OS、DLL closure、ABIは `NOT_OBTAINED`／動的挙動 `UNKNOWN`。A–G/Rは `NOT_IMPLEMENTED` |

出典：[第1工程報告](phase-1-readonly-20261119.md)、[Stage AN 環境台帳](../stage-an/environment.md)、[Stage AM 外部R契約](../stage-am/external-recovery-contract.md)、[Stage AN 実装ゲート](../stage-an/implementation-gate.md)。既存原票の具体的トークン・ファイル指紋等はローカル証拠側に保持し、GitHubに新規転載しない。

## 2. 候補タイプと選定判断（実体は未確認）

以下は**実際に配備済みのVM／Rの名称ではない**。現行アクセスで真の資産ID・オーナー・権限を検証できないため、選定は `PENDING_ASSET_IDENTIFICATION` とする。

| 優先候補（条件付き） | VM側の必要実体 | R側の必要実体 | 現段階の扱い |
|---|---|---|---|
| **C1：既存の別管理ホスト上の隔離Windows VM** | 管理者が指定する1台のVMと、限定read-only管理API、UUID・generation・epoch・image・guest版 | guest外の管理ステーション／サービスと、VMに限定した管理API・権限、別の状態確認経路 | **第一候補タイプ**。既存の資産と権限は `NOT_OBTAINED` |
| **C2：既存の管理サービス付き隔離Windows VM** | 構築済みVMの厳密な資産ID、image／版、管理面／snapshot方針と状態閲覧API | guestと切り離された管理面上のR、STOP権限範囲、共有障害の明示 | **代替候補タイプ**。実サービス・契約・権限は `NOT_OBTAINED` |
| **C3：現在の開発Windows上のローカルVM** | 第1工程で管理経路を確認できない。実VM識別子もなし | 同一ホストに依存する停止役ではホスト障害で共倒れが残る | **現在は安全実証用として採用不可**。新規ソフト導入やVM作成は別承認が必要 |

C1を優先する理由は、guestと停止管理を分けて識別・観測できる可能性があるためであり、故障時の安全を保証するためではない。R自体がhang／停止し管理系も不達となる場合の自動保証は依然 `NONE`。別ホストだから無条件安全とも、管理APIがSTOPを受け付けたから停止成立とも判定しない。

## 3. 実体固定に必要な読み取り専用取得一覧

| 調査項目 | 要求する証跡・照合 | 判定 |
|---|---|---|
| 資産の実在／未配備 | 所有者または管理者の正規資産台帳、対象1件の識別子、操作主体。未配備なら確認した者・日時・範囲が明記された原票 | `UNKNOWN`。証明なしに `NOT_PROVISIONED` にしない |
| VM管理主体と閲覧権限 | 管理者／owner、guest／hostとは区別したVM-scoped read-only role、実際に有効な読み取り権限、取得経路と時刻 | `NOT_OBTAINED` |
| VM identity | UUID、設定generation、rollback耐性のあるepoch、hypervisor名・版・管理基盤ID | `NOT_OBTAINED` |
| guestの実OS／image | guest OS edition／build／UBR／arch、image原本SHA-256と出所、snapshot／rollback管理方針 | `NOT_OBTAINED` |
| R管理主体／所在／権限 | R所在（guest外）、運用責任者、API識別子、VM-scoped STOP権限・read/status権限、認証方式の概要、失効経路 | `NOT_OBTAINED` |
| 外部停止経路 | R発の要求、API受理、独立の新鮮なVM停止状態、guest EXIT、資源解放、保存・再取得を**別証跡**にする計画と既存の非操作的能力一覧 | 仕様のみ。実STOP `NOT_TESTED` |
| 共通故障・回復境界 | guest、R、hypervisor管理面、host、network、power、credential、storageの依存関係、管理面障害時の手動／自動区分 | `UNKNOWN` |
| guest Job／ABI／clock | 実guestのSDK/CRT/toolchain、Job階層・limits・ACL・権限、使用API／DLL、時計ドメイン | `NOT_OBTAINED` |

現時点での実調査の成果は**不足項目の範囲と選定基準の固定**であり、未取得値の代入や環境実証ではない。認証情報そのもの、APIトークン、個人情報を公開Issue/PRへ転記しない。

## 4. 所有者・管理者の限定確認待ち

1. **既存C1またはC2の有無の照会**：既存の隔離Windows VM（テスト用・破棄可能）について、台帳上の管理主体とVMを一件に特定できるか。特定できなければ未特定 `UNKNOWN` を維持。
2. **本当に無い場合だけ未配備を確定**：所管する管理主体が、探索した資産台帳の範囲・日時・対象種別を明示して配備無しを確認した場合に限り、`NOT_PROVISIONED` を記録。未配備が確定した場合は**VM/Rの環境構築設計を独立工程**に分離し、実際の配備・権限変更・起動は別途承認を必要とする。
3. **既存実体が確認できる場合の次の最小行為**：正規の読み取り経路・管理者承認・既存権限を特定し、UUID・guest OS・management/R権限・外部停止能力の情報だけをREAD_ONLYで取得。read権限が不足する場合は取得を停止し、権限昇格や管理API操作へ進まない。
4. **証拠作成時の保全**：新規採取した実原票は改めてLevel評価、対象・承認範囲とreceiptを固定して保存・再取得監査する。第1工程10件の保存PASSを再実施・変更しない。

## 5. 継続状態と受入範囲

- 第2工程Bの**既存文書の再審査と候補タイプ整理：限定PASS**。真のVM・R実体の確定・読取権限証明：`BLOCKED/NOT_OBTAINED`。ホストの新規直接検証なし、資格試験なし。
- AK01 `OPEN / RECOVERY_GUARANTEE=NONE`、AK02 `OPEN / PHYSICAL_SAFETY=UNKNOWN`。原有限計画 `5,000/30,000/90,000 ms`、8スロット各10秒以内、再試行0は不変。現時点で実測成立を主張しない。
- `IMPLEMENT_ONLY=NO`、`QUALIFICATION_RUN=BLOCKED`。Draft PR #44/#46をDraft・未マージのまま維持。新しいオーナー承認なしに開発・検証ゲートを昇格させない。
