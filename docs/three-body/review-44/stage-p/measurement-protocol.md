# Stage P 計測契約（事前記録）

製品ソースをディスク上で変更せず、esbuildの診断専用bundleにフックを挿入する。固定刻み、Verlet、5初期値、保存量、原子的A/B commitを維持する。診断bundleは本番entryへimportしない。

## 段階と独立因子

AはVerlet kernelのみ（履歴なし）、Bは通常のadvanceと履歴、CはB＋DOM、DはB＋Canvas、EはB＋両方、Fは飽和A/B＋全表示。B以降の計算には既存の検査も含み、Aとの差を「履歴だけの費用」と呼ばない。表示OFFの条件は製品の安全停止試験ではなく成分の分離実験である。

`observe`には保存量・加速度・数式インスペクターの値計算とDOM更新が一緒に含まれる。DOM OFFはその関数全体を止めるため、差を純粋なDOM CPU時間とは解釈しない。旧legacyの関数別計測は追加負荷のある別対照であり、lightの区間値へ加算しない。深い診断のgraph属性更新もLayout完了／GPU描画完了を意味しない。

基準は1280×900、速度4、438×330 CSS pxのCanvas、DPR2、readback向けcontext。DPR1、累積Document、短履歴、軌跡／発光／ベクトルOFF、旧context、追加計測OFF、WebKit、CPU throttlingを別因子で比較する。表示状態はheadlessのvisibilityを記録し、実OSの非表示とは区別する。全因子の総当たりとはしない。

改訂後は全表示で最初の2rAFを完了してbacking寸法を確定し、その後activateでOFF条件へ移る。componentsはA〜Fを飽和状態から3反復する。固定壁時計窓では達成step数の違いはthroughputの観測であり、同じstep数に丸めて比較しない。各最終stepで同一engineの無改変数理moduleと回収した全倍精度値・履歴を照合する。

Canvas OFFはpaint内の新規命令投入を止める条件で、Canvas要素・buffer・初期画像を削除／非表示にしない。DOM OFFも観察値と主要DOM更新を止め、既存要素は残す。両方OFFでも画面を空白にするわけではない。この対照はCanvas資源の不存在やcompositor処理の停止を意味しないため、Canvas全体を原因から除外できない。初期bitmapを残す条件とCanvas資源自体を持たない条件の比較は今後の未実施対照である。

60秒を複数回、可能なら300秒の連続窓を測る。短い因子比較と長時間窓を混ぜて平均しない。試験を同時実行しない。各実行にrun ID、ソースhash、ブラウザー・起動引数、時計、環境、エラーを付ける。

## 時計・時間の意味

- ページ区間はperformance.now（単調ms）。phaseのbegin/endを保存。入れ子を足し合わせない。
- traceはChromium trace ts（単調µs、pid/tid付き）。一意なperformance.markを呼ぶ前後の時刻で対応させ、offsetと誤差区間を保存する。同期できなければ対応はNOT_TESTED。
- Workerとページは起動時・終了時の往復交換で時計offsetの範囲を求める。Worker T0からページT1の値には同期誤差を併記する。OS wall clockを区間の差し引きに使わない。
- T0独立Worker要求、T1 main受信、T2 pause開始、T3 pause終了、T4同じ停止stepのDOM／Canvas命令受付。T4はGPU／実ディスプレイ提示完了ではない。
- 要求瞬間のモデルstepは同時計測しない。T1以降の追加stepと事前snapshot由来の上限を区別する。
- CDP process CPUTimeは取得できたプロセスの累積値。OSのrun queue／context switch／swap、GPU提示完了を補完しない。

## 計測器と負対照

OFFにも設定・停止・最終snapshotの診断フック、独立Worker、製品元来の時計呼出しは残る。「無計測製品」とは呼ばない。phase計測とtraceを独立に切り替える。旧計測器はそのshim／変換関数を再利用し、追加負荷を調べる。

追加のpublic条件では製品モジュールを一切変換せず、公開UIから飽和状態を作る（既存26000step/15秒を維持）。5分試験の主対象はこの条件とし、Chromium traceによる負荷を混ぜず、GC／process内詳細はNOT_TESTEDとする。publicでも外部Worker・1HzのCDP／状態採取は残る。公開属性ではpause内部のT2/T3／timer／epochを読めないため、それらを架空の値で補わない。

