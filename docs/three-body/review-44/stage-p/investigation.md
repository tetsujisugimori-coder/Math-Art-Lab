# Stage P：長時間区間と入力遅延の調査

基準は `b1d24d8098abcbcb8530f7a459387e38265ef2b7`、PR #44、再レビュー5830894813。開始時のremote/local HEAD一致、clean、両CI成功、Draft、auto-mergeなしを確認した。製品コードの変更を目的にしない。

## 先に確認できた証拠の限界

- 旧1249ms、readback-longのpaint433.5ms、calculate432.5ms、Worker待ち27.6ms、停止144条件のhost→settled1138msは別の尺度／実行。相互の因果を推定しない。
- 既存の長時間試験は区間のduration分布・最大を保存しているが、各最大区間の開始／終了と同時刻のGC・taskを保存していない。後からtraceへ対応付けられない。
- 旧GC記録は一部の短い固定バッチのみ。長時間再生中のGC、OSのcontext switch、GPU提示完了は未測定。
- 旧計測器はVerlet／保存量等を毎呼出しでperformance.nowにより包み、1/32の値を配列へ蓄積する。負荷の候補H8であり、原因確定ではない。

今回、同一の診断フックに対する追加計測OFF／phase計測／CDP trace／旧計測器を比較する。計算状態、描画寸法、履歴、表示点数を保存する。長い区間と独立Worker要求の到着が重なった実例を区別し、重ならなかった実行も残す。

最終結果はこのディレクトリの各報告とPRの最終HEAD CIコメントへ固定する。根本原因不明はUNKNOWNのままにする。

## 計測器の途中修正（失敗も保存）

最初のsmoke後、全過去spanの走査を終了時刻で打切る探索へ変更し、測定中の全report再gzipを1Hz journal追記へ変更した。以後の条件はその版で比較する。

long-chromiumの旧計測器条件では、旧変換が作る `function pause(){` と、新フックが期待した `function pause() {` の空白差により診断bundle生成に失敗した。selector待ち30秒の失敗を保存し、物理／性能の結果とは数えない。正規表現anchorとHTTPエラーの早期採取へ計測器を修正し、別のlegacy-smoke／legacy runで再測定する。制限時間の延長や失敗のskipは行わない。

probes-chromiumのEscape試行はcontinued-step／timer残存を検出した。T2自体がなく、合成keydownをwindowへdispatchしていたため、documentに登録された製品のhandlerへ届いていなかった。製品の「受信後停止」不具合と混同しない。失敗425追加stepとtimer=trueを保持し、dispatch先をdocumentへ修正して別stops suiteで3反復する。通常のPlaywright keyboard経路も既存GUIで再検証する。

初期matrix／ablationの一部表示OFF条件は、最初のrAFより先に描画をOFFにし、Canvas backing寸法が初期値のままになる交絡があった。CSS寸法は保存しているが、backing memoryが違うため厳密なCanvas成分費用の比較には使わない。全表示ONで初期化した後にactivateで診断flagを適用する方式へ修正。飽和componentsと長時間causalで再測定する。全ONの60秒・public5分の結果はこのOFF交絡に該当しない。

neither条件の初回は、測定・停止・データ回収後のTracing終了通知が既定の10秒以内に届かなかった。原データとエラーを残す。入力応答データを消さず、traceについてはFAILED／NOT_TESTEDとする。制限時間は延長しない。

測定中にツールを修正したため、各runのtoolHashesを記録する。後半のcausal以降は実行した4ファイルをSHA256のディレクトリに保存した。causal版は既知の差分を戻した内容が記録済みSHA256と完全一致することも確認した。初期pilotの全版を復元できたとは主張しない。`tool-versions-recovery.json`と各runのarchivedフラグを参照する。

全件の事後解析の初回は、実験状態の全objectをPlaywright基準計算へ転送する処理が重かったため中断した（終了コード-1を保存）。全倍精度値・履歴を含むJSON文字列へ転送表現だけを変え、同じ厳密比較を再実行した。これは測定終了後の解析工程であり、保存した性能標本や製品動作を変更していない。`full-analysis-attempt-1.log`と`final-local-status.json`を残す。

事後解析2回目は全runの解析JSON／表を書いた後、HTTP生成失敗の3runにoptionsがないことを最終console集計が考慮せず終了コード1になった。欠測を保持したままmetadataとguardを修正し、全件解析を再実行した。失敗runを除去して成功率を上げたのではない。`full-analysis-attempt-2.log`と`analysis-attempt-2-status.json`に保存する。

## 調査の到達点

