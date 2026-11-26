# Pages 再実行耐性 — 第2工程B

基準 main: `4f84db018c3bd2f371cc66bffdd89a88bcb62b32`。
旧 Run 45644982922 の deploy 再実行は同名 github-pages が2件で停止。初回0件の根因は未確定。新 Run 45825345359 は公開成功。

## 実装契約
- Validate の成功時出力で検証済み artifact ID、ZIP digest、生成 attempt、ファイル集合 digest を受け渡す。
- 同一 run の成果物を名前・ID・期限・digest・head SHA で検査し、ID で取得する。取得後のファイル集合 digest を確認する。
- Pages 成果物と回帰原票の名称を run/attempt で分離する。既存成果物を削除・上書きしない。保持期間は従来通り。
- Pages artifact の登録結果 ID と REST 一覧の同名一意性を確認し、固定 Action にその名前を渡す。REST と Action 内部の一覧の可視性が異なる場合は公開 Action が失敗し得る。
- 同じ run の全ての以前の attempt で deploy ジョブまたは Deploy Pages ステップが明示的に skipped である場合に限り再実行を許す。記録不足、Action への進入、通信エラーは停止。Action が送信前に失敗していても保守的に停止する。
- 別 run の不明な送信結果はこのガードの対象外。運用者が公開状態を照合するまで新規 run を開始しない。自動的な横断再送防止は未実装。
- main の直前照合は古い SHA の公開を抑止するが照合から送信までの競合を完全には排除しない。
- PR は従来どおり検証のみ。main 直変更・本番故障注入は禁止。

## 第2工程Cの受入試験
本番公開権限を持たない隔離環境で、実際の YAML のガードを使用すること。模擬だけでなく、可能なら隔離リポジトリで Actions の attempt API と成功済みジョブ出力の引継ぎを確認すること。
1. 初回、公開のみ再実行、全工程再実行。
2. 成果物0/1/2件、異なる試行の残存、同名別ID、期限切れ、欠落digest、ZIP・ファイル集合digest不一致、別SHA・別run。
3. attempt API のページング、ジョブ/ステップ欠落、skipped、failed、cancelled、成功、API失敗。Action に入った過去試行はすべて停止すること。
4. Pages ID 不一致、RESTと内部一覧不一致、main更新、PR/feature dispatch、結果不明の送信。
5. 旧原票の非削除・非上書き、既存検証工程の維持。
6. 回帰原票の命名変更に依存する既存取得手順を確認する。

第2工程Bではコード作成と静的確認まで。上記試験、正式CIの完了確認、独立レビュー、恒久保全、本番公開は別工程。マージ不可。
