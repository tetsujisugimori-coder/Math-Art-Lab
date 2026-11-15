import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {digest} from './three-body-stage-ah-contract.mjs';
import {validateDesign,executionGate} from './three-body-stage-ai-contract.mjs';
export function audit(root='.'){
  try{
    const dir=path.join(root,'docs/three-body/review-44/stage-ai');
    const raw=fs.readFileSync(path.join(dir,'design-contract.json'));const d=JSON.parse(raw),r=validateDesign(d);if(digest(raw.toString('utf8').replaceAll('\r\n','\n'))!=='b7c0451e46dd0112557078c752a23ba5d9df060db9cbbca6b570da3d3773f64a')r.errors.push('DESIGN_SEAL');
    const bindingRaw=fs.readFileSync(path.join(dir,'source-binding.json'));const binding=JSON.parse(bindingRaw);if(digest(bindingRaw.toString('utf8').replaceAll('\r\n','\n'))!=='f6566de40702f211d2651f53fe74f8fb390abc6630c5d011dbea98a7e91d833f')r.errors.push('SOURCE_BINDING_SEAL');
    for(const row of binding.sources){const b=fs.readFileSync(path.join(root,row.file));if(digest(b.toString('utf8').replaceAll('\r\n','\n'))!==row.logicalSha256)r.errors.push('SOURCE_DRIFT:'+row.file);}
    if(r.errors.length)r.status='DESIGN_INVALID';return {...r,gate:executionGate()};
  }catch(e){return {status:'DESIGN_INVALID',errors:['EVIDENCE_INCOMPLETE',String(e)],gate:executionGate()};}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const r=process.argv[2]==='validate'?audit():executionGate();console.log(JSON.stringify(r));process.exitCode=r.status==='DESIGN_VALID'?0:r.status==='BLOCKED'?2:1;}
