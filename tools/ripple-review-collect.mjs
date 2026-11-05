import {readdirSync,readFileSync,writeFileSync} from 'node:fs';
import {join} from 'node:path';
const [source,destination]=process.argv.slice(2);if(!source||!destination)throw Error('source destination required');
const results=[];function visit(dir){for(const entry of readdirSync(dir,{withFileTypes:true})){const path=join(dir,entry.name);if(entry.isDirectory())visit(path);else if(entry.name==='review-observations.json')results.push(JSON.parse(readFileSync(path,'utf8')));}}
visit(source);writeFileSync(destination,JSON.stringify(results,null,2)+'\n');console.log(`${results.length} browser observations collected`);
