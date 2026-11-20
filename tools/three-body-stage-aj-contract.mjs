import {isDeepStrictEqual as equal} from 'node:util';
import {executionGate} from './three-body-stage-ai-contract.mjs';
export {executionGate};
export const qualificationOrder=['normal','worker-silent','parent-silent','monitor-hang','stop-send-failed','exit-missing','save-interrupted','pid-reuse'];
export function validatePrefixed(d){
  const errors=[],check=(v,k)=>{if(!v)errors.push(k);};
  check(d?.revision==='aj-prefixed-1'&&d.state==='PLAN_ONLY'&&d.executionAuthorized===false&&d.runtime==='NOT_TESTED'&&d.qualificationStart==='NO'&&d.approval==='APPROVAL_MISSING'&&d.decision==='HOLD','STATE');
  check(d?.basis?.head==='c499e58bfde6b9bdebaff91ee359dea6a39c7c1c'&&d.basis.tree==='e16cfbb08f9093ac5eba68238850e949d3f5e3a0','IMPLEMENTATION_BASIS');
  check(Array.isArray(d?.components)&&d.components.length===7&&d.components.every((c,i)=>c?.id==='ABCDEFG'[i]&&c.state==='NOT_IMPLEMENTED'&&c.physical==='NOT_TESTED'&&equal(c.source,{path:null,commit:null,sha256:null})&&['name','plannedPath','actor','thread','permissions','identity','input','output','stopAndRecovery','evidence','notGuaranteed','falsification'].every(k=>typeof c[k]==='string'&&c[k].length>5)&&typeof c.ipc?.authentication==='string'&&c.ipc.authentication.includes('not implemented')&&typeof c.clock?.wall==='string'&&c.clock.wall.includes('own process')),'COMPONENTS');
  check(equal(d?.limits,{originalMs:5000,parentMs:30000,totalMs:90000,ahSlots:2,ahOrder:['OFF','ON'],retry:0,replacement:0,reorder:false,graceMs:0}),'AH_LIMITS');
  const q=d?.qualification;
  check(q?.slots===8&&equal(q.order,qualificationOrder)&&q.perSlotMs===10000&&q.totalMs===90000&&q.maxScheduledMs===80000&&q.extraSlackAuthorized===false&&q.retry===0&&q.replacement===0&&q.reorder===false&&q.firstFailure==='BLOCK_REMAINING'&&q.executed===0&&q.start==='NO','FINITE_QUALIFICATION');
  const m=d?.monitorRecovery;
  check(m?.death==='CONDITIONAL_KILL_ON_LAST_HANDLE_CLOSE_NOT_TESTED'&&m.hangGuarantee==='NONE'&&m.externalWatchdog==='NOT_IMPLEMENTED'&&m.outOfBandAutomaticRecovery==='NOT_OBTAINED'&&m.humanRecovery==='MANUAL_ONLY_NOT_AUTOMATIC_GUARANTEE'&&m.qualificationStart==='NO','HANG_RECOVERY');
  check(equal(d?.isolation,{monitorOutsideJob:true,suspendAssignResume:true,pidOnlyStop:false,breakaway:false,handleInheritance:false,nestedJobCompatibility:'NOT_TESTED',membershipProof:'NOT_OBTAINED',stopSendImpliesExit:false,storageBlocksStop:false,unrelatedTargetAllowed:false}),'ISOLATION');
  const e=d?.environment;
  check(e?.qualificationEnvironment==='NOT_OBTAINED'&&e.currentDoesNotProveIsolation===true&&e.nativeBridge==='NOT_IMPLEMENTED'&&e.bridgeAbi==='UNKNOWN'&&e.compilerSdk==='NOT_OBTAINED'&&e.nativePackage==='NOT_OBTAINED','ENVIRONMENT');
  check(equal(e?.candidateFromAH,{node:'v24.20.0',vitest:'3.2.7',platform:'win32',release:'10.0.26300',arch:'x64',nodeExecutableSha256:'5c976096e04e5c2c1f091938926234cc9fbebfe9787ddd149351b3b0ecc707b5'}),'CANDIDATE_DRIFT');
  check(equal(d?.preserved,{root:'UNKNOWN',time:'NOT_COMPARABLE',improvement:'NOT_TESTED',originalStop:'NOT_TESTED',historicalRuntime:'NOT_OBTAINED',W:'BLOCKED',X:'FAIL'}),'HISTORY');
  return {status:errors.length?'PREFIX_INVALID':'PREFIX_VALID',errors,gate:executionGate(),physicalImplementation:'NOT_IMPLEMENTED',qualificationStart:'NO'};
}
