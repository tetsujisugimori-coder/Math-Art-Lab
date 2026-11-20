# Stage AP 第4工程 — C1/C2構築設計の比較と条件付き候補選定（文書限定）

**判断日：2026-11-19 JST。設計候補：C1を第一比較対象、C2を代替。設計判断：`DESIGN_CANDIDATE / PENDING_INDEPENDENT_REVIEW`、実配備：`NOT_PROVISIONED (OWNER_DECLARED, 所有者が管理する範囲限定)`、物理安全：`NOT_PROVEN`。構築・契約・設定変更・資格試験は承認していない。**

## 0. 根拠、適用範囲と履歴の扱い

- 所有者は、現在管理する開発PC・別PC・クラウドで今回の対象となる隔離Windows VMおよび外部回復Rを配備していないと申告。[Issue #45の所有者申告記録](https://github.com/tetsujisugimori-coder/Math-Art-Lab/issues/45#issuecomment-7005670953)。
- 過去の`UNKNOWN`はその当時の機械的実機観測結果として保持する。申告は第三者管理領域の包括不存在証明ではない。[第3工程](phase-3-existing-vm-r-existence-20261119.md)。
- 本工程は**初回の机上構築設計と比較**のみ。現在の所有者所有のVM/R実物、正規のmanagement API/ACL、guestのOS・ライセンス、認証主体、R実バイナリ、有限停止実測の原票はない。見積金額・稼働時間・構成は未契約・未購入。
- 根拠の設計契約：[Stage AK外部回復](../stage-ak/recovery-architecture.md)、[Stage AM外部R契約](../stage-am/external-recovery-contract.md)、[Stage AN有限計画](../stage-an/finite-plan.md)、[Stage AN実装承認ゲート](../stage-an/implementation-gate.md)。OS・管理操作・料金は本書末尾の公式文書を参照する。
- 「C1優先」は**設計の検討順**であり、製品/物理資格試験に使える環境としての採用や90秒回復保証を意味しない。

## 1. 必要な構成と責任境界

| 役割 | 独立性・最小権限の設計要求 | 今回の状態 |
|---|---|---|
| Windows guest (W/P/C、Job J、M) | 使い捨て対象VMを1件に固定、Job内部のW/P/CとJ外のMを区別。guest OS・build/UBR・architecture、image SHA256、VM UUID/generation/epoch、snapshot/rollback方針を実体で固定 | `NOT_PROVISIONED`（申告）、バージョン未選定 |
| hypervisor/管理プレーン | 独立した状態読取API、対象VM単位の停止機能、操作結果と実状態を別原票で保存。開発PCをguest/VM hostと同一視しない | 未選定 |
| R（外部停止管理） | **guest外の管理主体**。理想はVMホストとも異なる実行環境。対象VMのIDと世代/epochに束縛し、heartbeat監視・nonce台帳・必要最小限のread/STOP、認証・失効を管理 | 未配備・実停止経路なし |
| O（観測と保存） | STOP要求、API受付、**新鮮な停止状態**、guest EXIT、資源解放、receipt/独立再取得を**別イベント**として扱う。guest rollbackの外にログを保持。Rと同じ基盤なら監査独立性を過大主張しない | 未配備 |
| H（所有者の手動対応） | 事前に特定された管理者による手動復旧は**自動90秒回復保証に算入しない**。個別の所有者承認後の操作のみ | 設計役割のみ |

**設計時に拒否する誤った昇格：** `STOP_REQUESTED` ≠ `API_ACCEPTED` ≠ `VM_STOPPED` ≠ `GUEST_PROCESS_EXIT` ≠ `RESOURCE_RELEASED` ≠ `EVIDENCE_PERSISTED`。強制電源断はguest内のhandle/EXIT原票を失わせ得るため、欠測は`NOT_OBTAINED`のまま。VM/R・管理プレーン・ネットワーク・電源・原票保存先の共通故障を明記し、同じコンピューター内の別プロセスを外部Rと呼ばない。

## 2. C1：別管理Windowsホスト＋外部R（第一設計候補）

**候補トポロジー（未導入）：**
- VMホスト：将来、購入・再利用を別途承認した物理PC（例：新デスクトップ候補）に、サポートされるHyper-VホストOSまたは別途選定の仮想化方式。**現在の開発Windows HomeをHyper-Vホストとして前提にしない**。MicrosoftによるとWindows 10/11 HomeにHyper-Vロールはインストール不可。
- guest：Windows版・イメージの正規ライセンスと、Job/Native APIに必要な実環境要件を満たす使い捨てVMを1件だけ設計する。Windows ServerをWindows 11クライアントの完全互換代替と勝手に扱わない。
- R：別物理端末（例：現行ギャラリアを将来のR候補として比較。まだ採用していない）でguest外に配置し、**VMホスト側に対象1VMのread/status・停止要求しか許さない制限された入口**を別途設計する。素のHyper-V管理者権限は広すぎる可能性があり、対象VM単位に制限済みと断定しない。JEA等の制限技術も、権限境界レビューなしで安全としない。
- O／保全：Rとは論理的に分離した読取・ログ記録処理を候補とし、VM/guestのsnapshot範囲外に保存。RとOの物理ホスト共有時は、その共通故障を明示する。別セッション照合は`LIMITED_SHARED_OWNER`、物理故障独立性の証明とは別。

**停止までの想定トレース（実行禁止・未実測）：** Rでheartbeat欠測を検知→使い捨てVM UUID/generation/epoch/nonceを照合しnonceの永続消費を確認→限定停止要求を記録→hypervisor受付と操作結果を個別に記録→別のread-only経路で鮮度ある同一VM停止状態を照合→guest EXIT/handle解放は別証拠（採れなければUNKNOWN）→guest外原票を保存/再取得。

**主要な未解決：** ホストとRが同一宅内電源・LAN・ルーター・認証/管理経路を共有すれば共倒れ可能。VMホスト自体の完全hang/電源断時にRがSTOP/API/観測できるか、管理サービスが落ちても動作する独立経路があるか、Windowsクライアントguestのライセンスが有効かは未確認。Rの自動有限回復保証は`NONE`。

## 3. C2：管理サービス付きWindows VM＋guest外R（代替設計候補）

- 参考プロバイダーとして**Azure VMを例示するが採用・契約はしていない**。guest OS（Windows 11クライアント/Windows Server）と利用資格・ライセンス・対象APIを最初に照合する。Windows Server VMを無条件にクライアント再現試験の代用品にしない。
- Rはguest内のTask/Functionではなく、独立した管理実行場所から、**VM資産スコープを限定した**既存RBAC/APIを使用する設計とする。Azureは`virtualMachines/read`、`instanceView/read`、`powerOff/action`、`deallocate/action`等を別の権限アクションとして公開する。実際にVM単位の最小ロール/失効を構成できるか別途審査する。
- `PowerOff`操作の受付、provider operation状態、instanceViewの最後に観測された電源状態を別の事実として固定する。**同一クラウド管理プレーンの別APIで読んだだけでは物理的に独立した停止保証と断定しない**。管理APIの停止・通信断・リージョン故障時は保証`NONE`。
- Windows VMの停止済み(`Stopped/Allocated`)は計算料金が続く場合があり、割当解除(`Deallocated`)なら計算料金が止まる一方、ディスク・ネットワーク等の費用が残る。**課金停止のdeallocate**と**資格試験の安全STOP**を同じものとして扱わない。予算アラートはそれ自体ではリソースを停止しない。

## 4. 定性的比較（採用判断）

| 評価項目 | C1：別管理ホスト＋R | C2：クラウド管理VM＋R |
|---|---|---|
| 初期費用 | 追加/既存ホスト、ホストOS・guestライセンス、R用端末、電源・ネットワーク保護。機材流用できるなら追加投資は変わる | 端末購入なしで始められる場合がある。ただしアカウント・契約・Windowsゲスト利用資格が要確認 |
| 維持費 | 電気・冷却・故障交換・保守・バックアップ・更新 | 稼働時間、Windows込みcompute、永続ディスク、送信、IP、ログ、Rホスト・保存の各継続課金 |
| VMの同定・制御 | ローカル管理基盤のVM UUID/管理API、VM単位STOP権限実現には制約入口等の設計が必要 | cloud resource ID/instance view/RBAC等、資産・権限の区分がしやすい場合あり |
| Rの独立性 | 別物理Rを置けるが、同じ電源/LANやホスト側管理サービス故障で共倒れ | guest外Rを置けるが、クラウド管理API・認証・ネットワークへの依存が残る |
| 最悪遅延の保証 | ホストhang・R hang・通信断・電源障害では上限保証未成立 | provider control plane hang・instanceView遅延・R故障で上限保証未成立 |
| 証拠と復元 | guest外の原票保全を所有者側で設計しやすいが、R/Oが同居すれば独立性限定 | 外部ログ・readbackは可能でもクラウド障害とログ系の依存関係を明示する |
| 適合・未解決 | Windowsホスト版、VMホスト用CPU/メモリ、正規guest OS、制限STOP・独立O | Windows client OS利用資格、管理料金、地域、データ保持、RBAC/コントロールプレーンの保証 |
| 暫定選好 | **第一設計候補（CONDITIONAL）** | **代替候補（CONDITIONAL）** |

**判断：C1を先に詳細設計する。** 理由は、将来の別PCの活用可能性、実体と証拠の管理範囲を所有者が限定しやすいこと、実験回数が少ない場合の従量費用への依存を避けられる可能性。ただし現在、別ホスト/Rの具体的資産・購入価格・Windowsライセンス・独立通信停止機構が固定されておらず、**C1が費用最安・物理安全・資格試験適合であるとは未判定**。C1の別ホストとRの独立性が成り立たない場合はC2再評価または未実施とする。

## 5. 費用比較・要見積項目（実額は提示しない）

費用の比較期間は**12か月**、稼働パターンは実験用の月間低稼働・中稼働・連続稼働の3シナリオとする。時間は現時点で未決定であり、見積前に所有者の想定稼働時間を固定する。

- **C1の12か月追加費用**＝追加機材の調達（既存機材の二重計上をしない）＋ホストOS/guest OSの正規ライセンス＋必要なR/UPS/別経路の調達＋（追加電力W×実時間h÷1000×契約電力単価）＋保守/ストレージ・交換予備費。既存デスクトップ購入計画全額を、Stage AP専用費として計上しない。
- **C2の12か月追加費用**＝（地域・Windows OS版・VMサイズごとの時間単価×稼働時間）＋（停止中も課金が続くストレージ等×期間）＋IP/転送/ログ保存＋独立R実行場所＋必要なライセンス/税＋運用・予備費。`Stopped`と`Deallocated`で課金が異なる。料金は公式見積ツールで**同一リージョン・時間・保存量・通貨**を指定して取得する。
- どちらも実額見積`NOT_QUOTED`。本書から契約・購入予算は承認できない。候補が固まった時点で公式の構成/見積IDと取得日時、Windowsライセンス根拠、単価の出所、想定実験稼働率、12か月TCOを追記する。
- C2での予算アラートは実費の強制上限ではない。費用暴走の停止を必要とする場合、別設計の有効な操作承認・権限・停止ワークフローが要る。

## 6. 受入ゲート、反例と次の作業

**Stage AP 第4工程（今回）**：机上比較と候補優先順位のみ`DESIGN_CANDIDATE`。構築設計受入は第三者/別Codex CLIの文書再レビュー待ち`PENDING_INDEPENDENT_REVIEW`。具体的部品・構成・予算の選定は`PENDING`。

| 次工程の確認事項 | 必須証拠／拒否条件 |
|---|---|
| C1ホスト/guest/R/Oの実候補 | 物理端末・Windows版・仮想化機構・guest image/ライセンス・RAM/CPU/SSDと用途、R・Oの所在を固定。存在しない資産を`EXISTS`と記録しない |
| 権限境界 | 対象VM scoped read/status/STOPの設計、通常管理者の過大権限／汎用PowerShell/リモート操作への逃げ道を拒否、nonce・世代/失効・認証情報の非公開保存を検討 |
| 共通故障 | host・R・observer・管理API・ネットワーク・電源・認証・永続保存を故障ツリー化。R hang/management hang時も90秒保証を主張しない |
| 費用と契約 | 12か月同条件のC1/C2見積とguestライセンス解釈、課金停止条件を固定。想定額なしで承認しない |
| 安全観測 | STOP要求/受理/実停止/guest EXIT/資源解放/外部保全は独立証跡。強制停止で取れないguest原票をPASSへ補完しない |
| 独立レビュー | 別Codex CLI等で設計・出典・従前契約との整合を確認。独立性`LIMITED_SHARED_OWNER`を表示 |
| 構築を行う時 | 対象限定の所有者承認（正確なPC/VM/契約/支出上限/許可操作/保存先/担当/復旧）を**別途**取得。未取得なら設計までで停止 |

既存`5,000 / 30,000 / 90,000ms`、8スロット各10秒以内・再試行0は**一切変更しない**。設計だけでは管理面やR自身の無限hangに対する最悪時間は制限できない。実現性`NOT_TESTED`、AK01 `RECOVERY_GUARANTEE=NONE`、AK02 `PHYSICAL_SAFETY=UNKNOWN`、`IMPLEMENT_ONLY=NO`、`QUALIFICATION_RUN=BLOCKED`、PR #44/#46 Open/Draft・未マージを維持。新しいLevel 2原票の正式保全は個別承認前につき`BLOCKED`、第1工程の固定10件・79,422 bytesの正式保全`PASS`は不変。

## 7. 参考資料（公式、2026-11-19参照）

- [Microsoft Learn：WindowsでHyper-Vをインストールする](https://learn.microsoft.com/en-us/windows-server/virtualization/hyper-v/get-started/install-hyper-v)（HomeはHyper-Vロール対象外）
- [Microsoft Learn：Hyper-Vホストをリモート管理](https://learn.microsoft.com/ja-jp/windows-server/virtualization/hyper-v/manage/remotely-manage-hyper-v-hosts)（管理者権限・リモート管理の考慮事項）
- [Microsoft Learn：JEAの概要](https://learn.microsoft.com/ja-jp/powershell/scripting/security/remoting/jea/overview?view=powershell-7.6)（権限委任候補、VM限定安全の完成証明ではない）
- [Microsoft：Windows 11仮想デスクトップのライセンス案内](https://www.microsoft.com/licensing/guidance/Windows-11-Licensing-for-Virtual-Desktops)（OEMライセンスのみなら仮想化権がない場合がある、契約別確認）
- [Microsoft Learn：Azure ComputeのRBACアクション](https://learn.microsoft.com/ja-jp/azure/role-based-access-control/permissions/compute)（read/powerOff/deallocateの違い）
- [Microsoft Learn：Azure VMの状態と課金](https://learn.microsoft.com/ja-jp/azure/virtual-machines/states-billing)
- [Microsoft Learn：Azure VM Instance View](https://learn.microsoft.com/ja-jp/rest/api/compute/virtual-machines/instance-view?view=rest-compute-2026-04-01)
- [Microsoft Learn：Azure Cost Management予算アラート](https://learn.microsoft.com/en-us/azure/cost-management-billing/costs/tutorial-acm-create-budgets)（通知は自動停止ではない）
- [Microsoft Azure：Windows VMの公式価格ページ](https://azure.microsoft.com/ja-jp/pricing/details/virtual-machines/windows/)（実額の見積取得は次工程）


---

## 8. 第4工程B：独立レビューP2/P3補訂と判定（2026-11-19 JST）

**対象独立レビュー：[PR #46 REVIEW 5973368781](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/46#pullrequestreview-5973368781)、[Issue #45](https://github.com/tetsujisugimori-coder/Math-Art-Lab/issues/45#issuecomment-7006643760)。固定レビュー対象HEAD 67be2abe54181f278bf3cbe824a15f03dcfff268。** P1 0件、P2 4件、P3 1件。以下は当該5件への**設計書上の補訂**であり、実機・API・権限・STOP実測の成立を主張しない。**P2/P3全件OPEN、設計補訂の独立再レビュー待ち**。旧章はレビュー時点の履歴として上に保持する。

### P2-AP4-01 OPEN — STOP操作許可・VM停止観測の鮮度

- R登録には、VM UUID、hypervisor/host identity、イメージ原SHA、構成generation・外部epoch・session/trial・承認操作の束縛、真正な発行/失効検証、**guest rollback範囲外にある耐久台帳のcommitと独立readback**を要求する。単なる同じJSONを検証器で生成したものは、外部Rの認証/受領原票ではない。
- STOP前にnonceを永続原子消費。永続commit・readback不明、対象不一致、古いepoch、信頼/権限の欠測は**初回も送信しない**。送信後に受付または操作結果が不明なら**再送しない**。対象VM以外に影響する権限を使う回避策は禁止。
- 停止操作の実メソッドを固定するまでは、優雅なshutdown、Hyper-V強制電源断、Azure PowerOff、deallocateを同一視しない。API受付は停止証明ではない。**STOP要求→受付→操作結果→別観測で確認した新鮮な同一世代VM停止→guest process EXIT→資源解放→保存/readback**を分離。
- Azureの状態表示は「最後に把握した状態」であり、HTTP応答到着時刻だけでは状態が新しいと証明できない。状態の更新根拠（世代、provider event/operation相関ID、状態バージョン等）が欠ければ**STOP確認UNKNOWN**。guest電源断で失ったEXIT/handle情報もUNKNOWN。
- 判定：**設計条件追記済み／STOP方法・API・状態鮮度の実証はNOT_TESTED、P2 OPEN**。

### P2-AP4-02 OPEN — R故障、共通故障、無限待機

- R/M/guest/VMホスト/電源・UPS/ネットワーク/管理プレーン/認証/状態観測/永続原票/監査セッションの故障ツリーを対象。Rプロセスhang・ギャラリア電源断、VMホストhang、LAN/ルーター停止、管理API応答停止、認証失効、保存不能ごとに観測不能・BLOCKED・中断時原票INCOMPLETEを区別。
- **R自身・管理API・ホストが停止してSTOPできない場合の自動回復保証はNONE**。別PC配置はhostの物理分離であって、同一電源・LAN・資格情報・管理プレーンからの独立ではない。R/G/Oの組合せが同じ故障を共有する場合はその証拠軸を別途失敗とする。
- 管理者による別コンソール経由の緊急対応は、実体/操作権限/同一対象識別/復旧責任者を別承認で固定するまで存在を仮定しない。人手による復旧を**自動90秒**に算入しない。
- 初期の登録・nonce記録が不確かな場合は試験開始を拒否。試験中のログ保存不能によって安全停止の待ちを無期限に伸ばさず、証拠欠測をINCOMPLETEで保管し、未証明ゲートを維持。
- 判定：**[C1詳細設計](phase-4b-c1-detail-20261119.md)に、R/O喪失時の残り枠の開始禁止を担うキャンペーン制御担当、中断条件、欠測と取得済み原票の記録先を追記済み。物理独立性・中断の実効性は未確認、P2 OPEN**。

### P2-AP4-03 OPEN — AK02/有限予算の実施前チェック

- guest対象版・Job入れ子順序・limits・token/ACL・breakaway・handle所有/複製/継承・最後のcloseを確認する。作成時のSTARTUPINFOEXW＋JOB_LIST＋CREATE_SUSPENDED／拡張フラグの有効性を、**対象実OSと実API結果**で確認するまで実装合格にしない。
- 親の生成消失8境界、CreateProcess内での所属/原子性、resume前の本人性とJob所属、Resume戻り値、EXITと資源回収を**別原票**。post-create AssignProcessToJobObjectへの黙示fallbackは禁止、PID再利用は保持handleで区別する。
- 原本5000ms/親30000ms/総90000ms、8スロット固定順各10000ms以内、再試行0、初回不成立で残り停止。登録、準備、時計、STOP状態確認、独立readback、後片付けはキャンペーン全体の**同一独立時計90秒**へ含める。時計が異なる区間を引き算して保証しない。
- 判定：**[C1詳細設計](phase-4b-c1-detail-20261119.md)に、次枠の開始前に共通終了処理分を確保する条件と親30,000msの計時区間を追記済み。実guest安全性・有限停止保証はNOT_TESTED、P2 OPEN**。

### P2-AP4-04 OPEN — C2 Azure権限と非同期進捗読み取り

- VMスコープのread/status/STOP action、操作の非同期進捗read、監査原票のreadを**別の権限表**で扱う。STOPがVMのresource scopeで許可されても、operation statusのURLにはVMパスがなく、リソースグループレベルの権限が別途必要な場合がある。
- **VM限定STOP主体は最小権限を保持**。リソースグループ全体へのContributor/VM Contributorを安易に付与しない。operation status専用の限定読み取り主体の候補と認可境界を独立審査し、作成していないロールを実装済みとみなさない。
- 進捗APIを取得できない、非同期operation IDが異なる、管理API障害、実VM状態の鮮度が不足する場合はUNKNOWN/HOLD。進捗取得を断念してSTOPを再送する回避は禁止。
- [Azure RBACのComputeアクション](https://learn.microsoft.com/ja-jp/azure/role-based-access-control/permissions/compute)、[Azure Resource Manager非同期操作権限](https://learn.microsoft.com/ja-jp/azure/azure-resource-manager/management/async-operations)を根拠とし、対象契約/権限の実証は未実施。
- 判定：**再レビューで権限スコープの文書補訂PASS。対象契約で進捗を読める実効権限・Azure実ロールはNOT_TESTED、P2 OPEN**。

### P3-AP4-01 OPEN — 同条件費用比較とライセンス

- 比較期間12か月、低稼働8h/月（年間96h）、中稼働80h/月（年間960h）、連続24h/日（年間8760h）。C1のホスト/Rの待機電力とVM稼働増分、機材費の配賦、ホストOS/guest権利、UPS/SSD/保守を分離する。C2はVM Windows込みの従量、停止移行による課金、ディスク/snapshot/IP/ログ/外部R/通信・税を分離する。
- [仮定付き12か月部分費用モデル](phase-4b-c1-c2-12month-cost-20261119.md)を作成。単価・電力は比較用仮定または二次価格参考であり**Microsoft公式の条件固定済み契約見積ではない**。ライセンス/費用全額はNOT_QUOTED、金額の小さい方を採用候補の決定理由にしない。
- Windows HomeでHyper-Vホストロールは利用できない。C1新デスクトップのWindows Pro/Enterprise、Windows 11 guest実行権、C2クライアントOSの契約適用範囲を各々別に一次資料と照合する。
- 判定：**再レビューで3稼働条件の算式PASS。同一試験要件のC1/C2構成、Windows 11利用資格、公式料金は未確定。COST_ACCEPTANCE=HOLD / NOT_QUOTED、P3 OPEN**。

### 第4工程Bの工程判定

| 区分 | 工程の結果 |
|---|---|
| 5指摘の文書補訂 | SUBMITTED、独立再レビューPENDING。**P2 4件＋P3 1件は全OPEN** |
| C1構成の詳細化 | [新デスクトップ/ギャラリア、権限、停止経路、故障ツリー](phase-4b-c1-detail-20261119.md)を**候補**として作成。機材・OS・ライセンス未確定 |
| C1/C2費用 | [12か月3シナリオ部分試算](phase-4b-c1-c2-12month-cost-20261119.md)を作成。**全額TCO未算定／採用順位を費用で確定しない** |
| Loading Museum参照 | [PR #88](https://github.com/tetsujisugimori-coder/Loading-museum/pull/88)の原証拠・CI失敗・本番受入分離原則を参照。同プロジェクトの実VM C1/C2構築実績としては利用しない |
| 採用・実機ゲート | DESIGN_REVIEW=PARTIAL、C1詳細設計第一候補、C2代替、構築/購入HOLD、IMPLEMENT_ONLY=NO、QUALIFICATION_RUN=BLOCKED、AK01 NONE、AK02 UNKNOWN |

これらは**レビュー指摘を設計上反映しただけ**であり、独立再レビュー、原票の現物保全、物理実証、資格試験は未実施。PR #44/#46 Draft・未マージ維持。固定10件・79,422bytesの旧保全PASSは不変。新規Level 2の正式保存は案件別承認待ち。
