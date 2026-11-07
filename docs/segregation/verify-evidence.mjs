import {execFileSync} from 'node:child_process';
import {createHash} from 'node:crypto';
const revision=process.argv[2]??'';
const read=path=>execFileSync('git',['show',`${revision}:${path}`],{maxBuffer:5*1024*1024});
const sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const manifest=JSON.parse(read('docs/segregation/evidence/manifest.json').toString('utf8'));
for(const a of manifest.artifacts){if(sha(read(`docs/segregation/${a.path}`))!==a.sha256)throw new Error(`Artifact mismatch: ${a.path}`);}
for(const s of manifest.sources){if(sha(Buffer.from(read(s.path).toString('utf8').replace(/\r\n/g,'\n')))!==s.sha256Lf)throw new Error(`Source mismatch: ${s.path}`);}
console.log(JSON.stringify({revision:revision||'index',artifactsVerified:manifest.artifacts.length,sourcesVerified:manifest.sources.length,productSourceHash:manifest.productSourceHash},null,2));
