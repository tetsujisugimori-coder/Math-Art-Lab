# Stage S の観測と採用判断

基準8f4d39f、レビュー5854989138。総合PARTIAL。製品変更・製品候補の試作は0件。

## ローカル測定

| グループ | 完了 | 取得失敗 | 結果 |
|---|---:|---:|---|
| mechanism初回 | 9 | 0 | 400ms非再現、入力配送max約12.12ms |
| capture | 36 | 6 | 旧contextで成功と5秒timeoutが混在 |
| capture-probe | 18 | 8 | view6エラー、旧PW／surfaceは各1失敗・各2成功 |
| emulation | 12 | 0 | 追加CDP metrics ON/OFFとも取得・画素照合成功 |
| sender-targets | 9 | 0 | 自然HIT1、MISS8、配送遅延と予算超過あり |
| mechanism再測定 | 9 | 0 | 約400msを再現、追加計測OFFでも配送遅延あり |

計93run完了、取得失敗14はE_SCREENSHOT。取得失敗と性能予算超過を分けて保持する。全raw・trace・初回の非再現を残す。単一の遅い実行だけを選んだ改善率は算出しない。

再測定001のpaintは437.2ms、包含Taskは466.917ms／thread CPU39.126ms。このpaintにmain同期GC、記録されたmain waitの重なりは0。geometry212.8msの中にLayout108.194ms／同event CPU2.061ms等がある。FunctionCallの長さをJSのCPU使用量としない。

同runの別の最大Taskは467.957ms／thread CPU39.008ms。JS区間9.726ms（同event CPU9.515ms）でも、Layout event373.296ms／同event CPU5.380ms、PrePaint61.473ms／CPU1.266msを含む。Layout群の重なり376.192ms、Paint群81.892ms、main GC1.153ms。Raster／Compositeの別threadのeventも存在するが、その存在や短い重なりだけでnative待機先やOS実行待ちを確定しない。CPU値はfull event、重なりは照会区間でclipしたunionであり、各分類や親子eventは加算しない。

native追加wrapperなしのphase-onlyでもpaint最大454.4ms。instrument OFFにも入力配送max473.7399msの標本がある。OFFでもtrace・時計・入力probe等は残っており、あらゆる計測負荷を除去した試験とは呼ばない。追加native／phase計測が必須の単独原因という説明は支持されない。

初回と再測定は同じ設定でも時間順が異なる。GPU／OS／累積状態が具体的に何で変わったかは未観測。起動経路や異OSの数値差をWeb製品改善とみなさない。元1249msとの同一原因はUNKNOWN。

両グループ001の公開GPU featureStatusは測定前後とも同じだった（2d_canvas、gpu_compositing、rasterization enabled、SwiftShader driver5.0.0）。これだけでは実際のnative実行経路・待機の同一性を保証できない。非再現も再現も同じChromium145.0.7632.6、DPR2、Canvas2枚、speed4、dt=.001、飽和履歴6000／graph1200、全表示を使用した。設定値は原snapshotとconfigureのsource snapshotで確認する。

## 仮説と候補

| 仮説 | 判定・限界 |
|---|---|
| 長い区間がすべてJS計算CPUである | 観測標本では反証。JS外の長いLayout／Paintと低いthread CPUを取得 |
| geometry呼出しのCPU量が原因 | 支持されない。低いLayout CPUを含むelapsed区間であり、他のrendering Taskも長い |
| GCだけが原因 | 437.2ms paintの同期main GC重なり0という反例。全標本のGC寄与は別に保持 |
| 追加native wrapperだけが原因 | wrapperなしでも再現。単独・必須原因説は反証 |
| renderer／描画経路との関係 | 時間的な局在はSUPPORTED。具体的native待機・プロセス同期はUNKNOWN |
| OS scheduler／page fault | kernel ETW未取得でUNKNOWN。CPUとwallの差から確定しない |
| 追加CDP overrideが撮影失敗の単独原因 | ON/OFFとも成功する反例。環境・順序の交絡を排除できていない |

geometry cache、DOM更新順序変更は候補のまま。根因未確定で、後続のLayout／Paintにも長区間があるため、局所処理を省けば入力が改善するという対照根拠はない。30%改善・他条件10%悪化なしの採用gateを適用する前提が成立せず、製品候補試作0／採用0／改善率NOT_TESTED。Worker／OffscreenCanvasも採用しない。

## 次の最小実験

同じstatic Canvas命令列・DPR2・2枚を使い、旧contextの同一設定を時間順で交互に反復し、追加CDP接続・readback前後・trace停止順を一因子ずつ分ける。取得前のbitmap readbackはbackendを変え得るため、実施する側としない側を明記する。命令列hash一致を初期bitmap画素一致の証明に代用しない。

遅延は今回の再現run001のmain pid29852/tid11672とevent時刻を固定した原traceから、ブラウザー内部flow／waitの対応を調べる。認可済み環境でkernel CSwitch／ReadyThreadとQPC同期を取得できれば、Layout／PrePaint内の非実行時間とready待ちを照合する。現tokenは非管理者なので本調査ではNOT_TESTED。権限昇格やOS変更は行わない。

これ以上の無期限反復を行わず、最終CIと正式回帰を確認後、根因UNKNOWN・総合PARTIALで独立再レビューへ提出する。
