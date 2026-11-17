// Pure synthetic design model. No launcher, clocks, I/O, native calls, trust store or real approval.
import {createHash} from 'node:crypto';
import {isDeepStrictEqual as equal} from 'node:util';
export const VERSION='am-safety-1';
export const sha256=text=>createHash('sha256').update(text,'utf8').digest('hex');
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const text=v=>typeof v==='string'&&v.trim().length>0&&v.length<=512;
const sha=v=>typeof v==='string'&&/^[a-f0-9]{64}$/.test(v);
export const identityKeys=['vmId','imageSha256','generation','epoch','hypervisorId','stationId','session','trial','monitorBirth','jobToken','processBirth','processHandle','threadHandle'];
export const bindingKeys=['head','tree','sourceSha256','planSha256','environmentSha256','scopeSha256','vmId','generation','epoch'];
export const limits=Object.freeze({originalMs:5000,parentMs:30000,totalMs:90000,measurementSlots:2,order:['OFF','ON'],qualificationSlots:8,perSlotMs:10000,retry:0,replacement:0,reorder:false});
export const states=['PLAN_ONLY','SPEC_READY','REVIEW_PENDING','REVIEW_FAILED','IMPLEMENTATION_ELIGIBLE','APPROVAL_MISSING','IMPLEMENT_ONLY','QUALIFICATION_BLOCKED','QUALIFICATION_READY','QUALIFICATION_RUN','BLOCKED','HOLD'];
export const requirements={
 recovery:['separateFailureDomains','outsideGuest','beforeGuest','externalDurableLedger','independentReadback','vmEpochBinding','nonceLedger','credentialLifecycle','rollbackRejectsOld','ownClock','independentStopConfirmation','boundedStorage'],
 orphan:['creationTimeJobList','suspended','limitsBeforeCreate','noninheritedJobHandle','handleOwnershipLedger','birthAndHandleBinding','membershipBeforeResume','resumeReceipt','nestedCompatible','noBreakaway','noAssignFallback','atomicityRequiredBeforeCreate','creatorLossExternalRecovery','exitReleaseSeparate'],
 approval:['ownerExplicit','separateImplementationQualification','exactBinding','externalAuthenticity','readback','expiry','revocation','noBooleanAuthority','noSyntheticExternalProof']
};
export const gate=(_input)=>({allowed:false,state:'PLAN_ONLY',status:'BLOCKED',approval:'APPROVAL_MISSING',decision:'HOLD',physical:'NOT_TESTED',qualificationStart:'NO',executionAuthorized:false});
export function validateSpec(s){
 const errors=[];const check=(v,k)=>{if(!v)errors.push(k);};
 check(record(s)&&s.schema===VERSION,'SCHEMA');
 check(s?.state==='PLAN_ONLY'&&s?.executionAuthorized===false&&s?.physical==='NOT_TESTED','PROMOTION');
 check(s?.recoveryGuarantee==='NONE'&&s?.orphanPhysical==='UNKNOWN'&&s?.qualificationStart==='NO','UNPROVEN_SAFETY');
 check(equal(s?.limits,limits),'LIMITS');
 for(const [group,names]of Object.entries(requirements))check(record(s?.[group])&&names.every(k=>s[group][k]===true)&&Object.keys(s[group]).length===names.length,'REQUIREMENTS_'+group);
 check(equal(s?.topology,{M:'NATIVE_GUEST_OUTSIDE_JOB',P:'GUEST_INSIDE_JOB',W:'GUEST_INSIDE_JOB',R:'MANAGEMENT_STATION_OUTSIDE_GUEST',jobHandleOwner:'M',jobHandleInherited:false}),'TOPOLOGY');
 check(s?.actualEnvironment==='NOT_OBTAINED'&&s?.implementation==='NOT_IMPLEMENTED'&&s?.realApproval==='NOT_OBTAINED'&&s?.budgetFeasibility==='NOT_TESTED','UNOBTAINED_PROMOTION');
 check(equal(s?.states,states),'STATE_SET');
 return {status:errors.length?'SPEC_INVALID':'SPEC_READY',errors,assurance:'STATIC_ONLY',gate:gate()};
}
export const failureTypes=['M_HANG','M_CRASH','M_KILLED','R_HANG','R_UNREACHABLE','HEARTBEAT_LOST','IPC_DISCONNECT','CREDENTIAL_REVOKED','CREDENTIAL_EXPIRED','VM_ROLLBACK','PERSIST_FAILED','READBACK_FAILED','RECORD_CORRUPT','SHA_MISMATCH','JOB_CREATE_FAILED','JOB_ASSIGN_FAILED','CREATOR_LOST','HANDLE_LEAK','NESTED_JOB_INCOMPATIBLE','BREAKAWAY','RESUME_FAILED','PID_REUSED','CLEANUP_FAILED','MONITOR_FAILURE','SAVE_FAILED','BUFFER_OVERFLOW'];
const validIdentity=v=>record(v)&&identityKeys.every(k=>text(v[k]))&&sha(v.imageSha256);
const targetEqual=(a,b,keys)=>record(a)&&record(b)&&keys.every(k=>a[k]===b[k]);
const boundedInteger=v=>Number.isSafeInteger(v)&&v>=0;
function proof(p,kind,target){
 if(!record(p)||p.kind!=='SYNTHETIC_RECEIPT'||p.purpose!==kind||!text(p.recordId)||!text(p.producer)||!text(p.reader)||p.producer===p.reader||p.external!==true||p.durable!==true||p.independentReadback!==true||p.nonceLedgerReady!==true||typeof p.raw!=='string'||p.raw.length>16384||p.raw!==p.readbackRaw||!sha(p.sha256)||p.sha256!==sha256(p.raw)||p.readbackSha256!==p.sha256)return false;
 let decoded;try{decoded=JSON.parse(p.raw);}catch{return false;}
 return record(decoded)&&decoded.purpose===kind&&decoded.recordId===p.recordId&&targetEqual(decoded.identity,target,identityKeys);
}
export function reduceTrace(enrolled,events){
 const s={execution:'UNKNOWN',observation:'PASS',evidence:'NOT_OBTAINED',physical:'NOT_TESTED',guarantee:'NONE',orphanPhysical:'UNKNOWN',remaining:'NOT_STARTED',enrollment:'NOT_OBTAINED',stop:'NOT_REQUESTED',accepted:'NOT_OBTAINED',vmStopped:'NOT_OBTAINED',exit:'NOT_OBTAINED',release:'NOT_OBTAINED',persisted:'NOT_OBTAINED',errors:[],raw:[],lateEvidence:[],contradictions:[],gate:gate(),assurance:'SYNTHETIC_ONLY',evidenceAcceptedAsExternal:false};
 const reject=k=>{s.errors.push(k);s.observation='FAIL';s.evidence='INCOMPLETE';s.remaining='BLOCKED';};
 if(!validIdentity(enrolled)){reject('IDENTITY_INCOMPLETE');return s;}
 if(!Array.isArray(events)||events.length>64){reject('EVENTS_OR_CAPACITY');return s;}
 let bytes=0,last=-1,lastAt=-1;const ids=new Set(),nonces=new Set();
 for(const event of events){
  // Preserve a valid prior runner FAIL even when all later input is malformed.
  if(!record(event)){reject('EVENT_STRUCTURE');continue;}
  let encoded;try{encoded=JSON.stringify(event);}catch{reject('NON_JSON_INPUT');continue;}
  bytes+=Buffer.byteLength(encoded,'utf8');if(bytes>65536){reject('BUFFER_OVERFLOW');break;}
  s.raw.push(encoded);
  const e=event;
  if(e.synthetic!==true||!text(e.id)||ids.has(e.id)||!text(e.type)||!boundedInteger(e.seq)||e.seq<=last||!boundedInteger(e.at)||e.at<lastAt||e.clockDomain!=='SYNTHETIC_R_LOCAL'||!text(e.nonce)||nonces.has(e.nonce)){reject('STRUCTURE_SEQUENCE_DOMAIN_REPLAY');continue;}
  ids.add(e.id);nonces.add(e.nonce);last=e.seq;lastAt=e.at;
  if(!targetEqual(e.identity,enrolled,identityKeys)){reject('IDENTITY_MISMATCH');continue;}
  if(e.authenticated!==true||e.vmScopedAcl!==true){reject('AUTH_OR_ACL');continue;}
  // Late valid failure reasons remain visible. Late PASS never erases known FAIL.
  if(e.type==='RUNNER_FAIL'){s.execution='FAIL';if(e.exitCode===0)s.contradictions.push('RUNNER_FAIL_WITH_EXIT_ZERO');reject('RUNNER_FAIL');continue;}
  if(failureTypes.includes(e.type)){reject(e.type);continue;}
  if(s.remaining==='BLOCKED'){s.lateEvidence.push(encoded);continue;}
  if(e.type==='ENROLL'){
   if(s.enrollment!=='NOT_OBTAINED'||e.beforeGuest!==true||e.separateFailureDomains!==true||!proof(e.proof,'ENROLL',enrolled)){reject('ENROLLMENT_PROOF');continue;}
   s.enrollment='SYNTHETIC_VERIFIED';s.evidence='SYNTHETIC_COMPLETE';continue;
  }
  if(s.enrollment!=='SYNTHETIC_VERIFIED'){reject('ENROLLMENT_REQUIRED');continue;}
  if(e.type==='RUNNER_PASS'){
   if(e.exitCode!==0)reject('PASS_EXIT_CONTRADICTION');else s.execution='SYNTHETIC_PASS';
  }else if(e.type==='STOP_REQUEST')s.stop='REQUESTED';
  else if(e.type==='API_ACCEPTED'&&s.stop==='REQUESTED')s.accepted='SYNTHETIC_ACCEPTED';
  else if(['VM_STOPPED','EXIT','RELEASE','PERSIST'].includes(e.type)){
   if(!proof(e.proof,e.type,enrolled)){reject('INDEPENDENT_LANE_PROOF_'+e.type);continue;}
   if(e.type==='RELEASE'&&s.exit!=='SYNTHETIC_CONFIRMED'){reject('EXIT_REQUIRED_FOR_RELEASE');continue;}
   s[{VM_STOPPED:'vmStopped',EXIT:'exit',RELEASE:'release',PERSIST:'persisted'}[e.type]]='SYNTHETIC_CONFIRMED';
  }else reject('UNKNOWN_EVENT_OR_ORDER');
 }
 return s;
}
export const transitions=[
 ['PLAN_ONLY','SPEC_READY','SPEC'],['SPEC_READY','REVIEW_PENDING','REQUEST_REVIEW'],
 ['REVIEW_PENDING','REVIEW_FAILED','REVIEW_FAIL'],['REVIEW_PENDING','IMPLEMENTATION_ELIGIBLE','REVIEW_PASS'],
 ['IMPLEMENTATION_ELIGIBLE','APPROVAL_MISSING','NO_APPROVAL'],['APPROVAL_MISSING','HOLD','HOLD'],
 ['IMPLEMENTATION_ELIGIBLE','IMPLEMENT_ONLY','OWNER_IMPLEMENT'],
 ['IMPLEMENT_ONLY','QUALIFICATION_BLOCKED','IMPLEMENTATION_RECORDED'],
 ['QUALIFICATION_BLOCKED','QUALIFICATION_READY','QUALIFICATION_REVIEW'],
 ['QUALIFICATION_READY','QUALIFICATION_RUN','OWNER_QUALIFY']
];
export function modelTransition(from,to,c){
 const out={modelState:from,transition:'REJECTED',errors:[],assurance:'SYNTHETIC_ONLY',externalApprovalAccepted:false,gate:gate()};
 const reject=k=>{out.errors.push(k);return out;};
 if(!states.includes(from)||!states.includes(to)||!record(c)||c.synthetic!==true)return reject('MODEL_INPUT');
 if(c.failed===true||['BLOCKED','REVIEW_FAILED'].includes(from)){out.modelState='BLOCKED';return reject('FAILURE_LATCH');}
 const edge=transitions.find(r=>r[0]===from&&r[1]===to);
 if(!edge||c.action!==edge[2])return reject('TRANSITION_NOT_ALLOWED');
 if(c.specReady!==true)return reject('SPEC_REQUIRED');
 if(['REVIEW_PASS','QUALIFICATION_REVIEW'].includes(c.action)){
  if(c.reviewIndependent!==true||c.reviewSourceBound!==true||c.openP1P2!==0)return reject('REVIEW_REQUIRED');
 }
 if(c.action==='QUALIFICATION_REVIEW'&&(c.physicalSafetyProven!==true||c.recoveryProven!==true||c.orphanProven!==true||c.finitePlanBound!==true))return reject('PHYSICAL_PREREQUISITES');
 if(['OWNER_IMPLEMENT','OWNER_QUALIFY'].includes(c.action)){
  const a=c.approval,t=c.target;
  if(!record(t)||!bindingKeys.every(k=>text(t[k]))||!['head','tree'].every(k=>/^[a-f0-9]{40}$/.test(t[k]))||!['sourceSha256','planSha256','environmentSha256','scopeSha256'].every(k=>sha(t[k])))return reject('TARGET_BINDING');
  if(!record(a)||a.kind!=='SYNTHETIC_APPROVAL'||a.ownerExplicit!==true||a.owner!=='SYNTHETIC_OWNER'||a.action!==c.action||a.version!==VERSION||a.revoked!==false||!boundedInteger(c.now)||!boundedInteger(a.issuedAt)||!boundedInteger(a.expiresAt)||a.issuedAt>c.now||a.expiresAt<=c.now||!targetEqual(a.target,t,bindingKeys)||!text(a.nonce)||!Array.isArray(c.usedApprovalNonces)||c.usedApprovalNonces.includes(a.nonce))return reject('APPROVAL_MISSING_OR_STALE');
  if(!proof(a.proof,'APPROVAL',c.identity)||!validIdentity(c.identity)||!targetEqual(c.identity,t,['vmId','generation','epoch']))return reject('APPROVAL_AUTHENTICITY_MODEL');
  const granted=JSON.parse(a.proof.raw).grant;
  if(!equal(granted,{target:a.target,owner:a.owner,action:a.action,version:a.version,nonce:a.nonce,issuedAt:a.issuedAt,expiresAt:a.expiresAt}))return reject('APPROVAL_RAW_BINDING');
 }
 out.modelState=to;out.transition='MODEL_VALID';return out;
}