各受信を記録する窓は最終停止要求のT1まで。停止受理後のWorker messageは以後の再生入力分布へ加えない。周期37msは実際のWorker送信時刻を保存し、予定送信時刻や物理キーボード入力とは区別する。同期は開始／終了の各8往復で確認する。

独立Workerは別JS threadの要求源であり、独立したOSプロセス／物理入力装置とは限らない。renderer全体が実行待ちなら要求源自身のtimerも遅れ得る。予定時刻からT0までの遅れ、OS入力からbrowserまでの遅れは未測定。hostの1Hz heartbeat区間はCDP複数要求と転送を含み、T0→T1停止要求待ちの代用にしない。

traceの開始／終了外にある状態転送・gzip・画像保存は区間統計へ混ぜない。新しい計測器は測定中に全履歴の再圧縮を繰り返さず、1Hz採取を追記journalへ保存する。集計と圧縮は窓外で実施する。最初のsmokeは計測器試作として別に保持する。

独立Workerは周期的な要求を送り、対象phaseの長い区間内にT0がある場合に停止するモードを用意する。対象が発生しなければ期限で停止しTARGET_MISSと記録する。自然発生と人工的な主スレッド占有の正対照を分ける。条件に合う値だけを分布へ残すことはしない。

## 保存・限界

全実行のJSON、失敗までのsnapshot、traceのgzip／hash／容量、画像を保存する。trace対象は新規の隔離ブラウザー内のローカル公開アプリのみ。ユーザーの既存タブ・認証profileは接続しない。大量traceは圧縮し容量を点検し、CI artifactの場合はrunと14日の期限を記録する。

quantileはnearest-rank、全標本のnを表示する。小標本p99は保証値ではない。Long Task／GCの重なりは因果確定ではない。thread CPU時刻がなければ壁時計区間をCPU時間へ読み替えない。

時計の往復／mark呼出しの前後幅が0でも、時計の量子化誤差が0とは言わない。観測した最小の正の時刻差、開始／終了offsetの変化、mark bracketを別に保存する。区間統計では測定窓をまたぐtaskを窓の境界でclipし、元durationとclip件数も保存する。窓外の転送・画像保存でtask最大値を水増ししない。

追加のdeep条件はgeometry読出し、Canvasのstroke/fill等、グラフ属性更新を包み、どのnative呼出しへ長い区間が重なるか調べる。lineTo等の全点呼出しは包まない。deep自身の追加負荷があるため、効果比較はlight条件で行う。固定438×330 fixtureのgeometry読出し差替え、GPU起動flag、DOM／Canvas更新停止の反復60秒対照を診断候補とする。製品へ採用しない。

GPU情報／featureStatusはBrowser CDPの取得値であり、Canvasの実際の内部backendやGPU完了時間の証明ではない。Windows counter採取は独立したos-counters条件にし、採取所要時間も保存する。PageFaults/secをhard fault数と同一視しない。global PageReads/PagesInputと特定pidの待ちの因果は未確定とする。

[Chromiumの説明](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool/trace-event-reading/)はThreadDurationをCPU時間として区別している。取得できたtdurだけを用い、欠落を0で埋めない。elapsed−thread CPUは待ち／deschedule等を含み得る差であり、それだけでは待ち先を特定しない。

