# 仮説と事前予測

SUPPORTEDは観測範囲の支持であり、元の1249msや全ての長時間区間の原因確定ではない。REJECTEDも特定の予測／測定窓に限定する。未測定を反証へ置き換えない。

| 仮説 | 予測 | 対照・検証 | 初期判定 |
|---|---|---|---|
| H1 Canvas命令量 | Canvasを除くと長い区間／待ちが減り、点・命令量と関連する | B/C対D/E、軌跡・発光・ベクトルOFF、同寸法・実計算点数 | UNKNOWN |
| H2 描画backend待機 | 同じ命令量でもcontextで差が出る。main taskと描画プロセスの区間が関係する | readback基準対旧context、traceのrender/GPU/compositor。GPU提示は未測定 | UNKNOWN |
| H3 GC停止 | 長い区間中にrenderer mainのGC区間が重なる | main pid/tidを時計markで特定しGC区間の和集合を算出。背景GCを混ぜない | UNKNOWN |
| H4 長いmain JavaScript | 長いFunctionCall／TaskがT0〜T1と重なる | phase begin/end、JS/task、独立要求。120ms人工占有は正対照だけ | UNKNOWN |
| H5 プロセス間scheduler | mainの実行待ちとbrowser/render/compositor activityが関係する | trace process/thread名とCPUTime。OS run queueなしでは原因確定しない | UNKNOWN |
| H6 OS負荷・メモリ圧迫 | CPU負荷／空きmemoryの変化と頻度が変わる | host CPU累積、freeMemory、process CPUTime／heap推移、CPU4倍throttling。実OS圧迫は別 | UNKNOWN |
| H7 累積session | 同一Documentで作品往復後に負荷が増す | 新規対同一Document8往復。数時間使用とは同一視しない | UNKNOWN |
| H8 計測器負荷 | phase／trace／旧毎呼出し計測で待ちやthroughputが変化する | 同じ停止Worker・hook下でOFF/light/legacy、trace ON/OFF。host採取費用も記録 | UNKNOWN |

確定結果・支持／反証・未確認範囲を測定後に追記する。

## 最終判定（この環境と測定窓に限定）

| 仮説 | 判定 | 支持する観測 | 反証・負対照 | 未確認／次の検証 |
|---|---|---|---|---|
| H1 Canvas命令量 | UNKNOWN | Canvasを含むD/E/Fに長い描画区間。deepのstroke等に長い経過区間 | Canvas除去後も入力397.3〜424.55ms。空guardにも158ms。命令量を変えず起動経路を変えると入力34.05〜39.75ms | 命令量の寄与を純CPUとして同定できない。最小描画fixtureでcompositing等を独立に変える |
| H2 描画backend待機 | SUPPORTED（描画処理経路への依存） | 3反復で明示SwiftShader＋GPU compositing/rasterization enabledは入力454.15〜479.9ms、unforced／disable-gpuでは34.05〜39.75ms。旧contextは2227.9〜2571ms | 同じdeviceStringでもfeatureStatusは異なる。Canvas内部backend、待機先、GPU提示は未測定。main wait markerは最大例に重ならない | 具体的な待機機構はUNKNOWN。featureを一つずつ制御した最小再現とOS context-switch trace |
| H3 GC停止 | UNKNOWN（一部の重なりのみ） | 79.7ms paintにGC74.047ms、292.3ms calculateにGC129.554msの重なり | 最大paint466.1ms／calculate411.2msのmain GCは0ms。GCだけで全長時間区間を説明する説は反証 | GC elapsedをCPU時間へ置換しない。allocation差替えの因果対照は未実施 |
| H4 長いmain JavaScript | UNKNOWN（純JS CPU主因説は最大例で反証） | 同期Task／JS elapsedが入力配信をまたぐ。120ms人工占有の正対照で検出器は応答する | calculate411.2msの包含Task CPU1.867ms、paint466.1msの包含Task CPU32.363ms。純計算量では説明不可 | native同期・実行待ちをJS wall durationから分離できない。mainが入力を処理できない窓は観測したが内因は未確定 |
| H5 プロセス間scheduler | UNKNOWN | main Taskのwall/CPU差、GPU process累積CPUの経路差。browser/render/GPU/thread metadataを取得 | 相関とCPU差だけではschedulerの因果を示せない。commit wait等の取得markerは最大例で0ms | ETW等のcontext switch／ready thread／priorityとtrace時計の同期が必要 |
| H6 OS負荷・メモリ圧迫 | UNKNOWN | host CPU/free RAM、process CPU/heap、独立os-counters条件のページ読出し等を記録 | ホスト全体CPU負荷は飽和を示さない例でも再現。空きRAMだけでswap／pidの待ちを特定できない | OS負荷を制御した圧迫実験・hard faultのpid別因果・電源/優先度は未検証 |
| H7 累積session | UNKNOWN | 8往復の累積Document条件と新規を3反復、5分public実行を保存 | 新規ブラウザーの3×60秒でも再現するため、累積sessionは必要条件ではない | 数時間使用・BFCache・実OSの表示切替、累積だけの寄与は未確認 |
| H8 計測器負荷 | REJECTED（追加計測器だけが原因という説明） | 旧毎呼出し計測／deep／traceは負荷と交絡を追加し得る | phase・observer・定期CDP・DOM heartbeatを外した無改変moduleでも入力最大463.4／459.0／462.25ms。旧計測器がなくても再現 | Worker自身のtimer待ち、完全無観測／独立OSプロセス入力は未測定。計測器の寄与が0とは言わない |

H2のSUPPORTEDを、内部待機機構のCONFIRMEDへ格上げしない。unforcedもGPU情報はSwiftShader deviceであり、「実GPUに変えて速くなった」「ソフトウェア描画全般が遅い」という結論はいずれも誤り。記録された違いは、起動flagとGPU機能有効化状態を含む処理経路である。

元の1249ms標本は同時刻traceがなく、今回の466msや旧contextの2571msと同じ原因とは断定できない。従来の433.5ms／432.5msも別実行。H1・H3・H4の単独説明と、H7・H8の必要条件説を狭めたことが今回の調査成果である。
