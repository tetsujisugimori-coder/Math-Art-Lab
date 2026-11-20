# Stage AP 第3工程 — 既存隔離VM／外部Rの有無を確認し、条件付きで構築設計へ分岐

## 実機追補（2026-11-19 14:32〜14:34 JST）

**第3工程は PARTIAL。隔離Windows VMの配備有無は `UNKNOWN`、外部回復Rの配備有無も `UNKNOWN`。実体確定は `BLOCKED`。** 開発Windowsで読み取り専用の直接照会を実施した。Windowsの通常非昇格トークンは `CodexSandboxOffline`（Medium、実効Administratorsなし）で、所有者の対話ログオントークンは利用できなかった。このセッションがアクセスできる範囲と、所有者が管理する環境全体の範囲を台帳上で区別した。

### 対象と根拠

- 開始時の文書Draft PR #46は `codex/stage-ap-01-readonly-20261119`、HEAD `a94b65f4ec1e766282e437a23411f1bf0d8f77d0`、tree `e0880e17af8afeaf6068f4a26048cfad6ca817f6`。GitHubの開始HEADを取得した隔離チェックアウトでこの追補を作成した。割当作業ツリーは別コミットのdetached HEADで、既存の管理ブランチ用作業ツリーは別の場所にあった。[Issue #45](https://github.com/tetsujisugimori-coder/Math-Art-Lab/issues/45)・[Draft PR #46](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/46)・[所有者の範囲限定判定方針](https://github.com/tetsujisugimori-coder/Math-Art-Lab/issues/45#issuecomment-7000267369)
- 実機で照会した範囲は開発Windowsのホスト情報、ローカルSCMとCIM、既定のVM管理製品と登録先、所有者プロファイルの対象限定パス・レジストリキー、ローカルタスク、既に開いている管理ウィンドウのタイトル。既知の管理範囲を確認するためGitHubのIssue・PR・台帳候補を閲覧した。C1/C2の管理対象ホスト・サービス・アカウントや既存の正規閲覧先を特定できなかったため、外部管理面への照会は未実施。

### 今回のWindows観測

| JST（2026-11-19） | 読み取り経路 | 取得結果・限界 |
|---|---|---|
| 14:32:49 | `WindowsIdentity.GetCurrent()`、`WindowsPrincipal.IsInRole(Administrator)`、`whoami.exe /groups /fo csv /nh` | `CodexSandboxOffline`、Medium、実効Admin=false。Administrators／Hyper-V Administratorsのグループ表示なし。whoami exit 0 |
| 14:32:49 | `HKLM:\SOFTWARE\Microsoft\Windows NT\CurrentVersion` の対象値、`RuntimeInformation.OSArchitecture` | Home/Core、レジストリ `ProductName=Windows 10 Home`、build `26300`、UBR `9974`、X64。第2工程Bの同項目と一致。第1工程のCIM captionは当時の記録 |
| 14:32:49 | `Get-CimInstance Win32_OperatingSystem`、`Win32_OptionalFeature`（Hyper-V・WHP・VMP）、`root\virtualization\v2` の `Msvm_ComputerSystem` | OS captionとオプション機能は `0x80041003`（アクセス拒否）。Hyper-V VM一覧は `0x8004100E`（無効な名前空間）。いずれも `NOT_OBTAINED` |
| 14:32:49 | `sc.exe query <名前>`、`Get-Module -ListAvailable -Name Hyper-V`、`Get-Command`、HKLM 32/64-bitのUninstall | `HvHost` は RUNNING（exit 0）。`vmms`、`vmcompute`、指定VirtualBox／VMware／WSL／Windows Admin Center等のサービスは照会結果1060。Hyper-Vモジュールと該当の製品登録は取得されず、候補コマンドで解決できたのは `wsl.exe` のみ |
| 14:32:50 | `Get-Item -LiteralPath`（登録ファイル・既定格納先） | 所有者プロファイルのルートは参照可。所有者の既定 `VirtualBox.xml`、VMware `inventory.vmls`、両製品の既定VM格納先、ホストの既定Hyper-V構成格納先と管理コンソールは `PathNotFound`。一覧0件の原票は得られていない |
| 14:33:41〜14:34:25 | `ProfileList`、所有者の既存 `HKEY_USERS` に対する `Test-Path` と `Registry.Users.OpenSubKey(..., false)` | `Test-Path` は存在しない対照キーにもtrueを返したため、可視性の判定から除外。直接の読み取りオープンは所有者hiveルート、ユーザーUninstall、Environmentでアクセス拒否。指定のVirtualBox・VMware・WSL登録キーはハンドルを取得できず、WSL子キー列挙もアクセス拒否。所有者の全登録範囲と非既定パスは `NOT_OBTAINED` |
| 14:32:50〜14:34:49 | ローカル `Get-Service`、`schtasks.exe /Query /FO CSV /NH`、`Get-ScheduledTask`、`sc.exe query Schedule` | サービス照会の初回型解決エラーを `Get-Service` で補完。可視296サービスのうち Math-Art-Lab、Stage AP、AK01、external recovery の名称一致0件。タスク一覧は `schtasks` exit 1（パス未検出）、CIM経路も `0x80041003`。ScheduleはRUNNING（exit 0）。Rの一覧は未取得 |
| 14:34:27 | Windowsの既存ウィンドウ一覧 `sky.list_windows()` | 取得7件のタイトル・アプリ名から対象管理ウィンドウを同定できず。管理サービスへの新規接続は発生していない |

