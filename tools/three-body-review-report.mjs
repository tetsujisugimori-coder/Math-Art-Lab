import {readFileSync,writeFileSync,existsSync} from 'node:fs';
const dir='docs/three-body/review-44',read=l=>JSON.parse(readFileSync(`${dir}/${l}/summary.json`)),a=read('before'),b=read('after');
const n=x=>x==null?'—':Number(x).toFixed(2),distribution=s=>`${n(s.median)} / ${n(s.p95)} / ${n(s.max)}`;
const rows=['# 性能・表示時刻の同条件比較','',
 '192条件と停止マトリクスはdoctypeなし診断HTML（v3）の結果で、afterは後に撤回した80ms試行。最終採用候補の全192条件は未再測定。本番standards modeの性能値へ外挿せず、実index.htmlのv4重点測定と最終停止マトリクスを下記で分ける。異なるHTML版間の改善率は計算しない。','',
 'Windows / Intel Core i7-14650HX / Node24.20.0 / headless Chromium145.0.7632.6（SwiftShader）/ Playwright WebKit26.0。環境の詳細・空きメモリ・バージョンは各diagnostic.json。原版→修正版の順に、他のローカル試験と競合させず実行。OS負荷・JIT・内部GCを固定した実験ではない。改善率や実機性能の保証を推定しない。', '',
 '全192条件/版が同一の計測器・設定。下表の中央値/p95/最大は経過ms。純CPU時間でもGPU描画完了でもない。paintは命令投入を囲む区間。p95はnearest-rankで、12標本では最大値、実再生3反復でも最大値になる。', '',
 '## 飽和A/B・固定2000step×4（各行3反復・12標本）','',
 '| Browser/session/DPR | paint 前 med/p95/max | paint 後 med/p95/max | observe 前 med/p95/max | observe 後 med/p95/max | rAF待ち 前 med/p95/max | rAF待ち 後 med/p95/max |',
 '|---|---|---|---|---|---|---|'];
for(const g of a.groups.filter(g=>g.condition==='full')){const h=b.groups.find(h=>h.browser===g.browser&&h.session===g.session&&h.dpr===g.dpr&&h.condition===g.condition);rows.push(`| ${g.browser}/${g.session}/${g.dpr} | ${distribution(g.metrics.paint)} | ${distribution(h.metrics.paint)} | ${distribution(g.metrics.observe)} | ${distribution(h.metrics.observe)} | ${distribution(g.frameWait)} | ${distribution(h.frameWait)} |`);}
rows.push('','## 飽和A/B・DPR2・独立Worker要求（各条件3反復）','',
 '3秒後にWorkerが停止要求を記録し、メインmessage受理との差を測る。停止handler完了後100msまでの追加stepは別に照合。総stepは停止要求までの3秒と受理待ち中を含み、厳密な3秒スループットではない。表示間隔制御が有効な実再生であり、上の停止中固定バッチとは別の実験。','',
 '| Browser/condition | 要求待ち 前 med/p95/max | 要求待ち 後 med/p95/max | paint最大 前→後 | calculate最大 前→後 | 進行step中央値 前→後 |',
 '|---|---|---|---|---|---|');
for(const g of a.live){const h=b.live.find(h=>h.browser===g.browser&&h.condition===g.condition);rows.push(`| ${g.browser}/${g.condition} | ${distribution(g.queueDelay)} | ${distribution(h.queueDelay)} | ${n(g.maxPaint)}→${n(h.maxPaint)} | ${n(g.maxCalculate)}→${n(h.maxCalculate)} | ${n(g.steps.median)}→${n(h.steps.median)} |`);}
rows.push('','Chromiumの全ONは修正後もp95≤100ms・最大≤250msの観測目標に未達。特定の1249ms paint標本の直接再現はないが、同程度の要求待ちが残る。原因UNKNOWNを維持する。Canvas OFFで待ちが小さくなったことを、GPUやGCの因果証明とは呼ばない。', '',
 '## 表示状態と描画対象','',
 '| 版 | 通常表示5条件の即時DOM/Canvas時刻不一致 | rAF後不一致 | 実drawOrbit引数と確定状態の不一致 |',
 '|---|---:|---:|---:|');