CDP一次資料：[Tracing](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/)、[Performance](https://chromedevtools.github.io/devtools-protocol/tot/Performance/)、[Chromium trace event資料](https://chromium.googlesource.com/chromium/src/+/main/docs/trace_events.md)。実際に取得できたcategory／event名を結果に保存する。

最後のminimal対照では製品moduleを無変換とし、phase／Long Task observer／CDPの定期採取／DOM heartbeatをすべて除く。37ms Workerの非停止messageも時計と受信時刻の記録だけにする。さらに60秒後の1回しか要求を送らない条件を別に実行する。準備・終了時のUI操作、時計同期、最終状態の読み取りは残るため、完全な無観測実行ではない。単発停止1標本は再生中の遅延分布を代表しない。

public／minimalは実UIから履歴6000・速度4・A/B・ベクトルを選び、26000step以上になった最初の停止状態から測定する。開始stepは厳密に26000ではなく、Canvasも製品のresponsive寸法を保つ。privateの固定438×330 fixtureと直接の改善率を出さない。これらは「phase計測がなくても再現するか」の定性的対照である。正確な開始／終了stepと寸法は各before／resultに保存する。

## 実行コマンドと再現

Node 24.20.0／既存lockfileのPlaywright 1.58.2、Windows 10.0.26300／Intel Core i7-14650HX。ブラウザーの正確なversion・総RAM・起動flag・DPRは各manifest／raw recordにある。測定は順次実行し、他のベンチマークやGUI試験と並列にしない。

```powershell
# --outputには未使用のディレクトリを指定する。同一manifestの上書きは禁止。
node --expose-gc tools/three-body-stage-p.mjs --suite=matrix --browser=chromium --output=test-results/reproduce-p
# 同じ形式で matrix/webkit、ablation/chromium、long/両engine、public/両engine、
# probes、deep、legacy-smoke、legacy、causal、neither、stops、minimal、components/両engine。
node --expose-gc tools/three-body-stage-p.mjs --suite=causal --browser=chromium --output=test-results/reproduce-causal
node --expose-gc tools/three-body-stage-p.mjs --suite=minimal --browser=chromium --output=test-results/reproduce-minimal
node --max-old-space-size=6144 --expose-gc tools/three-body-stage-p-report.mjs test-results/reproduce-causal --archive
```

実際の条件数・版は保存済みmanifestが正本。途中でprobesへdeepを追加したが、初回probesは12試行で、deepは別suiteで実施した。過去run IDを現行plannerから推測しない。causalの実行版は`tool-versions`の記録済みhashから復元可能。reportはBrotli保存後も再解析でき、archive-indexに変換前後と展開後のSHA256を保持する。圧縮は測定窓の外で行う。

回帰は`npm test`、`npm run typecheck`、`npm run build`、既存の開発／本番Playwright構成を使用。ローカルでは第17作の開発48・本番48を実行し、既存16作を含む全回帰は最終HEADのGitHub Pages Validateで確認する。4196番を使い、既存4173番の他サーバーは変更しない。独立数値照合は`tools/three-body-measure.mjs`、変更前後の倍精度bit照合は`TB_NUMERICAL_BASE=b1d24d8...`と`TB_NUMERICAL_DIR`を指定した`tools/three-body-review-numerics.mjs`。値は`raw-results/numerical-*.json`を参照する。

WebKitにCDP trace／CPU4倍emulationを実施したとは主張しない。matrixのWebKit cpu4名は未適用の対照であり、capabilitiesにNOT_TESTEDを明記する。実OSの最小化・非表示は未検証で、visibility試験は合成documentイベントである。

## 公開前の容量・機密・保持監査

全466個のcapture／journal／traceをBrotliへ可逆変換し、変換前732,217,770bytes→466,421,299bytes。展開した全byteのSHA256一致を確認した。監査時のStage P一式は約524.5MB（最終byte数はpublication-audit）、最大1file18,301,940bytes、100MB以上0。証拠保全のため今回はGitへ保存する。リポジトリの取得容量が約0.5GB増えるコストがあり、性能改善とは無関係である。

Gitのcompressed evidenceは履歴に永続保持され、単なる後続commitでの削除は保持期限にならない。CIの短い再検証artifactは14日保持。大きな原traceを将来artifactへ移す場合は、run URL・期限・decoded hashを残し、独立レビュー前に参照不能にしない。公開アプリのdistへこの資料をimportしない。

fresh isolated profileとlocalhostの公開アプリだけを記録し、既存のユーザーtab／認証profileへ接続していない。local path・hardware・pid/tid・公開GitHub metadataは保持する。`tools/three-body-stage-p-audit.mjs`でarchiveのencoded／decoded hashと既知token形式を点検し、不整合0、既知credential候補0。これは一般的なDLP保証ではない。個々の公開対象と監査値は`publication-audit.json`に記録した。

source hashはCRLFをLFへ正規化したもの。compressed captureのhashはbinary byteそのもの。console logは保存後UTF-8／LFへ変換し、plain JSONのBOMを除いた。PowerShellの入力decodeに由来する文字化けは復元を推測せず保持したため、数値と日本語の正本はNodeがUTF-8で保存したJSONと本文とする。captureの圧縮内byteは変更していない。
