export function initialResult(id){return{id,launched:false,exitCode:null,executionStatus:'NOT_STARTED',observationStatus:'NOT_OBTAINED',evidenceStatus:'NOT_OBTAINED',acceptance:'BLOCKED',errors:[]};}
export function recordProcess(r,p){r.launched=Number.isInteger(p.pid)&&p.pid>0||!p.error&&(Number.isInteger(p.status)||!!p.signal);r.exitCode=p.status??null;r.signal=p.signal??null;r.executionStatus=p.error&&!r.launched?'SPAWN_ERROR':p.status===0&&!p.error?'PASS':'FAIL';if(p.error)r.errors.push('PROCESS_ERROR: '+p.error);return finalize(r);}
export function observationErrors(o){
 const e=[],rows=o?.rows;if(o?.observer!==true||!Array.isArray(rows))return['OBSERVATION_SCHEMA'];const final=rows.findLast(r=>r.event==='final-journal-read'),after=rows.filter(r=>r.event==='state-after-200ms');
 if(final?.error||!Array.isArray(final?.value?.journal))e.push('FINAL_JOURNAL');if(after.length!==1)e.push('AFTER_200MS_COUNT');
 for(const r of after){const v=r.value,s=v?.state,j=v?.journal;if(r.error||!Number.isFinite(r.begin)||!Number.isFinite(r.end)||r.end<r.begin||!Number.isFinite(v?.now)||!Number.isFinite(v?.timeOrigin)||!s||s.playing!==false||s.timer!==null||!Number.isInteger(s.internalStep)||s.internalStep<0||String(s.internalStep)!==v.domStep||s.domStep!==v.domStep||v.playing!=='false'){e.push('AFTER_200MS_STATE');continue;}
  if(!Array.isArray(j)){e.push('AFTER_JOURNAL');continue;}const pause=j.findLastIndex(x=>x.event==='pause-exit');const p=j[pause];if(!p||p.playing!==false||p.timer!==null||p.internalStep!==s.internalStep||j.slice(pause+1).some(x=>x.event==='advance-after'))e.push('POST_PAUSE_ADVANCE');
  if(!j.slice(0,pause).some(x=>x.event==='pause-enter')||!j.slice(0,pause).some(x=>x.event==='click-capture'&&x.id==='sm-play'))e.push('PAUSE_TIMELINE');
  const reads=rows.filter(x=>x.event==='step-read'&&Number.isFinite(x.harnessMono)&&x.harnessMono<=r.begin);if(!reads.length||reads.at(-1).value!==v.domStep)e.push('PAUSED_DOM_DIFFERENCE');
 }
 if(rows.filter(r=>r.event==='play-click-issued').length!==2||rows.filter(r=>r.event==='play-click-returned').length!==2)e.push('CLICK_REQUESTS');return e;
}
export function assess(r,reportText,observation){
 try{const p=JSON.parse(reportText);r.stats=p.stats;const invalid=(p.stats?.expected??0)+(p.stats?.unexpected??0)!==1||p.stats?.flaky||p.stats?.skipped||p.stats?.unexpected!==(r.executionStatus==='FAIL'?1:0);if(invalid)r.errors.push('TEST_COUNT_OR_RESULT_CONTRACT');r.evidenceStatus=invalid?'FAIL':'PASS';}catch(e){r.evidenceStatus='FAIL';r.errors.push('REPORT_JSON: '+e);}
 const errors=observationErrors(observation);r.observationStatus=errors.length?'FAIL':'PASS';r.errors.push(...errors);return finalize(r);
}
export function evidenceFailure(r,error){r.evidenceStatus='FAIL';r.errors.push(String(error));return finalize(r);}
export function finalize(r){r.acceptance=r.executionStatus==='FAIL'||r.executionStatus==='SPAWN_ERROR'?'FAIL':r.executionStatus==='PASS'&&r.observationStatus==='PASS'&&r.evidenceStatus==='PASS'&&!r.errors.length?'PASS':'BLOCKED';return r;}
export function counts(runs){return{planned:runs.length,launched:runs.filter(r=>r.launched).length,executionFailed:runs.filter(r=>r.executionStatus==='FAIL').length,accepted:runs.filter(r=>r.acceptance==='PASS').length,blocked:runs.filter(r=>r.acceptance==='BLOCKED').length,unexecuted:runs.filter(r=>!r.launched).length};}
