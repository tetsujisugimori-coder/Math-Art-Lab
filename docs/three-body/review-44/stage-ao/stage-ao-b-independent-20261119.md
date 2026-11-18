# Stage AO-B 保存実物の独立再取得監査（2026-11-19 JST）

**総合 PASS（Stage AO 正式保全）。正式保全 HOLD を解除し、`DESIGN_ACCEPTED=YES` と判定する。** B は保存担当 A と別の新規 Codex CLI セッションから、承認済み Windows Archive の Level 2 保存版16件と元原票16件を直接開いた。両側とも計1,052,533 bytes。ファイル名集合、各サイズ・SHA-256、全バイトが一致し、欠落・余分・読取失敗は0件だった。

## 固定版と承認

- PR #44 製品 HEAD `bca7eb3abedf51679eaffff2f8eaee15b86b5ab6`、tree `9ede8fb01acb4e45d5c81bd9a17a82709f916f1e`、parent `c499e58bfde6b9bdebaff91ee359dea6a39c7c1c`。報告ブランチ `codex/stage-am-safety-gates-20261118` の基点は保存報告 `a84fe161594108dbf1ed03680301b279fce814fb`、tree `69af2f4f507a65cc885a8e59a82c69ec26a861d4`。[保存報告](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/44#issuecomment-6983402427)・[指定レビュー](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/44#pullrequestreview-5960085646)
- 所有者承認 `5bafd6dfdafc4457517d7ac8920c636e213bce58` と中央保全・監査統合規約 v0.2.0 採用版 `4695c3ce2d61e66df0dd36a4312373459e1557d4` を適用。固定16件の Level 2 分類と承認済み保存先を使用した。[案件承認](owner-archive-approval-v020-20261118.md)・[所有者承認レビュー](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/44#pullrequestreview-5958762993)・[中央規約](https://github.com/tetsujisugimori-coder/git-preservation-gate/blob/4695c3ce2d61e66df0dd36a4312373459e1557d4/docs/v0.2.0/policy.md)

## B の実行と取得結果

正規 Windows アプリ版 Codex CLI 0.170.0、明示モデル `gpt-6.2-sol`、ChatGPT ログインで、新規セッションを開始した。起動主体は同じ通常の非昇格 Windows 所有者、検証コマンドは Codex 標準の読み取り専用 Windows サンドボックストークン、Medium integrity で実行された。PowerShell の読取事前確認は exit 0。監査本番は CLI exit 0、CLI 内の検証コマンドも別に exit 0。コマンド実行・実物の結果は新規イベントログで確認した。

先行試行ではアプリ版の `registered Core launch requires an installed app` と、スタンドアロン版 0.136.0 の既定モデル非対応（exit 1）が報告されていた。今回も作業用サンドボックスから直接 CLI を起動した試行は通信段階で停止した。通常所有者ログオンからの正規 CLI 起動と、その子セッション内の読み取り専用 PowerShell で実物照合が成立した。

| 確認項目 | 独立実測 |
|---|---|
| 取得経路 | 固定索引が指す元原票ディレクトリと、保存報告・承認・receipt が対応づける Windows Archive の Level 2 ディレクトリから、それぞれ直接取得 |
| 固定索引 | SHA-256 `d8331f268423570294f1e358ad88cfc73d0342ecfed1c3c0aeed9a85b918f068` を再計算し、一致後に参照 |
| 保存実物の集合 | Level 2 に16件。欠落0、余分0。receipt と監査試行記録は親ディレクトリの管理ファイル。元領域の補助4項目は固定対象の外 |
| サイズ・SHA-256・全バイト | 元と保存版を個別にバイナリで開き、両側の実サイズと SHA-256 を新規計算。固定値に16/16件一致。元と保存版の全バイトも16/16件一致。両側計1,052,533 bytes |
| 保存 receipt | SHA-256 `2df5390f9d0950eef827f81b6c721c94fc6b069c71d8fdddeeef7ef9aa5444a9` と一致。16件の元・保存先、サイズ・両 SHA-256、固定索引・承認・規約の参照が一致 |
| 保存日時・保持 | receipt の保存時間帯は2026-11-19 00:30:44.807988〜00:30:44.837865 JST。各項目の日時が範囲内で、保存版の作成日・最終書込日も同日。全16件の保持期限は2027-11-19 JST。自動削除不可。削除・移動・上書きは別途所有者承認 |
| 既存3件 | 保存版3/3件、計906,037 bytes を開き、固定サイズ・SHA-256 と一致。保持期限2027-11-18 JST。固定版に対する既存の全バイト・209 ZIP entries・manifest・Git対応31件の独立監査結果を適用 |

監査 CLI の実行は 02:11:08.693228〜02:11:24.321993 JST。ファイル検査は 02:11:19.288647〜02:11:19.357898 JST。B は独自の検証器でバイナリを直接比較し、A の一致フラグを判定入力から除いた。同一の所有者・ホスト・filesystem を共有し、CLI セッション、検証プロセス、検証器、結果ログは別。区分は `LIMITED_SHARED_OWNER`。人的な第三者独立性や改変不能性の保証は範囲外。

## 四状態と受入

| 対象 | CUSTODY_STATUS | VERIFICATION_STATUS | INDEPENDENCE_STATUS | ACCEPTANCE_STATUS |
|---|---|---|---|---|
| B監査原票16件 | PASS | PASS | LIMITED_SHARED_OWNER | PASS |
| 既存3件 | PASS | PASS（同一固定版の先行監査を適用） | LIMITED_SHARED_OWNER | PASS |
| Stage AO 正式保全 | PASS | PASS | LIMITED_SHARED_OWNER | PASS |

保存承認、実保存と receipt、保持条件、必要な独立再取得が揃ったため、Stage AO 正式保全の HOLD を解除する。既存の `DESIGN_REVIEW_ACCEPTED=YES` と、承認先の独立再取得を要件とする Stage AN の設計受入基準により、`DESIGN_ACCEPTED=PENDING_ARCHIVE` を `DESIGN_ACCEPTED=YES` に進める。PR #44 は Open／Draft、Stage AN 総合は PARTIAL。物理安全、AK01/AK02、外部R、IMPLEMENT_ONLY、QUALIFICATION_RUN の各判定は従前どおり。[設計受入基準](../stage-an/README.md)・[先行の独立技術監査](archive-audit-b-20261118.md)

保全受入の残作業はない。既存3件の ZIP 内部・Git対応の再検査は固定版一致により先行結果を適用し、今回16件への ZIP CRC は非適用。新規の監査記録は案件専用のローカル領域に保存した。識別情報、実パス、固定索引、各実測値、コマンド、stdout・stderr・終了コードを同領域で追跡できる。結果ファイル `verification.json` の SHA-256 は `cafe67e6bc66c4f367159c6009536decdc029ac7f7772606253024802a5ceb39`。