上記は今回のホスト出力の非機密要約。第1工程および第2工程Bの結果はそれぞれの時点の記録として参照し、対象guestの情報には用いていない。[第1工程](phase-1-readonly-20261119.md)・[第2工程BのWindows記録](phase-2b-windows-readonly-20261119.md)

### VMとRの配備判定

| 対象 | 判定 | 判定に必要な未取得証拠 |
|---|---|---|
| 隔離Windows VM | **`UNKNOWN`** | C1/C2の所有者管理範囲、既存台帳・閲覧先、対象資産IDとVM単位の実効閲覧権限。配備が確認できた場合のUUID・世代／epoch・guest OSを採取する経路。C3も登録一覧未取得で `UNKNOWN`、同一開発ホスト依存のため安全実証の採用対象外 |
| 外部回復R | **`UNKNOWN`** | 既存の配備台帳、運用主体、guest外の実行場所、同一VMとの対応、管理API・read/STOPロールの仕様、独立した新鮮な状態閲覧経路、共通故障依存。ローカル照会では該当サービスを特定できず、タスク一覧と外部管理面は未取得 |

正規資産を具体的に同定できた範囲、または所有者が列挙した管理範囲を十分に照会して未配備と確認できた範囲は、今回いずれも確定していない。所有者本人が管理主体を兼ねられる。ローカルのサービス未登録や既定パス未検出で `NOT_PROVISIONED` へ変更しない。現在のC1/C2費用・権限・運用・共通故障の比較は、下記の机上比較を参照する。

### 次の実行可能工程と保全

