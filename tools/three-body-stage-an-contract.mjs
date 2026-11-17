// Offline contract model. Receipts and verdicts accepted here are synthetic.
import {createHash} from 'node:crypto';

const record = value => value !== null && typeof value === 'object' && !Array.isArray(value);
const literal = value => typeof value === 'string' && /^[!-~]{1,240}$/.test(value);
const hash = value => typeof value === 'string' && /^[a-f0-9]{64}$/.test(value);
const oid = value => typeof value === 'string' && /^[a-f0-9]{40}$/.test(value);
const time = value => Number.isSafeInteger(value) && value >= 0;
const uuid = value => typeof value === 'string' && /^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/.test(value);
const sortedPaths = paths => Array.isArray(paths) && paths.length > 0 && paths.length <= 16 &&
  Array.from(paths).every((p,i) => typeof p === 'string' && /^tools\/[a-z0-9-]+\.(mjs|cc)$/.test(p) && (i===0 || paths[i-1]<p));
const checks = Object.freeze({
  repositoryId: v=>typeof v==='string' && /^[1-9][0-9]{0,19}$/.test(v),
  repository: v=>literal(v) && /^[\w.-]+\/[\w.-]+$/.test(v),
  pr: v=>Number.isSafeInteger(v) && v>0,
  branch: v=>literal(v) && v.startsWith('refs/heads/'),
  action: v=>['IMPLEMENT_ONLY','QUALIFICATION_RUN'].includes(v),
  policyVersion: literal, head:oid, tree:oid, sourceSha256:hash, planSha256:hash,
  environmentSha256:hash, scopeSha256:hash, vmUuid:uuid, generation:literal, epoch:literal,
  paths:sortedPaths, permission:v=>['SOURCE_EDIT_ONLY','QUALIFICATION_PLAN_ONLY'].includes(v),
  ownerId:literal, ownerRole:v=>v==='REPOSITORY_OWNER', issuedAt:time, expiresAt:time,
  grantId:uuid, nonce:hash, revocationId:literal, issuerId:literal, keyId:literal,
});
export const grantFields = Object.freeze(Object.keys(checks));
export const contextFields = Object.freeze(grantFields.filter(k=>!['issuedAt','expiresAt','grantId','nonce','revocationId'].includes(k)));
const correctPermission = grant => grant.permission === (grant.action==='IMPLEMENT_ONLY' ? 'SOURCE_EDIT_ONLY' : 'QUALIFICATION_PLAN_ONLY');
const validGrant = grant => record(grant) && Object.keys(grant).length === grantFields.length &&
  grantFields.every(k=>Object.hasOwn(grant,k) && checks[k](grant[k])) && correctPermission(grant) && grant.issuedAt < grant.expiresAt;

// Flat, restricted ASCII schema with exact keys. No nested object or non-integer number.
export function canonicalGrant(grant){
  if(!validGrant(grant))return null;
  // All keys are ASCII and have no array-index form, so JSON.stringify preserves this order.
  return JSON.stringify(Object.fromEntries([...grantFields].sort().map(k=>[k,grant[k]])));
}
export const sha256 = raw => createHash('sha256').update(raw,'utf8').digest('hex');
export const gate = () => ({allowed:false,executionAuthorized:false,status:'BLOCKED',approval:'APPROVAL_MISSING',decision:'HOLD',qualificationStart:'NO',physical:'NOT_TESTED'});

