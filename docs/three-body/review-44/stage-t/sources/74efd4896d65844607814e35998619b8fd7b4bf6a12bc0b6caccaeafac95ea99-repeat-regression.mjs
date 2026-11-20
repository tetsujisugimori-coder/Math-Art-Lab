import fs from 'node:fs';import {spawn} from 'node:child_process';import {executeNode} from '../../../tools/three-body-stage-q-pipeline.mjs';
const dir='.three-body-evidence/stage-t/regression';const rows=[];
async function run(name,args,separate=false){const start=new Date().toISOString();let result;
 if(separate){const out=fs.openSync(dir+'/'+name+'.log','w'),err=fs.openSync(dir+'/'+name+'.stderr.log','w');result=await new Promise(resolve=>{const p=spawn(process.execPath,args,{windowsHide:true,stdio:['ignore',out,err]});p.on('close',(code,signal)=>{fs.closeSync(out);fs.closeSync(err);resolve({code,signal});});});}
 else result=await executeNode(args,dir+'/'+name+'.log');rows.push({name,args,start,end:new Date().toISOString(),...result});fs.writeFileSync(dir+'/repeat-processes.json',JSON.stringify(rows,null,2));console.log(JSON.stringify(rows.at(-1)));}
await run('unit-targeted',['node_modules/vitest/vitest.mjs','run','src/knot.test.ts','src/three-body.test.ts','-t','is deterministic, finite and stays|figure eight is reproduced']);
await run('unit-repeat',['node_modules/vitest/vitest.mjs','run','src']);
process.env.TB_EVIDENCE=dir+'/screenshots-development-repeat';
await run('gui-development-repeat',['node_modules/@playwright/test/cli.js','test','three-body','--reporter=json','--output='+dir+'/gui-development-repeat-output'],true);
if(rows.some(r=>r.code!==0))process.exitCode=1;
