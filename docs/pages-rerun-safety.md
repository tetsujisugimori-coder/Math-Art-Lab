# Pages 再実行耐性 — 第2工程B

基準 main: `4f84db018c3bd2f371cc66bffdd89a88bcb62b32`。
旧 Run 45644982922 の deploy 再実行は同名 github-pages が2件で停止。初回0件の根因は未確定。新 Run 45825345359 は公開成功。

## 第2工程B提出時の実装契約
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

## 第2工程Cの隔離試験（2026-11-27 JST）

第2工程Bの固定版 `e26b2b9b72299158295731361d55993234a238c0`（tree `5a55202256e2d00b0247629836f5968730bd7f68`）では、隔離試験38件中5件で公開前ガードを通過した。再試行ジョブの取得結果について、別試行のジョブ、取得件数不足、重複IDを検知できなかった。成果物一覧も取得件数不足を検知できず、展開結果が同じ別ZIPをValidateが記録したZIPのSHA-256に直接照合していなかった。

- APIの各ページの `total_count`、受信件数、IDの一意性を照合する。以前の公開ジョブはRun IDと試行番号も確認する。ページ間で一覧が変化して一貫性を確認できない場合は停止する。
- Validateが出力したSHA-256をダウンロードしたZIP全体に照合してから展開する。展開したファイル集合の照合も行う。
- `deploy-pages` v5.0.1は内部成果物一覧を名前で検索し、そこで取得したIDを公開要求に使う。REST側で照合したIDは同Actionの入力に渡せない。確認済みのIDを [Pages REST API](https://docs.github.com/en/rest/pages/pages#create-a-github-pages-deployment) の公開要求に直接渡し、内部一覧を再検索する経路を除いた。既存のPages環境、OIDC、並行実行制御、公開対象を維持し、`configure-pages` と `upload-pages-artifact` の固定版を使う。
- 最新mainをOIDC取得後、送信の直前に確認する。公開要求は1回だけ送信し、返ったデプロイIDの状態を確認する。既知IDの状態確認が時間切れの場合は取消要求を送り、公開結果の運用照合を求める。

[`scripts/test-pages-rerun-safety.py`](../scripts/test-pages-rerun-safety.py) をリポジトリルートで `python3 scripts/test-pages-rerun-safety.py` として実行する。Python 3とPyYAML、GNU Bash、jq、unzipを使用する。既存のNode依存関係には追加していない。YAMLの実際のBash処理を抽出し、HTTP境界とActionの入出力をテストデータで置換する。子プロセスの環境を作り直し、ネットワーク呼び出しはテスト用コマンドだけに解決される。Linux Debian 13、Bash 5.2.37、jq 1.7で修正後42/42件が成功した。

| 試験範囲 | 結果 |
| --- | --- |
| 初回、公開のみ再実行、全ジョブ再実行、前回Validateの出力再利用、異なる試行の成果物残存、複数ページ | **模擬成功**。期待するIDの要求を1回記録。GitHubによる実際の `needs.validate.outputs` 引き継ぎは未実測。 |
| 0件・重複、ID・試行・Run・SHA不一致、期限切れ、SHA-256欠落・不一致、ZIPと展開後の不一致 | **模擬成功**。公開要求0回。 |
| API障害、ページ欠落・重複、前回ジョブ・ステップ欠落、以前の公開ステップが開始済み、main更新 | **模擬成功**。公開要求0回。 |
| OIDC応答欠落、POST後の応答喪失・ID欠落、公開の終端エラー | **模擬成功**。OIDC欠落は0回。POST後の異常は1回から増えない。別試行で過去の公開開始を検出した場合も停止。 |
| PRおよびmain以外の公開阻止、公開権限・既存検証 | **静的照合**。公開ジョブの条件・環境・権限と既存検証の入口を確認。実PRのValidateと公開ジョブの状態はCIを参照。 |

[第2工程Bの正式CI](https://github.com/tetsujisugimori-coder/Math-Art-Lab/actions/runs/45880824250) は単体422件、開発回帰588件（2件スキップ）、本番スモーク448件が成功し、公開はスキップされた。回帰原票は [artifact 15147824979](https://github.com/tetsujisugimori-coder/Math-Art-Lab/actions/runs/45880824250/artifacts/15147824979) で、74,611,440 bytes、SHA-256 `53ece081a585b8539acb0354eadec0f38052c061f800d89106532b0c84940007`。取得時はRun IDとartifact IDで固定する。PR CIの名前に入る `github.sha` はPRのマージ候補SHAで、RESTの `workflow_run.head_sha` はPRのHEADを示す。リポジトリ内の[既存取得例](cooperation/verification.md#L39)はRun IDとartifact IDを使う。旧名だけで照合するリポジトリ外の手順は未確認。

### 残る確認事項

- [旧Run初回](https://github.com/tetsujisugimori-coder/Math-Art-Lab/actions/runs/45644982922/job/139331848658) はartifact `15040495550` の登録成功後約0.5秒で内部一覧に同名0件、[同Run再実行](https://github.com/tetsujisugimori-coder/Math-Art-Lab/actions/runs/45644982922/job/139878657468) は同名2件で停止した。[第1工程成功](https://github.com/tetsujisugimori-coder/Math-Art-Lab/actions/runs/45825345359) は同じmain SHAの別Runで公開した。初回に一覧へ表示されなかった基盤側の根因は **UNKNOWN**。旧RunでのValidate再利用の記録は、修正版の出力伝播の実証には使えない。
- 別Runには今の再送ガードは及ばない。公開状況を照合してから次のRunの扱いを判断する。main照合とPOSTは別のAPI操作なので、その間のmain更新との競合は残る。
- `Deploy Pages` ステップ開始後にOIDCやmain確認で停止した場合も、次回は同じRunで保守的に停止する。ログから送信開始前であることが分かる場合も、自動判定には使わない。送信結果の照合手順を優先し、横断用の永続状態は追加しない。
- GitHub Actions上での再実行による出力引継ぎ、アップロード直後の可視性、実サービスの公開受付・状態応答は未実証。PR CIでは公開ステップを実行しない。故障注入はPagesとOIDC権限を持たない隔離リポジトリを対象とし、利用または新設には別途承認を得る。実サービスでの公開可否は隔離試験と独立レビューの結果を踏まえて判断する。
- 判定の適用基準は [git-preservation-gate v0.3.0](https://github.com/tetsujisugimori-coder/git-preservation-gate/blob/79740b1dfb3d9990094f6b847dcf619fc6edcb61/docs/v0.3.0/policy.md)。第1工程の原ZIPの恒久保存と独立再取得は記録未確認。第2工程の原ZIPには案件別の承認済み永続先を確認できず、取得・サイズ・SHA-256・ZIP検査までを実施。固定版のCI原票の保全状態はCI結果と合わせて個別に記録する。
