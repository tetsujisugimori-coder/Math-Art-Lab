# Stage Q 調査結果

総合 **PARTIAL**、根本原因 **UNKNOWN**。基準は `b07ccec1205ca99a1112ab8db951efbe94a51f74`、対象は独立レビュー5842434528。製品コードを変更していない。過去の長時間区間が今回のWindows環境で再現せず、実測で支持された製品修正を選べなかったため、事前の停止条件に従って診断成果を提出する。観測値の短縮を製品改善とは呼ばない。

## 調査の範囲

[事前プロトコル](protocol.md)と[Issueへの計画](issue-plan.md)を製品変更前に記録した。Canvas資源をなくす条件と、資源を保持して命令だけ止める条件を分離した。最小ページは基準モデルから別工程で生成した固定命令列を再生し、ページ内で重力計算を行わない。各Canvasの命令数3181、CSS438×330、DPR2、backing876×660、2枚、40ms周期が基準。命令列SHA256は `3080cf71635e04f98f62d13927de156c142c7828a0674b548e2a65e512129291`。

Canvasなし、要素のみ、contextのみ、初期bitmap保持、clearのみ、線のみ、実アプリ由来命令、4frame分割を比較した。DOMは更新なし／text／属性／SVG／幾何読取り／強制layout。DPR1、1枚、非表示、半寸法、80ms周期、旧context、起動flagなし、disable-gpu、計測OFF、WebGL初期化も別条件とした。72screen runは24条件×3反復・各3秒であり、長期再現率の推定には短い。半寸法は同じ命令列をcropする資源量対照で、同じ画像とは主張しない。4frame分割は途中bitmapを許す診断であり、製品のA/B表示には採用していない。

最小ページ、WebGL warm-up、実アプリ、初期作品のmountを診断bundleだけで省いた実アプリを各6秒×3回比較した。通常の初期作品はWebGLを使用するが既存cleanupにはdisposeとcontext lossがある。今回の対照からリークや初期WebGL原因を断定できない。warm-upは単純なclearだけで初期作品全体と同等ではない。

ローカル140runの機能検査失敗は0。ただし性能予算には1件逸脱がある。全run、原データhash、要求時刻は[raw-results](raw-results/)を参照。Chromium 145.0.7632.6、Windows10.0.26300、i7-14650HX、RAM16,869,351,424byte、Node24.20.0。Windows WebKitは最終smoke4件を別engineとして測定した。Linuxと画面幅等の回帰は最終HEAD CIで確認する。

## 過去の証拠との関係

Stage Pの採用context paint最大439.3～466.1ms、入力待ち454.15～479.9ms、旧context最大2227.9～2571ms、flag対照34.05～39.75msは過去の観測として保持する。元1249ms標本の原因とも、今回の現象とも同一原因は証明されていない。

旧Stage P public生成器を変更せず今回5分再実行した結果も最大13.4msだった。新生成器だけが短縮の原因という説明を支持しない。一方、過去と現在のOS／ブラウザー内部状態を完全に揃えられていないため、環境原因を特定したとも言えない。同じbrowser version、起動flag、featureStatus、Canvas寸法を確認した。deviceStringだけでGPU経路を分類していない。

旧trace再解析では、Workerの実送信間隔476.5msの窓にmain RunTask476.807ms（thread CPU33.839ms）と、DedicatedWorker候補のRunTask423.247ms（CPU0.407ms）、TimerFire365.421ms（CPU0.224ms）が重なった。Worker候補は旧traceに固有markerがないため推定。同時期の遅延はmain JavaScriptのCPU消費だけで説明するには不足するが、OS scheduler・プロセス停止・native lock・ブラウザー内部同期の区別はできない。経過時間からCPU時間を引いた差を特定の待機時間とは呼ばない。[旧証拠再解析](raw-results/send-gap-reanalysis.json)。

## 指摘別判定

| 指摘 | 判定 | 理由 |
|---|---|---|
| P2-01 | PARTIAL | 過去の長時間区間を再現できず、製品改善の同条件比較が成立しない |
| P3-01 | PASS（実施範囲） | 確定step・実描画対象座標・DOM・A/B・グラフ標本の既存契約を維持し回帰検証 |
| P3-02 | PARTIAL | 測定した停止後の追加step0を維持。自然長区間へのHIT0、最悪入力応答保証なし |
| P3-03 | PARTIAL | 新規巨大traceをGitへ追加せずhashとartifact運用を追加。ローカル原証拠の遠隔完全複製は未完了 |

Issue #43はOPENで残す。PRの`Closes #43`は`Refs #43`へ変更し、残件を同Issueで追跡する。Draftを維持し、限定マージ推奨NO。独立再レビュー前のmerge／auto-mergeは行わない。

## 次の調査

過去の遅延が再発するホスト状態で短いtraceとWorker markerを同時採取し、権限を別途認可された環境ならkernel ETWのCSwitch／ReadyThreadを追加する。まずmainとWorkerが同時に非実行となる窓を特定し、再現条件を固定する。その後にのみ描画経路・資源量・更新順序の局所候補を試す。今回の非再現だけを根拠にWorker／OffscreenCanvasを実装しない。
