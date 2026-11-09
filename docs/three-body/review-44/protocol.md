# PR #44 レビュー修正：測定手順と表示契約

最新の採用描画経路・全192条件の再測定は [readback-verification.md](readback-verification.md)。以下の旧候補名「final」は当時の記録であり、最新結果はreadback系の資料を参照する。

80ms表示制御は試行後に撤回した。before/afterとbefore-standards/after-standardsのafterはこの試行、final-standards/final-stops/*-reviewed.logはその撤回後・描画経路変更前の記録。試行ソースはattempt-80ms-view.txtへ保存している。

原版 `cf80c3e8189f28b99beb96e80191446faf122d99`。開始時PR/ローカルHEAD一致、clean、既存CI成功、Draft、auto-mergeなしを確認。原レビュー・PR・CIは `*-original.json`。依存、物理核、初期値、誤差尺度、履歴容量、Pages条件を維持。

## 再実行（PowerShell）

```powershell
$env:TB_REVISION='cf80c3e8189f28b99beb96e80191446faf122d99'
$env:TB_LABEL='before'
node tools/three-body-review-diagnostic.mjs
Remove-Item Env:TB_REVISION
$env:TB_LABEL='after'
node tools/three-body-review-diagnostic.mjs
node tools/three-body-review-summary.mjs before
node tools/three-body-review-summary.mjs after
node tools/three-body-review-numerics.mjs
$env:TB_NUMERICAL_OUTPUT='docs/three-body/review-44/numerical-reference.json'
node --experimental-strip-types tools/three-body-measure.mjs
npm.cmd run typecheck
npm.cmd test -- --reporter=dot
npm.cmd run build
$env:MATH_ART_E2E_DEV_PORT='4196'
npm.cmd run test:e2e -- e2e/three-body.spec.ts e2e/three-body-review.spec.ts
npm.cmd run test:e2e:production -- e2e-production/three-body.spec.ts e2e-production/three-body-review.spec.ts
```

他のGUI・数値ベンチマークとは同時実行しない。既存4173番の別用途サーバーは変更しない。診断は自動割当ポート、開発4196、本番は既存Pagesパス。esbuild・ブラウザーのWindows sandbox制約は許可された制限外実行で扱う。

## 診断v3

Git原版または作業ツリーのmain.ts、CSS、関連モジュールをesbuild読込時にメモリ内で計測用に変換。製品へ計測globalを追加しない。表示OFFは物理計算・履歴を変えない。まず全表示ONでA/Bレイアウトを確定し、その後診断スイッチを変更。

- 8条件（飽和A+B全ON、Aのみ、短履歴、軌跡OFF、ベクトルOFF、観察DOM更新OFF、Canvas OFF、両OFF）×2ブラウザー×DPR1/2×新規/累積×3反復＝192実行/版。短履歴step0、飽和step26000から2000×4step。累積は同じbrowser/context/page/Documentを継続し、各回作品往復3回。数時間の実使用と同等とはしない。
- 実再生：DPR2、新規、飽和A+B、速度4、全ON/DOM OFF/Canvas OFF/両OFF、各3反復・各ブラウザー。別Workerの3秒タイマーの要求絶対時刻とメインmessage受理との差を測る。Workerは測定器のみ。
- 停止6操作（ボタン、Escape、visibilitychange、motion、作品切替、pagehide経由破棄）×2ブラウザー×DPR1/2×新規/累積×3反復＝144実行/版。visibility/pagehideは合成、motionはemulateMedia。ホスト要求、イベントtimestamp/受信、pause開始/終了、直後と100ms後の内部step・timer・描画を保存。ホスト時間には移送・actionability待ちも含む。

区間：Verlet、履歴record、difference、保存量invariants/errors、加速度寄与contribution、calculate、observe、DOM setter、refresh、paint、rAF予約待ち。保存量等はcalculate/observe/paint別。入れ子は重複するので加算しない。高頻度区間は全呼出しの件数/合計/最大、分布は32回に1回。UI区間・rAFは全標本。時計分解能以下の0msをゼロコストとは呼ばない。

performance.now経過時間であり、OS純CPU時間・GPU完了時間・実画面FPSではない。longtaskは観測であり原因ではない。Chromium一部条件だけCDP V8 GCトレースを保存し、トレース負荷も含む。WebKit GCは直接未測定。GCイベントとの近接や空き物理メモリだけで因果を確定しない。

## 測定器の修正・失敗を保持

初回は保存量が大きく中断し `before/instrumentation-pilot.json.gz`。v1は完走したがDOM OFFでB初期表示まで抑制しCanvas数に交絡。このpaint比をDOM改善率に用いない。`diagnostic-v1.json.gz` / `summary-v1.json`を保持。v2は同一Document累積・停止・GC計測改訂中に中断し `diagnostic-v2-partial.json.gz`。最終比較は同一v3のみ。1249msが再現しなくても根本原因UNKNOWNを維持。

## 表示契約（P3-01）

DOM観察値とCanvas A/Bを一つのrAF内で同じ確定状態から更新する。同期区間に次の計算は割り込まない。両Canvas描画受付を確認してから観察値を更新。失敗時は停止し、古い観察値を最新値として扱わない。

- computedStep / computedBStep：最新計算確定step。
- step / observedStep：数値観察の表示対象step。
- Canvas paintedStepと実drawOrbit引数：命令投入対象step。GPU完了の証拠ではない。
- paintedAStep / paintedBStep：A/B表示対象。狭幅はBをAへ重ね、非表示Bの古いreceiptを消す。
- graphTime：20stepごとの最終標本時刻。現在時刻との差を文章で明示。

待機中は直前の揃ったCanvas/観察値を保持し「表示対象step / 最新計算step・描画待ち」を示す。停止直後に表示rAFが1件残り得るが計算は進まない。実際の隠れたタブでrAFが保留されても停止し、自動再開しない。破棄はtimer・rAFを取消す。

属性だけでなく診断の実drawOrbitのstep・全位置引数を内部状態と照合。GUIでは独立RK4予測位置の画素も検査。低FPSはrAF250ms遅延で模擬し、再生/停止/1step/初期化/比較終了/教材終了/非表示復帰を検証。

## 応答の受入と限界

速度4で26000stepへ15秒以内、停止ボタン5秒以内を維持し、失敗をskip・延長しない。handler受信後・100ms後の追加step0、A/B一致、timerなし、破棄後rAFなしを必須とする。timer epochで古い継続を無効化、safetyEpochの復元保護を維持。

64stepごとに経過確認し約4msを目安にyieldする。64step処理中やブラウザー/OS停止を強制中断できる上限保証ではない。配信遅延と受信後停止を分ける。独立Worker要求からメイン受理p95≤100ms、最大≤250msを観測目標とするが、全端末保証ではない。未達や長時間スパイクはP2/P3-02の残存リスクとする。

飽和A/B連続再生では描画完了後80ms以上を空ける（最大12.5Hz、実際は描画時間＋次rAF分さらに低い）。計算timerは独立し、停止・stepは制限を迂回する。実再生のCanvas OFFで待ちが小さくなった反復観測を根拠に採用。単発固定2000step測定は停止中のためこの制御を通らない。計算精度の代わりに表示頻度を下げた選択であり、滑らかさの制約を明記する。

追加の測定器不備：原版のpagehide破棄後に同じDocumentで作品を再選択すると二重disposeでnull参照となり、後続の累積停止計測が失敗した。pagehideはDocument終端として記録後reloadし、ブラウザー/contextは継続する測定へ修正。原失敗を残し、before-stop-repair（TB_DIAG_REPAIR=1、原版、累積停止72件のみ）で再測定する。終端をまたぐ同一Document試験とは呼ばない。

state.rafは内部ハンドルが非0かを示す。原版はcancel後も非0を保持するため、これだけでブラウザー内に予約callbackが残ったとは断定しない。停止後draw呼出し・step推移、破棄コードのcancel、遅延rAF付きGUI復帰も併せて判断する。修正版はcancelと同時にハンドル0へ戻す。

要求時stepはホスト送信に先立つ内部snapshotとの間に通信遅延がある。requestWindowStepUpperBoundはそのsnapshotから停止までの増分で、要求後追加stepの上限であり厳密値ではない。イベントcapture開始からpause完了のstepと100ms後増分は厳密に照合。独立Workerの要求時点に主スレッド内部の各stepを同時計測しておらず、その厳密追加数は未測定として残す。

両ブラウザーはheadless。Chromiumは既存E2Eと同じ --use-angle=swiftshader --enable-unsafe-swiftshader（ソフトウェア描画）を指定する。実機Chromeのハードウェア描画性能を実測したとは呼ばない。WebKit 26.0もWindows Playwright版。

## HTML文脈の制約とv4重点測定

v3はdoctypeなしの診断用HTMLだった。両版は同じ文脈だが本番のstandards modeと同一とは保証できない。192条件・停止144条件の数値はその診断文脈の結果として保持し、本番の性能値へ外挿しない。現在の計測器でv3を再実行する場合は TB_DIAG_HTML_V3=1 を指定する。最初のコマンド例は当時のv3実行であり、現在の既定値はv4。

v4は実際のindex.html（doctype/meta viewport込み）に計測コードと生成JS/CSSを挿入。TB_DIAG_LIVE_ONLY=1、TB_LABEL=before-standards/after-standards、前者のみTB_REVISION=cf80…を指定し、DPR2・新規・全ON/Canvas OFF・各3反復・2ブラウザー（12実行/版）の重点再計測をする。document.compatMode、CSS Canvas寸法、backing寸法も保存する。v3とv4間の改善率は計算しない。v4の全192条件・停止144条件マトリクスは未実行で、広いv3測定と通常HTMLでの重点測定・GUIを区別する。

不採用版を再現するには TB_DIAG_HTML_V3=1（v3の場合）と TB_VIEW_FILE=docs/three-body/review-44/attempt-80ms-view.txt を指定し、TB_LABELは既存資料を上書きしない別名とする。基準はTB_REVISION=cf80…、最終採用候補はTB_REVISION/TB_VIEW_FILE/TB_DIAG_HTML_V3を未指定にする。最終停止マトリクスはTB_DIAG_STOPS_ONLY=1、TB_LABEL=final-stopsで144件。ソースhashをLF正規化でraw JSONへ記録する。既定の全マトリクスはv4で、保存済みv3と混同しない。

計算時間の定義：製品data-compute-msは最後のcalculate呼出しの区間で、再生中は最大64step小区間。tick全体の合計ではない。既存browser-profileツールで修正前の大バッチ値とそのままCPU性能比を計算しない。診断器のcalculate件数・合計・最大・標本分布を使い、1呼出し占有の短縮と同じ総step数の計算コストを区別する。固定2000stepの測定は同じ作業量、連続再生の1呼出しは旧大バッチ対64stepで作業量が違う。paintは両Canvas命令投入区間、observeは別区間。どの値も純CPU時間ではない。

公開資料はraw diagnostic.jsonを内容不変のcompact JSONとして保存し、summary.jsonを可読形式とした。WindowsのUTF-16/BOMログをUTF-8へ揃え、行末空白と末尾空行だけ正規化した。失敗メッセージ・数値・traceは保持する。

## 2026-11-10 採用描画経路の再実行

readback-beforeはTB_RENDER_FILE=docs/three-body/review-44/attempt-default-context-render.txt、TB_DIAG_LIVE_ONLY=1で旧renderだけ復元した12実行。同じview/state/physics/HTMLで、readback-afterは両変数を解除した通常v4の192条件＋24実再生＋144停止。描画処理以外の差分を持ち込まない。readback-longはTB_DIAG_LONG=1で飽和A/B・全表示・DPR2・各browser1回の60000ms連続再生。要求受理後100msの観察を含む実経過も保存する。実機や数時間使用の保証ではない。

各再実行のTB_LABELは別名にして既存証拠を上書きしない。統計はtools/three-body-review-summary.mjs、最新比較資料はtools/three-body-readback-report.mjsで生成する。readback-integrity.jsonは計測した製品6ファイルのLF正規化hashを確認する。最終test/tool/workflow入力hashはverification-inputs.json。
