# 実行経路の対応表

機械表は`execution-path-map.json`。SHA・Git blob・HEAD/treeは[source-binding.json](source-binding.json)。以下の「一致」は静的演算対応だけを指す。各段階の過去Vitest計時はNOT_OBTAINED、過去runtime帰属もNOT_OBTAINED。現在installed runnerの読解は過去実設定の証明ではない。

|段階|原Vitest：source・主体|AE：source・主体|計時と既存証拠|対応・帰属|
|---|---|---|---|---|
|1 発見・収集|package.json `vitest run src`、Vitest glob/collectTests、coordinator/worker|ae-prepare.extract、TypeScript ASTで名前を選択、準備Node|原collection時間なし。AE抽出時間なし。test snapshotとentry|DIFFERENT、POSTHOC_STATIC_ONLY|
|2 TS変換/import|vite.config、Vitest/Vite変換・解決|prepareのesbuild、Node24 ESM bundle|原transform時間なし。AE build時間なし。metafile、bundle/source SHA|DIFFERENT、派生再build NOT_TESTED|
|3 module初期化|原testのproduction/state/render/reference/Vitest imports、worker|bootstrapからbundle import、subsetとadapter初期化、独立child|AE before-import→after-import。同じpid内。元import区間なし|DIFFERENT、全closure同一性UNKNOWN|
|4 describe/it登録|test内describe/itをrunner taskとして登録|entryにはdescribe/itなし|原登録時間なし。AEは登録自体を行わない|DIFFERENT|
|5 setup/hook/worker|runner collectTests/setupFiles/fixtures/worker isolation。対象fileに明示hookなしでもrunner処理は存在|bootstrap/adapter state初期化、fresh Node、Vitest workerなし|adapter初期化はbundle import内。OS/worker準備の分離費用なし|DIFFERENT、過去worker実設定NOT_OBTAINED|
|6 body|対象it callback|同じ文をIIFEへ移し`return {p,max}`追加|AE stamp start.at→end.at。原body時計なし|STATIC_MATCH、実時間NOT_COMPARABLE|
|7 Verlet/energy/RK4/RMS|three-body.ts、独立reference.ts、testのRMS|同じ引数のwrapper、referenceのRHS/step counter挿入|ON 6カテゴリ計時。OFFは未計測。body/bit/history/count原票|STATIC_MATCH_WITH_INSTRUMENTATION、同負荷の証明なし|
|8 assertion/matcher|Vitest expectとtest context、runnerのassertion lifecycle|ae-expect：Chai+installed JestExtend/JestChaiExpect、state counter、2 matcher wrapper|expect構築とtoBeNull/toBeLessThanをON個別計時。context全体は同じでない|DIFFERENT、matcher全API互換UNKNOWN|
|9 cleanup/集計|runner hook/task result/report/worker終了|body後telemetry、bootstrap JSON保存、parent checkpoint/cohort|after-body→result-savedは保存近傍。原cleanup/集計時計なし。AE残りcleanup分離なし|DIFFERENT、未取得費用NOT_OBTAINED|
|10 timeout/終了|対象itの明示timeoutなし。installed非browser既定5000ms、runner withTimeout|run.spawnSync timeout30000ms、安全停止・process終了|parent start/endは別pidの起動終了区間。原deadline時計なし|DIFFERENT、NOT_COMPARABLE|

対象bodyは`presets[0].config`、126518 Verlet反復、10回毎energy、閾値2e-6、RK4 h=.0002、RMS閾値.001を保持する。bodyとRMSは独立ASTのcanonical SHAで固定し、元file全体もpinする。演算順序・引数・閾値は変更していない。

wrapper契約：initialPhase(c)→rawInitial(c)の戻り値、verlet(p,c)→rawVerlet(p,c)の戻り値r、errors(p,c)→rawErrors(p,c)、reference(c,T,h)→rawReference(c,T,h)の配列、rms(a,b)→rawRms(a,b)。追加副作用はcalls、energyCalls、referenceBodies/finalRms保存、履歴hash、RK4 counters、ON clock/CPU読取り。expect(v)はrawExpect(v)を構築し、toBeNull()とtoBeLessThan(x)だけを公開する。例外はAE process失敗へ伝播し、Vitest task帰属とは異なる。

AE entryには元fileの他test、describe登録、state/render importの未使用経路が含まれない。原fileの同じbodyが読めることだけでmodule初期化や他suiteの影響まで一致とはしない。

2026-11-15 JST