1. 所有者が自ら管理するホスト・管理サービス・アカウントを列挙し、既存の読み取り専用の資産一覧・台帳または管理画面を指定する。C3の追加照会が必要なら、所有者が通常ログオンした非昇格セッションで登録VM・管理製品・関連タスクの照会を行う。対象VMとRは別々に、確認時刻、実行主体、照会成功・拒否・未到達を記録する。
2. 既存資産が見つかれば、そのVMとRの実体・ID・世代・guest OS・ロール・依存関係を対象限定で照合する。未配備を確定できた範囲があれば、その根拠を固定してC1/C2の構築設計に進む。C1を第一候補タイプ、C2を代替とする。現在は実体確定 `BLOCKED`。
3. 第1工程の10件・79,422 bytesの正式保全 `PASS`（`LIMITED_SHARED_OWNER`）を維持。今回分の新しいLevel 2原票の正式保存は案件別承認がなく `BLOCKED`、独立再取得は `NOT_TESTED`。必要なら対象・分類・保存先・操作主体・ACL・保持条件を承認後に照会を実施し直し、原bytes・receiptの保存と別経路照合を行う。[第2工程Aの正式保全](phase-2a-custody-20261119.md)
4. **`IMPLEMENT_ONLY=NO`、`QUALIFICATION_RUN=BLOCKED`、AK01 `RECOVERY_GUARANTEE=NONE`、AK02 `PHYSICAL_SAFETY=UNKNOWN`。** VMの起動／停止、STOP、Job・試験用process生成、ACL・認証・設定変更、故障注入、資格試験は未実施。

---

## 以下は第3工程の文書調査時点の記録

**調査・判断日：2026-11-19 JST。現行判定：PARTIAL／既存VM配備 UNKNOWN／外部R配備 UNKNOWN／実体確定 BLOCKED。分岐D継続。実機読み取りは今回 NOT_TESTED。** 既存の第1・第2工程の原票とGitHubの現行記録を再照合した。今回のChatGPT接続には所有者のWindows PowerShell／VM管理API／外部R管理APIを実行する権限・経路がなく、開発Windows上で新規コマンドを実行していない。接続ブラウザーの既存タブにも認可済み管理画面を特定できなかった。別環境の診断結果を所有者の実ホストの診断と扱わない。

## 1. 固定根拠と確認可能な範囲

