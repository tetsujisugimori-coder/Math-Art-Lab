import {createHash} from 'node:crypto';
import {hash} from './three-body-stage-ag-contract.mjs';
const oid=(type,b)=>createHash('sha1').update(Buffer.from(`${type} ${b.length}\0`)).update(b).digest('hex');
// Git content-addressed proof. It needs no local baseline objects in shallow CI checkout.
export function gitProof(binding){
  const objects=new Map();
  for(const r of binding.gitObjects){
    if(!['commit','tree','blob'].includes(r.type)||objects.has(r.sha))throw Error('GIT_OBJECT_SET');
    const b=Buffer.from(r.base64,'base64');if(oid(r.type,b)!==r.sha)throw Error('GIT_OBJECT_SHA');
    objects.set(r.sha,{type:r.type,b});
  }
  const get=(sha,type)=>{const r=objects.get(sha);if(r?.type!==type)throw Error('GIT_OBJECT_NOT_OBTAINED:'+sha);return r.b;};
  const commit=get(binding.baselineHead,'commit').toString('utf8');
  if(commit.split('\n')[0]!=='tree '+binding.baselineTree)throw Error('GIT_COMMIT_TREE');
  function find(file){
    const parts=file.split('/');if(parts.some(p=>!p||p==='.'||p==='..'))throw Error('GIT_PATH');
    let tree=binding.baselineTree;
    for(const [i,name]of parts.entries()){
      const b=get(tree,'tree');let at=0,entry;
      while(at<b.length){const space=b.indexOf(32,at),zero=b.indexOf(0,space);if(space<at||zero<space||zero+21>b.length)throw Error('GIT_TREE_SYNTAX');
        const mode=b.subarray(at,space).toString(),n=b.subarray(space+1,zero).toString('utf8'),sha=b.subarray(zero+1,zero+21).toString('hex');
        if(n===name)entry={mode,sha};at=zero+21;
      }
      if(!entry)return null;
      if(i===parts.length-1){if(!['100644','100755'].includes(entry.mode))throw Error('GIT_NOT_FILE');return {sha:entry.sha,b:get(entry.sha,'blob')};}
      if(entry.mode!=='40000')return null;tree=entry.sha;
    }
    return null;
  }
  return row=>{
    const file=find(row.file);
    if(!file){if(row.gitBlob!==null||row.gitBlobSha256!==null||row.head!==null||row.tree!==null)throw Error('GIT_ABSENT_METADATA:'+row.file);}
    else if(row.gitBlob!==file.sha||row.gitBlobSha256!==hash(file.b)||row.head!==binding.baselineHead||row.tree!==binding.baselineTree)throw Error('GIT_BINDING:'+row.file);
    return file?'BASELINE_GIT_OBJECT_PROOF_VERIFIED':'BASELINE_GIT_PATH_NOT_PRESENT';
  };
}
