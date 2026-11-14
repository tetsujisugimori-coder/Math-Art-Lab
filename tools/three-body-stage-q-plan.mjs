import fs from 'node:fs';
import path from 'node:path';
export function preserveExplicitPlan(root,suite,file){
 if(!/^[a-z0-9-]+$/.test(suite))throw Error('Invalid diagnostic suite name');
 const bytes=fs.readFileSync(file),plan=JSON.parse(bytes.toString('utf8').replace(/^\uFEFF/,''));
 if(!Array.isArray(plan)||!plan.length||plan.some(p=>!p.name||!Number.isFinite(p.duration)||p.duration<=0||p.duration>300000))throw Error('Invalid explicit diagnostic plan');
 fs.copyFileSync(file,path.join(root,'sources',`explicit-plan-${suite}.json`),fs.constants.COPYFILE_EXCL);
 return plan;
}
