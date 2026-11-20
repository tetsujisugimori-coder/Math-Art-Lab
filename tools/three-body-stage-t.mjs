import fs from 'node:fs';
import path from 'node:path';
import { execFileSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { chromium,webkit } from '@playwright/test';
import { stageTPlans } from './three-body-stage-t-plans.mjs';
import { executeNode,finalize } from './three-body-stage-q-pipeline.mjs';
import { auditSuite,writeJson } from './three-body-stage-q-evidence.mjs';
const args=Object.fromEntries(process.argv.slice(2).map(x=>x.replace(/^--/,'').split('=')));
const root=args.output??'.three-body-evidence/stage-t/local',browser=args.browser??'chromium';
const manifestFile=path.join(root,'pipeline-manifest.json');
if(fs.existsSync(manifestFile))throw Error('Existing evidence: choose an unused output');
fs.mkdirSync(path.join(root,'sources'),{recursive:true});
for(const file of ['three-body-stage-t.mjs','three-body-stage-t-plans.mjs'])fs.copyFileSync('tools/'+file,path.join(root,'sources',file),fs.constants.COPYFILE_EXCL);
const fullPlans=stageTPlans(browser);
const plans=args.only==='moving'?{'t-moving':fullPlans['t-controls'].filter(p=>p.factor==='moving')}:fullPlans;
const manifest={runId:process.env.GITHUB_RUN_ID??'local-'+new Date().toISOString(),head:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),browser,status:'PLANNED',suites:Object.entries(plans).map(([name,plan])=>({name,planned:plan.length,status:'PLANNED'}))};
writeJson(manifestFile,manifest);
let launched;
try{
 launched=await({chromium,webkit}[browser]).launch({headless:true,...(browser==='chromium'?{args:['--use-angle=swiftshader','--enable-unsafe-swiftshader']}:{})});
 manifest.preflight={status:'PASS',version:launched.version()};await launched.close();
}catch(error){manifest.preflight={status:'FAIL',error:String(error)};manifest.blocker='Mandatory browser preparation failed';}
writeJson(manifestFile,manifest);
for(const suite of manifest.suites){
 if(manifest.blocker){suite.status='BLOCKED';continue;}
 suite.status='RUNNING';writeJson(manifestFile,manifest);
 const planFile=path.join(root,'plans',suite.name+'.json');writeJson(planFile,plans[suite.name]);
 suite.process=await executeNode(['--expose-gc','tools/three-body-stage-q.mjs',`--suite=${suite.name}`,`--browser=${browser}`,`--output=${root}`,`--plan-file=${planFile}`],path.join(root,'logs',suite.name+'.log'));
 const audit=auditSuite(root,suite.name,browser,suite.planned);Object.assign(suite,{status:audit.status,counts:audit.counts,issues:audit.issues});
 if(audit.status==='BLOCKED'||suite.process.launchError)manifest.blocker='Environment/evidence failure; independent continuation unsafe';
 writeJson(manifestFile,manifest);
}
if(!manifest.blocker){
 const report=await executeNode(['--expose-gc','tools/three-body-stage-q-report.mjs',root],path.join(root,'logs/analysis.log'));
 const check=await executeNode(['tools/three-body-stage-q-check.mjs',root],path.join(root,'logs/checks.log'));
 manifest.analysis={report,check,status:report.code===0&&check.code===0?'PASS':'FAIL'};
}
finalize(manifest,root);
console.log(JSON.stringify({head:manifest.head,browser,status:manifest.status,counts:manifest.counts,completeness:manifest.completeness}));
if(manifest.status!=='PASS')process.exitCode=1;
