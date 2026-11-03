# PR #32 再検証 — P2-01 / P3-01

2026-11-04 JST。対象は[独立レビュー](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/32#pullrequestreview-5755523261)、基準HEADは`cab21143b9263904da2a9fc95571b79a58b22cd0`。PR #32の既存ブランチへ積み上げる。作業開始時はクリーン、origin/mainとPR baseは`1c29194eb27872e8930122eae7c4cef0eb537f0b`。PR・レビュー全文・Issue #31・過去の失敗／CIを取得して確認した。[Issue #31](https://github.com/tetsujisugimori-coder/Math-Art-Lab/issues/31)の要求原本は変更しない。Issue #30は別件のまま。

端末ログはANSI制御列と行末空白だけを除去し、失敗・警告・数値・結果は保持した。JSON生データは変更しない。破線復帰RED時の[renderer控え](independent/voronoi-render-before-dash.ts.txt)は最終ファイルから線種初期化1行だけを除いて再構築し、独立RED記録のSHA256 `5c92445ecc561dab7592ddaad852c3015d1c132a4105249cfafe9529a38e0dc2`との一致を確認した。再現は隔離したコピーにこのファイルを適用し、作業ツリーを変更せず行える。

## P2-01：所属と表示候補

根本原因は、`observe().nearest`が「計算距離の最小値との差≤10⁻¹²」という表示候補だったのに、選択領域の数学的条件の説明にも使用されていたこと。p1=(.25,.5)、p2=(.75,.5)、x=(.5000000000001,.5)ではp2だけが数学的最近点だが、旧UIはV1の距離条件も成立する候補と説明した。

|方式|比較結果と判断|
|---|---|
|従来のε付き距離比較|近いという表示判断を数学的等距離へ拡張するため不採用|
|丸めたhypotを許容値なしで比較|通常例は分離できるが、丸めて同じ距離になる反例・subnormalでの差の消失があるため不採用|
|誤差区間を用い曖昧なら判定保留|安全な候補。区間の正当な誤差評価と厳密等距離の追加証明が必要になる|
|保持座標の厳密な二乗距離比較|採用。有限のbinary64座標は2⁻¹⁰⁷⁴の整数倍。共通単位のBigIntへ変換し、差の二乗和を丸めず比較できる。最大64点の観察用途に限定|

数学の定義は引き続き`∀j, ‖x−pᵢ‖≤‖x−pⱼ‖`。`mathematicalOwners`は、この条件を満たす**保持座標に対する**全ID。`displayCandidates`は従来どおり`Math.hypot`による計算距離の最小値との差≤10⁻¹²で別に求める。`displayOwner`はその最小ID。曖昧な`nearest`配列は廃止し、両用途を明示した別フィールドにした。ID順の変更は幾何の最近位置を変えず、表示優先順位だけに作用する。

10⁻¹²は単位正方形・距離0〜√2に対する**表示をまとめる絶対幅**で、数学的等距離の定義、幾何クリップの許容誤差、hypotの厳密な誤差上限ではない。距離を通常5桁で表示する画面より十分小さな差を近い候補としてまとめる既存の表示方針を維持した。差の欄は微小な非ゼロ値を指数表記にする。丸めにより表示差0でも数学的最近点が一つだけの場合があり、両ラベルを独立に示す。

Canvasの距離線は実線＝数学的最近点、破線＝その他、金色（ライトは茶色）＝表示候補。近似候補だが数学的最近点ではない線は「金色の破線」になる。数式・所属文・距離一覧・凡例はこの区別を共有する。多角形の共有境界を最小ID順で重ねる従来の色分けとアンチエイリアスは別の画素規則である。

精度の限界：入力はNumberへ丸められる。例えば文字列`0.50000000000000001`は保持値.5となり、未保持の実数の意図は復元できない。画面にも有限精度の入力と保持値を明示した。この有効入力の二乗距離比較自体には判定保留は不要だが、入力前の実数や、浮動小数点クリップで得た多角形境界を厳密に証明したとは述べない。既存の座標・面積・点間距離・同時更新の契約は変更しない。

## P3-01：描画要求と命令実行済み記録

根本原因は`drawOne()`の早期returnを呼び出し元が区別せず、未描画でも完了記録を更新したこと。新しい`submitCanvas()`は`submitted / unavailable / zero-size / context-lost / failed`を返す。正の有限な幅・高さ、context、DPRを確認し、Canvas命令が例外なく戻りcontext喪失も検出しなかった場合だけ`submitted`とする。

主図と比較図は各自の`requestedStep / requestedRevision`と`renderedStep / renderedRevision / renderedSites / renderCount`を持つ。後者は**最後に成功したCanvas命令実行**の記録で、主図の成功で比較図の記録を進めない。比較の初期配置はstep0、直前配置はmax(0,currentStep−1)。比較OFFでは`disabled`、予約時`pending`、非表示では`hidden`。現在の状態を描いたかは、`drawStatus=submitted`と要求／実行済みrevision一致の両方で判断する。

幅0などではバッファに触れず、完了記録も維持する。描画中の例外は途中まで画像を変える場合があるため、古い完了記録だけを見て現在画像の完全性を判断してはいけない。`failed`または`context-lost`を示し、状態を保存して通知する。ResizeObserver・表示復帰・contextrestored・次の操作で最新状態を再試行する。GPUの実表示完了・ブラウザの合成完了を検出するAPIとは扱わない。

1件のrAF予約をオブジェクトで識別し、callbackが現在の予約と同じ場合だけ消費する。非表示・破棄でキャンセルした旧callback、消費済みcallbackが新しい予約を消去したり描画したりできない。モデル計算は同期で全点一括更新を維持し、描画だけを統合する。`renderMs`は各Canvas自身のCPU側命令時間になった。初回提出時の主図＋比較図の合算値とは直接比較しない。

## RED→GREEN と追加調査

|同一条件|修正前|修正後|
|---|---|---|
|数学所属・表示候補の分離を要求する新規単体10件|10失敗：[RED](unit-red.log)|10成功、描画ヘルパー10件も成功：[GREEN](unit-green.log)|
|境界左右／等距離のUI、幅0で10ステップ・復帰（両ブラウザ）|4失敗：[RED](gui-red.log)|4成功：[GREEN](gui-green.log)|
|拡張単体：閾値内外・ID・subnormal等、描画失敗|—|23/23：[ログ](unit-green-expanded.log)|
|追加GUI8種×両ブラウザ|初回15成功・1失敗：[全失敗出力](gui-green-expanded.log)|16/16：[再実行](gui-expanded-final.log)|

拡張GUIの初回失敗は、WebKitの教材前後のPNG厳密一致。State・CSS寸法757.84375・DPR1・backing758は同じで、デコードした画像は右下(757,757)の1画素・最大1階調だけ異なった。無描画で8回読む[対照実験](encoding-control.log)は不変。[教材前後の測定](layout-control.log)では同じ端画素のalpha197→198だった。小数CSS幅までのclearRectが端画素を部分消去し、再描画で透明度が蓄積する製品側の描画不具合と特定。identity transformでceil(size×DPR)まで全画素を消去してから描く方式へ変更した。**画像期待値も許容差も変えず**、同じ教材試験がGREENになった。

新GUIは上記に加え、手計算の2点分割x=.3→ロイド後x=.4で同じ標本(.35,.2)の領域色が変わることを直接読む。幅0の間は旧画素、復帰後は最新モデルの画素になる。比較ON/OFF・直前step・片方だけ幅0・context喪失・命令例外・主contextなし・旧rAF強制実行・作品切替・教材開始終了・reduced-motion・通常step/revisionを検証する。Canvas命令数の増加だけを根拠にせず、画素・手計算座標・提出した点配置も照合する。

さらに自己点検で「距離の破線stroke中に例外が起きた場合、線種が次回へ残るのではないか」と仮説を提示し、独立担当が両browserで再現した。失敗時はcount据置・dash[3,5]、最初の復帰はsubmittedでも正常な同状態PNGに不一致、2回目の再描画で一致した。最初の例外試験は多角形の最初のstrokeだったため、この経路を検出できなかった。先行22項目の成功だけでP3を閉鎖せず、描画開始時に線種を初期化した。恒久GUIの同条件も両browserで[2失敗のRED](dash-red.log)を保存してから修正し、最初の復帰PNGが正常画像と完全一致することを検証する。生の反例と再検証は独立記録にも残す。

旧単体の`nearest`参照4箇所は`displayCandidates`へ改名し、期待配列は変更していない。これは従来の表示規則を保全する試験で、数学的所属は別試験で確認する。移行途中の型検査では旧参照4箇所を検出し、API移行後に成功した。個別timeout増加・新規skipはない。

診断手順の失敗も記録する：一度Playwrightの`--output`を省略し、既定test-resultsの掃除が独立レビューの一時ファイルを削除した。ログ自身もその中に開いていたため、Windows上で試験開始前の掃除が進まない状態になった。今回の診断プロセスだけを終了し、ログを掃除対象外、出力先を専用にして実行。削除された独立基準の証拠はcab2114から再計算して再取得し、元ファイル復元とは扱わない。製品の初回goto30秒問題とは別で、以前のUNKNOWN判定を変更する証拠ではない。

## 全体回帰・画像・性能

全単体207/207、型検査、本番build成功。[最終単体](unit-final.log)・[型検査](typecheck.log)・[build](build.log)。JS748.90KB/gzip215.61KB、CSS33.86KB/gzip7.09KB。基準cab2114のJS745.81KB/gzip214.37KBから約3.09KB/gzip1.24KB増、新規依存なし。Viteの500KB警告は既存と同種。

最終の破線復帰修正前に、本番GUI全236/236成功（14.6分）：[本番全件](production-full.log)。同時に走らせた[開発全件の途中ログ](development-full.log)はChromium側178件を完了、WebKitの204/356件目まで進行した時点で、発見した破線復帰不具合を先に修正するため担当者が明示的に中断した。そこまでassertion失敗なしだが、**この開発途中実行を全件PASSとは扱わない**。

最終修正後は、新作の既存30＋追加18＝48件を開発・本番の両環境／両browserで実行し、[開発最終](development-crystal-final.log)・[本番最終](production-crystal-final.log)に保存する。1280/390/375/320px、両テーマ、文字100/200%、DPR、キーボード・タッチ相当・フォーカス・横はみ出し・pageerror・教材復元を含む。最終HEADのCIでは既存10作品を含め、単体207・開発全358件・本番全238件を省略せず実行し、その成功を完了条件とする。既存の手動撮影2skipの意味は変更しない。個別timeoutの増加・新規skipはない。最終結果はPRの検証コメントに固定する。

最終ローカル結果：本番48/48成功（4.2分）。開発は47成功・1失敗（4.7分）で、失敗はChromiumの375px試験のbeforeEach、作品選択前のpage.goto(load)30秒。原因UNKNOWN。同じコード・timeoutで該当1件を単独実行し[1/1成功（5.2秒）](development-375-retry.log)。最初の失敗を取り消さず、47成功＋初回load失敗＋同条件再試行成功と報告する。数式・描画・教材など試験本文へ到達した条件は両環境で成功し、最終CI全件の結果を別途照合する。

[追加画像とCPU生データ](capture-report.json)は両ブラウザの境界・左右、320pxライト文字200%の8枚。各画像のモデル・描画revision、保持座標、テーマ・DPRを併記。64点の厳密観察は20回warmup＋300回のCPU標本を採取し、平均だけでなく最大値と全標本を保持する。他GUI検証と同時の同一ホスト実測で、低性能端末の上限保証ではない。撮影／計測は[再実行可能スクリプト](../../../tools/capture-voronoi-review.mjs)。

測定条件はWindows、Intel Core i7-14650HX、Node24.20、Chromium145.0.7632.6／WebKit26.0。最終64点観察1回の平均0.096／0.110ms、最大0.200／2.000ms。[初回生データ](capture-report-initial.json)は平均0.119／0.123ms、最大0.600／3.000msで、全観測中の最大はこちら。再測定の低い値で過去の最大を上書きしない。両browserのpageerrorは0。320px・文字200%のdocument.scrollWidthも320px。目視では境界右でp1への距離線が破線・p2へ実線、両方は表示候補色で、V1不成立・表示所属p1という独立の説明と一致した。最終画像8枚に加え、破線復帰REDの失敗画像2枚もscreenshots/に保持する。

実機iPhone Safari、実スクリーンリーダー、低性能端末、OS拡大はNOT_TESTED。200%はCSS文字拡大で、OS拡大ではない。context喪失・例外・旧callbackは合成試験で、実GPU障害を発生させたわけではない。初回提出で記録したpage.gotoの30秒失敗は原因UNKNOWNのまま残す。今回の再試行成功を過去原因の解決とみなさない。

今回も独立拡張ハーネスの最初のloadで30秒失敗が2回再発し、同一timeoutで再試行した。最終画像の再撮影も最初のChromium loadで[30秒失敗](capture-final.log)。いずれも試験本文前で、原因はUNKNOWN。並行ブラウザ作業中だった事実はあるが、因果関係や解決を確定したとは述べない。GUI終了後の同じ撮影スクリプトはexit0で8枚を取得し[別ログ](capture-retry.log)と最終capture-report.jsonへ保存、失敗ログは保持した。補助画像解析の初回はPillow未導入で実行できず、標準zlibでPNGをデコードして画素差を確認した。

## 独立再レビューとGitHub対応

自己検証とは別の読み取り専用レビュー担当が、Python Fraction.from_float基準を再構築し1517ケースを検査。cab2114の表示候補を数学的所属とした場合のfalse positive738ケースを再現、修正後の数学的所属1517/1517一致を報告。基準計算は実装のBigInt変換関数を使用しない。[独立最終所見](independent/REVIEW.md)・[失敗履歴](independent/failure-history.json)・[11項目](independent/browser-review-green.json)・[追加22項目](independent/extended-review.json)・[破線復帰RED](independent/dash-recovery-red.json)／[GREEN](independent/dash-recovery-green.json)・再実行可能なスクリプトを保存した。

最終の描画コードでも各browserの11/11・22/22と破線復帰の最初のPNG一致が成功。独立担当はP2-01/P3-01の対象範囲PASS、全体独立検証PARTIAL、最終HEADのfingerprint一致と必要CI成功を条件に限定マージ推奨YESと判定した。最終renderer SHA256は`265f9f3931c643032432f2ac75eff5705773447b99e70c328fb6eb00819056b9`、他の対象hashも独立JSONへ固定。最初の22項目だけでは破線途中例外を見逃した事実も所見に保持。同一ホスト上の別担当・別プロセスで、実機や人間の第三者レビューを代替したとは述べない。独立担当は本番・全既存作品・全幅テーマ行列・CIを別実行していないためNOT_TESTED、自己検証やCIと混同しない。

自己判定もP2/P3の修正・実施した数学／GUI範囲はPASS、総合はPARTIAL（初回load原因UNKNOWN・実機等NOT_TESTED）。最終HEADの全CI成功後に限り、両指摘の範囲に限定してマージ推奨YESとする。実際のマージ判断は利用者に残す。

最終HEAD・CI URL・checkoutコミット／tree対応・PRのDraft状態・自己判定／独立判定は、循環するcommit自己参照を避け、[PR #32](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/32)の追補コメントに記録する。Pages workflow・main限定公開条件・既存10作品の製品コードは変更しない。Draft維持、merge・auto-mergeは行わない。
