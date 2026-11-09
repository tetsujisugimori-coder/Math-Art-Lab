import fs from 'node:fs';
const root=process.argv[2]??'test-results/stage-p';
const d=JSON.parse(fs.readFileSync(root+'/raw-results/analysis.json','utf8'));
const fail=[];
for(const r of d.runs){
  if(r.errors.length)fail.push([r.id,r.errors]);
  if(!r.sameEngineReference?.phasesEqual||r.sameEngineReference?.historiesEqual===false||r.numeric?.displayedEqual===false)fail.push([r.id,'numerical/display mismatch']);
  if(r.drawStateVerification?.a===false||r.drawStateVerification?.b===false||r.committedFrameSteps?.mismatches)fail.push([r.id,'actual draw snapshot/frame mismatch']);
  if(r.stop?.postStopSteps!==0||!r.stop?.atomic||r.stop?.timerAfter!==false)fail.push([r.id,'stop/synchronization failure']);
  if(r.options.trace&&(r.trace?.clock.mainPid==null||!r.trace?.clock.completeMarkerSet||r.trace?.dataLoss===true))fail.push([r.id,'missing/incomplete trace clock']);
  if(r.synthetic&&(!r.syntheticVerified||!r.stop.targetHit||r.stop.T0T1<50))fail.push([r.id,'positive-control overlap not detected']);
}
if(!d.runs.some(r=>r.synthetic))fail.push(['suite','missing positive control']);
console.log(JSON.stringify({runs:d.runs.length,failures:fail},null,2));if(fail.length)process.exitCode=1;
