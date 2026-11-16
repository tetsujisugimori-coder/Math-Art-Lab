import {isDeepStrictEqual as equal} from 'node:util';
import {digest} from './three-body-stage-ah-contract.mjs';
export const gate=()=>({state:'PLAN_ONLY',executionAuthorized:false,allowed:false,status:'BLOCKED',approval:'APPROVAL_MISSING',decision:'HOLD',physical:'NOT_TESTED',qualificationStart:'NO'});
export const vmKeys=['edition','build','ubr','architecture','image','imageSha256','imageOrigin','vmId','generation','hypervisorId','operator','administrator','recoveryOwner','account','acl','jobHierarchy','ownershipReceipt','outOfBandConsole','managementRights','evidenceRestorationBoundary'];
export const qualificationOrder=['normal','worker-silent','parent-silent','monitor-hang','stop-send-failed','exit-missing','save-interrupted','pid-reuse'];
export function validateSafety(d){
 const errors=[],check=(v,k)=>{if(!v)errors.push(k);};
 check(d?.revision==='ak-plan-only-1'&&d.pr===44&&d.branch==='feat/017-three-body-dance'&&d.basis?.head==='bca7eb3abedf51679eaffff2f8eaee15b86b5ab6'&&d.basis.tree==='9ede8fb01acb4e45d5c81bd9a17a82709f916f1e','TARGET');
 check(d?.state==='PLAN_ONLY'&&d.executionAuthorized===false&&d.allowed===false&&d.approval==='APPROVAL_MISSING'&&d.decision==='HOLD'&&d.physical==='NOT_TESTED'&&d.qualificationStart==='NO'&&d.push==='HOLD','STATE');
 check(equal(d?.p2,{'P2-AK01':{state:'OPEN',guarantee:'NONE',closureReviewRequired:true},'P2-AK02':{state:'OPEN',proof:'NOT_TESTED',closureReviewRequired:true}}),'P2_CLOSURE');
 check(d?.recovery?.implementation==='NOT_IMPLEMENTED'&&d.recovery.owner==='NOT_OBTAINED'&&d.recovery.hostFailureGuarantee==='NONE'&&d.recovery.humanRecovery==='MANUAL_NOT_AUTOMATIC'&&d.recovery.selfFailure==='BLOCKED_NO_AUTOMATIC_GUARANTEE'&&d.recovery.milestonesState==='UNAPPROVED_PROPOSAL_NOT_MEASURED'&&equal(d.recovery.milestonesQualificationMs,[5000,6000,8000,9000,10000])&&equal(d.recovery.milestonesAHMs,[25000,26000,28000,29000,30000]),'RECOVERY');
 check(d?.orphan?.creatorLossProof==='NOT_TESTED'&&d.orphan.nestedJob==='NOT_TESTED'&&d.orphan.implementation==='NOT_IMPLEMENTED'&&['breakaway','inheritJobHandle','pidOnlyStop','unrelatedStop','fallbackUncontainedResume'].every(k=>d.orphan[k]===false),'ORPHAN');
 check(d?.vm&&equal(Object.keys(d.vm).sort(),[...vmKeys].sort())&&Object.values(d.vm).every(v=>v==='NOT_OBTAINED'),'VM_PROMOTION');
 check(d?.native?.actualSource===null&&d.native.binary===null&&d.native.binarySha256===null&&d.native.signature==='NOT_OBTAINED'&&d.native.abi==='UNKNOWN'&&d.native.qualificationCompatibility==='NOT_TESTED'&&d.native.method==='CANDIDATE_NATIVE_MONITOR_EXE_CDE_SAME_PROCESS_NOT_IMPLEMENTED','BINARY_PROMOTION');
 check(Array.isArray(d?.components)&&d.components.length===7&&d.components.every((c,i)=>c?.id==='ABCDEFG'[i]&&c.implementation==='NOT_IMPLEMENTED'&&c.state==='NOT_IMPLEMENTED'&&equal(c.source,{path:null,commit:null,sha256:null})&&c.physical==='NOT_TESTED'&&c.interface?.maxBytes===1048576&&c.interface.maxEvents===1024&&c.interface.unknownType==='REJECT_FAIL_BLOCK'&&typeof c.handleOwner==='string'&&Array.isArray(c.dependsOn)),'COMPONENTS');
 check(Array.isArray(d?.components)&&['C','D','E'].every(id=>d.components.find(c=>c?.id===id)?.actor==='M native monitor EXE outside J; C/D/E same process'),'NATIVE_TOPOLOGY');
 check(equal(d?.limits,{originalMs:5000,parentMs:30000,totalMs:90000,ahSlots:2,ahOrder:['OFF','ON'],retry:0,replacement:0,reorder:false,graceMs:0}),'AH_LIMITS');
 check(d?.qualification?.slots===8&&equal(d.qualification.order,qualificationOrder)&&d.qualification.perSlotMs===10000&&d.qualification.totalMs===90000&&d.qualification.maxScheduledMs===80000&&d.qualification.extraSlackAuthorized===false&&d.qualification.executed===0&&d.qualification.start==='NO'&&d.qualification.retry===0&&d.qualification.replacement===0&&d.qualification.reorder===false&&d.qualification.firstFailure==='BLOCK_REMAINING','FINITE');
 check(equal(d?.clockRules,{sameDomainOnly:true,crossProcessSubtract:false,missingAsZero:false,residualAllocation:false}),'CLOCK');
 check(equal(d?.preserved,{root:'UNKNOWN',time:'NOT_COMPARABLE',improvement:'NOT_TESTED',originalStop:'NOT_TESTED',historicalRuntime:'NOT_OBTAINED',W:'BLOCKED',X:'FAIL'}),'HISTORY');
 return {status:errors.length?'DESIGN_INVALID':'DESIGN_VALID',errors,gate:gate()};
}
const record=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
export const peerKeys=['session','trial','vmId','vmGeneration','hypervisorId','incarnation','handleToken','peer','channel','clockDomain','imageSha256'];
// Synthetic inert-data stream only. No authentication or OS exit proof is implemented.
export function inspectStream(enrolled,events){
 const s={execution:'UNKNOWN',observation:'PASS',evidence:'EVIDENCE_INCOMPLETE',physical:'NOT_TESTED',remaining:'NOT_STARTED',stop:'NOT_REQUESTED',exit:'NOT_OBTAINED',resources:'NOT_OBTAINED',savedRaw:[],errors:[]};
 const reject=k=>{s.errors.push(k);s.observation='FAIL';s.remaining='BLOCKED';};
 if(!record(enrolled)||peerKeys.some(k=>typeof enrolled[k]!=='string'||!enrolled[k].trim())||!/^[a-f0-9]{64}$/.test(enrolled.imageSha256)){reject('ENROLLMENT');return s;}
 if(!Array.isArray(events)){reject('EVENT_ARRAY');return s;}
 let seq=-1,at=-1,total=0,savedBytes=0;const ids=new Set();
 for(const e of events.slice(0,1024)){
  if(!record(e)){reject('EVENT_STRUCTURE');continue;}
  let bytes;try{bytes=Buffer.byteLength(JSON.stringify(e));}catch{reject('INPUT_SERIALIZATION_FAILURE');continue;}
  total+=bytes;if(total>1048576){reject('BYTE_CAPACITY');break;}
  if(e.synthetic!==true||typeof e.id!=='string'||!e.id.trim()||ids.has(e.id)||!Number.isSafeInteger(e.seq)||e.seq<=seq||!Number.isFinite(e.at)||e.at<0||e.at<at||!record(e.identity)||peerKeys.some(k=>e.identity[k]!==enrolled[k])){reject('ENVELOPE');continue;}
  ids.add(e.id);seq=e.seq;at=e.at;
  switch(e.type){
   case 'RUNNER_FAIL':s.execution='FAIL';s.remaining='BLOCKED';break;
   case 'HEARTBEAT':break;
   case 'STOP_REQUEST':s.stop='REQUESTED';break;
   case 'STOP_ACK':if(s.stop!=='REQUESTED'){reject('STOP_ORDER');break;}s.stop='ACKED';break;
   case 'EXIT_CONFIRMATION':if(!record(e.proof)||e.proof.kind!=='SYNTHETIC_HANDLE_WAIT'||e.proof.handleToken!==enrolled.handleToken){reject('EXIT_PROOF');break;}s.exit='SYNTHETIC_CONFIRMED';break;
   case 'RESOURCE_RELEASED':if(s.exit!=='SYNTHETIC_CONFIRMED'){reject('RELEASE_ORDER');break;}s.resources='SYNTHETIC_RELEASED';break;
   case 'RAW':if(!record(e.raw)||typeof e.raw.base64!=='string'||e.raw.base64.length>1398104||!Number.isSafeInteger(e.raw.bytes)||e.raw.bytes<0||e.raw.bytes>1048576||Buffer.from(e.raw.base64,'base64').length!==e.raw.bytes||digest(Buffer.from(e.raw.base64,'base64'))!==e.raw.sha256||savedBytes+e.raw.bytes>1048576){reject('RAW_OR_CAPACITY');break;}savedBytes+=e.raw.bytes;s.savedRaw.push({...e.raw});break;
   case 'SAVE_FAILED':reject('SAVE_FAILED');break;
   default:reject('UNKNOWN_TYPE');
  }
 }
 if(events.length>1024)reject('EVENT_CAPACITY');return s;
}
