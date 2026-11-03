import fs from 'node:fs';
import crypto from 'node:crypto';
const baseline=process.argv.includes('--baseline');
const source=new URL(baseline?'./baseline/src/voronoi.ts':'../../src/voronoi.ts',import.meta.url);
const {transform}=await import('esbuild');
const compiled=await transform(fs.readFileSync(source,'utf8'),{loader:'ts',format:'esm',target:'esnext'});
const {observe}=await import('data:text/javascript;base64,'+Buffer.from(compiled.code).toString('base64'));
const data=JSON.parse(fs.readFileSync(new URL('./oracle-cases.json',import.meta.url),'utf8'));
const failures=[],baselineMisclaims=[];let strictAvailable=true;
for(const c of data.cases){const actual=observe(c.sites,c.point);if(!Array.isArray(actual.mathematicalOwners)){strictAvailable=false;const falseCandidates=actual.nearest.filter(id=>!c.mathematicalOwners.includes(id));if(falseCandidates.length)baselineMisclaims.push({label:c.label,point:c.point,expected:c.mathematicalOwners,displayCandidates:actual.nearest,falseCandidates});continue;}if(JSON.stringify(actual.mathematicalOwners)!==JSON.stringify(c.mathematicalOwners))failures.push({label:c.label,point:c.point,sites:c.sites,expected:c.mathematicalOwners,actual});}
const examples=data.cases.filter(c=>c.label.includes('boundary offset')||c.label.includes('norm equality')||c.label.includes('subnormal')).map(c=>({label:c.label,point:c.point,expectedMathematical:c.mathematicalOwners,actual:observe(c.sites,c.point)}));
const result={date:new Date().toISOString(),method:data.method,cases:data.cases.length,strictAvailable,failures,baselineMisclaimCount:baselineMisclaims.length,baselineMisclaims:baselineMisclaims.slice(0,25),examples,sourceSHA256:crypto.createHash('sha256').update(fs.readFileSync(new URL(baseline?'./baseline/src/voronoi.ts':'../../src/voronoi.ts',import.meta.url))).digest('hex')};
const file=new URL(baseline?'./baseline-oracle-red.json':'./oracle-green.json',import.meta.url);fs.writeFileSync(file,JSON.stringify(result,null,2)+'\n');console.log(JSON.stringify({cases:data.cases.length,strictAvailable,failures:failures.length,baselineMisclaims:baselineMisclaims.length,report:file.pathname}));if(!baseline&&(!strictAvailable||failures.length))process.exitCode=1;
