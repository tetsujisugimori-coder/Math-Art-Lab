import {readFileSync,writeFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {execFileSync} from 'node:child_process';
import {join,relative,resolve} from 'node:path';
const root=resolve('docs/segregation/review-p2-01'),revision=process.argv[2];
const sha=b=>createHash('sha256').update(b).digest('hex'),lf=b=>Buffer.from(b.toString('utf8').replace(/\r\n/g,'\n'));
const git=(path,rev=revision)=>execFileSync('git',['show',`${rev}:${path}`],{maxBuffer:8*1024*1024});
const files=dir=>readdirSync(dir,{withFileTypes:true}).flatMap(e=>e.isDirectory()?files(join(dir,e.name)):[join(dir,e.name)]);
if(revision){
  const manifest=JSON.parse(git('docs/segregation/review-p2-01/manifest.json'));
  for(const a of manifest.artifacts)if(sha(git(`docs/segregation/review-p2-01/${a.path}`))!==a.sha256)throw new Error(`Evidence mismatch ${a.path}`);
  for(const s of manifest.source)if(sha(lf(git(s.path)))!==s.sha256Lf)throw new Error(`Source mismatch ${s.path}`);
  console.log(JSON.stringify({revision,artifacts:manifest.artifacts.length,source:manifest.source.length,verified:true},null,2));
}else{
  const source=['src/segregation.ts','src/segregation.css','src/segregation-view.ts','src/segregation-render.ts','e2e/segregation-layout-checks.ts'].map(path=>({path,sha256Lf:sha(lf(readFileSync(path)))}));
  const oldModel=lf(git('src/segregation.ts','caa3f0a')),model=lf(readFileSync('src/segregation.ts'));
  if(!oldModel.equals(model))throw new Error('Unrelated mathematical model change');
  const math=text=>text.match(/<math\b[\s\S]*?<\/math>/)[0];
  if(math(git('src/segregation-view.ts','caa3f0a').toString())!==math(readFileSync('src/segregation-view.ts','utf8')))throw new Error('Formula changed');
  const phases=['green-linux','green-windows-layout-serial-dev','green-windows-layout-serial-production'],coverage=[];
  for(const phase of phases){
    const matrices=files(join(root,phase)).filter(p=>/matrix-.*\.json$/.test(p));if(matrices.length!==16)throw new Error(`Expected 16 matrix reports for ${phase}, got ${matrices.length}`);
    let states=0;
    for(const path of matrices){const report=JSON.parse(readFileSync(path));if(report.states.length!==4)throw new Error(`Incomplete ${path}`);
      for(const state of report.states){const m=state.measurement;if(m.rootScrollWidth>m.innerWidth||m.bodyScrollWidth>m.innerWidth||m.escapes.length)throw new Error(`Document overflow ${path}`);
        const region=m.candidates.find(c=>c.selector==='.sm-math-scroll'),formula=m.candidates.find(c=>c.selector==='math');
        if(!region||!formula||formula.rect.top<region.rect.top||formula.rect.top+formula.rect.height>region.rect.top+region.rect.height)throw new Error(`Vertical formula clip ${path}`);
        if(!state.keyboard)throw new Error(`Incomplete keyboard check ${path}`);states++;
      }
      for(const s of report.source)if(source.find(c=>c.path===s.path)?.sha256Lf!==s.sha256Lf)throw new Error(`Matrix source mismatch ${path}`);
    }coverage.push({phase,matrices:matrices.length,states});
  }
  const artifacts=files(root).filter(p=>/\.(json|txt|png)$/.test(p)&&relative(root,p)!=='manifest.json').map(p=>({path:relative(root,p).replaceAll('\\','/'),sha256:sha(readFileSync(p)),bytes:readFileSync(p).length}));
  const manifest={at:new Date().toISOString(),baseline:'caa3f0a2734c2c2faaaa1b8cbfe5a46d2b22de03',modelUnchanged:true,formulaUnchanged:true,source,coverage,artifacts};
  writeFileSync(join(root,'manifest.json'),JSON.stringify(manifest,null,2));console.log(JSON.stringify({source:source.length,coverage,artifacts:artifacts.length},null,2));
}
