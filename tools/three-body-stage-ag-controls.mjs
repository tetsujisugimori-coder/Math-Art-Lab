import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {extract} from './three-body-stage-ae-prepare.mjs';
import {workspaceSources,staticAudit,historicalAudit} from './three-body-stage-ag-audit.mjs';
import {verifyStatic,verifyClaims,claims,pathMap} from './three-body-stage-ag-contract.mjs';
import {faults,promotions} from './three-body-stage-ag-faults.mjs';
import {json} from './three-body-stage-af-records.mjs';
export function controls(out,rawRoot,afReport){
  fs.mkdirSync(out); // exclusive outputs; source records are never updated
  const binding=json('.','docs/three-body/review-44/stage-ag/source-binding.json'),original=workspaceSources(),rows=[];
  for(const [name,mutate]of Object.entries(faults)){
    const s=structuredClone(original);mutate(s);
    let legacy='REJECTED';try{extract(s.original);legacy='ACCEPTED_BY_EXTRACTION_ONLY';}catch{}
    const green=verifyStatic(s,binding.contract);
    fs.writeFileSync(out+'/'+name+'.fixture.json',JSON.stringify(s,null,2),{flag:'wx'});
    rows.push({name,red:{scope:'Existing AE extract() only; not an AF raw audit or a previous AG verifier',result:legacy,unexaminedFields:Object.keys(s).filter(k=>k!=='original')},green:{status:green.status,errors:green.errors}});
  }
  for(const [name,mutate]of Object.entries(promotions)){
    const value=structuredClone({...claims,pathMap});mutate(value);
    fs.writeFileSync(out+'/'+name+'.claims.json',JSON.stringify(value,null,2),{flag:'wx'});
    rows.push({name,red:{result:'NOT_APPLICABLE',reason:'No pre-AG claims validator; do not invent a historical false acceptance'},green:verifyClaims(value)});
  }
  const normal=staticAudit('.',binding),historical=historicalAudit(rawRoot,afReport,binding),copies=[];
  for(const kind of ['bundle','source-snapshot','truncated-entry','missing-result']){
    const dest=out+'/'+kind;fs.cpSync(rawRoot,dest,{recursive:true,force:false,errorOnExist:true});
    if(kind==='bundle')fs.appendFileSync(dest+'/bundle.mjs','\n// altered copy');
    if(kind==='source-snapshot'){const m=json(dest,'source-manifest.json');fs.appendFileSync(dest+'/'+m.rows[0].snapshot,'\n// altered copy');}
    if(kind==='truncated-entry')fs.writeFileSync(dest+'/entry.ts','export function run(');
    if(kind==='missing-result')fs.unlinkSync(dest+'/ae-B1.result.json');
    const r=historicalAudit(dest,afReport,binding);copies.push({name:kind,status:r.status,errors:r.errors});
  }
  const result={scope:'STATIC_AND_READ_ONLY_COPIED_EVIDENCE',normal:{status:normal.status,errors:normal.errors},historical:{status:historical.status,errors:historical.errors},rows,copies,success:normal.status==='PASS'&&historical.status==='PASS'&&rows.every(r=>r.green.status==='FAIL')&&copies.every(r=>r.status!=='PASS'),newMeasurements:0};
  fs.writeFileSync(out+'/red-green.json',JSON.stringify(result,null,2),{flag:'wx'});return result;
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const result=controls(...process.argv.slice(2));console.log(JSON.stringify({success:result.success,sourceAndClaimFaults:result.rows.length,copiedEvidenceFaults:result.copies.length}));if(!result.success)process.exitCode=1;
}
