// Source-bound diagnostic acquisition; byte identity and logical identity are distinct.
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';import {execFileSync,spawnSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
export const sha=b=>createHash('sha256').update(b).digest('hex'),blobId=b=>createHash('sha1').update(Buffer.concat([Buffer.from(`blob ${b.length}\0`),b])).digest('hex'),logicalSha=b=>sha(Buffer.from(b.toString('utf8').replaceAll('\r\n','\n'))),sourceContract='stage-w-source-1';
const git=(...a)=>execFileSync('git',a,{encoding:'utf8',windowsHide:true}).trim(),json=(f,v)=>fs.writeFileSync(f,JSON.stringify(v,null,2)+'\n',{flag:'wx'});
export function bindingId(b){const {id,...body}=b;return sha(JSON.stringify(body));}
export function captureBinding(root,files,runner,diagnosticRevision){
 if(new Set(files).size!==files.length)throw Error('Duplicate source plan');fs.mkdirSync(root,{recursive:true});if(fs.existsSync(root+'/source-binding.json'))throw Error('SOURCE_BINDING_COLLISION');
 const execution={head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}'),workingTree:git('status','--porcelain=v1'),diagnosticRevision,runner};
 const records=files.map(file=>{if(!/^tools\/[a-z0-9-]+\.mjs$/.test(file))throw Error('Unsafe diagnostic source');const bytes=fs.readFileSync(file),copy='sources/runtime/'+file,dest=root+'/'+copy;fs.mkdirSync(path.dirname(dest),{recursive:true});fs.writeFileSync(dest,bytes,{flag:'wx'});let headBytes=null,headBlobId=null;try{headBytes=execFileSync('git',['show',execution.head+':'+file],{stdio:['ignore','pipe','ignore']});headBlobId=git('rev-parse',execution.head+':'+file);}catch{}
  return{file,copy,bytes:bytes.length,sha256:sha(bytes),runtimeBlobId:blobId(bytes),logicalSha256:logicalSha(bytes),headBlobId,headBlobSha256:headBytes?sha(headBytes):null,headLogicalSha256:headBytes?logicalSha(headBytes):null,headRelation:headBytes?bytes.equals(headBytes)?'BYTE_IDENTICAL':logicalSha(bytes)===logicalSha(headBytes)?'CHECKOUT_NEWLINES_ONLY':'DIRTY_RECORDED_SNAPSHOT':'NOT_IN_HEAD_DIRTY_SNAPSHOT'};});
 const b={contract:sourceContract,execution,files:records};b.id=bindingId(b);json(root+'/source-binding.json',b);return b;
}
export function runtimeReference(root,b,moduleUrl){
 if(git('rev-parse','HEAD')!==b.execution.head||git('rev-parse','HEAD^{tree}')!==b.execution.tree)throw Error('Execution HEAD/tree changed');
 const expected=path.resolve(root,'sources/runtime',b.execution.runner),actual=fs.realpathSync(fileURLToPath(moduleUrl));if(fs.realpathSync(expected)!==actual||process.env.STAGE_W_SOURCE_BINDING_ID!==b.id)throw Error('Runner is not executing the bound snapshot');
 for(const s of b.files){const bytes=fs.readFileSync(root+'/'+s.copy);if(bytes.length!==s.bytes||sha(bytes)!==s.sha256||blobId(bytes)!==s.runtimeBlobId)throw Error('Runtime source changed: '+s.file);}
 return{bindingId:b.id,executionHead:b.execution.head,executionTree:b.execution.tree,diagnosticRevision:b.execution.diagnosticRevision,runtimeSourceVerified:true,runner:b.execution.runner,runnerSha256:b.files.find(s=>s.file===b.execution.runner).sha256};
}
export function launchBound(root,files,runner,diagnosticRevision,explicitArgs){
 if(explicitArgs!==undefined&&(!Array.isArray(explicitArgs)||explicitArgs.some(a=>typeof a!=='string'||a.includes('\0')||a.startsWith('--bound='))))throw Error('INVALID_EXPLICIT_CHILD_ARGUMENTS');
 const b=captureBinding(root,files,runner,diagnosticRevision),entry=path.resolve(root,'sources/runtime',runner),args=explicitArgs===undefined?process.argv.slice(2).filter(a=>!a.startsWith('--bound=')):[...explicitArgs];args.push('--bound='+path.resolve(root));
 const child=spawnSync(process.execPath,[entry,...args],{cwd:process.cwd(),env:{...process.env,STAGE_W_SOURCE_BINDING_ID:b.id},stdio:'inherit',windowsHide:true});if(child.error)throw child.error;return child.status??1;
}
export function verifyBinding(binding,read,{headTree,gitBlob,rawReferences=[],manifestHead,manifestTree,manifestSources,manifestRevision,expectedRunner,indexBindingId,indexHead,indexTree,indexRevision,indexRequired=false}={}){
 const errors=[],proof=[],fail=(code,file=null)=>errors.push({code,file});
 if(!binding)return{status:'UNKNOWN',errors:[],proof,reason:'LEGACY_SOURCE_RUNTIME_BINDING_NOT_OBTAINED'};
 if(binding.contract!==sourceContract||binding.id!==bindingId(binding))fail('BINDING_CONTRACT_OR_ID');const e=binding.execution;
 if(!e||!['stage-v-timing-2','stage-w-1','stage-aa-1'].includes(e.diagnosticRevision))fail('WRONG_DIAGNOSTIC_REVISION');
 if(manifestRevision!==undefined&&e?.diagnosticRevision!==manifestRevision)fail('MANIFEST_DIAGNOSTIC_REVISION');
 if(expectedRunner!==undefined&&e?.runner!==expectedRunner)fail('WRONG_RUNTIME_RUNNER');
 if(e?.head!==manifestHead||e?.tree!==manifestTree||headTree!==e?.tree)fail('EXECUTION_HEAD_TREE');
 if(!Array.isArray(binding.files)||new Set(binding.files.map(s=>s.file)).size!==binding.files.length)fail('SOURCE_SET_DUPLICATE');
 if(JSON.stringify(manifestSources)!==JSON.stringify(binding.files))fail('MANIFEST_SOURCE_BINDING');
 for(const s of binding.files??[])try{if(!/^tools\/[a-z0-9-]+\.mjs$/.test(s.file)||s.copy!=='sources/runtime/'+s.file)throw Error('Unsafe source path');const bytes=read(s.copy);if(bytes.length!==s.bytes||sha(bytes)!==s.sha256||blobId(bytes)!==s.runtimeBlobId)fail('SOURCE_RAW_BYTES',s.file);if(logicalSha(bytes)!==s.logicalSha256)fail('SOURCE_LOGICAL_DIGEST',s.file);
  const g=gitBlob(e.head,s.file);let relation;if(g){if(blobId(g)!==s.headBlobId||sha(g)!==s.headBlobSha256||logicalSha(g)!==s.headLogicalSha256)fail('GIT_BLOB_SUBSTITUTION',s.file);relation=bytes.equals(g)?'BYTE_IDENTICAL':logicalSha(bytes)===logicalSha(g)?'CHECKOUT_NEWLINES_ONLY':'DIRTY_RECORDED_SNAPSHOT';}else{if(s.headBlobId!==null||s.headBlobSha256!==null)fail('GIT_BLOB_MISSING',s.file);relation='NOT_IN_HEAD_DIRTY_SNAPSHOT';}
  if(relation!==s.headRelation||(/DIRTY/.test(relation)&&!e.workingTree))fail('UNDECLARED_RUNTIME_SOURCE_DIFFERENCE',s.file);proof.push({file:s.file,rawBytesVerified:bytes.length===s.bytes&&sha(bytes)===s.sha256,rawSha256:s.sha256,runtimeBlobId:s.runtimeBlobId,headBlobId:s.headBlobId,headRelation:relation,logicalSha256:s.logicalSha256});
 }catch{fail('SOURCE_MISSING_OR_UNREADABLE',s.file);}
 for(const r of rawReferences){if(!r||r.bindingId!==binding.id||r.executionHead!==e.head||r.executionTree!==e.tree||r.diagnosticRevision!==e.diagnosticRevision||r.runtimeSourceVerified!==true||r.runner!==e.runner||r.runnerSha256!==binding.files.find(s=>s.file===e.runner)?.sha256)fail('RAW_RUNTIME_SOURCE_REFERENCE');}
 if(indexRequired&&(indexBindingId!==binding.id||indexHead!==e.head||indexTree!==e.tree||(indexRevision!==undefined&&indexRevision!==e.diagnosticRevision)))fail('ARTIFACT_INDEX_SOURCE_BINDING');
 return{status:errors.length?'FAIL':'PASS',errors,proof,contract:sourceContract,bindingId:binding.id,headRelation:e.workingTree?'RECORDED_DIRTY_DIAGNOSTIC_SNAPSHOT':'CLEAN_CHECKOUT',attestationScope:'Snapshot runner actually selected by path/environment and rehashed before each trial; no kernel/V8 attestation or claim about unrecorded external dependencies'};
}
export function auditBinding(root,m,records,index){
 const b=JSON.parse(fs.readFileSync(root+'/source-binding.json'));let headTree=null;try{headTree=git('rev-parse',m.head+'^{tree}');}catch{}
 const result=verifyBinding(b,f=>fs.readFileSync(root+'/'+f),{headTree,gitBlob:(head,file)=>{try{return execFileSync('git',['show',head+':'+file],{stdio:['ignore','pipe','ignore']});}catch{return null;}},rawReferences:records.map(r=>r.sourceReference),manifestHead:m.head,manifestTree:m.tree,manifestSources:m.sources,manifestRevision:m.diagnosticContract,expectedRunner:m.schema==='stage-w-1'?'tools/three-body-stage-w.mjs':'tools/three-body-stage-v.mjs',indexBindingId:index?.sourceBindingId,indexHead:index?.head,indexTree:index?.tree,indexRevision:index?.diagnosticRevision,indexRequired:!!index});
 if(JSON.stringify(m.sourceBinding)!==JSON.stringify(b)){result.errors.push({code:'MANIFEST_BINDING_FILE_DIFFER'});result.status='FAIL';}
 return{...result,auditor:{revision:sourceContract,moduleSha256:sha(fs.readFileSync(fileURLToPath(import.meta.url))),head:git('rev-parse','HEAD'),tree:git('rev-parse','HEAD^{tree}')}};
}
export function acquiredParameters(p,binding,read,fallback){
 if(p.kind==='capture')return fallback(p);const s=binding?.files.find(s=>s.file==='tools/three-body-stage-v-contracts.mjs');if(!s)throw Error('Acquired expression source missing');const bytes=read(s.copy);if(sha(bytes)!==s.sha256)throw Error('Acquired expression source hash differs');const text=bytes.toString('utf8'),start=text.indexOf('function handler(id,marked){'),end=text.indexOf('\n return `(${handler.toString()})',start);if(start<0||end<0)throw Error('Unsupported acquired expression revision');const handler=text.slice(start,end).trimEnd();return{expression:`(${handler})(${JSON.stringify(p.id)},${JSON.stringify(p.marked)})`,returnByValue:true,awaitPromise:true};
}
