# Stage Q：最小再現と支持された局所修正

基準b07ccec1205ca99a1112ab8db951efbe94a51f74、独立レビュー5842434528。開始時clean／同一HEAD／Draft OPEN／auto-mergeなし、既存3CI成功を確認。origin/mainは9167e979のまま。Stage Pの約525MBは改変しない。新規Issue／PR、merge／auto-mergeは行わない。

## 事前の計画・停止条件

1. 物理積分を含まないCanvas＋DOMページで、Canvasなし／要素のみ／contextのみ／初期bitmap保持／clearのみ／線のみ／実アプリ由来の固定命令列／複数frame分割を独立比較する。サイズ・DPR・枚数・visibility・更新周期・DOM種類・context・起動経路を明示する。基準は438×330 CSS、DPR2、Canvas2枚、40ms更新。命令列は基準modelの26000stepから別工程で生成し、ページ内で重力積分しない。
2. 最初のscreenは3秒×3。長い区間が出た条件と負対照のみ追加traceで確認する。最小ページで出なければ、初期WebGLの有無／実アプリDOM構造を次の小さな対照とする。製品候補は根拠の得られた局所変更を最大2個まで短時間試作し、効果のないものを撤回する。未確定なら診断成果としてPARTIALで止める。
3. 実アプリは新計測器で基準60秒×3＋300秒を再実行。候補を採用する場合は同じ生成器・版・寸法・表示・履歴・A/B・dt・速度・時間で候補も全再実行する。各窓の進行step差を保存し、固定総stepの数理同一性と区別する。Stage Pの旧生成器と直接の改善率を出さない。
4. 一時停止／Escape／合成visibility／連続操作／教材復元／作品切替・破棄を別条件で確認する。通常・reduced-motion、各画面幅、Linux Chromium/WebKitは既存GUIと新CI artifactで検証する。実OS非表示／物理キー／GPU提示が取得できなければNOT_TESTED。

## 事前の観測目標

同条件3反復で、予定要求→受信p95≤100ms、p99≤200ms、観測最大≤250ms。受信→停止≤20ms、停止→同step命令受付≤100ms、受信後・停止後追加step0、A/B同時刻、古いtimerなし。製品改善の支持はp95の30%以上低下を同条件で再現し、別条件p95の10%以上悪化や数理／画素／状態の回帰がないこと。達成しなければPARTIAL。これらは今回の観測予算であり理論的保証上限ではない。

## 時計・OS・計測負荷

Workerは有限個の絶対予定timerを開始時に予約し、T-1（予定）／T0（実送信）を両方保存する。main T1、pause T2/T3、Canvas/DOM受付T4を分離。開始・終了8往復の時計bracketを残す。別Nodeプロセスからのprotocol要求も別条件とし、物理入力とは区別する。自然phase HIT／TARGET_MISSと人工正対照を混ぜない。

traceは選択した短い窓だけに限定し、main tid/pidをmarkで同定。CPU／wall／native API／GC／Layout／Paint／waitの重なりを別々に扱う。存在だけで原因を確定しない。新phaseは開始前snapshotを区間外に置く。計測OFFの対照を用意する。

Windowsの既存wpr.exeは存在、現tokenは非Administrator、statusはnot recording。権限変更や追加インストールは行わない。kernel CSwitch／ready／faultのETWが取得できなければNOT_TESTED。可能な非特権のProcessThread状態標本は別物として、QPCとNode／pageの往復bracketで同期し、標本をcontext-switchイベントと呼ばない。

## 証拠とIssueの運用

- 既存Stage Pは変更・削除しない。履歴書換え／LFS導入なし。
- 新規生データは`.three-body-evidence/stage-q/`へ保持（Git除外、Playwrightのtest-results清掃から分離、自動削除なし）。Gitには契約・要約・全run索引・SHA256・小さい検証JSONを保存し、追加10MB以内を目安に監査する。巨大traceを無条件で追加しない。
- CIはWindows Chromium／Linux Chromium・WebKitの再現可能なrawをartifactへ保存、保持90日を指定。run URL／実際の期限／encoded・decoded hashをPR提出記録へ保存。期限前にdownloadしてSHA256確認し、local保持へ複写する。タイミング標本そのものの再生成は保証できないので、再実行コマンドをraw再取得の代わりとは呼ばない。
- local Windows原証拠のremote完全複製ができていない場合はNOT_UPLOADEDと明記し、消去しない。fresh browser／localhostだけを対象にし、公開前に既知credential形式とpath・端末情報を点検する。機密を伏せる場合は元データと編集理由を保持する。
- P2-01／P3-02未解決ならIssue #43をOPENのまま残し、PRの自動閉鎖keywordをRefsへ変更する。別Issueへ重複転記せず、#43で残件を追跡する。

## 参照

[CDP Tracing](https://chromedevtools.github.io/devtools-protocol/tot/Tracing/)、[Microsoft WPR options](https://learn.microsoft.com/en-us/windows-hardware/test/wpt/wpr-command-line-options)。CPU elapsed差だけで待機先やOS schedulerを断定しない。
