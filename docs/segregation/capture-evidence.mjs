import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {resolve,relative,join} from 'node:path';
const directory=resolve('docs/segregation'),sha=bytes=>createHash('sha256').update(bytes).digest('hex');
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);
const transcodes=[];
for(const path of files(directory).filter(p=>p.endsWith('.txt'))){
  const before=readFileSync(path);if(before[0]!==255||before[1]!==254)continue;
  // Encoding only. Keep every character, newline, and terminal escape unchanged.
  const after=Buffer.from(before.subarray(2).toString('utf16le'),'utf8');writeFileSync(path,after);
  transcodes.push({path:relative(directory,path).replaceAll('\\','/'),from:'UTF-16LE with BOM',to:'UTF-8',sha256Before:sha(before),sha256After:sha(after)});
}
const sourcePaths=['src/main.ts','src/segregation.ts','src/segregation-render.ts','src/segregation-view.ts','src/segregation.css'];
const sources=sourcePaths.map(path=>{const bytes=readFileSync(path);return {path,sha256:sha(bytes),sha256Lf:sha(Buffer.from(bytes.toString('utf8').replace(/\r\n/g,'\n')))};});
const productSourceHash=sha(Buffer.from(JSON.stringify(sources.map(({path,sha256Lf})=>({path,sha256Lf})))));
const artifacts=files(directory).filter(p=>/\.(png|txt)$/.test(p)).map(p=>({path:relative(directory,p).replaceAll('\\','/'),bytes:readFileSync(p).length,sha256:sha(readFileSync(p))}));
const bundles=files(resolve('dist/assets')).map(p=>({path:relative(resolve('dist'),p).replaceAll('\\','/'),sha256:sha(readFileSync(p))}));
writeFileSync(join(directory,'evidence/manifest.json'),JSON.stringify({at:new Date().toISOString(),productSourceHash,sources,bundles,finalScreenshots:['screenshots/development/','screenshots/production/'],historicalScreenshots:'Other PNG paths are first-pass or RED evidence; do not assign the final source hash to those.',transcodes,artifacts},null,2));
console.log({productSourceHash,artifacts:artifacts.length,transcoded:transcodes.length});
