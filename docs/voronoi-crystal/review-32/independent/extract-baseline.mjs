import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
const head='cab21143b9263904da2a9fc95571b79a58b22cd0',root=path.resolve('node_modules/.review32-independent/baseline');
const files=execFileSync('git',['ls-tree','-r','--name-only',head,'src'],{encoding:'utf8',windowsHide:true}).trim().split('\n').filter(f=>!f.endsWith('.test.ts'));
files.push('index.html','package.json','tsconfig.json','vite.config.ts');
for(const file of files){const target=path.join(root,file);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,execFileSync('git',['show',`${head}:${file}`],{windowsHide:true}));}
console.log(JSON.stringify({head,files:files.length,root}));
