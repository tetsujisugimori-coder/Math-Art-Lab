# P2-AH01 / P2-AH02 検証

基準9fb0b1d、レビュー5911250527。開始時GitHub/local HEAD・branch一致、差分なし。適用`C:\Users\tetsu\.codex\AGENTS.md`は回答末尾の日時を要求する。AH仕様/計画/264試験/独立レビューを確認した。

期待分類を先に固定し、修正前contract/spec/legacy observerの生bytes・size/SHA/Git blobを新規before-toolsへ保存した。保存した旧分類器で28ケースの実結果を取得。採用するbefore-v2は12 RED / 16 BASELINE_PASS。追加fieldの不在だけをREDにしない。初稿はinvalid-clockの実行UNKNOWNに未要求のFAILを課して20 REDと数えたため、その期待値を棄却した。初稿・訂正版と理由を全保存し、20という集計を採用しない。

同じpacket/expectedCore/追加field期待値でafterは28/28 GREEN。修正前から正しい16ケースも受理/拒否を維持。正常runner PASS、既知FAILと監視/保存/欠落の併発、欠測/不正runner、開始前/中/後、end欠測、決定event欠測、begin欠測、重複/逆順/別trial/pid/tid/clockを網羅した。

コマンド：

```text
node tools/three-body-stage-ah-p2-controls.mjs before NEW_JSON
node tools/three-body-stage-ah-p2-controls.mjs after NEW_JSON
node node_modules/vitest/vitest.mjs run --config tools/three-body-stage-ah-tests.config.mjs
node node_modules/typescript/bin/tsc --noEmit
npm.cmd run build
```

専用configで既存264＋追加58＝322/322成功。型/build成功、既存chunk警告保持。修正前targeted testの12失敗は期待したREDであり、修正後回帰失敗と混同しない。Gate本体にlauncherを加えず、PLAN_ONLY/常時BLOCKED/APPROVAL_MISSING/HOLDを維持。新しい原数理テスト・原停止・性能実測・ブラウザー/CDP・ABBA・手動workflow・retry/replacementは0。

元の計画/seal/数理source/policy/過去原票を更新しない。旧AH evidence-indexと旧264成功・独立レビューは9fb0b1d時点の記録として保持し、新source帰属・CI・保全receiptを別scopeへ保存する。正式CIは通常push後の実際のworkflow集合を集計し、path filterで起動しないworkflowをskipやsuccessへ読み替えない。W/Xの歴史的failureは維持する。

Windowsは`PR-44/Stage-AH-P2-*`新規領域を使用し、集合/数/size/SHAとmanifest自身をcapture時の外部receiptに別processで照合。UTF-8原文/API応答/readbackをterminal scopeへ保全する。原票欠測・全履歴部分保全・遠隔未保全、UNKNOWN/NOT_TESTEDは変更しない。

2026-11-15 JST
