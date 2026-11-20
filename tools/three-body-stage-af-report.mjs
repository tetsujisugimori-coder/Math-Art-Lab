import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {analyze} from './three-body-stage-ae-analyze.mjs';
import {createIndex,audit} from './three-body-stage-af-audit.mjs';
import {descriptor,json} from './three-body-stage-af-records.mjs';
import {isDeepStrictEqual as equal} from 'node:util';
export function captureReport(root,out) {
  fs.mkdirSync(out); // exclusive, never updates old raw or reports
  fs.writeFileSync(out+'/summary.json',JSON.stringify(analyze(root),null,2),{flag:'wx'});
  const index={...createIndex(root),summary:descriptor(out,'summary.json')};
  fs.writeFileSync(out+'/audit-index.json',JSON.stringify(index,null,2),{flag:'wx'});
  const result=verifyReport(root,out);
  fs.writeFileSync(out+'/audit-result.json',JSON.stringify(result,null,2),{flag:'wx'});
  return result;
}
export function verifyReport(root,out) {
  try {
    const index=json(out,'audit-index.json');
    if(!equal(index.summary,descriptor(out,'summary.json')))return {status:'FAIL',errors:['SUMMARY_BYTES_SIZE_SHA']};
    return audit(root,index,json(out,'summary.json'));
  }catch(e){return {status:'FAIL',errors:['REPORT_NOT_OBTAINED_OR_INVALID:'+String(e)]};}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [command,root,out]=process.argv.slice(2);
  if(!['capture','verify'].includes(command)||!root||!out)throw Error('USAGE: capture|verify RAW_ROOT REPORT_DIRECTORY');
  const result=command==='capture'?captureReport(root,out):verifyReport(root,out);
  console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;
}
