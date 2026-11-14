import fs from 'node:fs';import path from 'node:path';import {fileIdentity,filesBelow} from '../../../tools/three-body-stage-t-archive.mjs';
if(process.platform!=='win32')throw Error('BACKUP_BLOCKED_NOT_WINDOWS');
const config=JSON.parse(fs.readFileSync('.three-body-evidence/stage-t/submission/archive-config.json'));
const archive=path.resolve(config.approvedRoot,config.archiveRelative),manifests=filesBelow(path.join(archive,'manifests')).filter(p=>p.endsWith('-manifest.json')).sort();
const file=manifests.at(-1),manifest=JSON.parse(fs.readFileSync(file));
const expected=new Set(manifest.rows.map(r=>r.archiveRelative.toLowerCase()));
const destinations=['stage-p','stage-q','stage-r','stage-s'].flatMap(s=>filesBelow(path.join(archive,s)).map(p=>path.relative(archive,p).replaceAll('\\','/').toLowerCase()));
const sources=manifest.scopes.flatMap(s=>filesBelow(path.join(config.repositoryRoot,s.relative)).map(p=>s.stage+'/'+path.relative(config.repositoryRoot,p).replaceAll('\\','/')));
const mismatches=[];
if(destinations.length!==expected.size||destinations.some(p=>!expected.has(p)))mismatches.push({code:'DESTINATION_SET'});
if(sources.length!==expected.size||sources.some(p=>!expected.has(p.toLowerCase())))mismatches.push({code:'SOURCE_SET'});
for(const row of manifest.rows){
 const source=await fileIdentity(path.join(config.repositoryRoot,row.sourceRelative)),destination=await fileIdentity(path.join(archive,row.archiveRelative));
 if([source,destination].some(v=>v.size!==row.size||v.sha256!==row.sha256))mismatches.push({code:'IDENTITY',stage:row.stage,sourceRelative:row.sourceRelative});
}
const result={timeUTC:new Date().toISOString(),verifier:'separate Node process, freshly enumerated sets and streamed source/destination SHA-256',status:mismatches.length?'BACKUP_NOT_VERIFIED':'LOCAL_BACKUP_VERIFIED',files:manifest.rows.length,bytes:manifest.sourceBytes,manifestSha256:(await fileIdentity(file)).sha256,collectionSha256:manifest.collectionSha256,mismatches,remote:'REMOTE_BACKUP_NOT_UPLOADED'};
fs.writeFileSync('.three-body-evidence/stage-t/submission/archive-verification.json',JSON.stringify(result,null,2));
console.log(JSON.stringify(result));if(mismatches.length)process.exitCode=1;

