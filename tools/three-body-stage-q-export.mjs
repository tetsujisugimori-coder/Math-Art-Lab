// Export bounded, hash-addressed evidence; never remove or rewrite originals.
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
const root=process.argv[2]??'.three-body-evidence/stage-q';
const dest=process.argv[3]??'docs/three-body/review-44/stage-q';
const hash=b=>createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const copies=[];
function copy(source,target){const bytes=fs.readFileSync(source);fs.mkdirSync(path.dirname(target),{recursive:true});fs.writeFileSync(target,bytes);copies.push({source:source.replaceAll('\\','/'),file:target.replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)});}
for(const file of fs.readdirSync(root+'/report'))copy(root+'/report/'+file,dest+'/raw-results/'+file);
for(const file of ['numerical-bitwise.json','numerical-reference.json','gui-development.json','gui-production.json','unit-permitted.log','unit-sandbox-startup.json'])if(fs.existsSync(root+'/regression/'+file))copy(root+'/regression/'+file,dest+'/raw-results/'+file);
copy(root+'/readback/send-gap-reanalysis.json',dest+'/raw-results/send-gap-reanalysis.json');
copy(root+'/storage-index.json',dest+'/raw-results/local-storage-index.json');
for(const file of walk(root).filter(p=>/[/\\]sources[/\\]/.test(p)))if(!copies.some(c=>path.basename(c.file)===path.basename(file)))copy(file,dest+'/sources/'+path.basename(file));
for(const file of walk(root).filter(p=>p.endsWith('-manifest.json')))copy(file,dest+'/manifests/'+path.relative(root,file));
for(const file of ['baseline/screenshots/long-chromium-004-app-300.png','final-smoke/screenshots/ci-chromium-002-mini-app.png'])copy(root+'/'+file,dest+'/screenshots/'+path.basename(file));
const bytes=copies.reduce((s,c)=>s+c.bytes,0);
if(bytes>10_000_000)throw Error('New evidence export exceeds declared 10MB review budget');
const analysisTools=Object.fromEntries(walk('tools').filter(p=>p.includes('three-body-stage-q')).map(p=>[p.replaceAll('\\','/'),hash(fs.readFileSync(p,'utf8').replaceAll('\r\n','\n'))]));
fs.writeFileSync(dest+'/raw-results/export-index.json',JSON.stringify({date:new Date().toISOString(),bytes,copies,analysisTools,remoteCopy:'Exact local full raw NOT_UPLOADED. CI raw is a separate reproduction; use final submission comment for artifact URLs and expiry.'},null,2)+'\n');
console.log(JSON.stringify({files:copies.length,bytes}));
