# Stage AO-B 救済保存追補（2026-11-19 JST）

## 結論
**総合 PARTIAL。B監査原票16件のCUSTODY_STATUS=PASS、保存版の独立VERIFICATION_STATUS=NOT_TESTED、INDEPENDENCE_STATUS=NOT_TESTED、ACCEPTANCE_STATUS=PARTIAL。正式保全HOLD、DESIGN_ACCEPTED=PENDING_ARCHIVEを維持する。**

原物保存は完了したが、要求された別Codex CLIでの実物照合は未成立。保存担当の自己照合を独立監査へ昇格しない。PR #44全体のDraft、マージNO、物理安全・AK01/AK02・外部R・IMPLEMENT_ONLY・QUALIFICATION_RUNの別ゲートは変更しない。

## 固定版・承認
- 製品PR #44: `bca7eb3abedf51679eaffff2f8eaee15b86b5ab6`、tree `9ede8fb01acb4e45d5c81bd9a17a82709f916f1e`、Open/Draft/未マージ。今回変更しない。
- 報告branch: `codex/stage-am-safety-gates-20261118`、開始HEAD `7d2420ac8b6d7afe1a09a80c38a00152f77bc2dc`、tree `56becb9d08ebd5bd318ce1db635f67c39cf4e85c`。
- 所有者承認: `5bafd6dfdafc4457517d7ac8920c636e213bce58`、中央正式規約: `4695c3ce2d61e66df0dd36a4312373459e1557d4`。
- 16件の固定索引SHA-256: `d8331f268423570294f1e358ad88cfc73d0342ecfed1c3c0aeed9a85b918f068`。
- 全16件Level 2の既存分類を維持。承認を再利用し、新たな保存先・共有・ACL変更は行っていない。

## 保存実測
承認済みWindows ArchiveのStage AO-B Level-2領域へ、**16/16件・1,052,533 bytes**を排他的に新規保存した。元原票は移動・変更・削除せず、同名領域があれば停止する処理を使用した。

- 開始: **2026-11-19 00:30:44.807988 +09:00**
- 終了: **2026-11-19 00:30:44.837865 +09:00**
- 保持: 各実保存日から1年間、**2027-11-19 JSTまで**。自動削除不可。削除・移動・上書きは別承認。
- 元原票の全16 size/SHAを固定索引と照合し、コピー直後の保存版と全byte一致を自己確認。
- 保存receiptはLevel-2原票集合の外に新規作成。SHA-256: `2df5390f9d0950eef827f81b6c721c94fc6b069c71d8fdddeeef7ef9aa5444a9`。対象、原本/保存版size/SHA、取得元/保存先、日時、保持条件、実行主体を収録。非公開のパスや生ログは公開しない。
- ZIPを新規生成していないため今回16件へのCRCは非適用。

## Windows実行境界
既定の制限トークンはLow integrityだった。正式なツール承認経路では同一所有者のMedium integrityトークンを使用でき、Administratorsはdeny-only、TokenElevation=0、IsTokenRestricted=falseを実測した。**管理者昇格、ACL変更、トークン偽装、保護回避は行っていない。**
Archive親へFILE_ADD_SUBDIRECTORYを要求する既存ディレクトリハンドルを取得して実効権限を確認し、祖先の再解析ポイントを検査した。DACLのFull Control表記だけを成功根拠にしていない。

保存前の失敗も保持する。初回はctypes HANDLE型宣言不足で書込み前に停止。修正後の事前検査では元領域の公開用補助4項目を追加検知し停止。固定16件との差を確認し、対象外補助を除外・不変保持したうえで保存した。固定16件の集合や期待hashを変更していない。

## 独立CLI監査の実行結果
別の新規CLIを実際に起動したが、いずれも保存物の読取検査へ到達していない。

1. 公式アプリCLI: 別セッション起動後、Windowsコマンド実行基盤が `registered Core launch requires an installed app` で失敗。Bは0/16件と報告。CLI自体のexit 0を監査成功と扱わない。監査結果ファイルの作成にも失敗したが、親側が取得したCLI出力・終了記録は専用領域に保持。
2. 公式standalone CLI: 別領域から1回起動。アカウントで既定モデルが非対応とのエラーでexit 1。実物照合0/16件。設定変更や無制限の再試行はしない。

各試行に専用領域、起動PID/時刻、JSONL stdout、stderr、終了codeを残した。担当AとBのセッションは異なるが、必要な独立実物照合が成立していないため独立監査PASSではない。成功時に想定する区分は同一所有者・ホスト・filesystemを共有する `LIMITED_SHARED_OWNER` であり、第三者人的監査ではない。

## 既存3件
既存保存版3件・906,037 bytesは再コピーしていない。今回、固定size/SHAが全件同一であることを確認し、既存3/3全byte、209/209 ZIP entry、manifest、Git対応31件の既存監査結果を再利用した。今回これら全検査を新規再実施したとは主張しない。既存保持期限2027-11-18 JSTは変更なし。

| 対象 | CUSTODY | VERIFICATION | INDEPENDENCE | ACCEPTANCE |
|---|---|---|---|---|
| 既存3件 | PASS | PASS（既存同一版の範囲） | LIMITED_SHARED_OWNER（既存別CLI） | PARTIAL（Stage AO全体HOLD） |
| 今回16件 | PASS | NOT_TESTED（別CLI保存版監査。A自己照合のみPASS） | NOT_TESTED（実物監査未成立） | PARTIAL |

## 最小再開手順
正常にローカルコマンドを実行できる**新規Codex CLIセッション**に、今回専用領域の監査依頼文を渡す。再保存は不要。
1. 保存先16件と固定索引を直接読み、集合・size/SHAを独自再計算。
2. 元16原票を別々に直接読み、保存版と全byte比較。
3. receiptの対象・日時・保持期限・hashを照合し、独自検査記録を新規作成。
4. 同一所有者の限界と未確認事項を明記して四状態を再判定。

必要な保存承認は既にある。追加所有者承認や別account/VMは一律要求しない。今回必要なのはCLI実行基盤の復旧であり、原票の再生成・再保存ではない。
