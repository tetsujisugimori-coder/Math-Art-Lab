import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {digest} from './three-body-stage-ah-contract.mjs';import {validateSafety,gate} from './three-body-stage-ak-contract.mjs';
const seals={"runtime-candidates.json":"edb0b9270b2f26de80c7272e6caee54e9d7691422a1ac00d5afcba809e726e00","current-host-windows.json": "f7373257a95b351d6031355364989137c3ab2b7bf31375570adc58860298b1da", "node-dependencies.json": "7e1511637f3f051dc35c8c931879b5f8d6ff755c5fe2b04c079ea18a756f844d", "safety-contract.json": "168bdb5074c35a71ae3f8fda8a25142dc95d22c5b54c91ccf2714f52ad42ee1a", "source-binding.json": "b7ad8fe82e8c576dcf97e386acea18c7cee0e17389d64d76db7b0c23514b00b2", "toolchain-candidates.json": "cd699d10a71d7a91d2a18497b9240156b975860ab7946fbef829411630eb20da", "workflow-audit.json": "4d69e07eac128de5d2e626f6337b546827424b0801ab4e75bfd7a06f29495640"};
export function audit(root='.'){
 try{
  const dir=path.join(root,'docs/three-body/review-44/stage-ak'),data={};
  for(const [f,h]of Object.entries(seals)){const b=fs.readFileSync(path.join(dir,f));if(digest(b.toString('utf8').replaceAll('\r\n','\n'))!==h)return {status:'DESIGN_INVALID',errors:['SEAL:'+f],gate:gate()};data[f]=JSON.parse(b);}
  const r=validateSafety(data['safety-contract.json']);
  for(const row of data['source-binding.json'].sources)if(digest(fs.readFileSync(path.join(root,row.file),'utf8').replaceAll('\r\n','\n'))!==row.logicalSha256)r.errors.push('SOURCE_DRIFT:'+row.file);
  const w=data['workflow-audit.json'];
  const actual=fs.readdirSync(path.join(root,'.github/workflows')).filter(f=>f.endsWith('.yml')).sort();
  if(JSON.stringify(actual)!==JSON.stringify(w.files.map(r=>r.file)))r.errors.push('WORKFLOW_SET');
  for(const row of w.files)if(digest(fs.readFileSync(path.join(root,'.github/workflows',row.file),'utf8').replaceAll('\r\n','\n'))!==row.logicalSha256)r.errors.push('WORKFLOW_DRIFT:'+row.file);
  if(r.errors.length)r.status='DESIGN_INVALID';return {...r,push:'HOLD',ci:'NOT_RUN_PUSH_HOLD'};
 }catch(e){return {status:'DESIGN_INVALID',errors:['EVIDENCE_INCOMPLETE',String(e)],gate:gate(),push:'HOLD'};}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const r=process.argv[2]==='validate'?audit():gate();console.log(JSON.stringify(r));process.exitCode=r.status==='DESIGN_VALID'?0:r.status==='BLOCKED'?2:1;}
