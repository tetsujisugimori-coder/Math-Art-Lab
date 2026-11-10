# 第17作 検証記録

最新の調査は[Stage P](review-44/stage-p/investigation.md)。基準`b1d24d8`以降は診断コード・測定・検証資料だけを追加し、製品の数理・描画・状態管理ソースは変更していない。総合PARTIAL／原因SUPPORTED（観測した描画経路への依存）であり、元の1249msと全スパイクの内部原因はUNKNOWN。最終HEADのCI・件数・Draft状態はPR #44のStage P提出記録を正本とする。過去のPASSやfinalというファイル名を今回の性能保証へ読み替えない。

2026-11-08 JST。自己検証の結果であり、独立レビューではありません。実機iPhone Safari、VoiceOver/NVDAの読み上げ、OS拡大、低性能実機は未検証です。Windows上のPlaywright WebKitを実機Safariと呼びません。

## 基盤・実施範囲

- origin/mainをfetchし、`9167e979b3c954e355d67c2b80e01dc4e733d8cc`から専用ブランチ作成。ローカルmainは更新していません。
- 既存Issue全件・PR全件を調査し、17作目との重複なし。依頼全文を[Issue #43](https://github.com/tetsujisugimori-coder/Math-Art-Lab/issues/43)へ保存。`request.md`との本文一致を改行正規化後に確認。
- GitHubコネクターは呼出し不可のためgh CLIを使用。Gitの共有管理領域、esbuildの親ディレクトリ参照、Playwrightのプロセス起動はWindowsサンドボックス外実行で検証。ブラウザーは既存のPlaywright 1.58.2 Chromium1208/WebKit2248を使用。
- TypeScript/Vite/Vitest/Playwright、Pages baseパス、公開ワークフロー条件、既存16作の計算・教材ソースは維持。入口`main.ts`の追加登録と新規作品ファイルのみ変更。依存追加なし。

## 数値検証

再実行：`node --experimental-strip-types tools/three-body-measure.mjs`。独立基準は`tools/three-body-reference.ts`：配列状態・順序付き全ペアの別実装・RK4。製品の重力・Verlet・保存量関数を呼びません。基準刻み半減による差も記録し、RK4を厳密解と呼びません。

| プリセット | 窓 | 最大規格化E誤差 | 終点位置RMS：Verlet対RK4 | RK4刻み半減差 |
|---|---:|---:|---:|---:|
| 8の字 | t=126.518（約20周期） | 2.043×10⁻⁷ | 5.166×10⁻⁵ | 9.585×10⁻¹² |
| 正三角形 | t=10 | 1.407×10⁻¹⁴ | 9.183×10⁻⁷ | 2.894×10⁻¹³ |
| 二重星 | t=20 | 4.775×10⁻¹⁰ | 7.694×10⁻⁶ | 1.153×10⁻¹² |
| 接近（ε=0.15） | t=30 | 2.361×10⁻⁶ | 7.710×10⁻⁴ | 8.700×10⁻⁸ |
| 逃走 | t=30 | 4.535×10⁻⁸ | 2.514×10⁻⁶ | 2.413×10⁻¹² |

最大誤差は10ステップごとの標本値で、全連続時刻における厳密な上限ではありません。[全桁・初期値・終点](numerical-results.json)。P・Lの規格化誤差は各窓で概ね10⁻¹⁴以下（接近のPは3.90×10⁻¹⁴）。並進速度を加えた独立試験で重心の直線運動も検証。

8の字の初期値はMontgomeryの公開値の全速度を反転した時間反転版。近似周期T=6.32591398でRK4の位置閉鎖残差2.901×10⁻⁸。初期値の桁数に由来する残差をゼロと扱いません。

正三角形は`aᵢ=−GM(rᵢ−R)/s³`、`ω²=GM/s³`、`vᵢ=ωJ(rᵢ−R)`の解析式を等質量・不等質量で照合。t=10の解析回転との位置RMS差9.183×10⁻⁷。等質量の長時間不安定性はモデルの性質であり、位置補正で隠しません。

8の字の固定t=2での収束：

| Δt | 独立RK4との位置RMS差 |
|---:|---:|
| 0.004 | 4.489953×10⁻⁵ |
| 0.002 | 1.122522×10⁻⁵ |
| 0.001 | 2.806327×10⁻⁶ |
| 0.0005 | 7.015831×10⁻⁷ |

刻み半減で約1/4。二次収束と一致します。

許容差は8の字の20周期E誤差<2×10⁻⁶、接近のt=30 E誤差<4×10⁻⁶、逃走の終点E誤差<10⁻⁷と設定。上の実測値と刻み幅収束、独立RK4の精度床より選択し、初期候補の失敗を許容差緩和で通していません。作用反作用、方向・逆二乗則、ポテンシャル勾配、保存P/L/重心、大質量差・微小初速度、対称性、再現性、近接・ステップ内横切り停止も試験。明示EulerではE誤差>10⁻³となる負対照と、反転重力の方向誤りを検出する対照を含めます。

## カオス比較

`node --experimental-strip-types tools/three-body-sensitivity.mjs`で、接近例の天体1のxだけにδ=10⁻⁶を加算。両系を同じt=30へ進めました。

| Δt | D(30) | Aの独立RK4との位置差 |
|---:|---:|---:|
| 0.0001（初期検討） | 0.019437107 | 0.012332332 |
| 0.000025（採用） | 0.019440267 | 0.000770957 |
| 0.0000125（精度比較） | 0.019440417 | 0.000192813 |

RK4のA/B比較D=0.019440461、Bの基準刻み半減差8.28×10⁻⁸。製品採用刻みで初期値差による観測と積分誤差を区別できる材料を残しました。ただし、この有限時間の増大はカオスの数学的証明・リアプノフ指数推定ではありません。[全データ](sensitivity-results.json)。UIのA/B時刻、D(0)、20ステップ時系列、速度摂動でD(0)=0、同時コミット、通常実験復元を単体・GUIの両方で確認。

## 単体・GUI

- 全単体31ファイル・422件成功（既存385、新作37）、skipなし。[unit.log](unit.log)
- 型検査成功。本番build成功。JS927.70KB/gzip280.07KB、CSS68.18KB/gzip13.37KB。500KB超チャンク警告は残ります。[build.log](build.log)
- 開発版：新作36/36成功。Chromium18・WebKit18、skipなし。[gui-development.log](gui-development.log)
- 本番版：新作36/36成功。Chromium18・WebKit18、skipなし。[gui-production.log](gui-production.log)。開発版は専用ポート4196、本番版はPagesパスで検証。
- 16基本条件＝4幅(375/390/765/1280)×2 motion×2ブラウザー。各条件内で2テーマ×文字100%/200%を操作し、横はみ出し、ページ例外、Tab、入力、数値観察、グラフ代替情報、touch-actionを確認。
- Canvas画素と計算座標、1ステップ・リセット再現、候補/適用分離、不正入力保持、5プリセット、Σの2寄与、記号連動、比較・教材の復元、Escapeフォーカス、非表示・reduced-motion停止、離脱時破棄をGUIで検証。
- 文字200%はブラウザー内のroot font-size変更。OS拡大・Safariピンチズームの試験ではありません。ラベル・代替文章・フォーカスの自動検査は実際の読み上げ試験とは別です。タッチのページスクロールはCSSと数値入力による経路までで、実機のジェスチャー体感は未検証。

既存16作品の全回帰はGitHubの最終HEAD Validateで照合します。今回の全テスト定義は開発594件・本番470件。CIの実際の成功・失敗・skipと対象SHAはDraft PRの最終検証コメントへ記録し、自己参照するSHAをこのファイルへ書くためだけの追加commitは行いません。

## 性能・メモリ

Windows 10.0.26300、Intel Core i7-14650HX、Node v24.20.0。単一観測の計算＋10ステップごとの統計の経過時間は、8の字126,518ステップ約79.94ms、接近1,200,000ステップ約3551.20ms、逃走300,000ステップ約740.20ms。JIT・並行処理の影響を受けます。OSの純CPU使用時間ではなく、ブラウザー・端末性能の保証ではありません。

`node --experimental-strip-types --expose-gc tools/three-body-memory.mjs`：履歴6000点／グラフ1200点に達した26,000ステップでヒープ12,637,120byte、208,000ステップで12,653,912byte。保持点数は一定、差16,792byte。プロセス全ヒープの観測であり、UI・GPU・ブラウザーのリーク全否定ではありません。[生データ](memory-results.json)。

ブラウザーの20標本、Canvas描画命令投入区間の経過時間、実際のバッファーbyte数は`gui-development/*-performance.json`と`gui-production/*-performance.json`。performance.nowで主スレッド処理区間の経過を測っており、OSが測る純粋なCPU使用時間ではありません。GC・スケジューラー待ち・命令投入の待ちも影響します。GPU描画完了や実画面FPSは測っていません。最終集計値はPRに掲載します。

追加の飽和履歴測定（A/B、各6000点保持・1000点表示、全ベクトル、1280×900、DPR1）は[browser-saturated-results.json](browser-saturated-results.json)。30標本でChromiumの計算区間中央値1.6ms・最大372.1ms、描画区間中央値2.6ms・最大1249ms。WebKitは計算3ms/最大6ms、描画7ms/最大11ms。停止操作から停止確定までChromium約83.5ms、WebKit約571.9ms。この観測で停止は確認したものの、Chromiumの長いスパイクは未解決で、滑らかな再生を保証しません。26,000ステップでの測定完了を、別の52,000ステップ到達予算の達成と扱わない。初回測定ではWebKitの停止直後値を確定待ちなしで読んでfalseとなったため、その[初回データ](browser-saturated-initial-results.json)も残し、最終測定では5秒上限で停止確定を待った。

CanvasバッファーはA/B合計1,156,320byte。Chromiumの公開heap値は10MBへ丸められ、WebKitは取得不可（null）なので、これを精密なブラウザーメモリ測定とはしません。履歴上限とNodeのGC後ヒープ観測を別の証拠として扱います。DPR2は実装上の上限で、今回のブラウザー性能測定はDPR1のみです。

## 失敗と修正を保持

1. 接近の最初の候補：ε=0.03、Δt=0.0005はt≈1.8785で安全停止。ε=0.05、Δt=0.0001はt=30のE規格化誤差約0.002457。ε=0.08は約0.000544、ε=0.1は約0.000214、ε=0.15は約0.00003756。モデル差を明示したうえでε=0.15を選択。
2. ε=0.15、Δt=0.0001ではt=30のAの位置誤差が0.01233で、δ比較の解釈を妨げる大きさ。Δtを0.000025へ縮小。初期の数値結果は[numerical-initial-results.json](numerical-initial-results.json)に残した。許容差を緩める変更ではない。
3. 逃走候補の入射y=0.8,1.2,1.5は近接停止。y=2,2.5,3はt=30まで完走し、外向き・正の比エネルギー。y=2を採用し独立RK4で照合。
4. 初回単体はテストの`-omega**2`がJavaScriptの構文規則に違反して収集失敗。括弧を修正。既存385件は成功していた。
5. 初回開発GUIは30成功・6失敗。ドラッグ試験で編集チェックによるスクロール後のCanvasが画面外だったため、Canvasをスクロール表示してから座標取得へ修正。reduced-motionの連続切替は通知を観測しないまま戻していたため、安全停止epochを待ってから戻す試験へ修正。
6. 同じ初回GUIの実行中にソース編集・数値計測を並行した。WebKitの要素detached失敗2件とChromium性能試験タイムアウト1件も発生。HMR・CPU競合の混入があり、単一原因は断定しない。次回は製品ソースを固定し、性能標本取得のブラウザー往復を減らした。初回画面・文脈の一部は[initial-failures/](initial-failures/)へ保存。最終再試験36/36成功と区別。
7. Windows権限で初回git fetch・browser install・一部esbuildが失敗。fetchと必要試験は許可された制限外実行、ブラウザーは既存キャッシュで解決。これらを数理試験成功として数えない。
8. 本番初回は35成功・Chromiumの性能試験1timeout（30秒）。計測JSONと撮影は完了していたが、テスト成功とは扱わない。原因未確定。[初回ログ](gui-production-initial.log)を保存。製品・試験の制限時間を変えずtrace付き単独再試験で2/2成功。
9. 目視でライトテーマのインスペクター本文ddが既存の淡色CSSを継承し、白背景で低コントラストとなる問題を発見。[修正前画像](initial-failures/light-inspector-contrast.png)を保存。作品内のddを本文色継承へ修正し、全16条件内の両テーマ・両文字サイズでコントラスト比≥4.5の検査を追加。修正後の全件再試験は開発36/36・本番36/36成功。
10. 同一workerの累積撮影セッションで本番Chromiumの性能試験timeoutが再発（35/36、trace付きChromium17/18）。traceでは一時停止click要求から最初のlocatorログまで約15.8秒。根本原因UNKNOWN。計測を新しいブラウザーへ隔離し、元の累積セッションの問題解決とは区別した。[診断とtrace](initial-failures/performance-diagnosis.md)。
11. 計測の隔離時に存在しないfixture名browserTypeを指定してテスト収集失敗。インストール済みPlaywrightの型定義を確認し、playwright/browserNameへ訂正して36件の収集と実行を確認。
12. 開発サーバー起動が2回60秒で停止。4173番は別の既存`serve-iphone-touch.mjs`プロセスが使用していた。既存プロセスは変更せず、構成でサポートする`MATH_ART_E2E_DEV_PORT=4196`へ切り替えて36/36成功。製品不具合と混同しない。
13. A/B・全ベクトル・6000点軌跡の追加負荷で、Chromiumが52,000ステップ到達の30秒予算を未達。初期計測の最終標本は描画約626.7ms。WebKitは同条件を完了し、標本最大描画39ms。製品表示を最大1000実サンプル/体へ削減し、端点・既存計算点・履歴不変の単体試験を追加。保存履歴とΔtは変更していない。
14. 表示削減後の再計測でもChromiumは45,367ステップで30秒予算未達（その時の計算2.5ms、描画5.4ms）。描画CPU短縮を全体の時間達成と混同しない。WebKitは54,102ステップ以上まで完了、30標本最大は計算11ms・描画21ms。変更前[データ](browser-stress-before-decimation.json)、変更後[データ](browser-stress-results.json)を保存。Windows上の高負荷・累積セッションの応答性は既知の制約として残す。
15. 26,000ステップでの別の飽和履歴計測は両ブラウザーで完了し停止を確認。ただしChromiumの最大描画区間1249msなど長いスパイクが再び観測され、点数削減で最悪応答を解消したとは言えない。初回の52,000ステップ計測は例外時に途中結果を保存できず終了したため、計測器に途中保存とfinallyによるブラウザー破棄を追加した。以降の失敗はJSON内errorとlastStateへ保持。

## 受入と独立レビュー

A〜Gは上記自己検証で成立。Hは全回帰CI照合、Iは16条件を実施、Jは最終HEAD CIの実結果を提出時に明記。Kは実機未検証を明示、LはIssue・commit・push・Draft PRで提出。実機・読み上げ・独立レビュー未実施のため総合判定はPARTIALです。マージ・auto-mergeは行いません。

重点レビュー：ソフトニングの別モデル扱い、Verletの符号・尺度・停止ガード、規格化誤差、時間反転8の字、正三角形の不安定性、Dと数値誤差の区別、A/B同期と通常状態復元、教材の安全停止優先、CanvasとDOMの同時刻性、既存16作品へのCSS・ライフサイクル回帰。

## 2026-11-09 JST — PR #44 独立レビュー指摘修正

対象は原版cf80c3e8189f28b99beb96e80191446faf122d99、レビュー5825552863。Issue #43/既存Draft PR #44を維持。総合PARTIAL、P2-01 PARTIAL、P3-01は実施範囲でPASS、P3-02 PARTIAL、マージ推奨NO。独立再レビュー待ちであり自己承認ではない。

DOMの表・SVG・インスペクターを保持し、変更値だけ更新。循環履歴から従来と同じ実計算点を直接選ぶ。計算は固定刻みを保った64step単位・約4msの処理区間に分割し、古いtimerをepochで無効化。Canvas A/BとDOM観察を一つのrAFで同じ確定状態へ更新し、最新計算step・表示対象step・グラフ最終標本時刻を区別する。表示待ちを画面に示し、描画失敗は停止する。safetyEpoch復元保護を維持。

広い診断v3は8条件×2 browser×2 DPR×新規/累積×3反復の192件/版。ただしdoctypeなしの診断HTMLであり、afterは後に不採用とした80ms表示間隔試行。DOM OFF初期化の交絡、保存量過多による中断、破棄後Document再利用の失敗も保存。通常HTMLのv4重点再測定で80ms案の操作応答改善を確認できず、最終コードから撤回した。最終候補の全192条件再試験は未実施。通常HTMLの重点12件/版・最終停止144件と、過去の診断文脈を分けて報告する。

本番と同じHTML（CSS1Compat）、DPR2・飽和A/B・新規・3反復の独立Worker要求待ちは、Chromium中央値422.1→394.5ms、p95/最大531.3→807.2ms。paint区間最大782.4→387.5msでも操作応答は解決していない。WebKit最終候補は要求待ち中央値2ms/p95・最大29ms。元の1249ms paint標本は直接再現せず根本原因UNKNOWN。GC・GPU・OSのどれかを根拠なく断定しない。Canvas OFFの診断で待ちが小さくなることを、GPU原因の証明と呼ばない。

最終通常HTMLの6停止操作×2 browser×2 DPR×新規/累積×3反復＝144/144で停止確認。pause最大1.0ms、受信後/100ms後の追加step0、A/B不一致0、計算timer残存なし、切替/破棄後rAFなし。host要求から表示確定の最大2824msは移送・actionability・rAF待ちを含む別指標。要求瞬間の正確な追加step数は未測定で、事前snapshotからの増分を上限として記録した。合成visibility/pagehideを実際のOS非表示試験とは呼ばない。

物理核ソース不変。5プリセットと接近δ=10⁻⁶の6窓で原版2000step/候補64stepバッチの全状態・履歴JSONと内部Float64LE hashが一致。独立RK4・解析正三角形・8の字約20周期・二次収束・保存則を再実行。許容差・初期値は不変。単体31ファイル424/424、型/build成功。JS930.36KB/gzip281.45KB、CSS68.18KB/gzip13.37KB。500KB警告を残す。

Windows最終GUIは開発46/48（4.7分）、本番46/48（4.4分）。失敗は各環境のChromium飽和DPR1/2、26000step/15秒未達で、skipや延長なし。16基本条件は両テーマ・文字100%/200%で成功。低FPS時刻整合・復元・要素保持も成功。Chromium飽和到達失敗後の低FPS/停止サブシナリオは未実行、WebKitは実行成功。追加撮影2件成功、モバイル4画面とDPR2飽和画面を目視確認。実機Safari、VoiceOver/NVDA、低性能実機、実OS拡大・非表示、数時間使用は未検証。

[対応記録](review-44/results.md)、[比較表](review-44/performance.md)、[手順と表示契約](review-44/protocol.md)、[全桁同一性](review-44/numerical-bitwise.json)、[独立数値基準](review-44/numerical-reference.json)、[最終停止](review-44/final-stops/summary.json)、[ソース照合](review-44/final-source-integrity.json)、[最終GUI失敗](review-44/failures/reviewed-index.json)。途中の失敗を上書きせず、資料名のfinal/afterと最終採用候補reviewed/final-standardsを区別する。

全作品の最終HEAD CIはこの資料commit/push後に確認し、[PR #44の検証コメントとchecks](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/44/checks)へ対象SHA・run URL・成功/失敗/skipを固定する。機械出力のローカル控えはtest-results/three-body-review-final-ci/。CI成功をWindows性能未達のPASSへ置き換えない。Draft・未マージ・auto-mergeなしを維持する。

## 2026-11-10 JST — 描画経路の切り分けと最終再検証

最新記録は[readback-verification.md](review-44/readback-verification.md)。前日の候補名final/afterと区別する。Linux CIで判明したDPR2の実画素不一致を、モデル値・API引数・小Canvas・実寸法7対照×3反復で切り分けた。全対照でモデル位置は一致し、willReadFrequently:trueと初期readbackだけ正しく描画されたため、描画側getContextの設定ヒントだけを採用。内部GPU/CPU機構やGCの原因を断定せず、物理・解像度・発光・しきい値150を維持した。

描画経路変更後も内部Float64/履歴6窓は原版と一致、独立RK4/解析解/約20周期/二次収束、単体424・型/build成功。通常HTMLの192条件取得エラー0、正常表示480フレームの時刻/描画引数不一致0、停止144/144、受信後追加step0、pause最大1ms。host要求→settled最大1138msは移送等を含む。Windows GUIは開発/本番とも48/48、同じ26000step/15秒基準のChromium飽和も通過。Linux重点CI #42644871408は9/9。追加撮影2件でモバイル4画面を保存。

旧renderのみ復元した3反復のChromium要求待ちは中央値368.6→20.3ms、p95/最大747→20.3ms、paint最大388→59.3ms。一方60秒試験で433.5msのpaint・432.5msのcalculate区間が残った。Worker停止要求待ちは27.6ms/10ms、追加step0。全時点・実機・数時間の上限保証ではなく、元1249msの直接原因もUNKNOWN。総合PARTIAL、P2/P3-02は未解決範囲あり、マージ推奨NO。最終HEAD CI結果はPR #44の検証コメントへ固定する。

## 2026-11-10 JST — Stage Q 最小再現と入力時計の調査

基準b07・レビュー5842434528へ対応。[Stage Q](review-44/stage-q/investigation.md)に事前計画・140run・旧trace再解析・原hashを保存。最小Canvas/DOM資源対照、60秒×3＋5分、旧public生成器の5分再試験でも歴史的400ms超は再現せず、根本原因UNKNOWN・総合PARTIAL。製品修正は採用せず、起動flag差を改善としない。停止後追加step0と同step表示を確認したが自然長区間への9試行はTARGET_MISS。作品除去の受付104msは事前100ms予算逸脱のまま残す。

5プリセット＋A/BのFloat64 bitと全履歴hashはb07と一致、独立RK4・約20周期・解析三角形・二次収束を再検証。単体441、型／両build、Windows開発GUI48・本番48成功。既存Stage P約525MBは非変更、新rawはGit外／CI artifact、小さい要約と版別sourceのみGitへ保存。実機・kernel ETW・GPU提示・長区間HIT・原証拠の遠隔完全複製は未検証／未完了。Issue #43をOPEN、PRをDraftのまま残す。最終HEADの全CIとartifact URLはPR検証コメントへ固定。マージ推奨NO。
