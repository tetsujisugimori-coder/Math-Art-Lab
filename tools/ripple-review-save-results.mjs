// Flatten long Playwright artifact paths on Windows, retaining a hash manifest.
import {readdirSync,readFileSync,writeFileSync,mkdirSync} from 'node:fs';
import {join,relative,basename} from 'node:path';
import {createHash} from 'node:crypto';
const [source,destination]=process.argv.slice(2);if(!source||!destination)throw Error('source destination required');mkdirSync(destination,{recursive:true});const files=[];
function visit(dir){for(const e of readdirSync(dir,{withFileTypes:true})){if(e.name.startsWith('.'))continue;const file=join(dir,e.name);if(e.isDirectory())visit(file);else if(/\.(json|png|md)$/.test(e.name)){const original=relative(source,file),data=readFileSync(file),name=createHash('sha256').update(original).digest('hex').slice(0,12)+'-'+basename(file);writeFileSync(join(destination,name),data);files.push({original,file:name,bytes:data.length,sha256:createHash('sha256').update(data).digest('hex')});}}}
visit(source);writeFileSync(join(destination,'manifest.json'),JSON.stringify(files,null,2)+'\n');console.log(`${files.length} artifacts preserved with short paths`);
