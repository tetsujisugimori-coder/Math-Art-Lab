// Capacity, integrity and a conservative credential-pattern check before publishing.
// Does not print candidate secrets. A zero count is not a general DLP guarantee.
import fs from 'node:fs';
import path from 'node:path';
import {createBrotliDecompress,createGunzip} from 'node:zlib';
import {createHash} from 'node:crypto';
const root=process.argv[2]??'docs/three-body/review-44/stage-p';
const entries=JSON.parse(fs.readFileSync(root+'/archive-index.json','utf8')).entries;
const archived=new Map(entries.map(e=>[path.resolve(e.file),e]));
const files=[];
function visit(dir){for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())visit(p);else files.push(p);}}
visit(root);
let tokenCandidates=0,integrityFailures=0;const checked=[];
for(const p of files.filter(p=>/\.(json|jsonl|br|gz)$/.test(p)&&!p.endsWith('publication-audit.json'))){
 const bytes=fs.statSync(p).size,expected=archived.get(path.resolve(p));
 const encoded=createHash('sha256').update(fs.readFileSync(p)).digest('hex');
 let stream=fs.createReadStream(p),carry='',count=0;const decoded=createHash('sha256');
 if(p.endsWith('.br'))stream=stream.pipe(createBrotliDecompress());
 if(p.endsWith('.gz'))stream=stream.pipe(createGunzip());
 for await(const chunk of stream){
  decoded.update(chunk);const text=carry+chunk.toString('utf8');
  const pattern=/(?:gh[pousr]_[A-Za-z0-9]{20,}|github_pat_[A-Za-z0-9_]{20,}|sk-[A-Za-z0-9_-]{20,}|Bearer\s+[A-Za-z0-9._-]{20,})/g;
  for(const match of text.matchAll(pattern))if(match.index+match[0].length>carry.length)count++;
  carry=text.slice(-256);
 }
 const decodedSha256=decoded.digest('hex'),integrity=expected?encoded===expected.sha256&&decodedSha256===expected.decodedSha256:null;
 if(integrity===false)integrityFailures++;tokenCandidates+=count;
 checked.push({file:p.replaceAll('\\','/'),bytes,sha256:encoded,decodedSha256,archiveIntegrity:integrity,credentialPatternCandidates:count});
}
const sizes=files.map(p=>({file:p.replaceAll('\\','/'),bytes:fs.statSync(p).size})).sort((a,b)=>b.bytes-a.bytes);
const report={date:new Date().toISOString(),totalFiles:files.length,totalBytes:sizes.reduce((s,x)=>s+x.bytes,0),largestFiles:sizes.slice(0,10),over100MB:sizes.filter(x=>x.bytes>=100000000),checked,integrityFailures,tokenCandidates,scope:'Known credential patterns only; fresh isolated profiles and localhost application; local paths, hardware, process ids and public GitHub metadata are retained. Git retention is permanent history; CI artifacts expire after 14 days.'};
fs.writeFileSync(root+'/publication-audit.json',JSON.stringify(report,null,2)+'\n');
console.log(JSON.stringify({files:files.length,bytes:report.totalBytes,integrityFailures,tokenCandidates,over100MB:report.over100MB.length}));
if(integrityFailures||tokenCandidates||report.over100MB.length)process.exitCode=1;
