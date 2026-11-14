# Stage AE：処理費用と診断契約

総合PARTIAL、マージNO。基準0b4f1ab8f38ec3dc692fe8056610ecbbe12c4954。製品・原テスト・5000ms・許容値・AB/AC承認policyは無変更。ブラウザー/CDP/GUI/原停止試験0。性能改善率NOT_TESTED。

## 構造と同等性

原テストのASTからbodyとRMS式を抽出し、演算・assertionの順序と入力を保った診断関数へ埋め込んだ。Verlet126518回、停止理由assertion126518回、保存量12652回、最後の不等式2回。T=126518×.001=126.518、h=.0002、RK4 n=ceil(T/h)=632590、4段RHS2530360回をカウンターで実測した。参照実装への2つのcounter挿入を消去すると元sourceとbyte一致する。

同じinstalled Chai/@vitest/expectのmatcherとassertion counterを使うが、Vitest worker/test association・soft/snapshot plugin・collectionは含まない。境界値null/非null、<、=、>、NaNの受理・拒否を元matcherと照合した。この実装差、bundle化、hash/counterは計測への交絡であり、原テストの5000ms PASSを示さない。

## 固定ABBA結果

ae-A1 OFF → ae-B1 ON → ae-B2 ON → ae-A2 OFF、4/4完了、未実行0、30秒上限到達0。新規独立processを各1件、追加・置換・retry0。

|項目(ms)|A1 OFF|B1 ON|B2 ON|A2 OFF|
|---|---:|---:|---:|---:|
|body全体|1392.046|3163.913|3173.000|1415.455|
|親process起動→終了|1785.077|3413.439|3446.042|1697.753|
|child内bundle import|10.228|18.591|9.985|10.280|
|Verlet呼出し計時合計|未計測|313.240|312.233|未計測|
|保存量呼出し計時合計|未計測|37.704|37.672|未計測|
|assertion構築＋matcher合計|未計測|917.456|920.310|未計測|
|独立RK4|未計測|808.934|805.413|未計測|
|最終RMS|未計測|0.122|0.057|未計測|
|未分類body時間|未計測|1086.409|1097.269|未計測|

assertion logical count126520に対して計時call数253040は構築とmatcherの2区間。RK4内の各stepは個別計時せず全体1区間。各区間の計時総和は全体時間ではない。OFFのraw内部accumulator0はobserved=0であり、ゼロ費用と表示しない。未分類にはhash、loop、counter、時計呼出し・集計等を含み、OS待機とは呼ばない。

全体process CPUはA1 1561ms/B1 3312ms/B2 3298ms/A2 1515ms、thread CPUは1390/3109/3125/1390ms。threadCpuUsage APIから直接取得し、process値から推定していない。各カテゴリのprocess/thread値も原票に保存。特に短い呼出しのCPU counterは量子化と別々の読取り境界の影響が大きく、wallや互いとの差を待機機構へ配賦しない。OFF/ON差は観測器の負荷とruntime差を含み、原試験の純計算費用や製品改善率ではない。

4件とも最終位置・速度Float64 bit、reference bits、最大energy error、RMS、全Verlet phase履歴hashが一致。max=2.0425110705340324e-7、RMS=0.00005166206684615977。履歴hash d090b4c5cdefc04a0de13262b815d06893eb5e655d941a76b5fcdc37f40996d4。同等性はこの診断cohort内の演算/判定結果であり、元Vitestの実行PASSではない。

RK4は診断ONで約0.81秒だが、単独で元10秒timeoutを説明する証拠ではない。matcher/test association、bundle/JIT、環境差の寄与はUNKNOWN。追加の原因探索・最適化は行わない。

## source取得範囲

最終preflightは52入力を事前byte snapshot。esbuild metafileの全runtime JS/TS入力、原試験・reference・型source・lock・設定・診断器・matcher・policy・YAML utilityを保存。bundleの外部importはnode:crypto/tty/node:perf_hooks/node:worker_threadsのみ。HEAD/tree/Git blob（未追跡・installedはnullと理由）、size/SHA、方法を記録。初期未実行snapshot2件はレビュー修正前準備として保全し、試行置換にはしていない。

起動前後にmanifest全文、rows再計算、source/snapshot、bundle、コピーbootstrap、Node executable SHAを照合。実際に実行するbundleをchildも検証。Node native libraries/OSと元Vitest全collection依存は完全束縛できていない。runtime JS closureの取得と環境全体の完全束縛を区別し、全面PASSを主張しない。

## YAMLと診断契約

既存配布内のYAML parserを使用。新規npm依存取得は待機のため停止、package/lock変更なし。構造でjob/steps/if/run/順序/continue-on-error/idを解析。コメント中だけの文字列、guard後置/無効化、always迂回、OR/否定、空白・大小文字status関数、重複キーを拒否する。

review-diagnosticsのalways raster処理にguard成功条件を追加。Qの独立後続suiteにもguard成功条件を明示追加（既存preflight成功条件は維持）。拒否policy自体、他PR/mainの通常経路は変更しない。外部action実装・任意shell間接実行はUNKNOWN。別PR移植と旧revision rerunへ遡及保護できない制約も維持。

初回契約28成功/1FAIL（boolean falseを未指定と誤認）を保存して修正。独立レビューでsource-set自己申告・否定条件・thread欠測保持を補強。計測開始前44/44契約PASS。診断器の成功を製品受入へ拡張しない。

計測後の独立解析レビューではclock必須値/envelope再計算/modeと計画の対応/bitと実phaseの対応/有限非負値を補強し、実行成功後の観測・source障害を総合PASSへ上書きしない検査も追加。旧summaryと旧解析sourceを保存し、新しい再監査だけを実施した。数値試行の追加は0。起動前2つの準備snapshotは未実行として保持した。

## AB独立timeout

Stage ADのAB run43639666261は92成功/1 timeout、5000ms、後続承認対照未実行・artifact未作成を保持。原テストは一時directoryと.last-run.json作成→PythonでZIP生成→別PythonでCRC/集合/size/SHA照合→fileをchangedへ変更→3回目Pythonで非ゼロ拒否確認。ここに実際のZIP展開操作はなく、既存のfixture fileを照合している。cleanup削除も本文にはない。

3つのPython起動時間と各処理区間は旧原票で未計測、UNKNOWN。第三呼出しの単なる非ゼロは別の起動障害でも成立するため、mock契約ではFILE_BYTES拒否とspawn異常/無関係非ゼロを分離した。原テストは変更せず、追加の実ZIP/Python測定は行わない。必要なら別固定計画で3呼出しの区間を事前定義して審査する。

## 回帰・保全・停止

診断契約、型/build、既存6条件bit/全履歴hashを別記録で検証。正式CIは最終HEADで確認し、W/X/AB過去failure・今回failureを区別する。GUI skipはNOT_RUN。

新規原票は承認済みStage-AE専用領域へ非破壊保存、別processで集合/サイズ/SHAを再検証する。旧6原本NOT_OBTAINED、全履歴LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS、REMOTE_BACKUP_NOT_UPLOADEDを維持。独立再レビュー待ちで停止する。
