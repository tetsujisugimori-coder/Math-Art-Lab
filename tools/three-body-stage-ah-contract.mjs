import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
import {span as legacySpan} from './three-body-stage-ad-observer.mjs';
import {boundaries,requiredStops,stageSpec,eventNames,stageActors,stageEvents,expectedEnvironment,clockSpec} from './three-body-stage-ah-spec.mjs';
export const version='ah-plan-only-1';
export const baseline=Object.freeze({head:'47f12bda192d722b348fc371722130901d936c8c',tree:'e17ff930687a13e11e50e790c657eb918ebb8e68'});
export const target='figure eight is reproduced and its energy stays bounded for 20 periods';
export const schedule=Object.freeze([Object.freeze({id:'ah-O1',mode:'OFF'}),Object.freeze({id:'ah-O2',mode:'ON'})]);
export const digest=b=>createHash('sha256').update(b).digest('hex');
export const seal=value=>digest(JSON.stringify(value)??'undefined');
export const preserved=Object.freeze({rootCause:'UNKNOWN',timeComparison:'NOT_COMPARABLE',performanceImprovement:'NOT_TESTED',originalStop:'NOT_TESTED',historicalRuntime:'NOT_OBTAINED',oldW:'BLOCKED',oldX:'FAIL',oldSixOriginals:'NOT_OBTAINED',wholeHistory:'LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS',remoteBackup:'REMOTE_BACKUP_NOT_UPLOADED'});
export function validatePlan(plan,lock){
  const errors=[];const check=(ok,code,status='PLAN_INVALID')=>{if(!ok)errors.push({code,status});};
  check(plan?.schema===version&&plan.repository==='tetsujisugimori-coder/Math-Art-Lab'&&plan.pr===44&&plan.branch==='feat/017-three-body-dance','IDENTITY');
  check(plan?.state==='PLAN_ONLY'&&plan.executionAuthorized===false&&plan.executionStatus==='NOT_TESTED'&&equal(plan.preserved,preserved),'STATE_PROMOTION');
  check(plan?.target?.head===baseline.head&&plan.target.tree===baseline.tree&&plan.target.file==='src/three-body.test.ts'&&plan.target.name===target,'TARGET','SOURCE_DRIFT');
  check(plan?.sourceSetSha256===lock?.sourceSetSha256&&/^[a-f0-9]{64}$/.test(plan?.sourceSetSha256??''),'SOURCE_SET','SOURCE_DRIFT');
  check(plan?.originalTimeoutMs===5000&&equal(plan.thresholds,{energy:2e-6,rms:.001,referenceStep:.0002,verletSteps:126518}),'NUMERICAL_OR_TIMEOUT');
  check(equal(plan?.schedule,schedule)&&plan.slots===2&&plan.retry===0&&plan.replacement===0&&plan.reorder===false,'FINITE_ORDER');
  check(plan?.parentSafetyMs===30000&&plan.totalBudgetMs===90000&&plan.stopOnFirstFailure===true,'BUDGET_OR_STOP');
  check(equal(plan?.worker,{pool:'forks',minWorkers:1,maxWorkers:1,isolate:true,fileParallelism:false,environment:'node'}),'WORKER');
  check(plan?.observerImplementation==='NOT_IMPLEMENTED'&&plan.observerRuntimeReceipt==='NOT_OBTAINED','IMPLEMENTATION_PROMOTION');
  check(equal(plan?.environment,expectedEnvironment),'PROPOSED_ENVIRONMENT');
  check(seal(plan)===lock?.planSha256,'PLAN_SEAL');
  return {status:errors.length?'PLAN_INVALID':'PLAN_VALID',errors,executionStatus:'NOT_TESTED',allowed:false};
}
export function validateDocuments(bundle){
  if(!bundle||typeof bundle!=='object')return {status:'PLAN_INVALID',errors:[{code:'DOCUMENTS_NOT_OBTAINED',status:'EVIDENCE_INCOMPLETE'}],allowed:false,executionStatus:'NOT_TESTED'};
  const errors=[];
  for(const [key,field]of [['timing','timingSha256'],['stops','stopsSha256'],['approval','approvalSha256'],['environmentMap','environmentMapSha256']])if(seal(bundle[key])!==bundle.lock?.[field])errors.push({code:'DOCUMENT_DRIFT:'+key,status:key==='environmentMap'?'SOURCE_DRIFT':'PLAN_INVALID'});
  const timing=bundle.timing,stops=bundle.stops,map=bundle.environmentMap;
  const actualBoundaries=Array.isArray(timing?.intervals)?timing.intervals.map(r=>[r?.id,r?.begin,r?.end,r?.owner]):null;
  if(timing?.schema!=='ah-timing-1'||timing.state!=='PLAN_ONLY'||!equal(actualBoundaries,boundaries)||timing.intervals.some(r=>r.status!=='PROPOSED_NOT_IMPLEMENTED'||r.clock!=='performance.now'||r.unit!=='ms'||r.on!==(r.owner==='parent'?'OFF_AND_ON':'ON_ONLY'))||timing.sumToTotal!==false||timing.crossProcessSubtraction!==false||timing.residualAllocation!=='PROHIBITED'||!equal(timing.clock,clockSpec)||!equal(timing.eventBuffer,{maxEvents:1024,maxBytes:1048576,onOverflow:'OBSERVER_FAILURE_STOP'}))errors.push({code:'TIMING_SEMANTICS',status:'PLAN_INVALID'});
  if(stops?.schema!=='ah-stop-1'||stops.state!=='PLAN_ONLY'||stops.failurePolicy!=='STOP_ON_FIRST_FAILURE'||!equal(stops.conditions,requiredStops)||stops.retry!==0||stops.replacement!==0||stops.reorder!==false||stops.remainingSlots!=='BLOCKED'||stops.actualExecution!=='NOT_TESTED'||stops.actualTerminationImplementation!=='NOT_IMPLEMENTED'||stops.mockProgressOnly!==true)errors.push({code:'STOP_SEMANTICS',status:'PLAN_INVALID'});
  const actualStages=Array.isArray(map?.stages)?map.stages.map(r=>[r?.stage,Array.isArray(r?.sources)?r.sources.map(s=>[s.file,s.anchor]):null]):null;
  if(!equal(actualStages,stageSpec)||map?.stages?.some((r,i)=>r.id!==i+1||r.actor!==stageActors[i]||!equal(r.candidateEvents,stageEvents[i])||r.processThreadBoundary!==([2,5,10,11].includes(r.id)?'PARENT_AND_WORKER_SEPARATE_DOMAINS':'WORKER_PID_AND_THREAD_REQUIRED')||r.historicalRuntime!=='NOT_OBTAINED'||r.observationState!=='PROPOSED_NOT_IMPLEMENTED'||r.existingOriginalIntervalRaw!=='NOT_OBTAINED')||map?.historicalRuntime!=='NOT_OBTAINED'||map.nativeAndOSCompleteBinding!=='UNKNOWN'||!equal(map.currentInstalled,expectedEnvironment))errors.push({code:'ENVIRONMENT_MAP_SEMANTICS',status:'EVIDENCE_INCOMPLETE'});
  if(bundle.approval?.schema!=='ah-approval-1'||bundle.approval.state!=='PLAN_ONLY'||bundle.approval.executionAuthorized!==false||bundle.approval.approvalStatus!=='APPROVAL_MISSING'||!equal(bundle.approval.trustedReviewerIds,[]))errors.push({code:'APPROVAL_POLICY',status:'PLAN_INVALID'});
  const ab=bundle.policies?.ab,ac=bundle.policies?.ac;
  if(seal(ab)!==bundle.lock?.abPolicySha256||seal(ac)!==bundle.lock?.acPolicySha256||ab?.executionAuthorized!==false||!equal(ab?.trustedReviewerIds,[])||ac?.executionAuthorized!==false)errors.push({code:'POLICY_MUTATION',status:'PLAN_INVALID'});
  const p=validatePlan(bundle.plan,bundle.lock);return {status:errors.length||p.status!=='PLAN_VALID'?'PLAN_INVALID':'PLAN_VALID',errors:[...p.errors,...errors],allowed:false,executionStatus:'NOT_TESTED'};
}
// No execution callback, command builder, subprocess, network or observer installation exists here.
export function executionGate(bundle,request={}){
  const validation=validateDocuments(bundle),reasons=[...validation.errors,{code:'PLAN_ONLY_EXECUTION_PROHIBITED',status:'BLOCKED'},{code:'LIVE_INDEPENDENT_APPROVAL_NOT_OBTAINED',status:'APPROVAL_MISSING'}];
  if(request.action&&request.action!=='VALIDATE')reasons.push({code:'UNAUTHORIZED_EXECUTION_REQUEST',status:'BLOCKED'});
  return {status:'BLOCKED',planStatus:validation.status,approvalStatus:'APPROVAL_MISSING',allowed:false,executionStatus:'NOT_TESTED',reasons,preserved};
}
const validCpu=x=>x&&['user','system'].every(k=>typeof x[k]==='number'&&Number.isFinite(x[k])&&x[k]>=0);
export function validateEvents(rows){
  if(!Array.isArray(rows)||rows.some(r=>!r||typeof r!=='object'))return {status:'FAIL',reason:'MALFORMED'};
  const first=rows[0],domains=new Map();
  for(const r of rows){
    if(r.schema!=='ah-event-1'||r.synthetic!==true||!eventNames.includes(r.event)||!schedule.some(p=>p.id===r.trialId&&p.mode===r.mode)||!Number.isInteger(r.pid)||r.pid<=0||!Number.isInteger(r.threadId)||r.threadId<0||r.clock!=='performance.now'||r.unit!=='ms'||!Number.isFinite(r.at)||r.at<0||!Number.isSafeInteger(r.seq)||r.seq<0||!validCpu(r.cpu)||(r.threadCpu!==null&&!validCpu(r.threadCpu))||!['parent','worker'].includes(r.owner)||r.owner!==(r.event.startsWith('parent.')?'parent':'worker'))return {status:'FAIL',reason:'EVENT_SCHEMA_OR_OWNER'};
    if(['trialId','mode','planSha256','sourceSetSha256','head','tree'].some(k=>r[k]!==first[k])||r.head!==baseline.head||r.tree!==baseline.tree||!/^[a-f0-9]{64}$/.test(r.planSha256??'')||!/^[a-f0-9]{64}$/.test(r.sourceSetSha256??''))return {status:'FAIL',reason:'EVENT_IDENTITY'};
    const prev=domains.get(r.owner);
    if(prev&&(r.pid!==prev.pid||r.threadId!==prev.threadId||r.at<prev.at||r.seq<=prev.seq))return {status:'FAIL',reason:'EVENT_ORDER_OR_DOMAIN'};
    if(prev&&(['user','system'].some(k=>r.cpu[k]<prev.cpu[k])||(r.threadCpu===null)!==(prev.threadCpu===null)||r.threadCpu!==null&&['user','system'].some(k=>r.threadCpu[k]<prev.threadCpu[k])))return {status:'FAIL',reason:'CPU_COUNTER_ORDER'};
    domains.set(r.owner,r);
  }
  const count=e=>rows.filter(r=>r.event===e).length,index=e=>rows.findIndex(r=>r.event===e);
  if(count('timeout.timer')>1||count('timeout.resolve.elapsed')>1)return {status:'FAIL',reason:'DUPLICATE_TIMEOUT_DECISION'};
  if(count('body.begin')>1||count('body.end')>1||count('body.throw')>1||(count('body.end')||count('body.throw'))&&!count('body.begin')||count('body.end')&&count('body.throw')||count('body.end')&&index('body.end')<index('body.begin')||count('body.throw')&&index('body.throw')<index('body.begin'))return {status:'FAIL',reason:'BODY_EVENT_ORDER'};
  return {status:'VALID'};
}
export function interval(rows,begin,end){
  if(!Array.isArray(rows)||rows.some(r=>!r||typeof r!=='object'))return {status:'NOT_OBTAINED',reason:'MALFORMED',wallMs:null};
  if(begin===end)return {status:'FAIL',reason:'SAME_ENDPOINT',wallMs:null};
  const a=rows?.filter(r=>r.event===begin)??[],b=rows?.filter(r=>r.event===end)??[];
  if(a.length!==1||b.length!==1)return {status:a.length>1||b.length>1?'FAIL':'NOT_OBTAINED',reason:'MISSING_OR_DUPLICATE',wallMs:null};
  const x=a[0],y=b[0];
  if(rows.indexOf(x)>=rows.indexOf(y))return {status:'FAIL',reason:'RECORD_ORDER',wallMs:null};
  if([x,y].some(r=>r.unit!=='ms'||!['parent','worker'].includes(r.owner)||!/^[a-f0-9]{40}$/.test(r.head??'')||!/^[a-f0-9]{40}$/.test(r.tree??'')||!/^[a-f0-9]{64}$/.test(r.planSha256??'')||!/^[a-f0-9]{64}$/.test(r.sourceSetSha256??'')||!schedule.some(p=>p.id===r.trialId))||['owner','trialId','planSha256','sourceSetSha256','head','tree'].some(k=>typeof x[k]!=='string'||x[k]!==y[k]))return {status:'FAIL',reason:'IDENTITY_OR_UNIT',wallMs:null};
  const d=legacySpan(rows,begin,end);
  if(d.status!=='OBSERVED')return {...d,wallMs:null};
  const thread=x.threadCpu===null&&y.threadCpu===null?{status:'NOT_OBTAINED',value:null}:validCpu(x.threadCpu)&&validCpu(y.threadCpu)&&['user','system'].every(k=>y.threadCpu[k]>=x.threadCpu[k])?{status:'OBSERVED',value:{user:y.threadCpu.user-x.threadCpu.user,system:y.threadCpu.system-x.threadCpu.system}}:{status:'FAIL',value:null};
  return {status:d.cpuStatus!=='OBSERVED'||thread.status==='FAIL'?'FAIL':'OBSERVED',wallMs:d.wallMs,wallUnit:'ms',processCpuUs:d.processCpuUs,processCpuStatus:d.cpuStatus,threadCpuUs:thread.value,threadCpuStatus:thread.status,scope:'Same pid/tid only; not a decomposition or cross-process subtraction'};
}
export function classifyFixture(packet,bundle){
  // This accepts synthetic observations only; none can promote an actual plan to executed.
  if(packet?.synthetic!==true)return {classification:'NOT_OBTAINED',executionOutcome:'NOT_OBTAINED',observationOutcome:'FAIL',actualExecution:'NOT_TESTED'};
  const runnerStatusState=['PASS','FAIL'].includes(packet.runnerStatus)?'OBSERVED':packet.runnerStatus==null?'NOT_OBTAINED':'INVALID';
  const runnerFailed=packet.runnerStatus==='FAIL',contradictions=runnerFailed&&packet.exitCode===0?['RUNNER_FAIL_WITH_ZERO_EXIT']:[];
  const rawComplete=packet.saved===true&&packet.receiptBound===true&&packet.rawMissing!==true&&packet.saveFailure!==true;
  const common={classificationVersion:'ah-p2-classification-1',runnerStatusState,contradictions,timeoutPosition:'UNKNOWN',bodyCompletion:'UNKNOWN',timeoutDecisions:[],evidenceCompleteness:runnerStatusState==='INVALID'?'INVALID':rawComplete&&runnerStatusState==='OBSERVED'?'COMPLETE':'EVIDENCE_INCOMPLETE',actualExecution:'NOT_TESTED'};
  // A later observation/evidence error cannot erase an independently reported runner failure.
  const finish=result=>({...common,...result,executionOutcome:runnerFailed?'FAIL':result.executionOutcome});
  if(validateDocuments(bundle).status!=='PLAN_VALID')return finish({classification:'EVIDENCE_INCOMPLETE',executionOutcome:'UNKNOWN',observationOutcome:'FAIL',evidenceCompleteness:'EVIDENCE_INCOMPLETE'});
  if(!Array.isArray(packet.events)||packet.events.some(r=>!r||typeof r!=='object'))return finish({classification:'NOT_OBTAINED',executionOutcome:'UNKNOWN',observationOutcome:'FAIL',evidenceCompleteness:'INVALID'});
  const eventCheck=validateEvents(packet.events);
  if(eventCheck.status!=='VALID'||!['OFF','ON'].includes(packet.mode)||packet.events.some(r=>r.mode!==packet.mode||r.planSha256!==bundle.lock.planSha256||r.sourceSetSha256!==bundle.lock.sourceSetSha256)||packet.mode==='OFF'&&packet.events.some(r=>r.owner==='worker'))return finish({classification:'INVALID_CLOCK_EVIDENCE',executionOutcome:'UNKNOWN',observationOutcome:'FAIL',reason:eventCheck.reason??'MODE_OR_BINDING',evidenceCompleteness:'INVALID'});
  const rows=packet.events,has=e=>rows.some(r=>r.event===e),index=e=>rows.findIndex(r=>r.event===e),begin=has('body.begin'),end=has('body.end');
  const bodyPosition=packet.mode==='OFF'?'NOT_OBTAINED_TIMING_OFF':end?'AFTER_BODY':begin?'BODY_IN_PROGRESS_AT_LAST_EVENT':packet.preBodyFailureConfirmed&&has('pre-body.failure')?'BEFORE_BODY':'NOT_OBTAINED';
  const bodyCompletion=packet.mode==='OFF'?'NOT_OBTAINED_TIMING_OFF':end?'COMPLETED':has('body.throw')?'THREW':begin?'UNKNOWN':'NOT_OBTAINED';
  const position=i=>!begin?'UNKNOWN':i<index('body.begin')?'BEFORE_BODY_BEGIN':end&&i>index('body.end')?'AFTER_BODY_END':end?'BETWEEN_BODY_BEGIN_AND_END':'AFTER_BODY_BEGIN';
  const timeoutDecisions=rows.flatMap((r,i)=>['timeout.timer','timeout.resolve.elapsed'].includes(r.event)?[{event:r.event,seq:r.seq,position:position(i)}]:[]);
  const timeoutPosition=packet.timeoutReported?timeoutDecisions[0]?.position??'NOT_OBTAINED':'NOT_REPORTED';
  if(timeoutDecisions.length&&packet.timeoutReported!==true)return finish({classification:'INCONSISTENT_TIMEOUT_EVIDENCE',executionOutcome:'UNKNOWN',observationOutcome:'FAIL',evidenceCompleteness:'INVALID',bodyCompletion});
  let classification='UNKNOWN',executionOutcome=Number.isInteger(packet.exitCode)&&packet.exitCode!==0||packet.signal||packet.abnormalExit||packet.timeoutReported===true||has('body.throw')?'FAIL':packet.saved===true&&packet.receiptBound===true&&packet.rawMissing!==true&&packet.workerResponded===true&&packet.exitCode===0&&packet.runnerStatus==='PASS'?'PASS':'UNKNOWN',observationOutcome='PASS';
  const body=begin&&end?interval(rows,'body.begin','body.end'):{status:'NOT_OBTAINED'};
  const boundariesComplete=packet.mode==='OFF'?interval(rows,'parent.launch.request','parent.exit.received').status==='OBSERVED':body.status==='OBSERVED';
  const evidenceCompleteness=common.evidenceCompleteness==='COMPLETE'&&!boundariesComplete?'EVIDENCE_INCOMPLETE':common.evidenceCompleteness;
  if(packet.monitorFailure){classification='MONITOR_FAILURE';observationOutcome='FAIL';}
  else if(packet.saveFailure===true){classification='EVIDENCE_SAVE_FAILURE';observationOutcome='FAIL';}
  else if(packet.saved!==true||packet.receiptBound!==true||packet.rawMissing===true){classification='EVIDENCE_INCOMPLETE';observationOutcome='NOT_OBTAINED';}
  else if(begin&&end&&body.status!=='OBSERVED'){classification='INVALID_CLOCK_EVIDENCE';observationOutcome='FAIL';}
  else if(packet.workerResponded!==true){classification='WORKER_RESPONSE_MISSING';observationOutcome='NOT_OBTAINED';}
  else if(runnerStatusState!=='OBSERVED'){classification=runnerStatusState==='INVALID'?'INVALID_RUNNER_EVIDENCE':'EVIDENCE_INCOMPLETE';observationOutcome=runnerStatusState==='INVALID'?'FAIL':'NOT_OBTAINED';}
  else if(packet.signal||packet.abnormalExit){classification='PROCESS_ABNORMAL_EXIT';executionOutcome='FAIL';}
  else if(has('body.throw')){classification='STOP_DURING_BODY';executionOutcome='FAIL';}
  else if(packet.timeoutReported){
    classification=({'BEFORE_BODY_BEGIN':'TIMEOUT_BEFORE_BODY','BETWEEN_BODY_BEGIN_AND_END':'TIMEOUT_REPORTED_DURING_BODY','AFTER_BODY_END':'TIMEOUT_AFTER_BODY','AFTER_BODY_BEGIN':'TIMEOUT_REPORTED_AFTER_BODY_BEGIN'})[timeoutPosition]??(!begin&&packet.preBodyFailureConfirmed&&has('pre-body.failure')?'STOP_BEFORE_BODY':'UNKNOWN');
    executionOutcome='FAIL';if(body.status==='NOT_OBTAINED')observationOutcome='NOT_OBTAINED';
  }
  else if(!begin&&packet.preBodyFailureConfirmed&&has('pre-body.failure')){classification='STOP_BEFORE_BODY';executionOutcome='FAIL';}
  else if(runnerFailed){classification='RUNNER_FAILURE';executionOutcome='FAIL';}
  else if(packet.exitCode===0&&packet.runnerStatus==='PASS'&&begin&&end){classification='NORMAL_EXIT';executionOutcome='PASS';}
  else if(packet.mode==='OFF'&&packet.exitCode===0&&packet.runnerStatus==='PASS'&&interval(rows,'parent.launch.request','parent.exit.received').status==='OBSERVED'){classification='NORMAL_EXIT';executionOutcome='PASS';}
  else if(Number.isInteger(packet.exitCode)&&packet.exitCode!==0)executionOutcome='FAIL';
  if(classification==='UNKNOWN'&&body.status==='NOT_OBTAINED')observationOutcome='NOT_OBTAINED';
  const wallBeyondOriginalLimit=body.status==='OBSERVED'&&body.wallMs>=5000;
  const anomalies=wallBeyondOriginalLimit&&!packet.timeoutReported?['WALL_OVER_LIMIT_WITHOUT_TIMEOUT_REPORT']:[];
  return finish({classification,bodyPosition,bodyCompletion,timeoutPosition,timeoutDecisions,executionOutcome,observationOutcome,evidenceCompleteness,timeoutReported:packet.timeoutReported===true,timeoutMechanism:packet.timeoutReported&&timeoutDecisions[0]?.event==='timeout.timer'?'TIMER':packet.timeoutReported&&timeoutDecisions[0]?.event==='timeout.resolve.elapsed'?'RESOLUTION_ELAPSED_CHECK':'UNKNOWN',wallBeyondOriginalLimit,anomalies,bodyInterval:body});
}
export function assessProgress(bundle,simulation){
  const errors=[];const validation=validateDocuments(bundle);
  if(validation.status!=='PLAN_VALID')errors.push('INVALID_PLAN');
  if(simulation?.synthetic!==true||!Array.isArray(simulation.rows)||simulation.rows.length>schedule.length)errors.push('SIMULATION_OR_COUNT');
  const rows=Array.isArray(simulation?.rows)?simulation.rows:[];
  for(const [i,r]of rows.entries()){
    if(!r||typeof r!=='object'){errors.push('MALFORMED_ROW:'+i);continue;}
    if(!equal({id:r.id,mode:r.mode},schedule[i])||r.planSha256!==bundle?.lock?.planSha256||r.sourceSetSha256!==bundle?.lock?.sourceSetSha256||r.head!==baseline.head||r.tree!==baseline.tree)errors.push('ORDER_OR_SOURCE:'+i);
    if(r.exitCode!==0||r.signal!==null||r.timeoutReported!==false||r.runnerStatus!=='PASS'||r.observationStatus!=='PASS'||r.saveStatus!=='VERIFIED'||r.runtimeAttribution!=='VERIFIED'||r.checkpointVerified!==true||r.rawComplete!==true||!equal(r.anomalies,[]))errors.push('FAILURE_OR_INCOMPLETE:'+i);
    if(r.workerIntervalsStatus!==(r.mode==='ON'?'OBSERVED':'NOT_OBTAINED_TIMING_OFF')||r.parentIntervalStatus!=='OBSERVED'||!equal(r.environment,bundle.plan.environment)||!equal(r.worker,bundle.plan.worker)||r.selectedCount!==1||r.targetName!==target||r.originalTimeoutMs!==5000)errors.push('EVIDENCE_OR_ENVIRONMENT:'+i);
    if(!Number.isFinite(r.parentElapsedMs)||r.parentElapsedMs<0||r.parentElapsedMs>=30000)errors.push('PARENT_BOUND:'+i);
  }
  if(!Number.isFinite(simulation?.elapsedMs)||simulation.elapsedMs<0||simulation.elapsedMs>=90000)errors.push('TOTAL_BUDGET');
  const exhausted=rows.length===schedule.length;
  return {status:errors.length?'BLOCKED':exhausted?'SIMULATION_COMPLETE':'SIMULATION_ELIGIBLE_ONLY',evidenceStatus:errors.some(e=>/INCOMPLETE|EVIDENCE/.test(e))?'EVIDENCE_INCOMPLETE':'SYNTHETIC_ONLY',stop:errors.length>0||exhausted,nextId:errors.length||exhausted?null:schedule[rows.length].id,errors,allowed:false,actualExecution:'NOT_TESTED'};
}
