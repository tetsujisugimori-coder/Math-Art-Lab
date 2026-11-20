# 検証と独立レビュー

製品model/state/render/view、5プリセット、dt、尺度、6000/1200履歴、Pagesを変更していない。診断bundleだけに測定用注入を行い、本番importには含まれない。

## 数理・状態

同一Node engineで基準b07と5プリセット＋A/Bの6条件の全Float64 bit、全履歴hashが一致。[原値](raw-results/numerical-bitwise.json)。browser原測定も同engineの基準モデルを独立に再積分し、回収可能なphase・履歴JSON・Canvas実描画座標を照合した。異engine間の丸め差を同一bitと主張しない。旧publicは公開A位置だけで、内部phase全体はNOT_TESTED。

独立RK4照合・約20周期（t126.518）の8の字の最大規格化E誤差2.0425111e-7、RK4位置RMS5.1662067e-5。三角形解析位置RMS9.1826258e-7。刻み半減の位置RMS4.48995e-5→1.12252e-5→2.80633e-6→7.01583e-7で約4倍収束。5プリセットのRK4・保存量・二重星／接近／逃走の既存判定も再実行し、閾値を変更していない。[独立計算](raw-results/numerical-reference.json)。

ローカル140診断runの機能失敗0、21,796フレーム標本のstep不一致0。受信後pause内・停止後の追加step0、A/B同時刻、教材安全停止3件のepoch増加・復元・停止維持を確認。性能予算逸脱・未取得は別表に残す。

## 自動試験

全単体441/441（33files）、新規診断7件。型検査、開発mode build、本番build成功。ローカル第17作の開発GUI48/48・本番GUI48/48成功、reduced motion・両engine・各幅・テーマ・文字倍率・Canvas/DOM時刻・DPR2・停止／教材／近接／旧作品復帰を含む。最終HEAD全作品回帰の確定結果は原JSONおよびPRの最終CIコメントに記録する。過去HEADの成功を流用しない。

## 変更差分・原証拠の独立点検

提出前の単体再実行はsandbox内esbuildが親directoryのread拒否で起動失敗（試験0件）。許可された実行環境で再実行し441/441成功。起動失敗を試験成功に数えず、両記録をraw-resultsへ保存した。

ユーザー依頼11.10に基づき、実装担当とは別のread-onlyレビューを実施。140/140原JSONのencoded/decoded SHA一致、frame・stop・教材・数理原値・製品とStage P非差分・性能PARTIALを独立再計算で確認した。指摘されたCI途中失敗の伝播、manifest予定run完全性、pause内部追加step検査を追加した。未解決の重大コード指摘なし。これは外部の独立再レビュー／最終HEAD CIを代替しない。

実機iPhone Safari、VoiceOver/NVDA、物理入力、低性能実機、kernel ETW、GPU提示、自然長区間への停止HIT、完全な累積長期sessionは未検証。総合PARTIAL、マージ推奨NO、Draftで外部独立再レビューを待つ。
