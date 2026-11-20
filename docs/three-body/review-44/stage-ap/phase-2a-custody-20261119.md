# Stage AP 第2工程A — 第1工程の原票10件の正式保全

**正式保全 PASS。Level 2 の固定原票10件、計79,422 bytes を新規保存し、別 Codex CLI セッションで保存実物を直接再取得した。名前集合、サイズ、SHA-256、全バイトは10/10件一致。欠落・余分・読取失敗は0件。**

| CUSTODY_STATUS | VERIFICATION_STATUS | INDEPENDENCE_STATUS | ACCEPTANCE_STATUS |
|---|---|---|---|
| PASS | PASS | LIMITED_SHARED_OWNER | PASS |

## 対象と承認

- Math-Art-Lab の Issue #45／文書 Draft PR #46。対象の第1工程 HEAD `16a9f698d7333337a8a35d67c984fa22fa0be573`、tree `2bd6b2affb49ba0314d7dbb11375c44e8e14888b`、parent `760928a85ceaec7272a67473c2bc9632cec1c552`。報告ブランチは `codex/stage-ap-01-readonly-20261119`。[第1工程報告](phase-1-readonly-20261119.md)・[Issue #45](https://github.com/tetsujisugimori-coder/Math-Art-Lab/issues/45)・[Draft PR #46](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/46)
- 製品 Draft PR #44 の HEAD `bca7eb3abedf51679eaffff2f8eaee15b86b5ab6`、tree `9ede8fb01acb4e45d5c81bd9a17a82709f916f1e`。文書と製品は別の固定版。[Draft PR #44](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/44)
- 2026-11-19 JST の案件別所有者承認を適用。固定10件の Level 2、新規コピー・管理記録・同一所有者の別CLI監査・非機密結果の報告の範囲。実保存日から各1年を保持し、自動削除を禁止。削除・移動・上書き・対象変更は別承認。中央保全・監査統合規約 v0.2.0 採用 commit `4695c3ce2d61e66df0dd36a4312373459e1557d4`。[正式規約](https://github.com/tetsujisugimori-coder/git-preservation-gate/blob/4695c3ce2d61e66df0dd36a4312373459e1557d4/docs/v0.2.0/policy.md)

## A の実保存

通常の非昇格 Windows 所有者ログオンで実行した。元原票10件を直接開き、固定台帳の SHA-256 `79c286d55c22ed14886eb4cccefddd426700d8ff5c5213b3b0e1f69cf3988769` と、台帳が指定する集合・サイズ・ハッシュを確認。既存ACLを読み取り、元経路と承認先の親までの再解析ポイントを確認した。親には `OPEN_EXISTING` で `FILE_ADD_SUBDIRECTORY` のハンドル取得に成功し、新規領域の作成権を実測した。

承認先 Windows Archive の案件領域 `Stage-AP-01-20261119` を排他的に新規作成し、その `originals` 配下に固定10件を元の相対名で保存。ファイルを排他的に新規作成し、書込結果を flush してから保存実物を開き直した。A の自己照合は名前集合・実サイズ・SHA-256・全バイト10/10件一致、コピーコマンド exit 0。保存は **2026-11-19 08:52:55.577082〜08:52:55.582150 JST**。コピー失敗・欠測・再試行は0件。

| 管理記録 | Bytes | SHA-256 |
|---|---:|---|
| 固定台帳 `intake-manifest.json` | 1,826 | `79c286d55c22ed14886eb4cccefddd426700d8ff5c5213b3b0e1f69cf3988769` |
| `save-receipt.json` | 24,413 | `8ecd2155280832ebbacf2f089cb7a59e766797a9876ed5b158be7bbf67f2ae86` |
| `save-manifest.json` | 1,629 | `fc14278bd9a3cc45af132ba09b79b01bb847ecaf8ff3bc5e9de85b6e97ba3faa` |
| `save-digests.json` | 312 | `7e8766c9676510c880985dfc931e07951d868531d7bbcae05c0f941557bcc6a3` |

保存receipt・manifest・ダイジェストは `originals` の外に作成した。ダイジェストが receipt 自身の実バイト長とSHA-256、および保存manifestの同情報を保持する。固定台帳と元領域の補助ファイルは固定10件の対象外。全10件の保持期限は **2027-11-19 JST**。receipt に各実保存時刻の JST、UTC、タイムゾーン、保持期限を記録した。

## B の独立再取得

同一所有者・同一ホストで、正規 Windows アプリ版 Codex CLI 0.170.0 の別の新規セッションを `gpt-6.2-sol` で起動した。検査コマンドは標準の読み取り専用 Windows サンドボックス。CLI exit 0 と内部検証コマンド exit 0 を個別に確認した。独立検査は **2026-11-19 08:55:05.163〜08:55:05.345 JST**。

- 固定台帳を直接開き、固定SHA-256を再計算。B の Node 検証処理は固定集合から元と保存版をそれぞれ10件開き、サイズと SHA-256 を計算し、全バイトを直接比較した。両側79,422 bytes、各検査10/10件一致。
- receipt、manifest、ダイジェストを直接開き、実サイズ・実SHA-256、台帳と双方のパス対応、固定集合、承認・実保存日時・各保持期限を独立照合。保存実物の作成日・最終書込日の JST 日付も receipt と一致。
- A の自己照合フラグをBの判定根拠から除いた。所有者・認証基盤・ホスト・filesystem は共有し、セッション・実行プロセス・検査器を分離。区分は `LIMITED_SHARED_OWNER`。人的独立性と改変不能性は保証範囲外。固定対象はZIPではないため ZIP CRC は非適用。

案件専用のローカル証拠領域に実パス、トークンとセッション、前検査、各工程のコマンド・stdout・stderr・終了コード、B の個別照合結果を保持した。B の検証結果ファイルの SHA-256 は `40de1e02c50106c0e09236ade16105d4742d694235294ce98c1b6a2534d00200`。

## 次工程

第1工程原票の正式保全条件を充足した。隔離VM／外部Rの実原票は引き続き `NOT_OBTAINED`。AK01 は OPEN・回復保証 NONE、AK02 は OPEN・実体安全 UNKNOWN／物理検証 NOT_TESTED。実装への移行は `IMPLEMENT_ONLY=NO`、資格試験は `QUALIFICATION_RUN=BLOCKED`。次の実環境調査には対象VM・外部R・管理主体と読取権限の指定が必要。Stage AO 正式保全は PASS、製品PR #44 と文書PR #46 は Draft。