for(const r of [a,b]){const g=r.groups.filter(g=>['full','single','short','no-trail','no-vector'].includes(g.condition));rows.push(`| ${r.label} | ${g.reduce((s,g)=>s+g.immediateMismatch,0)}/480 | ${g.reduce((s,g)=>s+g.settledMismatch,0)}/480 | ${g.flatMap(g=>g.drawTargetFailures).length} |`);}
rows.push('', '修正版は即時に最新計算stepだけを更新し、旧Canvas/旧DOMの揃った表示を保持する。次rAFで同じ確定状態へ進める。描画対象はstep属性だけでなく全位置引数でも照合。GPUの完了時刻を証明する試験ではない。', '',
 'DOM setter呼出し数は固定4更新/回で68→272へ増える。大きなHTML置換を小さなセルテキスト更新へ変えたためで、setter回数削減とは呼ばない。MutationObserverのaddedNodesは追加された直接ノード数で、innerHTML内の全子孫生成数ではない。要素再利用はGUIの同一性検査で確認。', '',
 '## 停止6操作（詳細はsummary.jsonの48条件）','',
 '原版の累積停止は終端Document再利用の測定器不備で48件失敗した。原データを残し、before-stop-repairの72件で累積部分全体を置換して集計。新規72＋修正累積72＝144件/版。','',
 '| 版 | 成功実行数 | 停止後step増加最大 | A/B不一致条件数 | pause処理最大ms | host要求→settled最大ms |',
 '|---|---:|---:|---:|---:|---:|');
for(const r of [a,b])rows.push(`| ${r.label} | ${r.stops.reduce((s,g)=>s+g.runs-g.errors.length,0)} | ${Math.max(...r.stops.flatMap(g=>g.postStopExtraSteps).filter(Number.isFinite))} | ${r.stops.filter(g=>g.atomic===false).length}/${r.stops.reduce((s,g)=>s+(g.atomicMissing??0),0)} | ${n(Math.max(...r.stops.map(g=>g.pauseHandler.max??0)))} | ${n(Math.max(...r.stops.map(g=>g.hostToSettled.max??0)))} |`);
rows.push('', 'host要求にはプロトコル・actionability・最終rAF待ちも含まれる。合成イベントのtimestamp差は実際の非表示通知遅延を測るものではない。要求時の厳密な内部stepは未測定で、summaryのrequestWindowStepUpperBoundは要求前snapshotから停止までの増分という上限。受信後追加stepと100ms後増分は別に確認する。', '',
 '原版のraf非0はcancel後に残るハンドルの場合があり、予約callbackの残存とは断定しない。修正版は破棄時にcancelと0化。表示だけの最終rAFは停止後に1件許すが、計算timerは停止する。実機非表示・数時間累積・低性能実機は未検証。');
for(const [target,title] of [['after-standards','不採用80ms試行'],['final-standards','最終採用候補']])if(existsSync(`${dir}/before-standards/summary.json`)&&existsSync(`${dir}/${target}/summary.json`)){
  const u=read('before-standards'),v=read(target),focused=[`## 本番と同じHTMLのv4重点測定：${title}`,'',
    'DPR2・新規・飽和A/B・速度4・全ON/Canvas OFF、各3反復、2ブラウザー＝12実行/版。compatModeと両Canvas寸法はraw JSON。全192条件のstandards-mode再測定ではない。calculate最大は1呼出しの同期占有区間で、旧バッチと64step小区間では作業量が違う。積分計算自体が高速化したという比較ではない。','',
    '| Browser/condition | 要求待ち 前 med/p95/max | 要求待ち 後 med/p95/max | paint最大 前→後 | calculate最大 前→後 |',
    '|---|---|---|---|---|'];
  for(const g of u.live){const h=v.live.find(h=>h.browser===g.browser&&h.condition===g.condition);focused.push(`| ${g.browser}/${g.condition} | ${distribution(g.queueDelay)} | ${distribution(h.queueDelay)} | ${n(g.maxPaint)}→${n(h.maxPaint)} | ${n(g.maxCalculate)}→${n(h.maxCalculate)} |`);}
  rows.splice(6,0,...focused,'');
}
if(existsSync(`${dir}/final-stops/summary.json`)){
  const r=read('final-stops');rows.push('','## 最終採用候補・通常HTMLの停止144条件','',
    `成功 ${r.stops.reduce((s,g)=>s+g.runs-g.errors.length,0)}/144。pause最大 ${n(Math.max(...r.stops.map(g=>g.pauseHandler.max??0)))}ms、host要求→settled最大 ${n(Math.max(...r.stops.map(g=>g.hostToSettled.max??0)))}ms。停止後100msの追加step最大 ${Math.max(...r.stops.flatMap(g=>g.postStopExtraSteps).filter(Number.isFinite))}。A/B不一致条件 ${r.stops.filter(g=>g.atomic===false).length}、未確認実行 ${r.stops.reduce((s,g)=>s+(g.atomicMissing??0),0)}。`,
    '', '原版の停止マトリクスはquirks文脈なので、この通常HTMLの結果との改善率は出さない。final-stops/diagnostic.jsonのソースhashをverification-inputs.jsonのnormalizedLFと照合する。要求時stepの厳密測定欠落、合成visibility/pagehide、実機未検証の制約は同じ。');
}
writeFileSync(`${dir}/performance.md`,rows.join('\n')+'\n');
