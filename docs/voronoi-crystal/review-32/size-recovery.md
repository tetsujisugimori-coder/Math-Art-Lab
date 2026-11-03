# 第2次修正：サイズ復帰の再描画予約

## 4038c87のCI失敗

[run41683574524](https://github.com/tetsujisugimori-coder/Math-Art-Lab/actions/runs/41683574524)は単体207・型・build成功後、開発GUI354成功＋既存2skip＋WebKit2失敗（358件、14.7分）。本番GUIは未実行で、前提としていた「最終CI成功」は成立しなかった。失敗は幅0から100%へ戻した後のready待ち、5秒のpredicate不一致だった。初回load30秒のUNKNOWNとは別の失敗として扱い、単に再実行やtimeout延長では閉鎖しない。

[失敗抜粋](ci-4038-failure.log)を保持。実checkoutは`af1f34a56987f296286c671e923fa259291fc059`、treeは`6f32dd14c01ccdbc9b7d51bf9f95ea1e91e68cc9`で4038c87のtreeと一致した。CI2件の失敗時点の詳細サイズ・RO通知履歴は未記録なので、CI上の個々の発生機序を完全には断定しない。

## native ResizeObserverによる独立反例

独立担当がROを抑制・差し替えず、次を両browserで実行した。

1. 正常描画後、同じJavaScript処理でCanvas幅を0にし、1ステップを押す。アプリのrAFが予約される。
2. その後に登録した同じフレームのrAFで、幅を元へ戻す。
3. アプリは先に幅0を観測して描画を見送る。ROのdelivery時点では元の幅へ戻っており、最後に通知したサイズと同じなので通知がない。
4. 幅757.84375に戻ってもstatus=zero-size、modelStep1/requestedRevision2に対しrenderedStep0/revision1/count2・旧PNGのまま残った。

ROは全ての中間サイズを必ず知らせる履歴イベントではない。したがって、未描画の記録を正しく据え置くだけでは足りず、RO単独を再表示の再試行保証に使っていた設計に取りこぼしがあった。元CI2件と同一の要件を破る具体的な製品反例である。

[独立RED](independent/resize-coalescing-red.json)・[独立スクリプト](independent/resize-coalescing-check.mjs)。恒久GUIにも同条件を追加し、修正前に両browserの[2失敗RED](size-red.log)を取得した。失敗を検出する条件や待機上限は修正後も変えていない。

## 採用した再試行

幅／高さが0または非有限で描画を見送ったCanvasだけをSetへ保持する。documentが可視で対象がある間、100msごとにサイズを再確認するタイマーを最大1本持つ。

- まだ全対象が0ならサイズを読むだけ。数学モデル・ステップ・再生・Canvas命令・実行済み記録を進めない。
- 正の有限サイズへ戻った対象があれば、通常のrequestDrawへ渡す。描画時の最新モデルと設定を使う。
- submittedまたは別の失敗状態になった対象はSetから外す。比較OFFでは比較図を外し、残る対象がなければ待機を終了する。
- 新しい描画要求で旧再試行を取り消す。非表示・破棄では予約とSetを解放する。callbackは予約オブジェクトの同一性も確認し、取消・消費済みの旧callbackが新予約を壊さない。
- reduced-motionの安全停止は再生を止める。サイズ待ちの静的再描画はモデルを進めず、自動再生とは別に扱う。

100msは表示復帰時の補助的な再確認と、非表示の図への不要な作業を抑えるための製品判断。通常はROで直ちに再描画し、このタイマーは通知がない場合を補う。最大2面の矩形を1回ずつ確認するだけで、0の間は描画しない。ブラウザの遅延・負荷があるため100ms以内の復帰を保証するものではない。

単発rAFを1回だけ追加する案は、0がその後も続き、最後のフレームで元へ戻った場合の保証が弱い。DOMのMutationObserver追加はstyle/class以外のCSS・media query等を網羅せず、監視範囲も広くなる。未描画の対象だけを保持する小さな補助タイマーを採用した。Canvas命令実行済みとGPU表示完了の区別、数学的所属と表示候補の分離は変更しない。

## 修正後の確認

追加GUI22/22成功：[ログ](size-green.log)。新たな2種類（nativeの通知併合、サイズ待機と旧callback）を開発・本番へ共通追加した。既存30＋追加22＝52件／環境になる。

独立再検証は、native反例の[GREEN](independent/resize-coalescing-green.json)、サイズ待機の[11/11×両browser](independent/size-wait-lifecycle.json)、既存の画素11/11・追加22/22・破線復帰GREEN・Fraction1517一致。ゼロ継続350msの不要な主／比較再描画なし、timer最大1本、hidden／比較OFF／破棄で終了、旧callbackが新予約中に走っても無作用を確認した。[独立追補所見](independent/ci-resize-review.md)。

最終view SHA256は`282e573a267938b6391a87dacd5fb3c5062b54632fc9819d11d7d5f8ea88b03b`、数学・render・paintの3ファイルは4038から不変。[単体207/207](size-unit.log)、[型exit0](size-typecheck.log)、[build成功](size-build.log)。JS749.45KB/gzip215.81KB、CSS33.86KB/gzip7.09KBで、新規依存なし。ローカルは[開発52/52（3.0分）](size-development.log)・[本番52/52（2.7分）](size-production.log)が同一コードで成功し、今回の実行で初回load失敗はなかった。過去のUNKNOWNを解決したとは扱わない。

最終4製品ファイルのSHA256付きで[画像マニフェスト](capture-report.json)を再取得し、通常境界と320px文字200%の8枚に、各browserのサイズ復帰前後4枚を加えた12枚を保存。REDの失敗画像は破線2枚・サイズ2枚を別に保持し、[全画像](screenshots/)は16枚。復帰後の2点分割x=.4・p1(.15,.5)・p2(.65,.5)を目視でも照合した。旧4038時の[性能／画像記録](capture-report-4038.json)も保存する。

最終64点観察300標本の平均は0.090／0.117ms、最大0.200／3.000ms（Chromium／WebKit）。初回を含む全観測最大0.600／3.000msを保持し、低い再測定値で上書きしない。これは観察計算のCPU時間で、GUI全体・GPU表示の上限保証ではない。撮影ページのpageerrorは0、320px文字200%のdocument幅も320px。待機中の計算／描画負荷は独立11項目で別に確認した。

最終HEADのCI全362件（既存2skipを含む）／本番全242件は、完了後にログから件数・実checkout・tree対応を確認し、PRの最終コメントへ固定する。workflowの公開条件・個別timeout・skipは変更していない。

最初の4038 CI失敗・独立検証の見逃し・P3の判定を保留へ戻した経緯を保存する。新HEADの全CI成功まで、限定マージ推奨YESは条件付き。実際のmerge／auto-mergeは行わずDraftを維持する。初回load UNKNOWNと実機等NOT_TESTEDも変更しない。
