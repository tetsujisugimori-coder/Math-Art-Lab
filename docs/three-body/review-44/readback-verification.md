# 描画経路修正後の最新検証（2026-11-10 JST）

総合PARTIAL。P2-01 PARTIAL、P3-01は実施範囲でPASS、P3-02 PARTIAL。限定マージ推奨NO。独立再レビュー待ちとする。

過去のfinal/afterという資料名は当時の候補名。最新はreadback-before（旧renderだけを復元）、readback-after（採用経路）、readback-long、*-readback.log。本書とreadback-integrity.jsonを提出ソースに対応付ける。

## 確認した描画問題と修正

Linux Playwright WebKit/DPR2の実アプリでは、正しいモデル値・arc引数・公開変換行列でもバッファー画素が参照位置と一致しなかった。小Canvasの矩形・パス・arc・shadow対照は正常。実寸法の7設定×3反復は全て同じモデル位置で、通常/発光OFF/遅延なし/buffer再初期化/opaqueは不一致、willReadFrequently:trueと初期readbackだけ一致した。発光や基本座標変換を原因とする仮説は不採用。

描画側getContextにwillReadFrequently:trueを指定した。設定ヒントの効果は実測したが、GPU/CPUの内部選択・GC・元の1249ms標本の直接原因までは特定していない。刻み・解像度・発光・ベクトル・履歴・モデルを削減せず、画素しきい値150も維持する。force-defaultは意図した旧経路の負対照。

## 同条件の旧経路／新経路（DPR2・飽和A/B・全表示・新規）

同じview/state/physics/HTML/計測器を用い、TB_RENDER_FILEだけで旧renderを復元。各3反復、3秒後の独立Worker要求からmain受理までを計測。med/p95/maxはms、n=3のp95はnearest-rankの最大値。純CPU時間・GPU描画完了・保証上限ではない。

| Browser/condition | 要求待ち 旧 med/p95/max | 要求待ち 新 med/p95/max | paint区間最大 旧→新 |
|---|---|---|---|
| chromium/full | 368.60 / 747.00 / 747.00 | 20.30 / 20.30 / 20.30 | 388.00→59.30 |
| chromium/no-canvas | 1.60 / 3.20 / 3.20 | 0.40 / 8.80 / 8.80 | 0.00→0.00 |
| webkit/full | 25.00 / 36.00 / 36.00 | 16.00 / 29.00 / 29.00 | 13.00→9.00 |
| webkit/no-canvas | 10.00 / 16.00 / 16.00 | 1.00 / 5.00 / 5.00 | 0.00→0.00 |

calculate最大は1呼出しの区間。原版cf80の大バッチと64step小区間を積分器のCPU性能比として比較しない。今回のreadback旧/新はどちらも64step。OS停止やGC等を含み得る経過区間であり、4msはpreemption保証ではない。

## 通常HTMLの全マトリクスと表示時刻

8条件×2 browser×DPR1/2×新規/同一Document累積×3反復＝192実行、取得エラー0。履歴short条件はstep0→8000で、前半が短履歴、後半は飽和へ入る成長条件。各グループの件数/中央値/p95/最大はreadback-after/summary.json。

通常表示5条件の即時DOM/Canvas不一致0/480、rAF後0/480、実drawOrbit引数の不一致0。診断で表示を無効化した条件を通常表示の一致判定に混ぜない。

## 安全停止144条件

6操作×2 browser×2 DPR×新規/累積×3反復。成功144/144、pause最大1.00ms、host要求→settled最大1138.00ms。停止後100msの追加step最大0、A/B不一致条件0、未確認実行0。

host時間には移送・actionability・最終rAF待ちも含まれ、Worker要求待ちとは別指標。要求瞬間の厳密な内部stepは未測定で、事前snapshot増分は上限値。visibility/pagehideは合成、motionはemulateMedia。受信後停止と要求配信待ちを区別する。

| Browser/action | n | host→settled med/p95/max | native event作成→capture最大 |
|---|---:|---|---|
| chromium/pause | 12 | 64.00 / 221.00 / 221.00 | 33.00 |
| chromium/escape | 12 | 28.00 / 437.00 / 437.00 | 171.60 |
| chromium/visibility | 12 | 31.00 / 525.00 / 525.00 | 0.10 |
| chromium/motion | 12 | 39.00 / 76.00 / 76.00 | 17.10 |
| chromium/switch | 12 | 57.00 / 661.00 / 661.00 | 0.10 |
| chromium/dispose | 12 | 25.00 / 30.00 / 30.00 | 0.40 |
| webkit/pause | 12 | 257.00 / 1138.00 / 1138.00 | 16.00 |
| webkit/escape | 12 | 45.00 / 132.00 / 132.00 | 18.00 |
| webkit/visibility | 12 | 32.00 / 115.00 / 115.00 | 1.00 |
| webkit/motion | 12 | 55.00 / 258.00 / 258.00 | 1.00 |
| webkit/switch | 12 | 144.00 / 329.00 / 329.00 | 0.00 |
| webkit/dispose | 12 | 53.00 / 109.00 / 109.00 | 0.00 |

## 飽和後60秒連続再生（各ブラウザー1回）

| Browser | 経過ms（要求後100ms含む） | 追加step | 要求待ちms | 停止後追加step | paint最大ms |
|---|---:|---:|---:|---:|---:|
| chromium | 60288.70 | 164863 | 27.60 | 0 | 433.50 |
| webkit | 60128.00 | 239823 | 10.00 | 0 | 26.00 |

これは各1回の有限窓で、数時間使用・実機性能・全時点の停止遅延上限の証明ではない。

## 数理・GUI・限界

物理核不変。numerical-bitwise.jsonの6窓で原版と全内部Float64/履歴一致。独立RK4・解析三角形・8の字約20周期・刻み半減収束はnumerical-reference-readback.json。unit-readback.log、typecheck-readback.log、build-readback.logを参照。

Windowsの最終GUIはgui-development-readback.log / gui-production-readback.log。16基本条件は各2テーマ×文字100/200%。Linuxの新作DPR2画素と既存wave失敗は過去CIに保存し、修正後の全回帰CIで確認する。

実機iPhone Safari、VoiceOver/NVDA、低性能実機、OS文字拡大・実際の非表示/BFCache、数時間連続使用、GPU描画完了は未検証。Windows Chromiumはheadless SwiftShader、WebKitはPlaywright版。内部原因不明のスパイクをGC/GPUのせいにしない。最終HEAD CIの確定結果はPR #44の検証コメントへ保存する。
