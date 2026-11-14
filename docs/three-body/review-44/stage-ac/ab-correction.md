## Stage AB報告の文字化けに関する訂正説明

対象HEAD：fe0cb5f5d9a885b6087adbf2c27c949ab171d2c8。
対象投稿：[PRコメント6866442032](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/44#issuecomment-6866442032)、[Issueコメント6866442406](https://github.com/tetsujisugimori-coder/Math-Art-Lab/issues/43#issuecomment-6866442406)。

旧投稿の日本語が多数の「?」へ置換されています。これは表示フォントだけの問題ではありません。ローカル送信元とWindows保管コピーのreport.mdも同じ破損を含み、サイズ8,861 bytes、SHA-256はfcbd852895be9d78b31fbe3dca69e85190bb598f047308146e38815fc0e83324です。旧投稿と旧原票は削除・上書きしていません。

**この説明は新規に作成した訂正説明であり、欠落した原文復元ではありません。** 限定した既存投稿原票・保管コピー・Git追跡資料では、旧報告の完全な正常日本語原文はNOT_OBTAINEDです。内容を推測して旧報告全文を再構成しません。

正常なUTF-8スクリプトの直接実行と、既存PowerShellのnative stdinパイプ経由を各1回比較しました。直接実行では日本語が保持され、パイプ経由では「?」に置換されました。現在のPowerShell OutputEncodingはus-asciiです。旧送信時のstdin生bytesは未取得なので、当時の全処理境界を直接観測したとは主張しません。確認できるのは、旧報告がAPI送信前の保存ファイルですでに破損していたことと、同じ方式で置換を再現できることです。

以下はGit追跡のStage AB検証資料および正常な独立レビュー5904109330から確認できる事実の要約です。

- 総合PARTIAL、マージ推奨NO。製品変更0件、ブラウザー起動0件、原停止試験0件、性能改善率NOT_TESTED。
- 診断契約190/190成功。正式CIの単体696/696・型・build成功、GUIはNOT_RUN。ローカル690成功/2失敗とStage W/Xのfailureは残存。
- 新規隔離ZIP329件とmanifest対象328件の差はmanifest自身1件。保管差分1118→1131は提出記録13件。これらは旧6原本の回収ではありません。
- Stage ABの取得証拠740件の保管台帳はありますが、そのうち旧投稿報告の日本語破損もそのまま保管されています。SHA一致は内容の言語的な正しさを保証しません。
- 旧6原本NOT_OBTAINED、全履歴LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS、REMOTE_BACKUP_NOT_UPLOADEDを維持します。

Stage AC第1段階では、UTF-8ファイル・API要求・応答・再取得本文の正規化なし全文一致に加え、日本語の代表文字列、対象HEAD、旧投稿との対応を検査します。本文が同じように破損しているだけの一致を合格にしません。

本投稿は実測開始承認ではありません。PRはDraft、IssueはOPEN、auto-merge無効・未マージを維持し、独立再レビューを依頼します。
