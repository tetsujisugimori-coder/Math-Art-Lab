# Stage AC第1段階：監査記録とCI実行禁止

総合PARTIAL、製品変更0件、ブラウザー起動0件、原停止試験0件、性能改善率NOT_TESTED、merge NO。基準HEADはfe0cb5f5d9a885b6087adbf2c27c949ab171d2c8、treeは50b19fe0a7beb23a238dc0f13e5a05a15c087c50。開始時の作業ツリーはclean。既存branchを継続し、旧証拠・SHA台帳・固定計画は不変。

## P2-AB05

GitHub APIから旧PR本文、コメント6866442032/6866442406、正常なAAレビュー5898515397、新レビュー5904109330を取得した。旧コメントは「?」1716文字、日本語6文字。正常レビューはそれぞれ日本語1159/915文字であり、同じAPI読取り経路で正常に取得できる。

限定探索の送信元report.mdと承認済みWindows保管コピーはともに8861 bytes、SHA-256 fcbd852895be9d78b31fbe3dca69e85190bb598f047308146e38815fc0e83324で、既に置換済みだった。JSON要求、API応答、再取得をデコードするとすべてこの破損したsourceと完全一致する。旧読戻し検査は「破損sourceと同じ」というだけで言語的完全性を誤認した。APIが日本語を置換した証拠はない。

現PowerShellのOutputEncodingはus-ascii、Console出力はutf-8。同一UTF-8スクリプトの直接実行1回は正常59 bytes、native stdinパイプ1回は19個の疑問符を含む21 bytesとなった。生stdout/stderrを保存。**送信前source破損は確認、ASCIIパイプによる同種置換は再現。旧実行時stdinの生bytesは未取得で、当時の全境界を直接観測したとはしない。** 正常な旧全文原本はNOT_OBTAINED。推測復元しない。

新規UTF-8の訂正説明は原文復元ではなく、Git追跡資料と正常レビューに基づく説明として追加した。原稿SHAは0e64b17e9ca74e1fb72351055a693bd2710b726a99d9397d3f13c860d9fbbcbf、3067 bytes。実APIの要求・応答・再取得の全文一致と日本語を確認した。

- [訂正PR投稿](https://github.com/tetsujisugimori-coder/Math-Art-Lab/pull/44#issuecomment-6876942156)
- [訂正Issue投稿](https://github.com/tetsujisugimori-coder/Math-Art-Lab/issues/43#issuecomment-6876942579)

新投稿器はUTF-8ファイルを直接読み、JSONファイルをAPIへ渡す。strict UTF-8、HEAD/SHA/参照のschema、日本語sentinel、全文正規化なし一致を確認。合成対照は旧一致のみ5/7→新7/7。全置換・部分置換・空・別HEAD・読戻し差・対応差を拒否。独立コードレビューで空HEAD/空参照の抜けを修正し、形式・重複・不正kind等の負対照も追加した。実投稿の読戻しとモックは別判定。

## P2-AB06

ブラウザー可能な8workflowを監査した。deploy-pages、review-diagnostics、Stage P/Q/T/U/V、segregation-layout。前7つは本文marker依存、segregationは別branch条件のみだった。共通のコミット済み式でPR番号44、対象branch、refs/pull/44をmarkerとは独立に拒否する。識別情報不足・未知eventも閉鎖。markerは追加の拒否条件として保持する。

全8workflowのinstall前にNodeの実方針検査を設置。PR44禁止policyと既存AB policyの形式・[]/falseを検査し、不正なら非成功終了する。AB承認policy自体は変更しない。Playwrightや診断子プロセスの経路は前提検査成功が必要であり、Qの後続suiteもpreflight成功なしでは起動しない。

実workflow式の静的検査、実ガード＋mock child、実GitHub event/CIの停止を分ける。markerあり/なし/変造/空本文、新HEAD/tree、dispatch/push/rerun相当、承認なし/偽造、番号だけ/branchだけでも対象を拒否。他PRおよびmainの正常push/dispatchはmock正常対照で1件だけ実行する。旧式対照は1/4拒否→新4/4拒否。測定起動0。

現在のworkflowはpull_requestが中心で、deploy-pagesのみpush(main)/dispatchも持つ。現在定義のrerunは同じ識別情報で拒否される。ただし**過去revisionのworkflow rerunを新commitで遡及修正できない**。旧workflowの再実行をしないことを運用上の残存条件とする。GitHubのworkflow無効化や権限変更は本工程で行わない。将来再開は固定計画と独立承認の下で別のゲート変更審査が必要。

## ローカル2失敗と回帰

固定1回の新規全単体は724件中722成功/2失敗/0skip（契約形式のレビュー追加6件前）。default reporterの原stderrは、knot網羅検査・three-body 20周期検査とも **Test timed out in 5000ms**。各所要時間9761.15/11263.79ms。JSON reporterでは旧Stage ABと同様STACK_TRACE_ERRORとなった。両reporter原票を保存し、旧原票は更新しない。

今回確認できた失敗種別は時間制限であり、数値assertion不一致ではない。ローカルWindowsと正式Linux CIのOS・CPU・同時実行条件差はあるが、遅延原因をCPUやschedulerと断定しない。原因UNKNOWN、期限/許容値/試験内容変更0、成功までの再試行0。

型/build成功。基準HEADと5プリセット＋A/Bの全Float64 bit・全履歴hashは6/6一致、不一致0。GUIはNOT_RUN。現行srcだけを選ぶ検査設定を使用し、保存snapshotを実行対象へ混入させない。診断契約の最終件数と正式CIの確定結果は最終HEADの提出記録で報告する。過去Stage W/X failureは保持し、再監査も新規測定ではない。

## 保全と停止

新規raw/API/command/stdout/stderr/exit/source/manifestを承認済みPR-44/stage-acへ非破壊保存し、別processで集合・サイズ・SHAを確認する。取得集合ごとの件数と投稿記録の追加件数を区別する。旧6原本NOT_OBTAINED、全履歴LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS、REMOTE_BACKUP_NOT_UPLOADEDを維持。期限付きartifactを永続保管とは扱わない。

次回計画はDRAFT/BLOCKED。今回の限定準備成功を実測開始承認や製品受入へ拡張しない。独立再レビュー待ちで停止する。
