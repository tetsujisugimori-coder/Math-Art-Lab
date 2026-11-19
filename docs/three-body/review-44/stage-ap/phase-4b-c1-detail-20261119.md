# Stage AP 第4工程B：C1詳細構成・権限・故障境界（設計のみ）

**2026-11-19 JST。C1は第一詳細設計候補であり、選定・購入・構築承認ではない。P2-AP4-01/02/03とP3-AP4-01をここで設計上具体化した。動作・権限・90秒保証は未検証、指摘OPEN。**

## 1. 候補トポロジーと選定前条件

| 役割 | 候補・割当 | 固定に必要な証拠／未決事項 |
|---|---|---|
| VMホスト（H） | **将来の新デスクトップ候補**。初期RAM32GB、64GB拡張を検討。Windows 11 Pro/EnterpriseなどHyper-V対応OSを設計候補とする | **機材未購入・OS未選定**。実CPU/BIOS SLAT、仮想化拡張、DEP、vTPM、ストレージ、OS/ライセンスは要確認。HomeではクライアントHyper-V不可 |
| 使い捨てWindows guest（G） | ホスト上の対象VM1台。Windows 11 clientを優先評価するがライセンスと対象ソフトのサポートを確認 | Generation 2、Secure Boot、vTPM、最低2 vCPU/4GB/64GB。設計余裕例4vCPU、8～12GB RAM、100～150GB VHDX。**この値は設計仮定、実測ではない** |
| 外部回復R | **現行ギャラリアを候補**。ゲスト外・VMホストとは別の物理PC。既存16GB→32GB増設案があるが専用機でのCPU/メモリ占有・夜間電源管理を未確認 | Windows HomeでもRから遠隔管理機能を使えるかはホスト側エンドポイント仕様次第。Rにはホスト管理者一般権限を付与しない |
| 独立観測O | guest外のR側観測と、可能なら別の読み取り経路／証拠保存先を検討 | 同一RホストでR/O共倒れ。別AIセッションは電源/ホストの独立性を提供しない。監査独立性LIMITED_SHARED_OWNERを明記 |
| 人間の緊急対応HUMAN | 所有者が管理者兼担当でよい | 手動復旧経路が実在・使用可能であること、対象VM同定・承認記録を別途固定。手動対応を90秒の自動回復に算入しない |

**別の古いiMacはVM/Rの安全性を証明する設備として本案に算入しない。** 他案件と同じPCを共用する場合は資源競合・同時起動不能を計上し、既存機材の役割変更を承認なしに決定しない。

## 2. 役割分離と通信モデル（未実装）

- 管理ネットワークは原則VMの実験用ネットワークと分離する。R→VMホストの限定管理エンドポイントはゲストの任意プロセスIPCに依存させず、VM ID/世代/epochと認証された要求を受ける設計とする。
- Rの役割は**対象1VMの状態read/STOPの限定操作**。利用者の通常Administrator/Hyper-V Administrators全権限を「VM限定最小権限」とは扱わない。JEA等の制限エンドポイントは権限最小化候補だが、任意コマンド実行・別VM停止・設定変更が不可能であることを正負ケースと権限台帳で検証してから候補採用する。
- Oの読み取り専用状態観測はSTOP送信主体との論理分離を目指す。ただし同一管理サービスからの返答を**独立の物理センサー**とは呼ばない。Rが使えない時に観測経路も失われる場合、状態はUNKNOWNのまま。
- VM専用の永続レジャーはguest rollback外に置き、対象VM UUID、image SHA、generation、epoch、セッション・試験IDと登録の原bytes/SHA、認証情報の識別子/失効情報、nonceの予約・消費順序を保持。登録の永続commitと別経路読戻しが成立**するまで試験開始禁止**。

## 3. P2-AP4-01 STOP・鮮度の安全契約

1. 事前登録：署名/信頼検証、対象VM・image・generation・epoch・sessionへの束縛と原票の外部保存・読戻し。違う対象、古いgeneration/epoch、失効・署名不明ならSTOP要求を生成しない。
2. 送信直前：許可操作を確認し、nonceをrollback外の耐久台帳へ原子的に消費する。書き込み・読戻し不確実なら**追加送信しない**。実装前に不確実性の扱いとログ破損反例を固定。
3. STOP方法：優雅なゲスト停止と強制電源断相当を混ぜない。VMホスト実製品・操作種別・権限・期限とguestログの保存可能性を比較し、未確定の特定コマンドを既定採用しない。
4. 6状態を分離：STOP_REQUESTED、MANAGEMENT_ACCEPTED、VM_STOPPED、GUEST_PROCESS_EXIT、RESOURCES_RELEASED、EVIDENCE_SAVED/READBACK。すべて別原票。APIが応答しただけで実停止PASSにしない。
5. 鮮度の拒否：VM UUID/generation/epoch一致、要求相関IDと操作完了・観測時刻／バージョン・状態の対応が必要。HTTP受信時刻だけ、古いキャッシュ、最後の既知電源状態、同一主体だけの主張は不足。相関不能ならUNKNOWN、STOP再送なし。
6. guest強制電源断が必要な場合、process EXIT・handle cleanupは取得不能になりうる。欠測を「停止したので完了」に変換しない。

**本節は設計契約を補訂するものであり、STOPの物理的成功・時限保証を証明しない。P2-AP4-01はOPEN。**

