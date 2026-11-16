import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {digest} from './three-body-stage-ah-contract.mjs';
import {validatePrefixed,executionGate} from './three-body-stage-aj-contract.mjs';
const seals={"implementation-environment-contract.json": "d2b8230735db44b9d0f0af68a24e67ba78953404bdb10c86cb3b214137a880f3", "support-source-binding.json": "740f36a775bc16ed3e54e569a05b2cef6f171810abf7c53cc8f6e6f90c3f1045", "current-static-environment.json": "a542f337767897c77294a66b635ce0cc97bd5ef049bbe7be63c9214716e12d88"};
export function audit(root='.'){
  try{
    const dir=path.join(root,'docs/three-body/review-44/stage-aj'),data={};
    for(const [f,sha]of Object.entries(seals)){const raw=fs.readFileSync(path.join(dir,f));if(digest(raw.toString('utf8').replaceAll('\r\n','\n'))!==sha)return {status:'PREFIX_INVALID',errors:['SEAL:'+f],gate:executionGate()};data[f]=JSON.parse(raw);}
    const r=validatePrefixed(data['implementation-environment-contract.json']);
    for(const row of data['support-source-binding.json'].sources){
      const raw=fs.readFileSync(path.join(root,row.file)),git=Buffer.from(row.gitRawBase64,'base64');
      const blob=createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${git.length}\0`),git])).digest('hex');
      if(blob!==row.gitBlob||digest(raw.toString('utf8').replaceAll('\r\n','\n'))!==row.logicalSha256||digest(git.toString('utf8').replaceAll('\r\n','\n'))!==row.logicalSha256)r.errors.push('SOURCE_DRIFT:'+row.file);
    }
    if(r.errors.length)r.status='PREFIX_INVALID';return r;
  }catch(e){return {status:'PREFIX_INVALID',errors:['EVIDENCE_INCOMPLETE',String(e)],gate:executionGate()};}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const r=process.argv[2]==='validate'?audit():executionGate();console.log(JSON.stringify(r));process.exitCode=r.status==='PREFIX_VALID'?0:r.status==='BLOCKED'?2:1;}
