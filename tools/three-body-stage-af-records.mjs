import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
export const digest = b => createHash('sha256').update(b).digest('hex');
export const read = (root,file) => {
  if (typeof file !== 'string' || path.isAbsolute(file) || file.split(/[\\/]/).includes('..')) throw Error('UNSAFE_PATH');
  return fs.readFileSync(path.join(root,file));
};
export const json = (root,file) => JSON.parse(read(root,file).toString('utf8'));
export function descriptor(root,file) {const b=read(root,file);return {file,bytes:b.length,sha256:digest(b)};}
export function binding(root,p,index) {
  const m=json(root,'source-manifest.json');
  return {id:p.id,mode:p.mode,checkpoint:index,head:m.head,tree:m.tree,sourceSetSha256:m.sourceSetSha256,bundleSha256:m.bundle.sha256,plan:descriptor(root,'run-plan.json'),manifest:descriptor(root,'source-manifest.json'),result:descriptor(root,p.id+'.result.json'),clock:descriptor(root,p.id+'.clock.jsonl')};
}
export function runtimeIdentity(root,git=(...args)=>execFileSync('git',args,{encoding:'utf8'}).trim()) {
  const identity={runtimeHead:git('rev-parse','HEAD'),runtimeTree:git('rev-parse','HEAD^{tree}')};
  const m=json(root,'source-manifest.json');
  if(identity.runtimeHead!==m.head||identity.runtimeTree!==m.tree)throw Error('RUNTIME_GIT_DRIFT');
  return identity;
}
export function runtimeReceipt(root,p,index,identity=runtimeIdentity(root)) {return {schema:'af-runtime-1',acquisition:'EXECUTION_CHECKPOINT',...identity,...binding(root,p,index)};}