## 4. P2-AP4-02 共通故障・R自身の停止

| 単一障害 | 検知・独立経路の設計候補 | 結果を保証できない場合 |
|---|---|---|
| guest process/M停止・hang | R自身の独立受信時計とheartbeat、対象1VMに束縛した管理経路 | STOP要求可能でもVM実停止は別観測、未観測UNKNOWN |
| Rのprocess hang/OS停止/ギャラリア電源断 | 外部独立観測者または事前承認された管理者の独立コンソール | 自動回復保証NONE。手動は90秒上限に算入しない |
| 新デスクトップ/host hypervisor hang | Rが外部でもhost管理APIが不達になり得る。BMC等の別管理経路は搭載・権限・対象分離の確認後に別候補 | host停止不能はBLOCKED。電源断をguest EXIT証明に転用しない |
| LAN/ルータ/認証プレーン断 | 別ネットワーク経路・ローカル権限境界・有効な失効情報を今後検討 | 観測/停止要求不達はUNKNOWN、追加コマンド無し |
| 共有電源/停電 | 独立UPSと通電時間の要件調査を条件付き候補として扱う | 別PCでも同じ電源なら共倒れ。UPS無しでは保証NONE |
| 状態API遅延・古いstatus | 先行操作相関・別読取・鮮度検証、timeout時は未確認を残す | STOP受付は停止ではない |
| 監査先/証拠保存不能 | 安全停止の依存レーンと保存を分離し、有限時間でINCOMPLETEを記録 | 保存待ちでSTOPを無期限ブロックしない。ただし未登録・nonce確定不能なら開始自体拒否 |

故障ツリーは**process→OS→ホスト→電源→ネットワーク→管理API→認証→観測→保存→監査主体**まで横断して扱う。別PCで動作するだけでは独立性PASSにしない。RとOが同一ギャラリア上なら物理障害を共有し、ゲスト外性は満たしても物理的独立性は限定される。

## 5. P2-AP4-03 AK02/有限計画の事前ゲート

- guest側はSTARTUPINFOEXW＋PROC_THREAD_ATTRIBUTE_JOB_LIST＋EXTENDED_STARTUPINFO_PRESENT＋CREATE_SUSPENDEDを**対応guest OS・実API・token/Job階層で**確認する。resume前に保持handleで起動個体の本人性とJob所属を検査。生成後AssignProcessToJobObjectの黙示fallbackは禁止。
- Job Jの階層・limits、breakaway、ACL、handle非継承・複製・別名・最後のcloseとKILL_ON_JOB_CLOSEの成立条件を列挙し、生成者消失の8境界（Job作成前～resume後）をそれぞれ別証拠で確認する計画とする。生成中の消失に伴う原子性は未証明。
- 既存の5000/30000/90000ms、8スロット各10秒以内、順序固定、再試行0、最初の未達で残り中止を不変とする。**独立campaign時計**に準備・R登録・各試行・確認・保存・再取得・回収を含める。時計ドメイン差引きをしない。
- 無限hang、R故障、停止未確認、原票未保存に対する物理的上限は現設計ではNOT_PROVEN。事前にSTOP経路の資格・安全独立条件を満たさない限り原停止試験を実行しない。

**P2-AP4-02、P2-AP4-03は設計追記済み/物理成立OPEN。**

## 6. 構成固定に必要な所有者の将来判断（まだ承認ではない）

- VMホスト：物理モデル、Windows Pro/Enterpriseライセンス、CPU機能、RAM 32→64GB、SSD空き、必要なリモート管理制限機構。
- guest：Windows 11版・利用ライセンス、4vCPU/8～12GBの設計仮定の妥当性、VM image・Hash、ネットワーク分離・snapshot方針。
- R：ギャラリアを通常開発用途からどの時間帯に割り当てられるか、給電・停電・スリープ・ネットワークの設計、管理権限を専用1VMに制約できるか。
- O/原票：Rと同居させた時の障害範囲、Windows Archive/別保存先のアクセス・保持・再取得、所有者許可を別途取得。
- 未固定の費用とライセンスは[12か月費用比較](phase-4b-c1-c2-12month-cost-20261119.md)で仮定付き扱い。調達・OS変更・VM起動・管理API・課金開始は別承認。

## 7. 対照参照：Loading Museum

[Loading Museum PR #88](https://github.com/tetsujisugimori-coder/Loading-museum/pull/88)では、CI失敗・実機未検証・原証拠保全・本番実行HOLDを**別々の判定として残す**運用を確認できる。この監査原則は本Stage APにも適用するが、Loading Museum内のC1/C2表記はブラウザー診断群を指し得る。**同名のVM候補の存在や構築承認として読み替えない。** 本C1/C2の定義はMath-Art-Lab Issue #45・PR #46に限る。

## 8. 継続する判定

C1構成 **DESIGN_CANDIDATE、候補機材・ライセンス未固定、構築HOLD**。P2-AP4-01/02/03 OPEN（文書補訂範囲は提出済・再レビュー待ち、物理安全未証明）。AK01 RECOVERY_GUARANTEE=NONE、AK02 PHYSICAL_SAFETY=UNKNOWN、IMPLEMENT_ONLY=NO、QUALIFICATION_RUN=BLOCKED。PR #44/#46はDraft・未マージ。新規Level 2原票の正式保存は案件別承認待ち。過去原票・失敗・UNKNOWNは上書きしない。
