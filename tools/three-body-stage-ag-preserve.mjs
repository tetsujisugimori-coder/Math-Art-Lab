import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
import {descriptor,json} from './three-body-stage-af-records.mjs';
import {isDeepStrictEqual as equal} from 'node:util';
function files(root,prefix='') {return fs.readdirSync(path.join(root,prefix),{withFileTypes:true}).flatMap(e=>{const f=prefix?prefix+'/'+e.name:e.name;if(e.isSymbolicLink())throw Error('SYMLINK');return e.isDirectory()?files(root,f):[f];}).sort();}
export function preserve(destination,inputs) {
  const allowed=path.resolve('C:/Users/tetsu/Dev-Artifact-Archive/Math-Art-Lab/PR-44');
  const dest=path.resolve(destination);
  if(!dest.startsWith(allowed+path.sep)||!path.basename(dest).startsWith('Stage-AG'))throw Error('ARCHIVE_PATH');
  fs.mkdirSync(dest); // collision is fatal; no old file updates
  inputs.forEach((input,i)=>fs.cpSync(input,path.join(dest,String(i)),{recursive:true,force:false,errorOnExist:true}));
  const manifest=files(dest).map(f=>descriptor(dest,f));
  fs.writeFileSync(path.join(dest,'manifest.json'),JSON.stringify(manifest,null,2),{flag:'wx'});
  return {status:'COPIED_PENDING_INDEPENDENT_READBACK',files:manifest.length,bytes:manifest.reduce((n,r)=>n+r.bytes,0)};
}
export function verify(destination) {
  const expected=json(destination,'manifest.json'),actual=files(destination).filter(f=>f!=='manifest.json').map(f=>descriptor(destination,f));
  return {status:equal(expected,actual)?'LOCAL_BACKUP_VERIFIED':'FAIL',files:actual.length,bytes:actual.reduce((n,r)=>n+r.bytes,0)};
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url)) {
  const [command,dest,...inputs]=process.argv.slice(2);
  if(!['capture','verify'].includes(command)||!dest)throw Error('USAGE');
  const result=command==='capture'?preserve(dest,inputs):verify(dest);console.log(JSON.stringify(result));if(result.status==='FAIL')process.exitCode=1;
}
