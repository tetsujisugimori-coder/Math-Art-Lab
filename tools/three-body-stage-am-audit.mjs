import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {gate,validateSpec} from './three-body-stage-am-contract.mjs';
export function audit(root='.'){
 const errors=[];
 let result;
 try{result=validateSpec(JSON.parse(fs.readFileSync(path.join(root,'docs/three-body/review-44/stage-am/safety-contract.json'),'utf8')));errors.push(...result.errors);}
 catch(e){errors.push('SPEC_NOT_OBTAINED:'+e.message);}
 for(const file of ['tools/three-body-stage-am-contract.mjs','tools/three-body-stage-am-fixtures.mjs','src/three-body-stage-am.test.js']){
  const source=fs.readFileSync(path.join(root,file),'utf8');
  if(/(?:node:child_process|node:worker_threads|node:net|node:http|node:ffi|execSync|spawnSync|process\.kill|new Worker)/.test(source))errors.push('FORBIDDEN_RUNTIME:'+file);
 }
 return {status:errors.length?'SPEC_INVALID':'SPEC_READY',errors,scope:'STATIC_ONLY',gate:gate(),guarantee:'NONE',orphanPhysical:'UNKNOWN'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
 const result=process.argv[2]==='validate'?audit():gate();
 console.log(JSON.stringify(result));process.exitCode=result.status==='SPEC_READY'?0:result.status==='BLOCKED'?2:1;
}

