# 計測・再取得

事前目標と停止条件は[protocol.md](protocol.md)。旧rawは編集しない。測定は1プロセスずつ直列、ブラウザーを各runで作り直す。traceは短い選択窓のみ。複数runの最大を保証値にしない。

```powershell
node --expose-gc tools/three-body-stage-q.mjs --suite=screen --browser=chromium --output=.three-body-evidence/new-q-screen
node --expose-gc tools/three-body-stage-q.mjs --suite=long --browser=chromium --ref=base --output=.three-body-evidence/new-q-long
node --expose-gc tools/three-body-stage-q.mjs --suite=host --browser=chromium --output=.three-body-evidence/new-q-host
node --expose-gc tools/three-body-stage-q.mjs --suite=lifecycle --browser=chromium --output=.three-body-evidence/new-q-lifecycle
node --expose-gc tools/three-body-stage-q.mjs --suite=targets --browser=chromium --output=.three-body-evidence/new-q-targets
node --expose-gc tools/three-body-stage-q.mjs --suite=os --browser=chromium --output=.three-body-evidence/new-q-os
node --expose-gc tools/three-body-stage-q-report.mjs .three-body-evidence/new-q-long
node tools/three-body-stage-q-check.mjs .three-body-evidence/new-q-long
node tools/three-body-stage-q-storage.mjs .three-body-evidence/new-q-long
```

他suiteは`smoke`（4）、`follow`（12）、`ci`（4）。screen72、long4（60秒×3＋300秒）、host9、lifecycle15、targets9、os6。`--browser=webkit`は別engine、GPU feature情報はNOT_TESTED。`--ref=base`は製品srcをb07から取得し、診断toolは実行時版を使う。

旧public生成器の再試験は既存toolを変更せず実行：

```powershell
node --expose-gc tools/three-body-stage-p.mjs --suite=public --browser=chromium --output=.three-body-evidence/new-p-public
node tools/three-body-stage-q-readback.mjs
```

実際に使用したCLI引数・durationは各manifest/optionsが正本。再実行は未使用outputを指定する（既存manifestへの上書きは禁止）。再実行でタイミングの原標本そのものは再生成できない。`sources/`には測定当時の診断toolをhash名で保存し、途中の小規模な計測修正も別版として追える。最終版のみを過去runへ適用したことにはしない。

CIはWindows Chromium／Linux Chromium／Linux WebKitの3jobで、全suiteのmanifest完了・予定件数・全raw存在を確認。bashの失敗伝播を明示し、途中コマンド失敗を次の成功で上書きしない。機能検査と性能予算を分け、予算逸脱はwarningとrawへ残す。CIの緑は性能PASSではない。

数理照合：`TB_NUMERICAL_BASE`を基準b07、`TB_NUMERICAL_DIR`を新規出力先に指定して`node tools/three-body-review-numerics.mjs`。独立基準は`TB_NUMERICAL_OUTPUT`指定で`node --experimental-strip-types tools/three-body-measure.mjs`。unit/type/build、既存開発・本番E2Eも実行する。
