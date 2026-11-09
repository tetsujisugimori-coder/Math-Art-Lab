# 性能調査の要約

製品動作は基準b1d24d8から不変。改善率を提出する工程ではなく、描画処理経路への依存を切り分けた調査である。総合PARTIAL、依存関係SUPPORTED、具体的な待機先と元1249msの原因UNKNOWN。

## 同じfixtureの3×60秒対照

Windows 10.0.26300／i7-14650HX、headless Chromium、1280×900、DPR2、両Canvas 438×330 CSS／876×660 buffer、速度4、初期26000step、A/B、履歴6000／1200、全表示。causal suiteは各条件を3巡して反復し、初回だけtraceをON。行の値は各run最大値3個の範囲で、95%信頼区間や性能保証値ではない。変更する因子以外の初期設定は同じだが、固定壁時計窓の達成step数は同じではない。

| 条件 | paint最大の範囲 ms | Worker要求待ち最大の範囲 ms | 解釈 |
|---|---:|---:|---|
| 採用context／明示SwiftShader＋compositing有効 | 439.3〜466.1 | 454.15〜479.9 | 長い待ちが再現 |
| Canvas OFF | 0.3〜158.0 | 397.3〜424.55 | 空guardのwall時間も含む。純描画CPUではない |
| DOM＋観察計算 OFF | 395.5〜411.4 | 412.6〜417.55 | DOMだけでは説明不可 |
| 明示GPU起動flagなし | 13.2〜17.1 | 34.05〜39.75 | 描画処理経路への依存を支持 |
| `--disable-gpu` | 14.8〜18.6 | 35.6〜37.65 | 別のsoftware経路でも短い |
| geometryのみ固定値cache | 434.8〜442.8 | 453.4〜465.85 | cache単独では解消しない |
| 旧context（診断専用負対照） | 765.8〜893.7 | 2227.9〜2571.0 | 採用経路へ戻す製品変更はしない |

SystemInfoのdeviceStringは3経路ともSwiftShader。明示flagありでは2d_canvas／gpu_compositing／rasterizationがenabled、unforced／disable-gpuではunavailable_software／disabled_softwareだった。実GPUへ切替えた証拠ではなく、Canvas内部backendの直接測定でもない。最初の60秒ではGPU processの平均core相当が基準2.75、unforced0.28、disable-gpu0.29。host総CPU使用は約24.6／12.7／13.9%。累積CPU差の近似であり、GPU描画時間・提示完了・瞬間CPU負荷ではない。

別suiteの両表示OFF、同じwarm fixture、3×60秒では入力最大10.4／15.6／34.85ms。初回trace回収は10秒deadline失敗で、入力データは残るがtraceはNOT_TESTED。これを全表示の製品代替にはできない。

## tailと出現回数

単位ms。paintは命令投入を囲む経過区間、入力はWorkerの実送信T0→main受信T1。n／50ms以上数、中央値／p95／p99／最大を全て残す。nearest-rank p99は保証値ではない。

| causal run | paint n / ≥50 | paint median / p95 / p99 / max | input n / ≥50 | input median / p95 / p99 / max |
|---|---:|---|---:|---|
| 001 F | 818 / 39 | 4.2 / 15.1 / 433.9 / 466.1 | 1262 / 199 | 8.3 / 233.6 / 375.1 / 479.9 |
| 008 F | 834 / 44 | 4.1 / 86.6 / 427.0 / 439.3 | 1303 / 237 | 8.75 / 282.25 / 402.45 / 454.15 |
| 015 F | 825 / 45 | 4.2 / 219.9 / 427.5 / 443.4 | 1297 / 237 | 9.0 / 241.6 / 419.2 / 467.7 |

同3runの64step以下のcalculate最大は30.1／86.8／122.9ms、≥50ms数0／3／5。表示commit間隔の中央値47.5〜49.0ms、最大497.7〜509.2ms。これをモニターの表示FPSへ換算しない。各runの計算・paint・observe・refresh・rAF待機・frame間隔の全分布は`raw-results/analysis.json`にある。

## 無改変moduleと長時間試験

public Chromium 300秒、6575要求：median6.5、p95 268.2、p99 422.5、max462.9ms、≥50ms1330回。最終A/B849465step、履歴6000／1200、100ms後の追加step0。最終停止要求だけは0.2msだったため、それだけを再生中の代表値としない。phase／GCは未測定。public Canvas寸法・開始stepはprivate fixtureと異なり、直接改善率を出さない。

phase／observer／定期CDP／DOM heartbeatを外したminimal 3×60秒でも、要求1238／1246／1257件、最大463.4／459.0／462.25ms。単発要求だけの別60秒は1.75ms（n=1）。再現しなかった単発結果も保持し、応答上限の根拠にしない。

public5分の採取JS heapは約7.16〜41.19MB。基準60秒3反復は約6.84〜41.24MBの範囲。履歴容量は一定でも診断buffer・GCでheapは変動する。傾向図・時系列はraw sampleにあり、これだけでleak不存在や実機メモリ保証を主張しない。

旧毎呼出し計測器3×60秒のpaint最大436.4／433.3／449.3ms、calculate最大168.7／421.1／298.7ms、要求最大480.8／467.75／470.4ms。無改変moduleでも再現するので旧計測器を唯一の原因としないが、追加負荷を0とも言わない。旧1249msは同じpaint尺度で今回再現せず、同時刻traceもないため原因UNKNOWNを維持する。

全215runの値・失敗は[全実行表](performance-runs.md)、定義と環境は[計測契約](measurement-protocol.md)、機構は[trace解析](trace-analysis.md)。初期OFF寸法交絡のある短時間pilotは厳密な成分費用比較に使わない。WebKitのCDP／CPU emulation非対応と実機未検証も保持する。
