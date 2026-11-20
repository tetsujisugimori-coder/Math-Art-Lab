// Small anonymous review copies; full raw/trace files remain in private storage.
import fs from 'node:fs';import path from 'node:path';import {gunzipSync,brotliCompressSync} from 'node:zlib';
import {createHash} from 'node:crypto';
import {anonymous,personalPathCandidates} from './three-body-stage-t-redact.mjs';
const root=process.argv[2]??'.three-body-evidence/stage-t',dest=process.argv[3]??'docs/three-body/review-44/stage-t';
const hash=b=>createHash('sha256').update(b).digest('hex');
const walk=d=>fs.readdirSync(d,{withFileTypes:true}).flatMap(e=>e.isDirectory()?walk(path.join(d,e.name)):[path.join(d,e.name)]);
const write=(relative,value)=>{const file=path.join(dest,relative);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,JSON.stringify(anonymous(value),null,2)+'\n');};
const originals=[],groups=[],captures=[],requests=[],copies=[];
for(const group of ['local','local-v2','moving']){
 const dir=path.join(root,group);if(!fs.existsSync(dir))continue;
 const pipeline=JSON.parse(fs.readFileSync(path.join(dir,'pipeline-manifest.json')));
 const summary=JSON.parse(fs.readFileSync(path.join(dir,'report/summary.json'))).runs;
 const rows=[];
 for(const file of walk(dir).filter(f=>/[/\\]raw[/\\].*\.json\.gz$/.test(f))){
  const bytes=fs.readFileSync(file),decoded=gunzipSync(bytes),r=JSON.parse(decoded),s=summary.find(s=>s.id===r.id);
  originals.push({file:path.relative(root,file).replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes),decodedSha256:hash(decoded)});
  rows.push({id:r.id,start:r.start,finish:r.finish,options:r.options,status:r.status,errors:r.errors,issues:r.issues,browser:{name:r.browser.name,version:r.browser.version,featureStatus:r.browser.gpuInfo?.gpu?.featureStatus??'NOT_TESTED',featureStatusAfter:r.browser.gpuInfoAfter?.gpu?.featureStatus??'NOT_TESTED',devices:r.browser.gpuInfo?.gpu?.devices??'NOT_TESTED'},launchArgs:r.launchArgs,fixture:r.fixture,before:r.before.small,after:r.result?.state.small,layout:r.before.layout,input:s?.input,budget:s?.budget,phase:s?.phase,math:s?.math,draw:s?.draw,frames:s?.frames,stop:s?.stop});
  captures.push({group,id:r.id,options:r.options,capture:r.capture,readbackPolicy:r.readbackPolicy,preCaptureReadback:r.preCaptureReadback??'NOT_TESTED',resourceRelease:r.resourceRelease??'NOT_TESTED',initialContext:r.before.contextAttributes??'NOT_TESTED'});
  requests.push({group,id:r.id,sourceSha256:hash(bytes),requests:r.data?.requests??[]});
 }
 for(const file of walk(dir).filter(f=>/[/\\]traces[/\\].*\.json\.gz$/.test(f))){const bytes=fs.readFileSync(file);originals.push({file:path.relative(root,file).replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)});}
 const indexed=new Set(originals.map(r=>r.file));
 for(const file of walk(dir)){
  const relative=path.relative(root,file).replaceAll('\\','/');if(indexed.has(relative))continue;
  const bytes=fs.readFileSync(file);originals.push({file:relative,bytes:bytes.length,sha256:hash(bytes)});
 }
 groups.push({group,status:pipeline.status,counts:pipeline.counts,completeness:pipeline.completeness,issues:pipeline.issues,rows});
 const selected=fs.readdirSync(path.join(dir,'report')).filter(n=>n.endsWith('-stage-s-attribution.json')&&(/anchor-/.test(n)||(/t-capture-chromium-00[1-4]-/.test(n))));
 for(const name of selected)write('raw-results/'+group+'/'+name,JSON.parse(fs.readFileSync(path.join(dir,'report',name))));
 for(const file of walk(path.join(dir,'sources'))){const bytes=fs.readFileSync(file),base=hash(bytes)+'-'+path.basename(file),target=path.join(dest,'sources',base);fs.mkdirSync(path.dirname(target),{recursive:true});if(!fs.existsSync(target))fs.writeFileSync(target,bytes);copies.push({source:path.relative(root,file).replaceAll('\\','/'),export:'sources/'+base,sha256:hash(bytes),bytes:bytes.length});}
}
write('raw-results/local-results.json',{groups});write('raw-results/captures.json',{captures});write('raw-results/originals.json',{files:originals,scope:'All files in local, local-v2 and moving acquisition directories; volatile submission/config files are not published',remote:'REMOTE_BACKUP_NOT_UPLOADED'});
fs.writeFileSync(path.join(dest,'raw-results/request-times.json.br'),brotliCompressSync(Buffer.from(JSON.stringify(anonymous(requests)))));
for(const name of ['archive-summary.json','archive-verification.json','etw-availability.json','environment-summary.json']){const file=path.join(root,'submission',name);if(fs.existsSync(file))write('raw-results/'+name,JSON.parse(fs.readFileSync(file,'utf8').replace(/^\uFEFF/,'')));}
for(const name of ['numerical-bitwise.json','numerical-reference.json','processes.json','repeat-processes.json','baseline-set-control.json','local-statistics.json','sender-initial.json','sender-v2.json']){const file=path.join(root,'regression',name);if(fs.existsSync(file))write('raw-results/regression/'+name,JSON.parse(fs.readFileSync(file)));}
for(const relative of ['local/logs/t-capture.log','regression/sender-v2-red.log']){
 const file=path.join(root,relative);if(!fs.existsSync(file))continue;const bytes=fs.readFileSync(file);
 write('raw-results/failures/'+path.basename(file)+'.json',{sourceSha256:hash(bytes),error:bytes.toString('utf8'),scope:'Anonymous copy; exact original retained privately'});
}
for(const name of ['verify-sender.mjs','verify-archive.mjs','regression.mjs','repeat-regression.mjs','baseline-control.mjs','local-statistics.mjs']){
 const file=path.join(root,'submission',name);if(!fs.existsSync(file))continue;
 const bytes=fs.readFileSync(file),relative='sources/'+hash(bytes)+'-'+name;
 fs.writeFileSync(path.join(dest,relative),bytes);copies.push({source:'submission/'+name,export:relative,sha256:hash(bytes),bytes:bytes.length});
}
for(const name of ['unit','unit-repeat','unit-targeted','unit-baseline-set','typecheck','build-development','build-production']){
 const file=path.join(root,'regression',name+'.log');if(!fs.existsSync(file))continue;const bytes=fs.readFileSync(file);
 write('raw-results/regression/'+name+'-log.json',{sourceSha256:hash(bytes),log:bytes.toString('utf8'),scope:'Anonymous review copy; original retained'});
}
for(const mode of ['development','production','development-repeat']){
 const file=path.join(root,'regression','gui-'+mode+'.log');if(fs.existsSync(file)){const text=fs.readFileSync(file,'utf8');const begin=text.indexOf('{');const data=JSON.parse(text.slice(begin));write('raw-results/regression/gui-'+mode+'.json',{stats:data.stats,errors:data.errors,projects:data.config.projects.map(p=>({name:p.name,testMatch:p.testMatch})),suites:data.suites});}
}
const image=walk(path.join(root,'local-v2/screenshots')).find(p=>/readback.*\.png$/.test(p));
if(image){fs.mkdirSync(path.join(dest,'screenshots'),{recursive:true});fs.copyFileSync(image,path.join(dest,'screenshots/current-context.png'));copies.push({source:path.relative(root,image).replaceAll('\\','/'),export:'screenshots/current-context.png',sha256:hash(fs.readFileSync(image)),bytes:fs.statSync(image).size});}
const files=walk(dest).filter(p=>/[/\\](raw-results|sources|screenshots)[/\\]/.test(p)&&!p.endsWith('export-index.json'));
let secrets=0,personalPaths=0;const inventory=files.map(file=>{const bytes=fs.readFileSync(file),text=file.endsWith('.br')?'':bytes.toString('utf8');secrets+=[...text.matchAll(/gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|Bearer\s+[A-Za-z0-9._-]{20,}/g)].length;personalPaths+=personalPathCandidates(text);return{file:path.relative(dest,file).replaceAll('\\','/'),bytes:bytes.length,sha256:hash(bytes)};});
if(secrets||personalPaths||inventory.reduce((s,r)=>s+r.bytes,0)>10000000)throw Error('Public evidence privacy/size review required');
write('raw-results/export-index.json',{inventory,copies,credentialCandidates:secrets,personalPathCandidates:personalPaths,scope:'Known-pattern scan, not a general DLP guarantee. Anonymous transformed review copies are distinct from immutable private originals.'});
console.log(JSON.stringify({groups:groups.map(g=>({group:g.group,counts:g.counts})),files:inventory.length,bytes:inventory.reduce((s,r)=>s+r.bytes,0),secrets,personalPaths}));
