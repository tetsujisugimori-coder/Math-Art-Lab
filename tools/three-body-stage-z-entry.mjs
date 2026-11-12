import fs from 'node:fs';import path from 'node:path';import {fileURLToPath} from 'node:url';
export const repositoryRoot=fileURLToPath(new URL('../',import.meta.url));
export function generateEntry(file){
 const moduleUrl=new URL('./three-body-stage-z-observer.mjs',import.meta.url).href;
 const controlUrl=new URL('./three-body-stage-y-control.mjs',import.meta.url).href;
 fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,`export {minimal} from ${JSON.stringify(moduleUrl)};\nexport {orchestrate} from ${JSON.stringify(controlUrl)};\nexport const importOnly=true;\n`,{flag:'wx'});return{file,moduleUrl,controlUrl,locationPolicy:'Resolved against generator module URL, not cwd; relocated source tree requires regeneration'};
}