export function inspectSynthetic(input, expected){
  const refuse = reason => ({reason,model:'REJECTED',externalApprovalAccepted:false,gate:gate()});
  if(!record(input) || input.kind!=='SYNTHETIC_ONLY' || !record(expected))return refuse('SYNTHETIC_INPUT_REQUIRED');
  if(typeof input.raw!=='string' || input.raw.length>8192)return refuse('RAW_REQUIRED');
  let grant;
  try { grant=JSON.parse(input.raw); } catch { return refuse('INVALID_JSON'); }
  const canonical=canonicalGrant(grant);
  if(canonical===null)return refuse('GRANT_SCHEMA');
  if(canonical!==input.raw)return refuse('CANONICAL_BYTES'); // Rejects duplicate keys, BOM and alternate encodings.
  for(const name of contextFields){
    const actual=grant[name], target=expected[name];
    if(!Object.hasOwn(expected,name) || !checks[name](target) || JSON.stringify(actual)!==JSON.stringify(target))return refuse('CONTEXT_'+name);
  }
  const digest=sha256(input.raw);
  const signer=input.signature;
  if(!record(signer)||signer.kind!=='SYNTHETIC_VERDICT'||signer.verdict!=='MATCH'||signer.payloadSha256!==digest||
     signer.issuerId!==grant.issuerId||signer.keyId!==grant.keyId)return refuse('SIGNATURE_UNVERIFIED');
  const trust=input.trust;
  if(!record(trust)||trust.kind!=='SYNTHETIC_TRUST'||trust.keyId!==expected.keyId||trust.issuerId!==expected.issuerId||
    trust.ownerId!==expected.ownerId||trust.action!==expected.action)return refuse('TRUST_UNVERIFIED');
  if(!time(input.now)||input.now<grant.issuedAt||input.now>=grant.expiresAt)return refuse('TIME_INVALID');
  const revocation=input.revocation;
  if(!record(revocation)||revocation.kind!=='SYNTHETIC_REVOCATION'||revocation.status!=='CURRENT_GOOD'||
    revocation.revocationId!==grant.revocationId||revocation.payloadSha256!==digest||revocation.at!==input.now)
    return refuse('REVOCATION_UNVERIFIED');
  const ledger=input.ledger;
  const consumeKey=sha256(JSON.stringify([grant.issuerId,grant.ownerId,grant.nonce]));
  if(!record(ledger)||ledger.kind!=='SYNTHETIC_COMMIT'||ledger.status!=='INSERTED_ONCE'||
    ledger.consumeKey!==consumeKey||ledger.grantId!==grant.grantId||ledger.payloadSha256!==digest||ledger.epoch!==grant.epoch||
    !literal(ledger.writer)||!literal(ledger.reader)||ledger.writer===ledger.reader||ledger.readbackSha256!==digest||
    !literal(ledger.recordId)||ledger.readbackId!==ledger.recordId)return refuse('NONCE_COMMIT_UNVERIFIED');
  return {model:'SYNTHETIC_REQUIREMENTS_MET',externalApprovalAccepted:false,gate:gate()};
}

export const transitions = Object.freeze({
  PLAN_ONLY:['SPEC_FROZEN'], SPEC_FROZEN:['REVIEW_ACCEPTED'], REVIEW_ACCEPTED:['OWNER_REQUEST_READY'],
  OWNER_REQUEST_READY:['IMPLEMENT_ONLY'], IMPLEMENT_ONLY:['QUALIFICATION_REVIEWED'],
  QUALIFICATION_REVIEWED:['QUALIFICATION_RUN'], BLOCKED:[],
});
export function transition(from,to){
  const designEdge=Object.hasOwn(transitions,from) && transitions[from].includes(to);
  const requiresExternal= ['IMPLEMENT_ONLY','QUALIFICATION_REVIEWED','QUALIFICATION_RUN'].includes(to);
  return {state:designEdge&&!requiresExternal?to:from,gate:gate()};
}

export const creatorBoundaries = Object.freeze(['BEFORE_JOB','AFTER_LIMITS','IN_CREATE','CREATE_RETURNED','BEFORE_MEMBERSHIP','AFTER_MEMBERSHIP','IN_RESUME','AFTER_RESUME']);
export function lostCreator(boundary){
  const index=creatorBoundaries.indexOf(boundary);
  return {boundaryKnown:index>=0,child:'UNKNOWN',membership:'UNKNOWN',
    requiredBoundaryEvidence:index>=5?'CHILD_AND_MEMBERSHIP':index>=3?'CHILD':index===2?'IN_FLIGHT_CREATE':'NONE',
    handleOwnership:'UNKNOWN',exit:'UNKNOWN',release:'NOT_OBTAINED',
    stopPossible:'UNKNOWN',residual:'UNKNOWN',remaining:'BLOCKED',physical:'UNKNOWN',gate:gate()};
}

const laneOrder = Object.freeze(['ENROLLED','DURABLE','READBACK','HEARTBEAT_MISSING','STOP_REQUEST','API_ACCEPTED','VM_STOPPED','GUEST_EXIT','RELEASE','SAVED']);
const terminalFaults = Object.freeze(['M_FAILURE','R_FAILURE','NETWORK_FAILURE','HYPERVISOR_FAILURE','VM_ROLLBACK']);
const recoveryKeys = ['vmUuid','generation','epoch','registrationSha256'];
export function recoveryTrace(target,events){
  const state={seen:[],failures:[],remaining:'BLOCKED',guarantee:'NONE',gate:gate()};
  if(!record(target)||!uuid(target.vmUuid)||!literal(target.generation)||!literal(target.epoch)||!hash(target.registrationSha256)||
    !Array.isArray(events)||events.length>32){state.failures.push('TRACE_INVALID');return state;}
  const ids=new Set();
  let sequence=-1;
  for(const event of events){
    if(!record(event)||event.kind!=='SYNTHETIC_ONLY'||!record(event.target)||!recoveryKeys.every(k=>event.target[k]===target[k])||
      !literal(event.id)||ids.has(event.id)||!time(event.sequence)||event.sequence<=sequence){
      state.failures.push('EVENT_BINDING');continue;
    }
    ids.add(event.id);
    sequence=event.sequence;
    if(terminalFaults.includes(event.type)){state.failures.push(event.type);continue;}
    if(state.failures.length)continue;
    if(laneOrder[state.seen.length]!==event.type || !laneOrder.includes(event.type)){
      state.failures.push('LANE_ORDER');continue;
    }
    state.seen.push(event.type);
  }
  return state;
}

