import {packet,event} from './three-body-stage-ah-fixtures.mjs';
export function p2Cases(bundle){
  const rows=[];
  const add=(id,issue,change,expectedCore,expected)=>{const p=packet(bundle);change(p);rows.push({id,issue,packet:p,expectedCore,expected});};
  const failZero={executionOutcome:'FAIL'},failExt={runnerStatusState:'OBSERVED',contradictions:['RUNNER_FAIL_WITH_ZERO_EXIT']};
  add('runner-fail-zero','P2-AH01',p=>p.runnerStatus='FAIL',failZero,{...failExt,observationOutcome:'PASS',evidenceCompleteness:'COMPLETE'});
  add('runner-fail-nonzero','P2-AH01',p=>{p.runnerStatus='FAIL';p.exitCode=1;},{executionOutcome:'FAIL',observationOutcome:'PASS'},{runnerStatusState:'OBSERVED',contradictions:[],evidenceCompleteness:'COMPLETE'});
  add('runner-fail-monitor','P2-AH01',p=>{p.runnerStatus='FAIL';p.monitorFailure=true;},{...failZero,classification:'MONITOR_FAILURE',observationOutcome:'FAIL'},{...failExt,evidenceCompleteness:'COMPLETE'});
  add('runner-fail-save','P2-AH01',p=>{p.runnerStatus='FAIL';p.saveFailure=true;p.saved=false;},{...failZero,classification:'EVIDENCE_SAVE_FAILURE',observationOutcome:'FAIL'},{...failExt,evidenceCompleteness:'EVIDENCE_INCOMPLETE'});
  add('runner-fail-raw-missing','P2-AH01',p=>{p.runnerStatus='FAIL';p.rawMissing=true;},{...failZero,classification:'EVIDENCE_INCOMPLETE',observationOutcome:'NOT_OBTAINED'},{...failExt,evidenceCompleteness:'EVIDENCE_INCOMPLETE'});
  for(const kind of ['missing','null','invalid'])add('runner-status-'+kind,'P2-AH01',p=>{if(kind==='missing')delete p.runnerStatus;else p.runnerStatus=kind==='null'?null:'BROKEN';},{executionOutcome:'UNKNOWN',observationOutcome:kind==='invalid'?'FAIL':'NOT_OBTAINED'},{runnerStatusState:kind==='invalid'?'INVALID':'NOT_OBTAINED',evidenceCompleteness:kind==='invalid'?'INVALID':'EVIDENCE_INCOMPLETE'});
  add('runner-pass','P2-AH01',()=>{},{executionOutcome:'PASS',observationOutcome:'PASS',classification:'NORMAL_EXIT'},{runnerStatusState:'OBSERVED',contradictions:[],evidenceCompleteness:'COMPLETE'});
  add('runner-pass-monitor','P2-AH01',p=>p.monitorFailure=true,{executionOutcome:'PASS',observationOutcome:'FAIL'},{evidenceCompleteness:'COMPLETE'});
  add('runner-fail-invalid-clock','P2-AH01',p=>{p.runnerStatus='FAIL';p.events[1].pid=99;},{executionOutcome:'FAIL',classification:'INVALID_CLOCK_EVIDENCE',observationOutcome:'FAIL'},{...failExt,evidenceCompleteness:'INVALID'});
  const trace=(p,events)=>{p.timeoutReported=true;p.events=events.map(([name,at,extra])=>event(bundle,name,at,extra));};
  const a='body.begin',z='body.end',t='timeout.timer',r='timeout.resolve.elapsed';
  const addTrace=(id,events,classification,timeoutPosition,bodyCompletion,observationOutcome='PASS')=>add(id,'P2-AH02',p=>trace(p,events),{classification,...(observationOutcome==='FAIL'?{}:{executionOutcome:'FAIL'}),observationOutcome},{...(observationOutcome==='FAIL'?{executionOutcome:'UNKNOWN'}:{}),timeoutPosition,bodyCompletion,evidenceCompleteness:observationOutcome==='PASS'?'COMPLETE':observationOutcome==='FAIL'?'INVALID':'EVIDENCE_INCOMPLETE'});
  addTrace('timeout-before-begin',[[t,5],[a,10],[z,20]],'TIMEOUT_BEFORE_BODY','BEFORE_BODY_BEGIN','COMPLETED');
  addTrace('timeout-between',[[a,10],[t,15],[z,20]],'TIMEOUT_REPORTED_DURING_BODY','BETWEEN_BODY_BEGIN_AND_END','COMPLETED');
  addTrace('timeout-after-end',[[a,10],[z,20],[r,25]],'TIMEOUT_AFTER_BODY','AFTER_BODY_END','COMPLETED');
  addTrace('timeout-after-begin-end-missing',[[a,10],[t,15]],'TIMEOUT_REPORTED_AFTER_BODY_BEGIN','AFTER_BODY_BEGIN','UNKNOWN','NOT_OBTAINED');
  addTrace('timeout-decision-missing',[[a,10]],'UNKNOWN','NOT_OBTAINED','UNKNOWN','NOT_OBTAINED');
  addTrace('body-begin-missing',[[t,15]],'UNKNOWN','UNKNOWN','NOT_OBTAINED','NOT_OBTAINED');
  addTrace('end-without-begin',[[z,20],[r,25]],'INVALID_CLOCK_EVIDENCE','UNKNOWN','UNKNOWN','FAIL');
  addTrace('duplicate-begin',[[a,10],[a,11],[t,15],[z,20]],'INVALID_CLOCK_EVIDENCE','UNKNOWN','UNKNOWN','FAIL');
  addTrace('duplicate-end',[[a,10],[t,15],[z,20],[z,21]],'INVALID_CLOCK_EVIDENCE','UNKNOWN','UNKNOWN','FAIL');
  addTrace('duplicate-timeout',[[a,10],[t,12],[t,15],[z,20]],'INVALID_CLOCK_EVIDENCE','UNKNOWN','UNKNOWN','FAIL');
  addTrace('reversed',[[z,20],[t,15],[a,10]],'INVALID_CLOCK_EVIDENCE','UNKNOWN','UNKNOWN','FAIL');
  addTrace('foreign-trial',[[a,10],[t,15,{trialId:'ah-O1',mode:'OFF'}],[z,20]],'INVALID_CLOCK_EVIDENCE','UNKNOWN','UNKNOWN','FAIL');
  addTrace('foreign-pid',[[a,10],[t,15,{pid:99}],[z,20]],'INVALID_CLOCK_EVIDENCE','UNKNOWN','UNKNOWN','FAIL');
  addTrace('foreign-tid',[[a,10],[t,15,{threadId:1}],[z,20]],'INVALID_CLOCK_EVIDENCE','UNKNOWN','UNKNOWN','FAIL');
  addTrace('foreign-clock',[[a,10],[t,15,{clock:'Date.now'}],[z,20]],'INVALID_CLOCK_EVIDENCE','UNKNOWN','UNKNOWN','FAIL');
  addTrace('two-decisions-first-before',[[t,5],[a,10],[z,20],[r,25]],'TIMEOUT_BEFORE_BODY','BEFORE_BODY_BEGIN','COMPLETED');
  addTrace('two-decisions-first-during',[[a,10],[t,15],[z,20],[r,25]],'TIMEOUT_REPORTED_DURING_BODY','BETWEEN_BODY_BEGIN_AND_END','COMPLETED');
  return rows;
}
// Deep subset comparison keeps newly introduced fields separate from baseline behavior.
export function matches(actual,expected){return expected&&typeof expected==='object'?actual!=null&&(Array.isArray(expected)?Array.isArray(actual)&&actual.length===expected.length&&expected.every((v,i)=>matches(actual[i],v)):Object.entries(expected).every(([k,v])=>matches(actual[k],v))):Object.is(actual,expected);}
