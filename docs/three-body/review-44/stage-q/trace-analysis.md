# ブラウザー・OS観測の限界

選択した短窓でChromium traceを採取し、main固有performance.markでpid/tidとpage時計を対応付けた。新しい診断版はWorker固有markも残す。旧Stage P traceにWorker固有markはないためDedicatedWorkerは候補threadとして扱う。mainとWorkerのperformance.nowを無変換で混ぜない。

Taskのwall duration、thread CPU、JS、native wrapper、Style/Layout、Paint、GC、Waitは別項目。Canvas wrapperは命令受付中の経過時間で、非同期raster／composite／GPU提示完了ではない。traceのイベントが存在するだけでは長区間原因と判定しない。dataLoss、時計marker、取得カテゴリはrawとexcerptへ保存する。カテゴリに要求したが実際に現れなかったイベントは、処理がないことの証明にならない。

非管理者の既存Windows環境で、read-only ProcessThreadを約100msごとに3×6秒、対照OFFも3回採取した。main170標本：Running43、Wait127。開始時QPC↔Nodeのbracket半幅0.063～0.097ms、Node↔page0.180～0.233ms。終了時はそれぞれ0.266～0.362、0.199～0.226ms。これは標本照会のbegin/end窓であり、atomicな全thread状態やCSwitchイベントではない。Waitの標本から待機原因を断定しない。

WPR/logmanは既存、xperfなし。tokenは非Administrator、WPRはnot recordingだった。権限変更・導入・新規kernel記録は行わず、CSwitch／ReadyThread／page fault ETWは**NOT_TESTED**。CPU時間の累積snapshot・priorityは取得したが、長時間試験全体にわたるOS負荷・メモリ圧迫の同時標本は未取得。`hostSamples`が空のrunを実測済みとは扱わない。

今回のOS観測窓で過去の長区間は発生しなかった。したがってOS状態と過去466ms等の因果関係はUNKNOWN。新旧traceの秒単位の時刻差やCPU差を、native待機・scheduler待機の確定値へ置き換えない。