総合PARTIAL、原因判定SUPPORTED（このWindows headless環境の描画処理経路への依存）。具体的な待機機構と元1249msの原因はUNKNOWN。製品の性能修正は採用していない。P2-01／P3-02を閉鎖せず、P3-01と数理の既存契約を維持した診断差分として独立再レビューへ提出する。

提出前の資料照合で「Canvas除去」を「新規Canvas命令停止」へ訂正した。要素と初期bitmapを残す対照であり、compositingやCanvas資源自体を反証していない。数値・実験条件・判定は変更せず、資料だけの追加commitと最終HEAD CIで確認する。

215計画runを保持し、212runでデータを回収した。エラーなしは210run、3runは初期診断bundle生成失敗による全欠測、1runは停止イベント誤配送、1runは終了後のtrace回収失敗。部分的に取れた値は表にも残す。成功した条件だけを選び直していない。45本の取得traceは全てclock mark 2/2、dataLoss=trueなし。ただし未取得のtraceとWebKitのCDP非対応を成功へ含めない。

詳しい量的結果は[性能](performance-summary.md)、[入力](input-latency.md)、[trace](trace-analysis.md)、[仮説](hypotheses.md)、[改善候補](candidate-improvements.md)。raw recordはrun IDで結合し、Brotli変換前後・展開後のhashをarchive-indexに残す。

## 数理と表示整合の回帰

製品sourceは基準b1d24d8と不変。5プリセット＋δ比較の6条件について、最終状態・履歴のserialized hashと全Float64のbit hashが変更前後で完全一致。8の字126518step（約20周期）、三角形10000、二重星20000、接近とδ比較各1200000、逃走300000step。独立RK4、三角形解析、刻み半減を別に実行した。

| 条件 | 最大規格化E誤差 | 独立RK4との位置RMS |
|---|---:|---:|
| 8の字 約20周期 | 2.042511×10⁻⁷ | 5.166207×10⁻⁵ |
| 三角形 | 1.406282×10⁻¹⁴ | 9.182625×10⁻⁷ |
| 二重星 | 4.774267×10⁻¹⁰ | 7.693446×10⁻⁶ |
| 接近 | 2.360754×10⁻⁶ | 7.709568×10⁻⁴ |
| 逃走 | 4.534625×10⁻⁸ | 2.513304×10⁻⁶ |

三角形解析位置誤差9.182626×10⁻⁷。8の字の刻み0.004／0.002／0.001／0.0005に対するRMSは4.489953×10⁻⁵／1.122522×10⁻⁵／2.806327×10⁻⁶／7.015831×10⁻⁷で約1/4へ収束。逃走t=30の距離36.381692、外向き速度1.341672。許容差・物理・初期値を変えていない。長期脱出やカオスの証明ではない。

同じengineの無改変moduleと、回収できた206runのphase／194runの履歴を照合し不一致0。public／minimalの6runは公開A位置の倍精度値のみで、全phaseはNOT_TESTED。Nodeとのcross-engine照合では39runに差があり、それを丸めて一致へ変えていない。engine内照合と基準前後bit照合を数理同一性の根拠とする。

エラーのない全表示runで26466回の表示commit step不一致0。実際のdrawOrbit引数を回収できた130runの最終A/B phase・位置との不一致0。Canvasへの命令受付とDOM値の整合であってGPU提示保証ではない。表示OFF診断の意図した欠測や誤配送runを通常GUIの成功へ数えない。

## 回帰・未検証・提出

ローカル：単体434/434（32file、追加10件は時計・GC負対照・境界・nested task query）、型検査／本番build成功。第17作の既存開発48／本番48成功。幅375/390/765/1280、Chromium/WebKit、motion通常/reduce、light/dark、文字100/200%、低FPS・停止・教材復元・表示時刻・描画点・キーボード等を既存構成で確認した。最終診断コードのsmoke2＋停止9の11実行は全てエラーなし、clock／数学／表示／停止の契約チェック成功。これを11件の通常E2E試験と混同しない。

既存16作を含む全開発／本番回帰、Linux WebKit DPR2画素、最終HEAD CIはPR #44のStage P提出コメントとworkflow artifactへ固定する。本文へ最終commit自身のhashを埋めるための追加commitを繰り返さず、GitHub上の最終提出記録をCI結果の正本にする。

実機iPhone Safari、VoiceOver/NVDA、低性能実機、OSの非表示／BFCache、数時間連続使用、GPU提示完了、ETW context switch／thread priority／hard faultの因果は未検証。WebKit自動試験と実機Safariを区別する。最悪入力遅延の上限は保証しない。

既存Issue #43／Draft PR #44／feature branchを維持し、merge・auto-mergeは行わない。PR全体の限定マージ推奨NO。診断差分と数理・表示契約の再レビューが可能な状態で停止する。