export const order = Object.freeze(['normal','worker-silent','parent-silent','monitor-hang','stop-send-failed','exit-missing','save-interrupted','PID-reuse']);
export const slotCosts = Object.freeze(['create','detect','request','stopConfirm','exitConfirm','save','readback','cleanup']);
export const costNames = Object.freeze(['prepare','enroll','finalConfirm']);
export function budget(plan){
  const result=(reason)=>({reason,physicalTiming:'NOT_TESTED',gate:gate()});
  if(!record(plan)||plan.kind!=='SYNTHETIC_ONLY'||!record(plan.limits))return result('PLAN_INVALID');
  const expected={originalMs:5000,parentMs:30000,totalMs:90000,slotMs:10000,retry:0,replacement:0,reorder:false,stopOnFirstFailure:true};
  if(Object.entries(expected).some(([k,v])=>plan.limits[k]!==v)||JSON.stringify(plan.originalOrder)!=='["OFF","ON"]')return result('LIMIT_DRIFT');
  if(!Array.isArray(plan.slots)||plan.slots.length!==8||Array.from(plan.slots).some((s,i)=>!record(s)||s.name!==order[i]))return result('SLOT_ORDER');
  const window=plan.campaign;
  const interval=(x,domain)=>record(x)&&x.domain===domain&&x.unit==='ms'&&x.clock==='WALL'&&time(x.start)&&time(x.end)&&x.end>=x.start;
  if(!record(window)||!literal(window.domain)||!interval(window,window.domain))return result('CAMPAIGN_NOT_OBTAINED');
  if(window.end-window.start>90000)return result('TOTAL_LIMIT');
  let cursor=window.start,failed=false;
  for(const slot of plan.slots){
    if(failed){
      if(slot.status!=='BLOCKED'||Object.hasOwn(slot,'timing')||Object.hasOwn(slot,'costs'))return result('FAILURE_LATCH');
      continue;
    }
    if(!['COMPLETE','FAILED'].includes(slot.status)||!interval(slot.timing,window.domain))return result('SLOT_NOT_OBTAINED');
    const {start,end}=slot.timing;
    if(start<cursor||end>window.end||end-start>10000)return result('SLOT_LIMIT_OR_OVERLAP');
    if(!record(slot.costs)||Object.keys(slot.costs).length!==slotCosts.length||
        slotCosts.some(name=>!Object.hasOwn(slot.costs,name)))return result('COST_NOT_OBTAINED');
    let costCursor=start;
    for(const name of slotCosts){
      const cost=slot.costs[name];
      if(slot.status==='FAILED'&&cost==='NOT_OBTAINED')continue;
      if(!interval(cost,window.domain))return result('COST_DOMAIN_OR_MISSING');
      if(cost.start<costCursor||cost.end>end)return result('COST_ORDER_OR_SLOT_BOUNDARY');
      costCursor=cost.end;
    }
    cursor=end;
    failed=slot.status==='FAILED';
  }
  if(!record(plan.costs)||Object.keys(plan.costs).length!==costNames.length||
    costNames.some(k=>!Object.hasOwn(plan.costs,k)))return result('COST_NOT_OBTAINED');
  for(const name of costNames){
    const x=plan.costs[name];
    if(!interval(x,window.domain))return result('COST_DOMAIN_OR_MISSING');
    if(x.start<window.start||x.end>window.end)return result('COST_OUTSIDE_CAMPAIGN');
  }
  if(plan.costs.prepare.end>plan.costs.enroll.start||plan.costs.enroll.end>plan.slots[0].timing.start||
     plan.costs.finalConfirm.start<cursor)return result('CAMPAIGN_BOUNDARIES');
  return result(failed?'SYNTHETIC_FAILURE_RETAINED':'SYNTHETIC_LIMITS_MET');
}
