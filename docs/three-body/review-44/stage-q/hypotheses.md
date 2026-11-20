# 仮説の判定

| 仮説 | 予測・対照 | 支持／反例 | 判定・未観測 |
|---|---|---|---|
| H1 Canvas命令量 | 線／実命令／分割／資源なしで長区間頻度が変わる | 今回72screenでは歴史的区間なし。単純命令量だけで旧現象を説明できない | UNKNOWN。再現時の同条件dose対照が必要 |
| H2 描画経路の待機 | context／flagで同現象が変わる | Stage Pに強い経路差。今回の負対照でも歴史的待ちを再現せず | SUPPORTED（過去の経路依存だけ）。具体的native機構UNKNOWN |
| H3 GC | 長区間とmain GC停止が一致する | traceとGCを分離。今回長区間なし、過去の差分をGCへ帰属できない | UNKNOWN。GC単独原因とは主張しない |
| H4 長いmain JS CPU | 長区間のCPU時間がwallと同程度 | 旧main476.807msにCPU33.839ms、Worker候補にも低CPUの長区間が重なる | 純粋なmain JS CPUだけの説明は支持されない。寄与全体UNKNOWN |
| H5 ブラウザー間同期 | renderer／worker／GPU等で同時停止が生じる | 旧mainとWorker候補に時間重なり。traceに存在するwaitだけでは原因未確定 | UNKNOWN。固有markerと同期対象の追跡が必要 |
| H6 OS負荷・圧迫 | Ready／CSwitch／faultが同窓で対応 | 非特権170標本は長区間なし。kernel ETW未取得 | UNKNOWN、NOT_TESTED項目あり |
| H7 累積セッション | fresh／累積状態で再現率が変わる | 既存Stage P累積証拠保持。今回freshと短いWebGL warmは再現せず、完全な累積状態対照ではない | UNKNOWN。長期同一browser sessionの再現は未完了 |
| H8 計測器単独 | 計測OFFで消え旧publicだけで発生しない | Stage Pの旧publicで発生、今回同旧publicも非再現。正対照はtimer/main遅延を区別して検出 | 追加計測器**単独**原因説REJECTED。交絡・負荷の寄与はUNKNOWN |

相関を因果としない。旧1249ms標本とStage P長区間の同一原因はUNKNOWN。今回の非再現を過去の不具合消失とは解釈しない。
