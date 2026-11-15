import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';import {isDeepStrictEqual as equal} from 'node:util';
import {descriptor,json,read,digest} from './three-body-stage-af-records.mjs';
function files(root,prefix=''){return fs.readdirSync(path.join(root,prefix),{withFileTypes:true}).flatMap(e=>{const f=prefix?prefix+'/'+e.name:e.name;if(e.isSymbolicLink())throw Error('SYMLINK');return e.isDirectory()?files(root,f):[f];}).sort();}
export function capture(destination,inputs){
  const allowed=path.resolve('C:/Users/tetsu/Dev-Artifact-Archive/Math-Art-Lab/PR-44'),dest=path.resolve(destination);
  if(!dest.startsWith(allowed+path.sep)||!path.basename(dest).startsWith('Stage-AH-'))throw Error('ARCHIVE_PATH');
  fs.mkdirSync(dest); // collision fatal; no existing archive updates
  inputs.forEach((input,i)=>fs.cpSync(input,path.join(dest,String(i)),{recursive:true,force:false,errorOnExist:true}));
  const payload=files(dest).map(f=>descriptor(dest,f));
  const manifest={schema:'ah-archive-1',evidenceType:'PLAN_ONLY_STATIC_POSTHOC_AND_SYNTHETIC',files:payload.length,bytes:payload.reduce((n,r)=>n+r.bytes,0),payload};
  const bytes=Buffer.from(JSON.stringify(manifest,null,2)),manifestSha256=digest(bytes);
  fs.writeFileSync(path.join(dest,'manifest.json'),bytes,{flag:'wx'});fs.writeFileSync(path.join(dest,'manifest.sha256'),manifestSha256+'\n',{flag:'wx'});
  return {status:'COPIED_PENDING_INDEPENDENT_READBACK',files:manifest.files,bytes:manifest.bytes,manifestSha256};
}
export function verify(destination,expectedManifestSha256){
  try{
    if(!/^[a-f0-9]{64}$/.test(expectedManifestSha256??''))throw Error('EXTERNAL_MANIFEST_RECEIPT_REQUIRED');
    const raw=read(destination,'manifest.json'),sidecar=read(destination,'manifest.sha256').toString('ascii').trim(),m=json(destination,'manifest.json');
    const actual=files(destination).filter(f=>!['manifest.json','manifest.sha256'].includes(f)).map(f=>descriptor(destination,f));
    const manifestOK=digest(raw)===expectedManifestSha256&&sidecar===expectedManifestSha256;
    const payloadOK=m.schema==='ah-archive-1'&&m.evidenceType==='PLAN_ONLY_STATIC_POSTHOC_AND_SYNTHETIC'&&equal(m.payload,actual)&&m.files===actual.length&&m.bytes===actual.reduce((n,r)=>n+r.bytes,0);
    return {status:manifestOK&&payloadOK?'LOCAL_BACKUP_VERIFIED':'BLOCKED',manifestStatus:manifestOK?'VERIFIED':'FAIL',fileSetStatus:payloadOK?'VERIFIED':'FAIL',files:actual.length,bytes:actual.reduce((n,r)=>n+r.bytes,0),manifestSha256:digest(raw)};
  }catch(e){return {status:'BLOCKED',error:String(e)};}
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)){
  const [command,dest,...args]=process.argv.slice(2);if(!['capture','verify'].includes(command)||!dest)throw Error('USAGE: capture DEST INPUTS | verify DEST EXTERNAL_MANIFEST_SHA');
  const r=command==='capture'?capture(dest,args):verify(dest,args[0]);console.log(JSON.stringify(r));if(r.status==='BLOCKED')process.exitCode=1;
}
