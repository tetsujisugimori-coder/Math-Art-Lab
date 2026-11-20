# 改善候補の判断

製品修正は採用していない。根本原因の非再現により、同条件の改善率もNOT_TESTED。64step分割・DOM再利用・willReadFrequently・A/B同時表示・epochを維持する。

| 候補 | 期待効果・必要な実測 | 副作用・検証費用 | 採用 |
|---|---|---|---|
| Canvas cache／命令削減 | native命令量に比例する長区間が再現すれば有効 | カメラ・履歴・DPR2画素・全実計算点を再照合。中程度 | 保留、H1未確定 |
| Canvas資源解放／context管理 | 資源保持のみで待ちが出る場合に限定 | 再初期化費用、画素、停止T4への影響。中程度 | 保留、blank/bitmap対照で再現なし |
| DOM頻度・read/write順序 | Style/Layoutが原因窓を占める証拠が必要 | 表示stepと数式／教材整合を再確認。中程度 | 保留、今回の読取り対照では根拠なし |
| rAF backpressure／分割 | 待ち予約の増加や1処理量との関係が必要 | A/B別時刻・途中bitmap禁止、復元epoch必須。高 | 保留、診断4frame分割は製品に不採用 |
| 中間配列再利用 | allocation／GC重なりが再現すれば削減余地 | 保存履歴を参照共有しないこと、bit/hash照合。中 | 保留、GC原因未確定 |
| Worker物理／OffscreenCanvas | 主thread応答改善を試作対照で示す必要 | 通信量・停止中commit・復元・A/B原子性・fallback・画素の費用が高い | 現時点で非推奨。CPUだけでは旧現象を説明できず根拠不足 |
| ブラウザー起動flag | Stage Pで経路差がある | Web製品が利用者の起動flagを制御できない | 製品改善として不採用 |

採用したのは診断修正のみ：予定時刻と送信時刻の分離、固有Worker marker、独立Node要求、非特権thread snapshot、manifest全run照合、CI途中失敗の伝播、巨大rawのGit外保存。これらはブラウザー診断bundleと開発toolだけに作用する。製品のmodel・state・render・view・Pagesへのimportはない。
