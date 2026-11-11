# 解析状態の契約

`analysisAvailability.files`は原ファイルの存在、byte読取、JSON読取、bytes、SHA256、原errorを独立に保持する。可用性はAVAILABLE／ABSENT／UNREADABLE／INVALID_SCHEMAである。失敗しても取得済みbyteのSHAを消さない。

| field | 意味 |
|---|---|
| analysisAcquired | summaryとraw-indexの両方を読み取り、JSON構造が監査に使用可能。存在だけではtrueにしない |
| analysisCompleted | reportとchecker両processの通常exit codeを取得済み。非zero終了でもtrue。未実行・中断・signalだけならfalse |
| analysisProcessSucceeded | 両processのcodeが0かつprocess集約statusがPASS。ファイル内容の成功を意味しない |
| analysisVerified | 取得した解析データのrun集合・path・hash等の監査でF/Gがない。物理・性能の受入とは別 |
| evidenceComplete | 撮影・整合・未取得に欠損がない。processが非zeroでも、失敗を完全に記録した証拠一式はtrueになり得る |
| acceptance | issueがあればNOT_ACCEPTED。取得、終了、process成功だけでは受入にしない |

破損JSONをprocess終了後に与える負対照では、acquired=false、completed=true、processSucceeded=true、verified=false、evidenceComplete=false、acceptance=NOT_ACCEPTEDとなる。これはprocessの正常終了という原記録と、その後の破損を併記するもの。

正常なJSONだがrun重複／欠落ならacquired=true、verified=false、evidenceComplete=false。整合した解析ファイルがありchecker code7ならacquired=true、completed=true、processSucceeded=false、verified=true、evidenceComplete=true、acceptance=NOT_ACCEPTEDとなる。証拠の完全性を検証結果の成功へ置換しない。

修正前は破損summary／raw-indexともanalysisAcquired=trueになった。REDは2失敗を保持した。最初のsandbox起動失敗は設定ファイルへのアクセス拒否であり、負対照のREDと区別して保存した。

追加のartifact-index破損JSONでは、検証関数の例外によりPASS manifestが残ることを別のREDで再現した。検証の読取不能／schema／metadata／file集合不整合をFとして返し、破損indexをartifact-index-failure.jsonへ保全する。FAIL・evidenceComplete=false・NOT_ACCEPTEDを保存後に非zero終了する。原障害のsnapshotも新indexへhash登録する。
