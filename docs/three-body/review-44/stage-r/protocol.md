# Stage Q 独立レビュー5852944140への対応計画

基準HEADは875a27c0352b8d269ff36f0a496b8e3e785ac496。P3-04を優先し、診断の分類・継続実行・完全性照合を修正する。既存Stage P/Qの原証拠は保全する。

## 事前条件と対照

- capture専用suiteで現行／旧context、追加計測ON/OFF、撮影なし／trace停止前／停止後を各3反復する。計36run。Canvas2枚、CSS438×330、DPR2、backing876×660、固定命令列、SwiftShader起動、撮影timeout5000msを固定する。
- 各試行は新しいブラウザーを使用し、計画順序、環境、命令列hash、撮影・trace・停止時刻を保存する。撮影なしは因果対照として明示する。
- 事象を数理、停止／表示、性能、計測、撮影、証拠整合、未取得に分類する。撮影例外も失敗としてCIへ伝播する。
- suiteを独立した子プロセスで直列実行する。環境準備・証拠整合の障害では後続をBLOCKEDにし、局所的な撮影失敗では後続を実行する。最終集約は失敗を保持する。
- manifest、raw、run summary、解析summary、artifact用indexを相互照合する。各suiteの計画・完了・失敗・未実行数、状態遷移を保存する。部分証拠のartifactはevidence名を使い、完全性を別フィールドで表す。

## 性能と停止条件

初期36条件で旧contextの撮影timeoutがtrace停止前後・計測ON/OFFに再現したため、追加の限定対照を行う。現行／旧contextに対しPlaywright、CDP surface、CDP viewの3経路を各3反復する（Chromium18run）。全て同じ寸法・DPR・命令列・5000ms予算とし、trace停止後に撮影する。成功した画像のCanvas部分を、撮影後に読み取る確定bitmapと画素照合する。読取りによるbackendへの影響は撮影・計測終了後に限定し、撮影経路を製品へ導入する根拠には使わない。

Stage Qの事前予算を維持する。予定→受信p95≤100ms、p99≤200ms、最大≤250ms、受信→停止≤20ms、停止→受付≤100ms。停止後追加step0とA/B原子性を検証する。自然長区間のHITが得られなければ性能受入はPARTIAL。

製品修正は自然長区間の再現、負対照、同条件比較、数理・状態回帰が揃う場合だけ採用する。根因不明なら製品修正0件で停止する。kernel ETWは現tokenの権限を読み取り確認し、管理者権限がなければNOT_TESTED。昇格・導入・OS設定変更は行わない。

## 検証と保存

専用sender9件のローカル測定でpaint約420～427msを観測したため、他試験終了後に6秒×6の既存os suiteを実行する。native呼出し、thread CPU、非特権標本を保存し、独立senderの自然phase targeting9件を追加する。過去標本と同一原因とは断定しない。送信専用process、harness Nodeタイマー、browser Workerを識別し、sender↔harnessとharness↔pageの開始／終了bracketを保存する。

単体、型、開発／本番build、数理bit/hashと独立基準、正式GUI、最終HEAD CIを確認する。新rawはGit外の`.three-body-evidence/stage-r/`とCI artifactへ保存し、Gitには要約・SHA・実行契約を保存する。既存認可済み遠隔保存先の可用性を調べ、完全複製できなければNOT_UPLOADEDを維持する。Issue43とDraft PR44へ結果を投稿し、独立再レビュー待ちで停止する。
