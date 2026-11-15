# Stage AG — 原テストと独立診断経路の対応検証

基準HEAD `8e6b3803af4a24a7920858dfb9b38cea5dcac961`、tree `bcebe1e030dcfe8ce81db90a3139396fc882da33`。開始時remote/local一致、Draft、auto-merge無効、作業差分なし。対象名は `figure eight is reproduced and its energy stays bounded for 20 periods`。Stage AFレビュー5910763802に対する診断基盤の検証であり、性能改善・原停止試験の受入ではない。

新規ABBA・retry・replacement・性能計測・ブラウザー/CDP/GUI/原停止試験は0。製品・原数理テスト・初期条件・演算仕様・許容値・5000ms・AB/AC承認policyは無変更。既存の失敗・欠測・BLOCKED・UNKNOWNを保持する。

静的成功の意味は、レビュー対象の固定sourceに対しASTとsource pinが一致したことだけ。原テストの実行時PASS、時間的同等性、環境の同一性、過去実行時帰属へ昇格させない。`NOT_COMPARABLE`を実時間比較の結論に固定する。

独立ASTで対象itとtop-level RMSを一意に選択し、callback形と基準body/RMS SHAを検査する。producer templateは許可した6種の置換のみ解釈し、prepareを実行しない。抽出IIFE・wrapper・引数・戻り値・hash/counter・開始終了位置を、レビュー可能なentry fixtureと比較する。referenceのcounter挿入はproducerの文字列置換とは別にAST位置から構成し、2か所だけの変更と逆変換一致を検査する。adapter/observer/runner/bootstrapは固定source SHAでも検査する。

`source-binding.json`は信頼するレビュー入力として固定する。現在worktree raw bytes/size/SHA、改行正規化SHA、基準Git blobとblob bytes SHA、HEAD/treeを別フィールドに記録する。Git blobが存在することはraw bytes一致の証明ではない。新規AGファイルとinstalledファイルの基準Git blobはnullであり、未取得理由を明示する。新sourceの最終commit帰属は提出後のGit記録と別source snapshotで保全する。全pinと検証器を同時に改変して再署名したデータを元証拠とは扱わない。

過去AEは当時の52入力snapshotと別契約で照合する。AFの固定index/summaryを保持し、entry/reference-counted/metafileもAGの後作成索引で追加固定する。bundleの保存bytes・source snapshot集合・metafile入力サイズを照合するが、再buildによる派生証明はNOT_TESTED。Git/source/manifestはNode native・OS全体を束縛しない。

Git帰属は保存したGitオブジェクトの`type + size + NUL + bytes`からSHA1を再計算し、固定基準commit→root tree→各path→blobを検証する。これによりCIの浅いcheckoutでもbaseline metadataを独立照合できる。raw descriptorは保存rawBase64のsize/SHAを検証し、checkoutとは改行正規化内容を照合する。RAW_MATCHとLINE_ENDING_EQUIVALENT_ONLYを別表示し、改行同等をraw同一や実行時帰属と呼ばない。同名別importは正規化前に厳密な許可fullpath/仮想alias集合で拒否する。

REDは実在する従来`extract()`の限定ガードで再現できる誤受理だけを記録する。抽出関数はwrapperや状態を監査していなかったことを明示し、AF監査全体の誤受理とは称さない。従来にclaims検証器がない反例はRED NOT_APPLICABLE。元body・保存原票は変更せず、故障はメモリーfixture/新しいコピーに限定する。正常対照・同じ反例の拒否をGREENとして保存する。

専用Vitest configはAE44+AE evidence23+AF67=134件とAG静的/mockだけを列挙する。原`src/three-body.test.ts`を発見しない。既存Pages正式CIは従来の全単体を実行するが、追加ローカル数理試行とは区別する。workflow手動起動は行わない。

根因UNKNOWN、性能改善率NOT_TESTED、原停止NOT_TESTED、旧6原本NOT_OBTAINED、歴史実行時帰属NOT_OBTAINED、全履歴LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS、遠隔REMOTE_BACKUP_NOT_UPLOADED。Draft維持、マージ推奨NO。

2026-11-15 JST
