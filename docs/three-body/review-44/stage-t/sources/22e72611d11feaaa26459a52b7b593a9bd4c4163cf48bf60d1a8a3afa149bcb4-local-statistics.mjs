import fs from 'node:fs';import path from 'node:path';import {gunzipSync} from 'node:zlib';import {inputStatistics} from '../../../tools/three-body-stage-q-metrics.mjs';import {distribution} from '../../../tools/three-body-stage-p-analysis.mjs';
const root='.three-body-evidence/stage-t',results=[];
for(const group of ['local','local-v2','moving']){
 const dir=root+'/'+group,manifest=JSON.parse(fs.readFileSync(dir+'/pipeline-manifest.json')),rows=JSON.parse(fs.readFileSync(dir+'/report/summary.json')).runs;
 const requests={app:[],mini:[]};
 for(const file of fs.readdirSync(dir+'/raw').filter(f=>f.endsWith('.json.gz'))){const r=JSON.parse(gunzipSync(fs.readFileSync(dir+'/raw/'+file)));requests[r.options.mini?'mini':'app'].push(...(r.data?.requests??[]));}
 const captures=rows.filter(r=>r.capture.status!=='NOT_TESTED');
 const byFactor=Object.fromEntries([...new Set(captures.map(r=>r.options.factor))].map(f=>[f,captures.filter(r=>r.options.factor===f).map(r=>({id:r.id,order:r.options.order,options:r.options,status:r.capture.status,apiMs:(r.capture.acquiredAt??r.capture.end)-r.capture.begin,image:r.capture.image,bitmap:r.capture.bitmap,errors:r.errors}))]));
 const senderFile=root+'/regression/sender-'+(group==='local'?'initial':'v2')+'.json',sender=group==='moving'?[]:JSON.parse(fs.readFileSync(senderFile)).rows;
 results.push({group,counts:manifest.counts,completeness:manifest.completeness,input:Object.fromEntries(Object.entries(requests).map(([kind,rs])=>[kind,inputStatistics(rs)])),
  capture:{planned:captures.length,pass:captures.filter(r=>r.capture.status==='PASS').length,fail:captures.filter(r=>r.capture.status==='FAIL').length,timeouts:captures.filter(r=>r.errors.some(e=>/timeout/i.test(e))).length,otherErrors:captures.filter(r=>r.capture.status==='FAIL'&&!r.errors.some(e=>/timeout/i.test(e))).length,byFactor},
  app:rows.filter(r=>!r.options.mini).map(r=>({id:r.id,input:r.input,paint:r.phase.paint,calculate:r.phase.calculate,geometry:r.phase.geometry,stepDelta:r.stepDelta,stop:r.stop,math:r.math,draw:r.draw,frames:r.frames,budget:r.budget})),
  stops:{n:sender.length,hit:sender.filter(s=>s.verdict==='HIT').length,miss:sender.filter(s=>s.verdict==='TARGET_MISS').length,notTested:sender.filter(s=>s.verdict.startsWith('NOT_TESTED')).length,unsafe:sender.filter(s=>!s.safe).length,sendReceive:distribution(sender.map(s=>s.stop.T1-s.stop.T0)),receiveStop:distribution(sender.map(s=>s.stop.T3-s.stop.T1)),stopReceipt:distribution(sender.map(s=>s.stop.T4-s.stop.T3))},
  mathMismatches:rows.filter(r=>r.math&&(r.math.phase===false||r.math.history===false||r.math.publicPosition===false)).length,displayMismatches:rows.filter(r=>r.draw?.a===false||r.draw?.b===false||r.frames?.mismatch).length});
}
fs.writeFileSync(root+'/regression/local-statistics.json',JSON.stringify({results,scope:'Separate observational windows, not a matched product before/after. No improvement percentage.'},null,2));
console.log(JSON.stringify(results.map(({group,counts,capture,stops,input,mathMismatches,displayMismatches})=>({group,counts,capture:{pass:capture.pass,fail:capture.fail,timeouts:capture.timeouts,otherErrors:capture.otherErrors},stops,input,mathMismatches,displayMismatches}))));
