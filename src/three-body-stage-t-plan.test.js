import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {describe,it,expect} from 'vitest';
import {preserveExplicitPlan} from '../tools/three-body-stage-q-plan.mjs';
it('RED control: a shared plan destination collides on the second independent suite',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'stage-t-plan-test-'));
 try{fs.mkdirSync(path.join(root,'sources'));const file=path.join(root,'input.json');fs.writeFileSync(file,'[]');
  fs.copyFileSync(file,path.join(root,'sources/explicit-plan.json'),fs.constants.COPYFILE_EXCL);
  expect(()=>fs.copyFileSync(file,path.join(root,'sources/explicit-plan.json'),fs.constants.COPYFILE_EXCL)).toThrow(/EEXIST/);
 }finally{if(!fs.realpathSync(root).startsWith(fs.realpathSync(os.tmpdir())+path.sep))throw Error('Unsafe fixture');fs.rmSync(root,{recursive:true});}
});
it('GREEN: independent plans coexist, invalid plans and overwriting are rejected',()=>{
 const root=fs.mkdtempSync(path.join(os.tmpdir(),'stage-t-plan-test-'));
 try{fs.mkdirSync(path.join(root,'sources'));const file=path.join(root,'input.json');
  fs.writeFileSync(file,JSON.stringify([{name:'first',duration:1200}]));preserveExplicitPlan(root,'t-controls',file);
  fs.writeFileSync(file,JSON.stringify([{name:'second',duration:1800}]));preserveExplicitPlan(root,'t-capture',file);
  expect(JSON.parse(fs.readFileSync(path.join(root,'sources/explicit-plan-t-controls.json')))[0].name).toBe('first');
  expect(JSON.parse(fs.readFileSync(path.join(root,'sources/explicit-plan-t-capture.json')))[0].name).toBe('second');
  expect(()=>preserveExplicitPlan(root,'t-capture',file)).toThrow(/EEXIST/);
  fs.writeFileSync(file,'[{"name":"bad","duration":999999}]');expect(()=>preserveExplicitPlan(root,'invalid',file)).toThrow('Invalid explicit diagnostic plan');
 }finally{if(!fs.realpathSync(root).startsWith(fs.realpathSync(os.tmpdir())+path.sep))throw Error('Unsafe fixture');fs.rmSync(root,{recursive:true});}
});
