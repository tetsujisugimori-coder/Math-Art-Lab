# Stage AF: 計測原票の整合性と解析器の独立検証

A. 総合PARTIAL。P2-AE01 PASS、P3-AE02は実装・固定原票照合の範囲で限定PASS。timeout解消ではない。新規性能計測0。

B. 基準HEAD `92296523481913720ead53fc800a9df291bc649d`、tree `d4ec911d200199841dab82c6cdd0be249af0cdfe`。ローカルとGitHub一致、開始時差分なし。最終HEAD/treeと正式CIの確定値はcommit後のPR/Issue投稿原文・API応答・readbackに保存する。

C. 変更一覧は changed-files.json。診断器、監査器、mock試験、既存browser-free workflow、証拠索引、本文、LOGのみ。

D. P2: 固定6カテゴリ・呼出回数・観測回数・有限非負値を検査。元原票からbody envelopeを再計算し、category wall総和と未分類を独立照合。許容差はprotocol.mdで検証前固定、後付け緩和なし。OFFの未分類nullと内部accumulator0・観測回数0を厳密検査。wall msとprocess/thread CPU usは混算しない。

E. P3: run-plan、ID/mode、manifest HEAD/tree、source-set、bundle/bootstrap/source snapshot、生result/clock bytes・size・SHA、全checkpoint prefix、cohort、最終summaryを照合。新runnerは実Git HEAD/treeの起動前・receipt作成時照合と実行時receiptを将来用に追加。新bootstrapはID/modeを原票にも固定。今回は実行しない。過去原票は変更しない。

F. 修正前RED: P2の13反例中10誤受理、P3の4反例全誤受理。正常原票受理。GREEN: 実原票コピーP2 13/P3 12反例すべて拒否。NaN/InfinityはJSON保存時nullになるため、in-memory NaN/Infinityもmockで個別検査。旧AE fixtureの矛盾したwall総和を修正し、既存契約回帰を維持。最終mock件数は contracts.json。

G. 保存済みae-A1 OFF、ae-B1 ON、ae-B2 ON、ae-A2 OFFの4件をread-only再監査。ローカル・Windows保全版とも正常PASS。結果は reaudit.json。execution/observation/count/Float64 bit/reference bit/履歴hash/計測区間を確認。再実行・追加・retry・replacement0。

H. 4件の数値同等性一致、既存6条件bit・全履歴hash照合6/6一致。製品source無変更。数値同等性は元Vitest成功や性能改善を意味しない。型/build成功、既存chunkサイズ警告保持。

I. 過去4件の実行時result/clock SHA固定はNOT_OBTAINED。今回の索引はPOSTHOC、照合成功はPOSTHOC_VERIFIED。実行時に取得した証拠へ昇格しない。trusted indexは対象原票とは別保全し、任意のresealは新監査として扱う。Node native/OS/全Vitest collectionの全面束縛はUNKNOWN。

J. gates.json: PR44の既存禁止ゲートPASS。製品・原テスト・5000ms・数学的許容値・AB/AC policy無変更。browser/CDP/GUI/原停止・追加ABBA・ZIP/Python性能試験・workflow手動起動・merge/auto-merge0。

K. 正式CIは通常pushで発生するものを確認する。基準HEADはsuccess6/failure2/skipped7。W/Xの既存failureを保持、skipは未実行。最終HEADの結果は投稿receiptへ固定する。契約の起動時sandbox/esbuild読取りエラーは観測失敗として区別し、権限付き実行の成功で過去記録を消さない。

L. Stage AF専用Windows領域へ新規成果・反例コピー・source一覧・manifest・LOGを排他的保存し、別processで集合/size/SHAを再取得照合する。成功範囲は今回AFのみ。旧6原本NOT_OBTAINED、全履歴LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS、遠隔REMOTE_BACKUP_NOT_UPLOADEDは維持。

M. independent-review.md: 別担当の独立レビューP2 PASS/P3限定PASS。検出された4点を修正・再確認。正式CI/保全/投稿の完了はこのレビューの対象外。

N. 根本原因UNKNOWN、改善率NOT_TESTED、過去実行時帰属NOT_OBTAINED。試験FAIL、観測失敗、証拠欠落、未実行、UNKNOWNを成功扱いしない。将来用runnerはmock/静的検査のみ、実計測による検証はNOT_RUN。

O. 既存PR44とIssue43へUTF-8原文を投稿、API応答と再取得本文を照合する。指摘はreview5910307815の本文内2件なので、指摘別の対応返信を既存PR conversationへ投稿する。

P. PR44 Draft維持、Issue43 OPEN、マージ推奨NOで停止。

2026-11-15 21:17 JST 追加独立検証：開始時HEADは既存Stage AFコミット `7ed29986bfc987636a2de97a234be35c7ccbd345`（tree `72e65d1842e7c4c62185083121333c17823c5fef`）でGitHubと一致、作業差分なし。指定AE基準の後続差分を確認して保持した。

独立レビューで将来形式のreceipt全欠落を初回監査が過去形式として受理する漏れを検出。新manifestと固定計画のruntimeBinding宣言、runnerの必須契約、新原票ID/modeを含む監査のreceipt必須検査を追加。追加2反例は修正前RED 2誤受理→修正後GREEN、AE/AF契約134/134成功。旧原票・旧RED/GREENは上書きしない。追加結果はreceipt-regression.json。型検査・build成功（既存chunk警告）、正常4原票の再照合PASS、既存Windows領域1,189ファイル/20,268,273 bytesの別process再照合PASS。新規計測0。追加差分source一覧・検証記録・投稿原文と最終CIは専用追加領域に保全する。
