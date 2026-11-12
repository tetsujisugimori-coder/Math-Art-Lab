import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {fileURLToPath} from 'node:url';
import {seal} from './three-body-stage-x-contracts.mjs';
export function gate(r){
 const reasons=[];
 for(const [key,code] of [['diagnostic','D_MEASUREMENT'],['complete','G_INCOMPLETE'],['source','F_SOURCE'],['evidence','F_EVIDENCE'],['cleanup','B_CLEANUP']])if(r[key]!==true)reasons.push(code);
 return reasons;
}
// Shared process execution path; a subsequent measurement command is unreachable
// unless every explicit prerequisite is true. Static audit is independent.
export function orchestrate(root,prerequisite,measurement,staticAudit){
 if(fs.existsSync(root))throw Error('EVIDENCE_COLLISION');fs.mkdirSync(root,{recursive:true});
 const record={prerequisite,reasons:gate(prerequisite),measurementLaunches:0,staticAudit:null,status:'RUNNING'};
 const save=()=>fs.writeFileSync(path.join(root,'result.json'),JSON.stringify(record,null,2));save();
 try{record.staticAudit=staticAudit();if(!record.reasons.length){record.measurementLaunches++;save();const p=spawnSync(measurement.command,measurement.args,{encoding:'utf8',windowsHide:true});record.process={status:p.status,signal:p.signal,stdout:p.stdout,stderr:p.stderr,error:p.error?String(p.error):null};record.status=p.status===0?'PASS':'FAIL';}else record.status='BLOCKED';}
 catch(e){record.status='FAIL';record.error=String(e);}
 save();seal(root);return record;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const [input,root]=process.argv.slice(2),spec=JSON.parse(fs.readFileSync(input));
 const r=orchestrate(root,spec.prerequisite,spec.measurement,()=>({status:'PASS',kind:'STATIC_ONLY',knownLegacyGaps:6}));
 if(r.status!=='PASS')process.exitCode=1;
}
