PR #44の独立レビュー5842434528に対し、基準b07ccecからStage Q調査を開始します。HEAD一致・clean・Draft OPEN・未merge・auto-mergeなし・既存3CI成功を確認。新規Issue／PRは作りません。

製品変更より先に、物理積分なしのCanvas＋DOM最小再現、予定時刻T-1を含む入力生成器、短時間正負対照を検証します。Canvasなし／context／初期bitmap保持／clear／線／実アプリ由来命令列／分割、DOM種類、DPR・サイズ・枚数・可視性・起動経路を分けます。支持された候補のみ最大2個を局所試作し、効果がなければ撤回。未確定なら診断成果としてPARTIALで止めます。

性能予算は予定→受信p95≤100ms、p99≤200ms、観測最大≤250ms、受信→停止≤20ms、停止→同step命令受付≤100ms、受信後追加step0。基準／候補とも同生成器で60秒×3＋5分を比較し、N差と全Float64／履歴hash・独立RK4／解析／収束を別に照合。観測最大を保証上限とは呼びません。

WPRは既存ですが現在tokenは非管理者。権限変更・追加ツール導入はせず、取得不能なkernel ETWはNOT_TESTED。Stage P約525MBは変更・削除しません。新規巨大rawはGit除外local保全＋Windows/Linux CI artifact90日保持、SHA256・実際の期限・再取得を記録します。Gitには小さい要約・索引・契約のみ。

P2-01／P3-02が残る間は#43をOPENで追跡し、PRのClosesをRefsへ変更する方針です。勝手なIssue閉鎖、merge、auto-mergeは行いません。
