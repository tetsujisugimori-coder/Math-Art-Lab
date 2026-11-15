# Stage AG 独立レビュー

別担当 `/root/ag_independent`、2026-11-15 21:58 JST。技術的限定PASS、残る修正要求なし。新規計測・ブラウザー・ファイル編集なし。正式CI・Windows保全・投稿完了はこのコードレビューの対象外。

初回に3件の誤PASSを独立再現：basenameだけのimport正規化、source-bindingのGit/raw metadata未検証、旧証拠のruntimeOriginals/rootCause昇格。3件を修正前REDとして保存した。

修正後、独立in-memory14反例を全拒否：Git/byte metadata6、4 module同名別import、欠測/UNKNOWN昇格2、Git proof破損/欠落2。正常static/historical監査はPASS、歴史runtime NOT_OBTAINEDとtime NOT_COMPARABLEを維持した。Git SHA1 header付き内容アドレスとcommit→tree→path、厳密import、raw一致/改行同等の別状態、欠測状態固定は妥当と判定。

確認SHA256：contract `e947a82a0fff4e9a96b03d95a9c73867db72321a7f86c863d7c598cad6bb6f27`、audit `5d020ae2b68d95c451d03fcc09acdc1c820278cc12c698460d0830bb0792672d`、Git proof `33e572efb142c4100d7360c438f00d442a6a4892564b2df085137d77ecd4aa33`。

原Vitestとの実時間同等性、timeout解消、性能改善を認定しない。bundleはmanifest bytes/input setの照合範囲であり、再build・Node native/OS・過去worker実設定は未証明。根因UNKNOWN、改善率NOT_TESTED、原停止NOT_TESTED、Draft・マージNOを維持。

2026-11-15 22:06 JST 追加再レビュー：初回CIの混在改行raw descriptor失敗に対し、保存rawBase64のSHA/size検証とcheckout論理SHA照合を分離した修正を確認。current正常PASS、隔離LF checkout PASS（原test LINE_ENDING_EQUIVALENT_ONLY）、rawBase64/SHA/size/logical SHA個別偽造4/4拒否、source追加変更拒否、歴史AE4件PASS/runtime NOT_OBTAINED/time NOT_COMPARABLE。実測原票・数理閾値変更なし。限定PASS、残る修正要求なし。最終audit raw SHA256 `c653cbb24f9447f66a4194c9e7c4feaee1b1c92902ae3459d4371f0cb446d1ff`。contract/Git proof SHAは前回同じ。初回CI失敗は保持し最終CIは別判定。
