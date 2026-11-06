# PR #40 — P2-01 修正・再レビュー資料

対象レビュー：`caa3f0a2734c2c2faaaa1b8cbfe5a46d2b22de03`。mainは`dd66a7fe`、開始時のlocal／PR HEADはレビュー対象と一致、未コミット変更なし。Issue #39・Draft PR #40・同じブランチを継続した。

## 元の失敗と原因

元CI [42215659609](https://github.com/tetsujisugimori-coder/Math-Art-Lab/actions/runs/42215659609) は単体317・型・build成功、開発516成功＋2失敗＋既存2skip、本番は前段失敗によるNOT_TESTED。失敗はWebKitの375px light/dark、20判断、比較ON、root文字200%。当初のWindowsの成功をLinuxの成功へ流用しない。

製品コードを変更せず、測定コードと証拠保存専用のCIだけを追加した`1b88325`で、[Linux診断42232933530](https://github.com/tetsujisugimori-coder/Math-Art-Lab/actions/runs/42232933530)を実行。4件中2成功（Chromium）、2失敗（WebKit）。JSON・親子のcomputed style・画面を`red-linux/`へ保存した。元製品との差はこの時点では診断・workflowのみ。

| 375px・200%・比較ON | root/body scrollWidth | MathML幅 | MathML右端 | 判定 |
| --- | --- | --- | --- | --- |
| Windows / Chromium | 375 / 375 | 約310px | viewport内 | 元のroot失敗は未再現 |
| Windows / WebKit | 375 / 375 | 300.234375px | 331.234375px | 元のroot失敗は未再現 |
| Linux / Chromium | 375 / 375 | viewport内 | viewport内 | 成功 |
| Linux / WebKit・light | 386 / 386 | 354.90625px | 385.90625px | RED |
| Linux / WebKit・dark | 386 / 386 | 354.90625px | 385.90625px | RED |

WindowsはOS報告10.0.26300、Node24.20.0、Playwright1.58.2、Chromium145.0.7632.6／WebKit26.0。Linuxは元CIと同じubuntu-24.04 runner、Node24、Playwright1.58.2、WebKit26.0（JSONのkernel報告7.0.0-1017-azure）。ブラウザ版・時刻・CSS・親の幅は各JSONに保存。実際に選ばれたmathフォントのファイル名までは特定していない。

原因は一般式MathMLの非折返し固有幅が、`width:max-content`・`overflow:visible`のまま親を越えたこと。Linuxの式はfont-size44.8pxで幅354.90625px、左31px、右385.90625px。親`.sm-formula`は幅343px/client340/scroll367、外のsectionは幅343/scroll370、mainは375/scroll386という伝播が連続し、式の末端右端と文書幅386が対応する。

一方、Canvas・統計・フォームを含む`.sm-layout`のscrollWidthは343px。比較表はLinux/WebKitで425.640625pxだが343pxの既存overflow:autoに収まる。表がさらに大きいLinux/Chromiumでも文書幅は375pxだった。候補一覧の「viewport外にある子」だけを原因とせず、局所スクロールの境界を区別した。

## 修正

- `src/segregation-view.ts`：一般式だけを名前付き・Tabで入れる`.sm-math-scroll`へ入れ、左右キーの説明を追加。数式マークアップは元と完全一致。
- `src/segregation.css`：数式領域にmax-width:100%とoverflow-x:auto、数式／比較表にfocus-visible枠。字を縮めず、root/bodyをhidden/clipにせず、内容を局所スクロールで保持。
- 比較表の既存スクロールにもtabindexとregion名を追加。これはrootの原因とは別のキーボード到達性の補助対応。
- `src/segregation-render.ts`：親のborder-box343pxに対しclient341pxだった2px超過も受入測定で確認し、描画幅をclientWidthへ合わせた。1倍時の正方形全体が表示領域に入ることを検査。数理状態・移動規則・乱数・統計には変更なし。

製品修正commitは`da2d3c9`。`src/segregation.ts`は元HEADから変更していない。`e2e/segregation-layout-checks.ts`は元の`scrollWidth <= innerWidth`を厳密なまま保ち、375/390/765/1280px × light/dark × 100/200% × 比較OFF/ON × Chromium/WebKitの64状態へ拡張した。

操作部品の枠・内容幅、Canvas全体・確定ステップ、MathMLと表の局所化、Tab相当のfocusと実際の左右キーによる末端到達・0へ復帰、SVG・統計の不変、pageerrorなしを確認する。375pxの元条件は別の診断でも直後／2rAF後を両方検査し、待機で失敗を隠さない。

## RED → GREEN

`green-linux/`は修正後の[診断42234451527](https://github.com/tetsujisugimori-coder/Math-Art-Lab/actions/runs/42234451527)（20件成功）。WebKitの375px・両テーマ・200%・比較ONで、inner/root/bodyはすべて375px。式の固有幅・font-sizeを保ったまま局所に収まり、式と表が左右キーで到達・復帰した。数式・フォーム・全Canvasは非表示にしていない。64表示状態の実測JSONと375pxの画面・数式画像を保存した。

Windowsの初回重点検証は8/8成功。全機能の初回は41成功＋1 timeout（WebKit765px dark、30秒）を`full-dev.txt`と`full-dev-results/`へ保持。これはroot幅の失敗としては数えず、原因は未特定とする。検査にはスクロール端に達した後も各16/17回キーを送る余分な処理があったため、端への到達・復帰の同じassertionを保って、到達後の無効なキー送信だけを省いた。ただし、これが765pxのtimeout原因と断定した説明は撤回する（そのケースにはスクロール不要の状態もあった）。30秒制限、元の厳密な幅条件、対象ケース、skip数は緩めない。

その後の並行実行は開発38成功＋4 timeout（`full-dev-final.txt`）、本番39成功＋3 timeout（`production.txt`）。ページ読込み・作品選択で止まるケースもあり、成功に数えない。観測時の空き物理メモリは約3070MB/16088MBだったが、これだけで原因を負荷やメモリへ断定しない。並行を終えて開発・本番の表示回帰16件ずつを単独実行し、別ログ・別ディレクトリへ保存する。Linuxの修正成功とWindowsの実行不安定さを区別する。

単独の開発表示回帰 **16/16成功（2.5分）**、本番表示回帰 **16/16成功（2.5分）**。それぞれ64状態すべてのJSONを`green-windows-layout-serial-dev/`・`green-windows-layout-serial-production/`へ保存。これは単独実行での再検証成功であり、先のtimeoutが解決した、または並行実行が安定したとは判定しない。表示以外の26機能ケースは上記両ビルドの全機能実行で成功しているが、Windows全42件が一度の最終実行で成功したという表現にはしない。

修正前診断用HEADの全作品run42232933192は、元の失敗と診断REDが得られた後の冗長な実行としてcancelled。成功扱いせず、元のfailure42215659609、診断failure42232933530と区別する。最終HEADの全作品CIは別途最後まで実行する。

## 独立補助確認と限界

実装担当以外の担当がGitHub APIによるLinux実測の読み取りと、現物CSS/MathMLを抽出する別経路のコンポーネント実行を行った。Windows375px・両テーマ・両ブラウザ・100/200/300%の12/12成功。MathMLの元との完全一致、文字拡大の維持、Tab・左右キー・末尾θ到達・復帰、上下クリップなし、実行前後のsource hash不変を確認。[独立記録](independent/README.md)・script・JSON・PNGを参照。

300% stressはWindowsでも局所スクロールを発生させる補助試験であり、Linux200%の代わりではない。この担当によるLinux修正後全アプリ、表／Canvas、最終CI、実機・支援技術の独立実行はNOT_TESTED。全体の独立再レビュー完了とは呼ばない。

## 最終提出の照合方法

全単体317件、型、build、対象作品の開発／本番、全14既存作品を含む標準CIを確認し、最終HEADとrunをPR #40の検証コメントで固定する。CI完了前は成功と判定しない。最終HEAD以降に証拠を追記するためだけのcommitを作らず、最終CIの完了結果は同じHEADのPRコメントに記録する。

最終CIのfailure／cancelled／skip／未実施と、既存2つの手動撮影skipは分ける。実機Safari／Android、読み上げ、低性能端末、長時間10,000判断、30判断/秒未達と遅延の原因未特定は従来の残存リスクとして維持する。

`node docs/segregation/review-p2-01/audit-evidence.mjs`は各環境の16報告・64状態、文書幅、数式の縦クリップなし、keyboard検査の完了、製品ソースhash、数理コードと一般式の元との一致を照合し、新しいmanifestを作る。commit後は同じコマンドに`HEAD`を渡し、Git保存内容の証拠とソースのhashだけを再確認できる。初回の73証拠は旧manifestのまま残す。

独立再レビュー待ちで停止し、Draft解除・merge・auto-merge・公開は行わない。
