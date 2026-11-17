import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {createHash} from 'node:crypto';
import {gate} from './three-body-stage-al-contract.mjs';
const sha=b=>createHash('sha256').update(b).digest('hex');
const seals={"ak28-binding.json": "9202857f7a654ad29888c9dacb6230c062768bd29afe7bca7079db8c62721f31", "clock-contract.json": "edd6eba54c42490f776c369778c4c23dbb3432bf20b5af4e13876d14066f66bd", "orphan-contract.json": "098832c32198e6c842ab6a418c4aa58e92fecdd439ac6f96678aa039883d4849", "recovery-contract.json": "420b51e4239c5e445dbd3abadbc47a953a8595e535347cfe7521cf65d5ddcf5f"};
export function audit(root='.'){
 const errors=[];
 try{
  const dir=path.join(root,'docs/three-body/review-44/stage-al/supplement');
  for(const [f,h]of Object.entries(seals))if(sha(fs.readFileSync(path.join(dir,f),'utf8').replaceAll('\r\n','\n'))!==h)errors.push('SUPPLEMENT_SEAL:'+f);
  const binding=JSON.parse(fs.readFileSync(path.join(dir,'ak28-binding.json')));
  if(binding.rows.length!==28)errors.push('AK_SET');
  for(const r of binding.rows)if(sha(fs.readFileSync(path.join(root,r.file)))!==r.checkoutSha256)errors.push('AK_CHECKOUT_CHANGED:'+r.file);
 }catch(e){errors.push('EVIDENCE_INCOMPLETE:'+String(e));}
 return {status:errors.length?'SPEC_INVALID':'SPEC_VALID',errors,gate:gate(),nativeImplementation:'NOT_IMPLEMENTED',recoveryGuarantee:'NONE',orphanPhysical:'UNKNOWN'};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){const r=process.argv[2]==='validate'?audit():gate();console.log(JSON.stringify(r));process.exitCode=r.status==='SPEC_VALID'?0:r.status==='BLOCKED'?2:1;}
