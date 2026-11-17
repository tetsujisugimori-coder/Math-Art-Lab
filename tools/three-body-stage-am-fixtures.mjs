import {VERSION,identityKeys,limits,requirements,states,sha256} from './three-body-stage-am-contract.mjs';
export const clone=v=>structuredClone(v);
export const identity=Object.fromEntries(identityKeys.map(k=>[k,k==='imageSha256'?'a'.repeat(64):'synthetic-'+k]));
export function receipt(purpose='ENROLL'){
 const recordId='synthetic-'+purpose;
 const raw=JSON.stringify({recordId,purpose,identity});
 return {kind:'SYNTHETIC_RECEIPT',purpose,recordId,producer:'synthetic-external-ledger',reader:'synthetic-independent-reader',external:true,durable:true,independentReadback:true,nonceLedgerReady:true,raw,readbackRaw:raw,sha256:sha256(raw),readbackSha256:sha256(raw)};
}
export const event=(type,i=0,extra={})=>({synthetic:true,id:'event-'+i,type,seq:i,at:i,clockDomain:'SYNTHETIC_R_LOCAL',nonce:'nonce-'+i,identity:clone(identity),authenticated:true,vmScopedAcl:true,...extra});
export const enrollment=()=>event('ENROLL',0,{beforeGuest:true,separateFailureDomains:true,proof:receipt()});
export const normalTrace=()=>[enrollment(),event('RUNNER_PASS',1,{exitCode:0})];
export const spec=()=>({schema:VERSION,state:'PLAN_ONLY',executionAuthorized:false,physical:'NOT_TESTED',recoveryGuarantee:'NONE',orphanPhysical:'UNKNOWN',qualificationStart:'NO',limits:clone(limits),states:clone(states),topology:{M:'NATIVE_GUEST_OUTSIDE_JOB',P:'GUEST_INSIDE_JOB',W:'GUEST_INSIDE_JOB',R:'MANAGEMENT_STATION_OUTSIDE_GUEST',jobHandleOwner:'M',jobHandleInherited:false},...Object.fromEntries(Object.entries(requirements).map(([g,ks])=>[g,Object.fromEntries(ks.map(k=>[k,true]))])),actualEnvironment:'NOT_OBTAINED',implementation:'NOT_IMPLEMENTED',realApproval:'NOT_OBTAINED',budgetFeasibility:'NOT_TESTED'});
export const faults=[
 ...['M_HANG','M_CRASH','M_KILLED','R_HANG','R_UNREACHABLE','HEARTBEAT_LOST','IPC_DISCONNECT','CREDENTIAL_REVOKED','CREDENTIAL_EXPIRED','VM_ROLLBACK','PERSIST_FAILED','READBACK_FAILED','RECORD_CORRUPT','SHA_MISMATCH','JOB_CREATE_FAILED','JOB_ASSIGN_FAILED','CREATOR_LOST','HANDLE_LEAK','NESTED_JOB_INCOMPATIBLE','BREAKAWAY','RESUME_FAILED','PID_REUSED','CLEANUP_FAILED','MONITOR_FAILURE','SAVE_FAILED'].map(id=>({id,expected:id,make:()=>[enrollment(),event(id,1),event('RUNNER_PASS',2,{exitCode:0}),event('VM_STOPPED',3,{proof:receipt('VM_STOPPED')})]})),
 ...[
 ['vm-identity',e=>e.identity.vmId='foreign','IDENTITY_MISMATCH'],
 ['epoch',e=>e.identity.epoch='old','IDENTITY_MISMATCH'],
 ['generation',e=>e.identity.generation='rollback','IDENTITY_MISMATCH'],
 ['nonce-replay',e=>e.nonce='nonce-0','STRUCTURE_SEQUENCE_DOMAIN_REPLAY'],
 ['clock-domain',e=>e.clockDomain='WORKER_CLOCK','STRUCTURE_SEQUENCE_DOMAIN_REPLAY'],
 ['event-id',e=>delete e.id,'STRUCTURE_SEQUENCE_DOMAIN_REPLAY'],
 ['sequence',e=>e.seq=-1,'STRUCTURE_SEQUENCE_DOMAIN_REPLAY'],
 ['false-stop',e=>{e.type='VM_STOPPED';e.proof={ok:true};},'INDEPENDENT_LANE_PROOF_VM_STOPPED'],
 ['self-proof',e=>{e.type='VM_STOPPED';e.proof=receipt('VM_STOPPED');e.proof.reader=e.proof.producer;},'INDEPENDENT_LANE_PROOF_VM_STOPPED']
 ].map(([id,mutate,expected])=>({id,expected,make:()=>{const e=event('RUNNER_PASS',1,{exitCode:0});mutate(e);return [enrollment(),e];}})),
 ...[
 ['missing-enrollment-proof',e=>delete e.proof],['not-durable',e=>e.proof.durable=false],['readback-missing',e=>delete e.proof.readbackRaw],['nonce-ledger',e=>e.proof.nonceLedgerReady=false],['sha-corrupt',e=>e.proof.sha256='bad'],['raw-readback-mismatch',e=>e.proof.readbackRaw+='x'],['record-id-mismatch',e=>e.proof.recordId='foreign'],['fake-independent',e=>e.proof.reader=e.proof.producer],['same-failure-domain',e=>e.separateFailureDomains=false],['late-enrollment',e=>e.beforeGuest=false]
 ].map(([id,mutate])=>({id,expected:'ENROLLMENT_PROOF',make:()=>{const e=enrollment();mutate(e);return [e,event('RUNNER_PASS',1,{exitCode:0})];}}))
];
export const target={head:'1'.repeat(40),tree:'2'.repeat(40),sourceSha256:'3'.repeat(64),planSha256:'4'.repeat(64),environmentSha256:'5'.repeat(64),scopeSha256:'6'.repeat(64),vmId:identity.vmId,generation:identity.generation,epoch:identity.epoch};
export function approvalContext(action='OWNER_IMPLEMENT'){
 const c={synthetic:true,action,specReady:true,now:100,identity:clone(identity),target:clone(target),usedApprovalNonces:[],approval:{kind:'SYNTHETIC_APPROVAL',ownerExplicit:true,owner:'SYNTHETIC_OWNER',action,version:VERSION,revoked:false,issuedAt:90,expiresAt:110,target:clone(target),nonce:'approval-1',proof:receipt('APPROVAL')}};
 const a=c.approval,p=a.proof,decoded=JSON.parse(p.raw);
 decoded.grant={target:a.target,owner:a.owner,action:a.action,version:a.version,nonce:a.nonce,issuedAt:a.issuedAt,expiresAt:a.expiresAt};
 p.raw=p.readbackRaw=JSON.stringify(decoded);p.sha256=p.readbackSha256=sha256(p.raw);
 return c;
}

