import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
const dir='docs/three-body/review-44',read=p=>JSON.parse(readFileSync(`${dir}/${p}`,'utf8').replace(/^\uFEFF/,''));
const before=read('readback-before/summary.json'),after=read('readback-after/summary.json'),raw=read('readback-after/diagnostic.json');
const f=n=>n==null?'—':Number(n).toFixed(2),dist=s=>`${f(s.median)} / ${f(s.p95)} / ${f(s.max)}`;
const integrity=Object.fromEntries(Object.entries(raw.sourceHashes).map(([p,h])=>[p,h===createHash('sha256').update(readFileSync(p,'utf8').replaceAll('\r\n','\n')).digest('hex')]));
writeFileSync(`${dir}/readback-integrity.json`,JSON.stringify({date:new Date().toISOString(),measured:'readback-after',sourceHashes:raw.sourceHashes,matches:integrity,allMatch:Object.values(integrity).every(Boolean)},null,2));
if(!Object.values(integrity).every(Boolean))throw Error('Measured product source differs from workspace');
const normal=after.groups.filter(g=>['full','single','short','no-trail','no-vector'].includes(g.condition));
const rows=['# 描画経路修正後の最新検証（2026-11-10 JST）','',
 '総合PARTIAL。P2-01 PARTIAL、P3-01は実施範囲でPASS、P3-02 PARTIAL。限定マージ推奨NO。独立再レビュー待ちとする。','',
 '過去のfinal/afterという資料名は当時の候補名。最新はreadback-before（旧renderだけを復元）、readback-after（採用経路）、readback-long、*-readback.log。本書とreadback-integrity.jsonを提出ソースに対応付ける。','',
 '## 確認した描画問題と修正','',
 'Linux Playwright WebKit/DPR2の実アプリでは、正しいモデル値・arc引数・公開変換行列でもバッファー画素が参照位置と一致しなかった。小Canvasの矩形・パス・arc・shadow対照は正常。実寸法の7設定×3反復は全て同じモデル位置で、通常/発光OFF/遅延なし/buffer再初期化/opaqueは不一致、willReadFrequently:trueと初期readbackだけ一致した。発光や基本座標変換を原因とする仮説は不採用。','',
 '描画側getContextにwillReadFrequently:trueを指定した。設定ヒントの効果は実測したが、GPU/CPUの内部選択・GC・元の1249ms標本の直接原因までは特定していない。刻み・解像度・発光・ベクトル・履歴・モデルを削減せず、画素しきい値150も維持する。force-defaultは意図した旧経路の負対照。','',
 '## 同条件の旧経路／新経路（DPR2・飽和A/B・全表示・新規）','',
 '同じview/state/physics/HTML/計測器を用い、TB_RENDER_FILEだけで旧renderを復元。各3反復、3秒後の独立Worker要求からmain受理までを計測。med/p95/maxはms、n=3のp95はnearest-rankの最大値。純CPU時間・GPU描画完了・保証上限ではない。','',
 '| Browser/condition | 要求待ち 旧 med/p95/max | 要求待ち 新 med/p95/max | paint区間最大 旧→新 |',
 '|---|---|---|---|'];
