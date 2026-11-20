# Stage AG 原証拠保全

作業証拠：`.three-body-evidence/stage-ag/`。正常static/historical、旧W/Xログコピー、初期不一致、RED/GREEN、隔離したsource/claims反例と原票コピー、mock契約、source一覧を保持する。元AE/AF領域を更新しない。source-bindingとentry fixtureは後作成の対応契約で、過去実行時証拠ではない。

Windows保存先：`C:\Users\tetsu\Dev-Artifact-Archive\Math-Art-Lab\PR-44\` の新規Stage-AG領域のみ。専用preserve CLIは衝突をエラーにし、旧ファイルの削除・上書きを行わない。保存後に別Node processでファイル集合・size・SHA256を独立再読戻しする。manifest自体のSHAも別receiptに保存する。

実際の保存件数・bytes・manifest SHAと読戻し状態は最終PR/Issue報告、および専用の保全receiptを正本とする。投稿原文・API応答・再取得本文は提出後のterminal scopeへ別保存し、件数を区別する。未実施のscopeをLOCAL_BACKUP_VERIFIEDとしない。Windowsアクセス不可なら未達として記録する。

旧6原本NOT_OBTAINED、歴史runtime NOT_OBTAINED、全履歴LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS、REMOTE_BACKUP_NOT_UPLOADED。Stage AGの新scopeの読戻し成功を全履歴の完全保全へ昇格しない。

2026-11-15 JST