- 文書PR #46の開始固定HEAD `53c0d7509fd282af7e8013d05002111b39d713fa`／tree `6a324acbdfa333ddb76244d1db5f14e3a8e7683b`。[第2工程Bの実Windows原票要約](phase-2b-windows-readonly-20261119.md)、[初回VM/R候補台帳](phase-2b-vm-r-inventory-20261119.md)、[第1工程](phase-1-readonly-20261119.md)、[Stage AN環境台帳](../stage-an/environment.md)を読み直した。
- 第1工程では開発WindowsのCIM captionをWindows 11 Home、x64、build 26300、UBR 9974として観測。第2工程BではサンドボックスアカウントでHome/Core、x64、同build/UBR、`HvHost` RUNNING、`vmms`／`vmcompute`の照会したSCMへの未登録を観測。一方、CIM/WMIにアクセス拒否、ローカルHyper-V管理名前空間は無効で、VM一覧は取得できなかった。これらは**開発ホストの限定観測**であり、対象guestの同定でもVM不存在の証明でもない。
- Microsoft公式のHyper-V要件では、Windows 10/11 HomeはHyper-Vロールの正式インストール対象外。[Microsoft Learn](https://learn.microsoft.com/ja-jp/windows-server/virtualization/hyper-v/get-started/Install-Hyper-V)。`HvHost` RUNNINGのみでHyper-V管理下VMの存在や実験可能性を推認しない。
- ローカルの調査対象にあるVirtualBox／VMwareの既定登録・サービス・ツールに候補を確認できなかったが、全パス・全アカウント・外部ホストを探索した証拠ではない。
- C1（別管理ホスト）／C2（管理サービス）とも資産ID、管理先、管理主体、所有者の管理範囲、実効read-only権限は `NOT_OBTAINED`。外部Rはguest外の実行場所／サービスの実体、管理責任、停止API、読み取り経路の原票が `NOT_OBTAINED`。自動回復保証は `NONE`。
- 以上のため本工程では `EXISTS` と `NOT_PROVISIONED` のどちらも確定できず、**既存VM/Rの有無を確定するための実機・所有者範囲照会は未完了**。これは実配備を否定しない。

## 2. 所有者兼管理者による範囲限定の判定基準（2026-11-19 承認採用）

| 判定 | 受け入れる証拠 | 対象範囲外の扱い |
|---|---|---|
| `EXISTS`（既存配備を確認） | 所有者が管理範囲と資産の具体的IDを指定し、認可された既存read-only経路で対象VMとRを同定。管理主体、同一VMとの対応、取得時刻、照会結果／実効閲覧権限を保持 | 未照会の別環境はUNKNOWN |
| `NOT_PROVISIONED`（指定管理範囲に未配備） | 所有者の管理対象ホスト・アカウント・管理サービス・台帳範囲と確認日時の宣言。対象範囲の実際のread-only照会結果（失敗／未到達は分離）、VM/R資産候補0件の根拠。VMとRを別判定する | 指定範囲外、拒否・欠測・未アクセスはUNKNOWN |
| `UNKNOWN/BLOCKED` | 対象の管理範囲未定義、読み取り経路なし、アクセス拒否、管理先未特定、候補タイプだけの列挙 | 推測でEXISTS／NOT_PROVISIONEDにしない |

「他人の管理者」「第三者の資産台帳」は一律必須でない。所有者本人が管理主体を兼ねてよい。ただし本人の宣言だけで、未管理のクラウド／外部ホスト／第三者環境の不存在まで証明したことにはならない。所有者の自己確認と別Codex CLI再取得は監査独立性 `LIMITED_SHARED_OWNER`。外部Rの物理的分離や共通故障の証明とは別軸。

## 3. 現時点の存在判定

| 対象 | 判定 | 未完了の必要操作 |
|---|---|---|
| 開発ホスト内の管理可能なVM（C3） | `UNKNOWN`。既定管理経路で同定0件、管理一覧は未取得。安全実証対象外 | 正規所有者Windowsセッションからread-onlyで対応製品・登録VM一覧とアクセス結果を確認。ACL変更／権限昇格はしない |
| 別管理ホストVM（C1） | `UNKNOWN` | 所有者が対象ホスト/管理範囲・資産IDを指定し、既存の正規read-only台帳／管理画面から確認 |
| 管理サービスVM（C2） | `UNKNOWN` | 所有者が管理するサービス・契約・アカウントの範囲を指定し、その範囲の既存VM一覧／VM単位閲覧権限を照合 |
| guest外のR | `UNKNOWN`、保証 `NONE` | 所有者がRの所在、配備主体、guest外性、対象VMとの対応、STOP/状態閲覧ロール、電源・ホスト・管理面・ネットワーク依存を特定 |
| VM/R全体 | **実体確定 `BLOCKED`** | 認可された所有者管理範囲と実機read-only出力が必要 |

今回のGitHub再読・接続先確認のみで新しいWindows実測原票は生成していない。第2工程Bの既存・未保全Level 2生出力を今回取得・保全したと主張しない。

## 4. 次に実機を確認する場合のread-only限定プロトコル

1. **所有者管理範囲の固定**：Windowsホスト名（公開報告には匿名ID）、確認対象アカウント、既存VM管理製品／クラウド契約／管理ホスト（分かる範囲）、R候補の有無、対象範囲と除外範囲を宣言する。実在しない管理部署の承認を求めない。
2. **開発Windowsのlocal read-only照会**：通常権限の正規Windowsセッションでトークンとホスト版を識別し、既存のVM管理製品・登録サービス・管理ツール・既存VM一覧の**取得できる範囲だけ**を照会する。存在しないコマンド、拒否、不明な管理対象は別状態で記録。ネットワーク全域スキャン・未知のホスト探索・不明な管理API呼び出しは行わない。今回の`CodexSandboxOffline`のアクセス拒否を所有者自身の能力不在と混同しない。
3. **C1/C2の所有者管理台帳照会**：既存管理画面・読み取り専用APIの権限がある場合だけ対象資産一覧と登録VM UUID／generationを確認。認証情報をGitHubへ記録しない。未指定アカウントへの接続・ロール追加はしない。
4. **外部RをVMとは別に調査**：既存サービス／管理ステーション／運用契約上のRを同定し、guest外の実行場所、権限と独立した停止状態確認、故障時の依存関係を台帳化。Rの「設計資料」があるだけなら配備済みとはしない。
5. **原票保全**：第1工程10件（79,422 bytes）の保全PASSは変更しない。今回の新しいLevel 2生原票を保存する場合は、対象・分類・保存先・ACL・操作者・独立読取主体・実保存日起算の保持期間・削除／移動／上書き条件に対する**個別承認を先に確定**。無承認での永続保存・変更は行わない。承認後、元バイトを非破壊保存し、別CLIで保存先から直接再取得、名前・全バイト・サイズ・SHA-256・receiptを照合する。
6. **分岐の再判定**：VM＋Rの同定ができれば `EXISTS` として実体・権限の限定調査へ。本人管理範囲の適切な根拠が揃い未配備なら範囲限定 `NOT_PROVISIONED` として構築設計へ。それ以外は `UNKNOWN/BLOCKED` を保持し、机上比較のみ進める。

## 5. 暫定の構築候補比較（非配備確定でも構築承認でもない）

| 候補 | 費用の比較軸（実額未見積） | 管理・権限 | 主な故障境界と位置づけ |
|---|---|---|---|
| **C1：所有者管理の別物理ホスト上に隔離Windows guest＋独立R** | 追加ホスト・OSライセンス、電力、ストレージ、管理労力。既存設備再利用なら初期費用を削減可能 | VM単位read-only、STOP専用最小権限、guest外の状態監査経路を区分 | VMとRが同じ電源・スイッチ・認証・管理サービス・保存先に依存すると共倒れあり。**第一候補タイプ**だが保証未成立 |
| **C2：外部管理サービス上のWindows VM＋guest外R** | VM稼働・ディスク・ネットワーク・バックアップ・ログ等の従量/継続費用。VMの電源状態と課金の関係も要確認 | 許可されたクラウド／管理主体・read-onlyと停止アクションを分離 | Rと管理API・資格情報・ネットワークが共有なら独立回復は成立しない。**代替候補タイプ** |
| **C3：開発Windows上のローカルVM** | 既存機での資源消費。HomeはHyper-Vロール非対応、他方式は別途確認 | 所有者管理可能性は未確定 | 同一ホスト障害で観測・停止とも失うため**AK01の安全実証には採用しない**。純粋mock等とは用途を分離 |

※ 具体額・調達モデル・使用サービス・ライセンス・実施時期はいずれも未選定。MicrosoftはAzure VMについて停止状態と割当解除状態で課金状態が異なると説明しているが、Azure導入を決定した意味ではない。[Azure VM状態と課金](https://learn.microsoft.com/en-us/azure/virtual-machines/states-billing)。資格試験に必要な停止の保証には、電源状態APIの受付／表示だけでなく、独立新鮮な同一UUID・generation・epoch確認と、guest EXIT・資源解放の別証拠が必要。

## 6. 許可状態・引継ぎ

- 文書のread-only根拠整理・条件付き設計比較だけ実施。**VM／Rの実配備判定は `UNKNOWN`、第3工程総合 `PARTIAL`。**
- AK01 `OPEN/RECOVERY_GUARANTEE=NONE`、AK02 `OPEN/PHYSICAL_SAFETY=UNKNOWN/NOT_TESTED`。
- `IMPLEMENT_ONLY=NO`、`QUALIFICATION_RUN=BLOCKED`。新規VM構築／起動／停止、STOP、Job/process作成、ACL・credential・設定変更、故障注入・資格試験は禁止。追加所有者承認を別途要する。
- PR #44／#46はDraft・未マージ。今回の文書追加は、実Windowsの検査や新規Level 2保存が成功したという報告ではない。
- 次の必須実務は**通常Windows所有者セッションまたは正規アクセスのあるCodex CLIに、この節4のread-only限定プロトコルを実行させること**。現在のChatGPT接続だけでは実機判定を確定できない。
