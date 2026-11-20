import fs from 'node:fs';import path from 'node:path';import {spawnSync,execFileSync} from 'node:child_process';import {seal,verifyIndex,sha} from './three-body-stage-x-contracts.mjs';
const root=process.argv[2];if(!root||fs.existsSync(root))throw Error('NEW_ROOT_REQUIRED');fs.mkdirSync(root,{recursive:true});
const rows=[],keys=['diagnostic','complete','source','evidence','cleanup'];
for(const fault of [null,...keys]){
 const name=fault??'normal',prerequisite=Object.fromEntries(keys.map(k=>[k,k!==fault])),input=root+'/'+name+'.json';
 const auditFile=root+'/'+name+'-audit.json';fs.writeFileSync(auditFile,JSON.stringify({status:'PASS',kind:'REQUIRED_CURRENT_AUDIT',legacyMissing:6}));
 fs.writeFileSync(input,JSON.stringify({prerequisite,auditFile,measurement:{command:process.execPath,args:['-e','process.stdout.write("mock measurement started")']}}));
 const p=spawnSync(process.execPath,['tools/three-body-stage-y-control.mjs',input,root+'/'+name],{encoding:'utf8',windowsHide:true});
 const r=JSON.parse(fs.readFileSync(root+'/'+name+'/result.json'));rows.push({fault,exit:p.status,record:r,accepted:fault?p.status!==0&&r.measurementLaunches===0&&r.staticAudit.status==='PASS':p.status===0&&r.measurementLaunches===1,index:verifyIndex(root+'/'+name)});
}
const source=root+'/transfer-source',dest=root+'/transfer-copy';fs.mkdirSync(source);fs.mkdirSync(dest);fs.writeFileSync(source+'/.hidden.json','{"mock":true}');fs.writeFileSync(source+'/visible.json','{"mock":true}');seal(source);
fs.copyFileSync(source+'/visible.json',dest+'/visible.json');fs.copyFileSync(source+'/artifact-index.json',dest+'/artifact-index.json');const red=verifyIndex(dest);fs.copyFileSync(source+'/.hidden.json',dest+'/.hidden.json');const green=verifyIndex(dest);
const result={head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),rows,transfer:{red,green,scope:'Small mock file transfer only, not remote Actions upload and not legacy recovery'},newBrowserLaunches:0,status:rows.every(r=>r.accepted&&!r.index.length)&&red.length&&!green.length?'PASS':'FAIL'};fs.writeFileSync(root+'/summary.json',JSON.stringify(result,null,2));seal(root);console.log(JSON.stringify(result));if(result.status!=='PASS')process.exitCode=1;
