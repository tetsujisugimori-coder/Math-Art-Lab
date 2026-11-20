# Trace解析：途中観測と最終集計の読み方

## 再現した長い区間（最終追加対照前の観測）

`long-chromium-004-F-light`、DPR2／飽和A/B／全表示／SwiftShader起動flag、60秒。

- paint id4654：ページ単調時刻54999.7〜55437.1ms、437.4ms。
- markによるmain同定：pid25596／tid13716。trace offset約28766267.786ms。
- このpaintを含むRunTask：elapsed464.06ms、記録されたthread CPU34.72ms。
- 同じmain threadのGC重なり：0ms。このpaintの全時間をGCで説明する仮説は支持されない。
- paintのCPU時間は包含taskのCPU時間以下なので、少なくとも約402.68msはそのスレッドのCPU実行だけでは説明できない。ただし、待ち先／OS deschedule／browser内同期をこの差だけで特定しない。

JS FunctionCallのwall durationにはnative呼出し内の待ちも含まれる。長いFunctionCallをそのまま長いCPU計算と呼ばない。[ChromiumのThreadDuration説明](https://www.chromium.org/developers/how-tos/trace-event-profiling-tool/trace-event-reading/)を参照。

## 解析上の注意

測定窓はperformance.markで区切る。窓外の状態転送・圧縮・画像保存を主張の根拠にしない。境界をまたぐtaskは窓内のwall時間へclipした統計と元durationを両方残す。GCの入れ子は和集合として重なりを数え、背景threadのGCをmain停止へ加算しない。

最初の計測器はLayout/Paintを一つの重なり指標にしたため、これを純Layout時間とは呼ばない。最終の再解析ではStyle/LayoutとPaint/Compositeを分ける。mark bracketが0でも時計誤差0を意味しない。最小の観測時刻差・offsetの変化も保存する。

全traceの再解析結果は `traces/*-analysis.json`、全runの統計は `raw-results/analysis.json`。途中のHTTP生成失敗／誤配送のEscapeはinvestigation.mdに保持し、有効な性能試行と区別する。native-localizationと反復60秒対照による最終結論は測定後に追記する。

## 60秒対照での局在

`causal-chromium-001-F-causal-light`は時計mark 2/2、offset 31113085.459ms、mark bracket ±0.05ms（精度保証ではない）、main pid3636／tid33284。

| 対象 | 経過区間 | 包含Task経過／thread CPU | main GC重なり | 取得できたmain wait marker重なり |
|---|---:|---:|---:|---:|
| F paint id2520 | 466.1ms | 492.143／32.363ms | 0ms | 0ms |
| F observe最大 | 432.0ms | 460.254／33.548ms | 0ms | 0ms |
| Canvas OFF calculate最大（causal-002） | 411.2ms | 412.263／1.867ms | 0ms | 0ms |
| Canvas OFFの空paint guard | 158.0ms | 280.962／12.174ms | 0ms | 0ms |

最後の行は描画を行わないguardにも長い経過区間が記録された例。これを158msのCanvas描画CPU時間と呼ぶのは誤りである。411.2msの64step計算区間も、CPU計算が411msを使ったわけではない。phaseを囲むTaskが延び、そのCPU時間が小さいことまでが実測である。

Fには別の79.7ms paintと74.047msのGC区間重なり、Canvas OFFには292.3ms calculateと129.554msのGC区間重なりもある。GCは全く起こっていないわけではない。ただしGCのelapsedにも待ちが含まれ得るため、重なった時間をそのままGC CPU時間へ置換しない。最大例のGC説明は反証され、一部の区間でのGC寄与の大きさは未確定。

`LayerTreeHost::WaitForCommitCompletion`／`SyncToken::Wait`／`VerifyFlush`等の名前がtrace全体に存在することだけでは原因にならない。causal-001のmainで採取したwait markerは最大0.487msであり、466.1ms区間との重なりは0ms。取得できていないnative待機やOS descheduleを0msと結論しない。[Chromiumの実装例](https://chromium.googlesource.com/chromium/src/+/815ca4192eebd11792deb48147c816bbc2fc9886/cc/trees/layer_tree_host.cc)はmarkerの意味を読むための資料であって、本標本の待機先の証明ではない。

同runの最大Worker待ち479.9msでは、取得JS区間の重なり354.562ms、Style/Layout 101.048ms、Paint/Composite 22.841ms、main GCと採取済みwait markerは0ms。これらは入れ子／重複し、合計して479.9msを分解した割合にはしない。要求T0で始まっていたpaint自身は4.8msであり、最大paintとの因果を同一視できない。

deep対照ではgetBoundingClientRect最大377.2ms、stroke最大162.9ms、fillText最大128.3ms、graph属性更新59.7ms。呼出し内の経過時間であり純CPU／GPU完了ではない。複数の異なるnative呼出しへ長い区間が現れることは局在の手がかりだが、deep自体の負荷がある。geometryだけをcacheした3×60秒でも最大入力待ちは453.4〜465.85msで、geometry単独修正は採用しない。
