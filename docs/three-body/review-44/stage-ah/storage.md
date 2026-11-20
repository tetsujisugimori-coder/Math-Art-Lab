# Stage AH保全

Windows専用新規領域：`C:\Users\tetsu\Dev-Artifact-Archive\Math-Art-Lab\PR-44\Stage-AH-*`。旧AF/AG/他stageの削除・上書き・移動は行わない。アクセス不可ならBLOCKEDとし、無断の代替保全を成功扱いしない。

今回のpayloadは静的source/計画、POSTHOC解析、SYNTHETIC反例、mock回帰、Git/CI/API証拠。新しい実測原票は存在しない。原証拠と後作成データをevidence-indexで区別する。旧4/6条件などは既存証拠のSHA参照であり、AH実測原本として作り直さない。

保全CLIは排他的copyとmanifest作成を行い、別processで集合/数/size/全SHA256を読戻す。manifest.json自身はsidecar SHAと、capture時に外部receiptへ取り出したSHAの両方と照合する。manifestとsidecarの同時改変も外部receipt不一致として拒否する。

最終HEADのCI取得後にimplementation scopeを保存し、件数・bytes・manifest SHA・readback状態を最終PR/Issueと外部receiptへ固定する。UTF-8投稿原文・API応答・再取得本文は別terminal scopeへ保存し、全文一致と集合/size/SHAを再照合する。未実施のscopeをVERIFIEDにしない。

旧6原本NOT_OBTAINED、歴史runtime NOT_OBTAINED、全履歴LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS、遠隔REMOTE_BACKUP_NOT_UPLOADED。新AH scopeの成功は全履歴完全保全を意味しない。

2026-11-15 JST
