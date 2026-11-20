import fs from 'node:fs';
import {loadBundle,auditSources} from './three-body-stage-ah-audit.mjs';
import {validateDocuments,executionGate,assessProgress} from './three-body-stage-ah-contract.mjs';
import {planFaults,progressFaults,row} from './three-body-stage-ah-fixtures.mjs';
import {outcome as previousADOutcome} from './three-body-stage-ad-timeout.mjs';
const out=process.argv[2];if(!out)throw Error('NEW_OUTPUT_DIRECTORY_REQUIRED');fs.mkdirSync(out);
const bundle=loadBundle(),normal=auditSources('.',bundle),rows=[];
for(const [name,mutate]of Object.entries(planFaults)){
  const b=structuredClone(bundle);mutate(b);const green=validateDocuments(b);
  fs.writeFileSync(out+'/'+name+'.json',JSON.stringify({name,plan:b.plan,policies:b.policies,timing:b.timing,stops:b.stops,approval:b.approval,environmentMapSeal:b.lock.environmentMapSha256},null,2),{flag:'wx'});
  rows.push({name,red:'NOT_APPLICABLE: no previous AH plan validator',green:green.status,errors:green.errors,execution:executionGate(b,{action:'EXECUTE'}).status});
}
for(const [name,mutate]of Object.entries(progressFaults)){
  const r=row(bundle);mutate(r);const result=assessProgress(bundle,{synthetic:true,rows:[r],elapsedMs:100});
  fs.writeFileSync(out+'/progress-'+name+'.json',JSON.stringify({synthetic:true,rows:[r],elapsedMs:100},null,2),{flag:'wx'});
  rows.push({name:'progress-'+name,red:'NOT_APPLICABLE: no previous AH stop contract',green:result.status,evidenceStatus:result.evidenceStatus,errors:result.errors});
}
for(const name of ['approval-record-missing','unapproved-request','forged-approval'])rows.push({name,red:'NOT_APPLICABLE',green:executionGate(bundle,{action:'EXECUTE',approval:name==='forged-approval'?{state:'APPROVED',execute:'YES'}:undefined}).status});
const old=previousADOutcome({exitCode:1},[]),current=assessProgress(bundle,{synthetic:true,rows:[{...row(bundle),exitCode:1}],elapsedMs:100});
const continuation={scope:'Previous AD outcome() permits continuation after integer test failure; differs from new AH stop-on-first-failure. Not a historical execution PASS or an AH prior verifier.',input:{exitCode:1,errors:[]},red:{continueAllowed:old.continueAllowed,executionStatus:old.executionStatus},green:{stop:current.stop,status:current.status,nextId:current.nextId}};
const result={scope:'PLAN_ONLY_STATIC_AND_SYNTHETIC',normal:{status:normal.status,gate:executionGate(bundle)},rows,legacyContinuationContrast:continuation,success:normal.status==='PLAN_VALID'&&rows.every(r=>['PLAN_INVALID','BLOCKED'].includes(r.green))&&current.stop&&current.nextId===null,actualExecution:'NOT_TESTED',measurements:0};
fs.writeFileSync(out+'/red-green.json',JSON.stringify(result,null,2),{flag:'wx'});
console.log(JSON.stringify({success:result.success,faults:rows.length,legacyContinuationContrast:continuation}));if(!result.success)process.exitCode=1;