for(const a of before.live){const b=after.live.find(b=>b.browser===a.browser&&b.condition===a.condition);rows.push(`| ${a.browser}/${a.condition} | ${dist(a.queueDelay)} | ${dist(b.queueDelay)} | ${f(a.maxPaint)}→${f(b.maxPaint)} |`);}
rows.push('', 'calculate最大は1呼出しの区間。原版cf80の大バッチと64step小区間を積分器のCPU性能比として比較しない。今回のreadback旧/新はどちらも64step。OS停止やGC等を含み得る経過区間であり、4msはpreemption保証ではない。', '',
 '## 通常HTMLの全マトリクスと表示時刻','',
 `8条件×2 browser×DPR1/2×新規/同一Document累積×3反復＝${after.runs}実行、取得エラー${after.errors}。履歴short条件はstep0→8000で、前半が短履歴、後半は飽和へ入る成長条件。各グループの件数/中央値/p95/最大はreadback-after/summary.json。`, '',
 `通常表示5条件の即時DOM/Canvas不一致${normal.reduce((s,g)=>s+g.immediateMismatch,0)}/480、rAF後${normal.reduce((s,g)=>s+g.settledMismatch,0)}/480、実drawOrbit引数の不一致${normal.flatMap(g=>g.drawTargetFailures).length}。診断で表示を無効化した条件を通常表示の一致判定に混ぜない。`, '',
 '## 安全停止144条件','',
 `6操作×2 browser×2 DPR×新規/累積×3反復。成功${after.stops.reduce((s,g)=>s+g.runs-g.errors.length,0)}/144、pause最大${f(Math.max(...after.stops.map(g=>g.pauseHandler.max??0)))}ms、host要求→settled最大${f(Math.max(...after.stops.map(g=>g.hostToSettled.max??0)))}ms。停止後100msの追加step最大${Math.max(...after.stops.flatMap(g=>g.postStopExtraSteps).filter(Number.isFinite))}、A/B不一致条件${after.stops.filter(g=>g.atomic===false).length}、未確認実行${after.stops.reduce((s,g)=>s+(g.atomicMissing??0),0)}。`, '',
 'host時間には移送・actionability・最終rAF待ちも含まれ、Worker要求待ちとは別指標。要求瞬間の厳密な内部stepは未測定で、事前snapshot増分は上限値。visibility/pagehideは合成、motionはemulateMedia。受信後停止と要求配信待ちを区別する。', '',
 '| Browser/action | n | host→settled med/p95/max | native event作成→capture最大 |',
 '|---|---:|---|---|');
const stats=v=>{v.sort((a,b)=>a-b);return {median:v[Math.floor(v.length/2)],p95:v[Math.ceil(v.length*.95)-1],max:v.at(-1)};};
for(const browser of ['chromium','webkit'])for(const action of ['pause','escape','visibility','motion','switch','dispose']){const a=raw.stops.filter(r=>r.browser===browser&&r.action===action&&!r.error);rows.push(`| ${browser}/${action} | ${a.length} | ${dist(stats(a.map(r=>r.hostSettledEpoch-r.hostRequestEpoch)))} | ${f(Math.max(...a.flatMap(r=>r.data.events.map(e=>e.begin-e.stamp))))} |`);}
if(existsSync(`${dir}/readback-long/diagnostic.json`)){const l=read('readback-long/diagnostic.json');rows.push('','## 飽和後60秒連続再生（各ブラウザー1回）','',
 '| Browser | 経過ms（要求後100ms含む） | 追加step | 要求待ちms | 停止後追加step | paint最大ms |',
 '|---|---:|---:|---:|---:|---:|');for(const x of l.live){const r=x.result;rows.push(`| ${x.browser} | ${f(r?.elapsed)} | ${(r?.stopped.step??0)-(r?.before.step??0)} | ${f(r?.queueDelay)} | ${(r?.later.step??0)-(r?.stopped.step??0)} | ${f(r?.data.metrics.paint?.max)} |`);}rows.push('','これは各1回の有限窓で、数時間使用・実機性能・全時点の停止遅延上限の証明ではない。');}
rows.push('', '## 数理・GUI・限界','',
 '物理核不変。numerical-bitwise.jsonの6窓で原版と全内部Float64/履歴一致。独立RK4・解析三角形・8の字約20周期・刻み半減収束はnumerical-reference-readback.json。unit-readback.log、typecheck-readback.log、build-readback.logを参照。', '',
 'Windowsの最終GUIはgui-development-readback.log / gui-production-readback.log。16基本条件は各2テーマ×文字100/200%。Linuxの新作DPR2画素と既存wave失敗は過去CIに保存し、修正後の全回帰CIで確認する。', '',
 '実機iPhone Safari、VoiceOver/NVDA、低性能実機、OS文字拡大・実際の非表示/BFCache、数時間連続使用、GPU描画完了は未検証。Windows Chromiumはheadless SwiftShader、WebKitはPlaywright版。内部原因不明のスパイクをGC/GPUのせいにしない。最終HEAD CIの確定結果はPR #44の検証コメントへ保存する。');
writeFileSync(`${dir}/readback-verification.md`,rows.join('\n')+'\n');
