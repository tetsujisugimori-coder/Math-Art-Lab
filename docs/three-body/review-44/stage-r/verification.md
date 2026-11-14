# 検証契約と結果

## 分類

| 分類 | 内容 |
|---|---|
| A_MATH | 独立基準／内部数理の不一致 |
| B_STOP_DISPLAY | 停止、A/B、表示step、破棄の契約違反 |
| C_PERFORMANCE | 事前予算超過・未測定項目 |
| D_MEASUREMENT | 計測process、validator、sender、traceの障害 |
| E_SCREENSHOT | 撮影timeout、APIエラー、取得画像の不整合 |
| F_EVIDENCE | manifest/raw/summary/index/画像/traceのhash・集合不一致 |
| G_NOT_ACQUIRED | 未実行、未終了、環境BLOCKED、取得不能 |

各issueに実行ID、code、scope、原エラーを保持する。rawの取得結果と解析後のrunOutcomesを別fieldへ保存し、counts.failedは取得失敗、evaluatedRunCountsは数理・表示・性能の解析も含む結果を示す。

## 診断CIの負対照

単体18件を追加し、全459件成功。撮影失敗後の次suite実行、環境・raw破損時BLOCKED、summary欠落、分析ID集合の破損、artifact改変、子processの非zero終了、checker未完了／失敗、専用senderの別PID・配送失敗、撮影準備を含む5秒deadlineを検証した。失敗processや分析中断が最終PASSへ上書きされる穴を独立点検で発見し、負対照を追加して修正した。

初期のsender2件は親起動引数の継承とWindows fork IPCのclose待ちでtimeoutした。子のexecArgvを明示し、process exitを確認してstdioを解放する方式へ修正した。試験timeoutは5000msを維持した。別の全単体実行では既存8の字20周期試験にもtimeoutが1件発生した。同時のブラウザー／数値処理負荷が混入しており、その単独因果はUNKNOWN。失敗ログを保持し、後続の全459件成功と区別する。

## 数理・GUI

基準875との5プリセット＋A/Bの6条件でFloat64 bit・全履歴hash一致。独立RK4、8の字約20周期、正三角形解析、刻み半減の二次収束を再検証した。browser reportの基準b07は875と同じ製品blobである。異engine間のbit一致は保証しない。

型検査、開発／本番build成功。Windowsの正式な第17作開発48/48、本番48/48、Chromium/WebKit、各幅・両テーマ・reduced motion・文字倍率・DPR2・Canvas/DOM確定step・教材復元・破棄を検証した。全作品の正式CIは最終提出HEADで再実行し、結果をPR対応コメントへ記録する。

独立したread-only点検で、撮影対照、自然HIT5、native traceのCPU/wall、状態不変、source保全を確認した。外部の最終独立再レビューは提出後に依頼する。

## 状態と完全性

suiteごとにPLANNED、RUNNING、PASS、FAIL、PARTIAL、NOT_TESTED、BLOCKEDを保存する。必須準備の失敗時も初期計画と最終BLOCKEDを保存する。各suiteの失敗でjobは失敗状態を保持し、明示条件で独立suiteを実行する。環境または証拠整合にblockerがあれば後続の子processを起動しない。

最終集約は全raw、manifest終端状態、run summary、解析summaryのID集合とpath、encoded/decoded SHA、画像、trace、artifact indexを検査する。validatorが未完了または非zeroなら失敗を保持する。artifact-indexは取得済みファイルすべてと完全性fieldを持ち、撮影失敗を含む部分証拠を完全と表示しない。
