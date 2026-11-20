# Stage AH — 原Vitestの実行時観測計画と停止条件の確定

**PLAN_ONLY。** 基準HEAD `47f12bda192d722b348fc371722130901d936c8c`、tree `e17ff930687a13e11e50e790c657eb918ebb8e68`。GitHub PR/commit API、remote branch、localが一致し、開始時差分なし。branch `feat/017-three-body-dance`、PR44 Draft、auto-merge無効。remoteの初回schannel資格情報読取り失敗は操作上の観測失敗であり、権限付きread-only再取得と区別して保持する。

AHは計画とbrowser-free契約を実装する工程。原Vitest停止試験・原停止・ブラウザー/CDP/GUI・性能測定・追加ABBA・retry/replacement・workflow手動起動は0。製品、原数理テスト、期待値、Float64演算順、許容値、5000ms、AB/AC policy、過去原票を変更しない。

有効な計画はPLAN_VALID。実測ゲートは常にBLOCKED/APPROVAL_MISSING/NOT_TESTEDを返す。承認風のJSONやcallbackを与えてもprocess生成portは存在しない。実装済みなのはsynthetic分類と停止判定であり、物理observer/supervisor/kill/flush/実行時receiptはNOT_IMPLEMENTED/NOT_OBTAINED。計画受入は実測可能性の最終承認ではない。

固定提案は`fixed-plan.json`。対象Vitest checkoutは基準47f12bd、AH計画・ゲートの最終commitとは別identityである。Node/Vitest/OS/workerの提案を固定するが、歴史的な実効設定や将来実行の取得済み証拠ではない。observer実装とそのsource SHAは未取得。次工程で実装/環境が変わるなら開始前に別の固定実行計画と承認が必要で、試行開始後の変更は禁止する。

`execution-environment-map.json`は23 sourceの保存bytes/size/SHA、改行正規化SHA、Git blobとblob bytes SHA、基準HEAD/tree、installedの未帰属理由を保持する。基準Git commit→tree→path→blobの内容アドレスをAGの検証器で再確認し、raw一致と改行同等を区別する。11実行段階のsource anchorと行番号を固定。現在installed defaultsを過去runtimeへ昇格しない。全Vitest closure・Node native・OS全面束縛はUNKNOWN。

`plan-seal.json`はレビュー対象の固定入力。sealだけに依存せず、8時計境界、17停止条件、11段階/source/主体、環境、未証明状態を独立semantic契約でも検査する。seal同時更新でstop緩和やVERIFIED昇格を通さない。計画原文・sourceと最終Git帰属は別snapshotでも保存する。

時計の計算はsynthetic記録の同pid/tid/owner/clockだけ。process CPUとthread CPUはus、wallはms。未対応thread CPUはnull/NOT_OBTAINED。合計一致やOS/GC/JITへの残差配賦を仮定しない。rawに利用する全eventのschema/identity/順序/CPU非後退を検査する。

回帰configはAE44+AE evidence23+AF67+AG44の既存178件とAH mockだけを列挙し、原数理testを含まない。新AH workflowも静的/mock専用。通常pushに伴う既存Pages全単体の結果は別scopeであり、追加性能試行とは扱わない。旧revision workflow rerunをこのgateで遡及防止できるとは主張しない。

根因UNKNOWN、実時間NOT_COMPARABLE、性能改善率NOT_TESTED、原停止NOT_TESTED、歴史runtime/旧6原本NOT_OBTAINED、全履歴LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS、遠隔REMOTE_BACKUP_NOT_UPLOADED、W BLOCKED/X FAILを維持。PR全体PARTIAL、Draft維持、merge NO。

2026-11-15 JST
