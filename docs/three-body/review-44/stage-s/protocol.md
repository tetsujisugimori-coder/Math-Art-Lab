# Stage S 事前計画

基準8f4d39fa6eeac35143ad36d6182bb1f2661b28c3、レビュー5854989138。Issue43 OPEN／PR44 Draft、origin/main9167e979、作業tree cleanを確認した。既存P/Q/R証拠は変更しない。

P3-05を最優先する。正常、summary欠落／破損、raw-index破損、run重複／欠落、report異常、checker異常、artifact不整合を負対照にする。修正前REDと修正後GREENを別ログに保存する。

状態の契約は、ファイルの存在／読取／JSON構造の可用性、解析processが終了したこと、その終了が成功したこと、内容の監査整合、証拠全体の完全性、受入を独立にする。破損ファイルが存在することを解析取得成功とは扱わない。失敗時の原errorとSHAを保持する。

遅延は最初に観測する。飽和A/B・全表示・DPR2・同じ固定刻みで6秒×3反復、native計測ON／phase計測のみ／追加計測OFFを対照とする。main／Worker pid/tid、固有mark、wall／thread CPU、Layout・Paint・raster・composite・GCの時間的重なりを保存する。包含や相関を因果と呼ばない。元1249msとの同一原因はUNKNOWNを維持する。

同じCanvas2枚・backing876×660・DPR2・命令列hashで既存capture36条件、PW／CDP surface／view18条件を再実行し、trace停止前後と追加計測ON/OFFを比較する。5000ms timeoutは維持する。新しい撮影条件は既存R結果を上書きしない。

36条件では旧contextの12撮影がtimeoutした一方、18probeでは旧contextのPW／surfaceが成功した。追加CDP接続への同一device metrics overrideと、撮影後の画素検査が差分である。撮影後readbackを両側に固定し、追加CDP overrideだけON/OFF、現行／旧context、各3反復の12条件を次に比較する。DPR・寸法・命令列・撮影順を照合し、一因子が固定できなければ交絡として記録する。これは製品候補ではなく診断対照である。

訂正：上の「12撮影timeout」は集計前の誤記で、全36原票の独立解析では6件だった。旧contextの成功も残す。解析reportは撮影Eを反映してcode1で正常に結果を書き終えた。ローカル補助loopがこのcode1を「Analysis failed」として後続解析を止めたため、そのログを保持し、残り4グループは終了codeを保存して個別に継続する。既存CIの独立suite継続処理を変更する事象ではない。

専用senderによる自然target9件、教材／作品破棄などの既存試験を再実行する。T-1／T0／T1／T2／T3／T4とsender→harness→pageの時計bracket・中継遅延を保存する。

最初のmechanism9件では約400msが非再現だったが、続くsender-targets007のtrace OFF条件でpaint約312ms・入力配送最大約437msを観測した。この間欠性を保持し、emulation対照後に同じmechanism9条件を一度だけ再測定する。最初の9件と実行順序が異なるため改善率の前後比較には使わない。それ以上の無期限な反復はせず、原因未確定なら停止する。

製品候補は最大2。原因の支持がなければ試作0、製品採用0とする。支持がある場合だけDPR1/2、Canvas1/2、負荷、resize、切替、教材、長時間の同条件試験へ進む。p95 30%以上改善、他条件10%以上悪化なしと既存予算を満たす必要がある。条件未成立なら改善率を算出しない。

事前予算は予定→受信p95≤100ms／p99≤200ms／max≤250ms、受信→停止≤20ms、停止→受付≤100ms、追加step0。観測最大を上限保証としない。kernel ETWはtoken権限を読み取り確認し、不足ならNOT_TESTED。昇格・設定変更・追加依存なし。

数理bit／全履歴hash6条件、RK4・20周期・三角形・二次収束、単体・型・build・開発／本番正式GUIと全作品CIを再確認する。CIは最終HEADのtree一致・実artifact ID／expires_at／digest／取得状態を記録する。新原本は隔離`.three-body-evidence/stage-s/`へ、小さい索引と要約をGitへ保存する。遠隔完全複製不可ならNOT_UPLOADED。総合PARTIAL、Draft・未mergeの独立再レビュー待ちで停止する。
