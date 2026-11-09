# 入力要求から停止まで

T0＝別Worker threadの実送信、T1＝main message受信、T2＝pause本体開始、T3＝pause本体終了、T4＝停止stepのDOM／Canvas命令受付。T4はGPU提示完了ではなく、物理入力装置／独立OSプロセスからの遅延も未測定。要求源自身のtimer待ちはT0より前にある。

## 自然な長時間区間への要求

Chromium／飽和A/B／採用context。T0が対象phase内へ時計誤差を超えて入った場合だけHITとする。中央値だけでなく各試行を残す。

| 対象／run | T0→T1 ms | T1→T3 ms | T2→T3 ms | T3→T4 ms | 結果 |
|---|---:|---:|---:|---:|---|
| calculate／probe002 | 67.75 | 208.10 | 0.20 | 8.80 | HIT |
| paint／004 | 345.40 | 1.30 | 0.30 | 8.10 | HIT |
| paint／005 | 266.05 | 1.10 | 0.20 | 7.60 | HIT |
| paint／006 | 322.90 | 0.80 | 0.10 | 6.80 | HIT |
| observe／007 | 25.50 | 1.10 | 0.30 | 6.40 | HIT |
| observe／008 | 453.70 | 0.90 | 0.20 | 4.50 | HIT |
| observe／009 | 69.15 | 1.10 | 0.30 | 6.00 | HIT |

calculateの他2試行はTARGET_MISSで要求待ち5.3／203.75ms。消さず全表へ記録する。120ms人工占有の別正対照は自然発生と混ぜない。最終smokeの正対照も実際のsynthetic-paintとの重なりを確認した。

停止本体が0.2msでも、その前の同期待ちが208.1msになる例がある。受信後追加step0と低い壁時計遅延は異なる契約であり、P3-02をPASSへ変更しない。旧contextを含むエラーなし全表示条件ではT3→T4最大697.2ms、最終停止要求T0→T1最大1184.75ms。再生中の全要求最大2571msとも別の標本である。

## 停止イベントと復元

送信先を修正したpause／Escape／visibility各3反復の9試行は、T0→T1 0.25〜23.35ms、T2→T3 0.1〜0.5ms、T3→T4 5.6〜14.0ms。受信後・停止後追加step0、A/B同step、timerなし、100ms後に再生なし。visibilityは合成documentイベントであり実OS非表示ではない。clockEpochは進み、visibility時のsafetyEpochも進む。教材復元／reduce切替／作品切替／破棄は既存GUIで別に確認する。

初期Escapeはwindowへ誤配送し、pause T2なし、425追加step、timer残存を検出した。失敗を残し、製品document handlerが受信してから停止しなかった現象とは区別する。修正後9試行と最終CIの再試行で検証する。

public5分終了時は停止受信後100msの追加step0とA/B／表示step一致を確認。ただし公開属性ではT2/T3、内部timer／epochを測れないためNOT_TESTED。公開値から架空の内部時刻を補完しない。

## 時計と保証の限界

各Workerは開始・終了8往復ずつ。`uncertainty`は開始時最短往復の半幅で、絶対精度保証ではない。開始／終了のoffset midpoint差はChromiumで最大約0.2ms、WebKitで最大11ms。後者は往復の幅・非対称性も大きく、11msの物理的clock driftと断定しない。`worker-clock-summary.json`に各幅を残す。

WebKitではT0→T1の名目値-6.5ms等があり、開始同期半幅±7.5ms内。0へ丸めて消さず、細かい順位や負の物理遅延を主張しない。負のnominal値・時計量子化・開始終了offset差のため、ブラウザー間の数ms差を因果的な速度差と解釈しない。

T0時の厳密なmodel stepは要求源と同時採取していない。T1／T2以降のstepとraw before snapshotに基づく範囲を区別する。GPU画面提示T4、実機の入力遅延上限、数時間後の停止はNOT_TESTED。全runを[停止表](input-latency-runs.md)とraw recordへ保持する。
