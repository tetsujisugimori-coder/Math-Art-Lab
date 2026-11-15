# Stage AG 最終source成果

A. 技術的限定PASS、総合PARTIAL、マージ推奨NO。数値一致と時間・環境・timeoutの同等性を分離する。

B. 基準HEAD `8e6b3803af4a24a7920858dfb9b38cea5dcac961`、tree `bcebe1e030dcfe8ce81db90a3139396fc882da33`。開始時remote/local一致、作業差分なし。最終HEAD/treeは通常commit/push後のGit記録・最終報告へ固定する。

C. 変更はAG検証器・mock・fixture・既存browser-free CI・証拠/文書・LOGのみ。変更一覧は提出時のchanged-files.jsonとGit記録。製品・原数理テスト・初期条件・許容値・5000ms・AB/AC policy無変更。

D. 10段階の[対応表](execution-path-map.md)と機械表を作成。source、主体、計時範囲、証拠、帰属状態を固定。

E. 原body/RMSのAST対応、wrapper引数/戻り値/副作用、referenceの2counter挿入と逆変換、保存bundle/source snapshot集合の整合を限定確認。

F. collection、TS変換、module範囲、worker/setup、expect context、cleanup、5000/30000msはDIFFERENT。native/OSはUNKNOWN、原Vitestの対応区間・歴史runtimeはNOT_OBTAINED。実時間NOT_COMPARABLE。

G. 25 source/claims反例と4原票コピーを拒否。独立レビュー3反例RED→GREENを保存。AE/AF134+AG43=177成功。旧extractのみの限定REDは新AGのREDと区別する。

H. 既存4件のみread-only再解析。body wall 1392.0457/3163.9133/3172.9999/1415.4547 msは過去原票の値。新しい測定値ではない。4件のbit/reference bit/history/count/実行・観測statusを確認。runtime NOT_OBTAINED、POSTHOC_VERIFIED。

I. 原timeout原因はUNKNOWN。[仮説表](hypothesis-matrix.md)でsourceから棄却できる主張と区別不能な候補を分離。residualをOS待機へ推測配分しない。

J. 4件の数値同等性、保存済み6条件bit/history照合6/6と製品source無変更を確認。型/build成功。追加性能測定0。

K. ゲート監査PASS。browser/CDP/GUI/原停止・ABBA再実行・retry/replacement・workflow手動起動0。

L. 最終HEADの正式CIは通常push後に取得し、別receiptへ固定する。W/X旧failureを保持、skipは未実行。ローカル177成功と正式CIを別記録にする。

M. Windows新規Stage-AG領域へ保存し、別processで集合/size/SHA照合。確定件数と状態は保全receipt・最終投稿を参照。旧6原本欠落・履歴部分保全・遠隔未保全を維持。

N. 別担当独立レビューで3誤PASSを修正し、独立14反例全拒否。技術的限定PASS。正式CI/保全/投稿はレビュー対象外。

O. bundle派生再build、過去worker実設定、Node native/OS全面束縛は未証明。必要な追加実測は別固定計画・反証/停止条件・AB/AC承認を要する次工程案のみ。根因UNKNOWN、改善率NOT_TESTED、原停止NOT_TESTED。

P. 既存PR44/Issue43へUTF-8原文を投稿し、API応答と再取得本文の全文一致を検証・保全する。Draft維持、auto-merge無効、mergeなし。

2026-11-15 22:00 JST
