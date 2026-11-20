# CPU・経過時間・待機の分析

os suiteはnative wrapperありでsample ON/OFFを各3反復した。他のブラウザー試験・数値測定終了後の短い窓で採取した。全6件で機能取得エラー0。traceの固有markでmain pid/tidを同定した。

| 実行 | paint最大ms | geometry最大ms | 包含Task経過ms | 同Task thread CPU ms |
|---|---:|---:|---:|---:|
| os001 ON | 447.8 | 97.2 | 480.312 | 38.779 |
| os002 OFF | 426.8 | 70.8 | 454.326 | 36.798 |
| os003 ON | 412.1 | 378.2 | 408.467 | 35.089 |
| os004 OFF | 424.1 | 169.4 | 449.404 | 32.233 |
| os005 ON | 433.7 | 348.7 | 448.511 | 33.885 |
| os006 OFF | 324.1 | 321.1 | 350.712 | 34.184 |

geometryの各最大区間でmain同期GC X eventの重なりは0。async GC追跡eventをCPU停止時間として加算しない。Task CPUには前後の処理も含み、表のCPU値をgeometryだけのCPU時間とは解釈しない。

os003にはcalculate経過166.9ms、包含Task経過194.903ms／CPU2.256msの標本もある。JS FunctionCall eventの区間が長くても、その長さをCPU上のJavaScript実行時間とは呼ばない。待機イベントが記録されなかった区間でも、経過とCPUの差を特定の待機種別へ配分できない。

現tokenのAdministrator判定はfalse。既存WPRを開始せず、kernel CSwitch／ReadyThread／page faultはNOT_TESTED。非特権ProcessThreadは標本であり、context-switch eventではない。mainとWorker固有mark、QPC↔harness↔pageのbracketを保存する。bracket幅0は時計誤差0を保証しない。

最終診断版は撮影前後にもNode↔pageの8往復を採取し、撮影APIの開始／受付終了、画素検証、trace停止を別時刻で保存する。撮影命令受付はGPU提示完了ではない。初期探索版にないclock fieldは未取得として保持する。

原因判定はUNKNOWN。観測した約400ms現象、撮影timeout、元1249msの同一原因は証明されていない。追加観測は権限認可済みの環境でのkernel ETWと、今回のcapture clockを使ったnative API区間との照合が対象となる。
