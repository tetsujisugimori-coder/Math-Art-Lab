# Stage S 検証記録

P3-05は[状態契約](diagnostic-state.md)に従う。破損summary／raw-indexのRED2件、artifact-index破損のRED1件を保存し、関連33＋帰属2＝35件はGREEN。全単体476件／35file成功。個別event CPU追加後の帰属2件も成功。sandboxでの最初の設定読取エラー、filter実行で選択されなかった既存test、撮影失敗で中断したローカル補助解析loopを記録し、正式試験のskipへ置換していない。

型検査、開発mode build、本番build成功。既存bundle 500KB warningは保持した。Windows正式GUIはChromium／WebKit、開発48/48（246.607秒）、本番48/48（201.821秒）、skip0・flaky0。既存幅・motion・theme・文字倍率・DPR2・Canvas/DOM確定step・教材復元・停止・破棄の条件を維持した。

基準8f4との5プリセット＋A/Bで全内部Float64 bit・全履歴hash6/6一致。物理source不変。独立RK4の20周期窓（t=126.518）RMS差5.1662067e-5、基準RK4を半刻みにした差9.5850773e-12、8の字の最大規格化energy誤差2.0425111e-7。三角形解析RMS9.1826258e-7。dt=.004/.002/.001/.0005のRMSは4.4899530e-5／1.1225223e-5／2.8063271e-6／7.0158311e-7で二次収束を再確認。許容値・積分法・初期値は非変更。

ローカルsenderは9件すべて停止内／停止後追加step0、A/B同時刻、playing/timer/rAF false。自然HIT1／MISS8。HITの開始・終了両clock bracketのenvelopeもphase内。T0→T1=330.52255ms、T1→T3=1.10ms、T3→T4=12.10ms。全入力の配送最大とこの停止要求の配送値を混同しない。sender→harnessとharness→pageのmidpoint推定・不確かさ、予定→送信をsender-verification.jsonへ保存する。これは物理入力ではない。

新CIは既存555条件を残し、mechanism9×3環境とCDP emulation12×Chromium2環境を追加し、計606runを計画する。Windows216／Linux Chromium210／Linux WebKit180。既存35分budget・撮影5000ms・事前応答予算を維持する。最終HEADの完了／失敗／未実行、process／可用性の新field、実artifact ID／digest／expires_at、全作品CIとcheckout tree一致はPR最終対応コメントへ確定する。過去HEADの成功は流用しない。

P3-05は実施範囲の限定PASS、P3-01は検証範囲PASS。P2-01／P3-02／P3-03／P3-04はPARTIAL。根因UNKNOWN、製品変更0、性能改善率NOT_TESTED。外部独立再レビュー前にmergeしない。
