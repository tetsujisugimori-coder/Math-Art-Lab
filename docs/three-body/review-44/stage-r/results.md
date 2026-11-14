# Stage Q 独立レビュー5852944140への対応

基準875a27c0352b8d269ff36f0a496b8e3e785ac496、既存Issue43／Draft PR44。総合PARTIAL。事前計画は[protocol](protocol.md)と[Issue投稿](https://github.com/tetsujisugimori-coder/Math-Art-Lab/issues/43#issuecomment-6785413774)に保存した。

## P3-04 撮影と診断CI

ローカルcapture36条件で、現行contextの撮影12件成功、旧context12件が5000ms timeout、撮影なし12件を記録した。trace停止前後・追加計測ON/OFFのどちらでも旧contextのtimeoutが発生した。

最終probe18件では、Canvas2枚、backing876×660、DPR2、同一命令列hashを維持した。現行contextのPlaywright／CDP surface各3件は2560×1800画像を取得し、両Canvasの画素差0。旧contextの両経路各3件はtimeout、CDP view全6件はUnable to capture screenshot。旧contextの実bitmap画素は取得できず、旧／現行間の画素一致は未確認である。

撮影経路とcontextへの依存を支持するが、Chromium内部の待機先はUNKNOWN。Playwrightの高水準APIだけに限定した原因説は、直接CDP surfaceでもtimeoutした結果で支持されない。初期probe2版のDPR交絡とhelper source記録不足は[計測履歴](measurement-notes.md)へ保持し、受入の対照は最終emulation版を使う。

診断CIをsuiteごとの子process実行へ分割した。撮影失敗はE_SCREENSHOTとして保持し、次の独立suiteへ進む。環境準備・F_EVIDENCE障害は後続をBLOCKEDにする。最後に全suiteの完了数・未実行数・分類・validator終了状態を集約する。artifact名はstage-q-evidence、checkpoint名を使い、内容の完全性をpipeline-manifestとartifact-indexに保存する。

ローカル実統合でcapture-probeは18完了／12失敗、その後ci4件と専用sender9件を完了した。取得31/計画186、未実行155の部分試験としてFAILを保持した。全CIの代わりとして扱わない。ci/senderは取得契約を通過したが、解析後の性能予算超過でPARTIALとなった。

## P2-01 長時間区間の再現

今回、飽和A/B全表示で約400msのpaintを再現した。quietな6秒×6のos suiteでpaint最大447.8ms。sample OFF対照も426.8／424.1／324.1ms。native.geometry最大378.2msの包含RunTaskは経過408.467ms／main thread CPU35.089ms、同期GC重なり0だった。[待機分析](trace-analysis.md)を参照。

native.geometryはgetBoundingClientRectの呼出し区間である。API呼出し中の非実行・内部同期を含み得るため、その経過時間だけでAPI内部の原因を確定しない。元1249ms標本との同一機構はUNKNOWN。製品変更の採用は0件である。

## P3-02 自然長区間への停止

送信専用Node OS processを追加した。browser操作・数理計算はharnessで行い、送信専用processは時計応答と有限個のtimer送信だけを行う。harness Node timer、browser Worker、専用sender、物理入力を別の条件として記録する。

自然target9件でHIT5（paint3、observe1、calculate1）／TARGET_MISS4を取得した。HITの送信時刻は開始・終了の両時計bracketから作るenvelopeでもphase内にあった。停止要求T0→T1最大471.2499ms、受信→停止は全9件最大約1.3ms。pause内・停止後追加step0、A/B同時刻、timer/rAF取消、撮影後の状態不変を確認した。時計の量子化・非線形driftの厳密な保証は行っていない。

性能予算は維持し、配送前遅延を含む最悪応答は未達のためP3-02はPARTIAL。

## 採用判断

| 指摘 | 判定 | 残件 |
|---|---|---|
| P2-01 | PARTIAL | 約400msの現象は再現。native／OS待機機構の確定と改善対照 |
| P3-01 | PASS（検証範囲） | GPU提示・実機Safariは未検証 |
| P3-02 | PARTIAL | 自然HIT5を取得。配送待ちと性能予算未達 |
| P3-03 | PARTIAL | 原Stage Qローカル証拠の遠隔完全複製未完了 |
| P3-04 | PARTIAL | 分類・継続・完全性照合を修正。旧context撮影障害が残る |

Canvas寸法のcacheやlayout読取り順序の変更は候補として記録する。今回のnative.geometry標本は呼出し箇所を示すが、cacheの入力応答改善やresize時の画素整合は未検証であり製品へ採用していない。Worker／OffscreenCanvasの採用も0件。固定刻み・保存量・A/B・教材の契約を維持する。

最終HEAD CI、原artifact ID／期限／SHA、独立再レビュー依頼はPR44の対応コメントへ固定する。Issue43はOPEN、Draft維持、限定マージ推奨NO。
