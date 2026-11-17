import {canonicalGrant,sha256,order,slotCosts} from './three-body-stage-an-contract.mjs';

export const grant = {
  repositoryId:'1428326650',repository:'tetsujisugimori-coder/Math-Art-Lab',pr:44,
  branch:'refs/heads/codex/stage-am-safety-gates-20261118',action:'IMPLEMENT_ONLY',policyVersion:'an-proposal-1',
  head:'1'.repeat(40),tree:'2'.repeat(40),sourceSha256:'3'.repeat(64),planSha256:'4'.repeat(64),
  environmentSha256:'5'.repeat(64),scopeSha256:'6'.repeat(64),vmUuid:'12345678-1234-1234-1234-123456789abc',
  generation:'generation-1',epoch:'epoch-1',paths:['tools/fake-component.cc'],permission:'SOURCE_EDIT_ONLY',
  ownerId:'synthetic-owner',ownerRole:'REPOSITORY_OWNER',issuedAt:10,expiresAt:30,
  grantId:'00000000-0000-0000-0000-000000000001',nonce:'7'.repeat(64),revocationId:'synthetic-status',issuerId:'synthetic-issuer',keyId:'synthetic-key',
};
export function packet(overrides={}){
  const g={...grant,...overrides},raw=canonicalGrant(g),digest=sha256(raw);
  return {expected:structuredClone(g),input:{kind:'SYNTHETIC_ONLY',raw,now:20,
    signature:{kind:'SYNTHETIC_VERDICT',verdict:'MATCH',payloadSha256:digest,issuerId:g.issuerId,keyId:g.keyId},
    trust:{kind:'SYNTHETIC_TRUST',keyId:g.keyId,issuerId:g.issuerId,ownerId:g.ownerId,action:g.action},
    revocation:{kind:'SYNTHETIC_REVOCATION',status:'CURRENT_GOOD',at:20,revocationId:g.revocationId,payloadSha256:digest},
    ledger:{kind:'SYNTHETIC_COMMIT',status:'INSERTED_ONCE',consumeKey:sha256(JSON.stringify([g.issuerId,g.ownerId,g.nonce])),
      grantId:g.grantId,epoch:g.epoch,payloadSha256:digest,readbackSha256:digest,writer:'synthetic-ledger',reader:'synthetic-reader',
      recordId:'record-1',readbackId:'record-1'}}};
}
export const approvalFaults = [
 ['repo-id',p=>p.expected.repositoryId='5','CONTEXT_repositoryId'],
 ['repo-name',p=>p.expected.repository='other/Math-Art-Lab','CONTEXT_repository'],
 ['pr',p=>p.expected.pr=45,'CONTEXT_pr'],
 ['branch',p=>p.expected.branch='refs/heads/other','CONTEXT_branch'],
 ['scope',p=>p.expected.scopeSha256='a'.repeat(64),'CONTEXT_scopeSha256'],
 ['environment',p=>p.expected.environmentSha256='a'.repeat(64),'CONTEXT_environmentSha256'],
 ['vm',p=>p.expected.vmUuid='12345678-1234-1234-1234-123456789000','CONTEXT_vmUuid'],
 ['epoch',p=>p.expected.epoch='old','CONTEXT_epoch'],
 ['binary-path',p=>p.expected.paths=['tools/another.cc'],'CONTEXT_paths'],
 ['qualify',p=>p.expected.action='QUALIFICATION_RUN','CONTEXT_action'],
 ['expiry',p=>p.input.now=30,'TIME_INVALID'],
 ['revoked',p=>p.input.revocation.status='REVOKED','REVOCATION_UNVERIFIED'],
 ['revocation-down',p=>delete p.input.revocation,'REVOCATION_UNVERIFIED'],
 ['stale-revocation',p=>p.input.revocation.at=19,'REVOCATION_UNVERIFIED'],
 ['nonce-reuse',p=>p.input.ledger.status='EXISTS','NONCE_COMMIT_UNVERIFIED'],
 ['rollback-ledger',p=>p.input.ledger.epoch='old','NONCE_COMMIT_UNVERIFIED'],
 ['save-error',p=>p.input.ledger.status='WRITE_FAILED','NONCE_COMMIT_UNVERIFIED'],
 ['readback',p=>p.input.ledger.readbackId='wrong','NONCE_COMMIT_UNVERIFIED'],
 ['self-readback',p=>p.input.ledger.reader=p.input.ledger.writer,'NONCE_COMMIT_UNVERIFIED'],
 ['key-missing',p=>delete p.input.trust,'TRUST_UNVERIFIED'],
 ['key-mismatch',p=>p.input.trust.keyId='other','TRUST_UNVERIFIED'],
 ['signature-bytes',p=>p.input.raw=p.input.raw.replace('synthetic-status','changed-status'),'SIGNATURE_UNVERIFIED'],
 ['raw-whitespace',p=>p.input.raw+='\n','CANONICAL_BYTES'],
 ['duplicate-key',p=>p.input.raw=p.input.raw.replace('{','{"pr":44,'),'CANONICAL_BYTES'],
 ['malformed-type',p=>p.input.raw=p.input.raw.replace('"pr":44','"pr":"44"'),'GRANT_SCHEMA'],
 ['real-label',p=>p.input.kind='REAL','SYNTHETIC_INPUT_REQUIRED'],
 ['boolean',p=>p.input=true,'SYNTHETIC_INPUT_REQUIRED'],
 ['synthetic-receipt-only',p=>p.input={kind:'SYNTHETIC_ONLY',approved:true},'RAW_REQUIRED'],
];
const timing=(start,end)=>({start,end,domain:'synthetic-campaign-boot-1',unit:'ms',clock:'WALL'});
export function campaign(){
  return {kind:'SYNTHETIC_ONLY',limits:{originalMs:5000,parentMs:30000,totalMs:90000,slotMs:10000,retry:0,replacement:0,reorder:false,stopOnFirstFailure:true},
    originalOrder:['OFF','ON'],campaign:timing(0,90000),
    slots:order.map((name,i)=>{
      const start=200+i*10000;
      return {name,status:'COMPLETE',timing:timing(start,start+10000),
        costs:Object.fromEntries(slotCosts.map((cost,j)=>[cost,timing(start+j,start+j+1)]))};
    }),
    costs:{prepare:timing(0,100),enroll:timing(100,200),finalConfirm:timing(80200,80201)}};
}
export const budgetFaults=[
 ['grace',p=>p.limits.totalMs++,'LIMIT_DRIFT'],['retry',p=>p.limits.retry=1,'LIMIT_DRIFT'],
 ['slot-order',p=>p.slots.reverse(),'SLOT_ORDER'],['campaign-overrun',p=>p.campaign.end++,'TOTAL_LIMIT'],
 ['slot-overlap',p=>p.slots[1].timing.start--,'SLOT_LIMIT_OR_OVERLAP'],
 ['slot-overrun',p=>p.slots[0].timing.end++,'SLOT_LIMIT_OR_OVERLAP'],
 ['zero-fill',p=>p.slots[0].costs.save=0,'COST_DOMAIN_OR_MISSING'],
 ['missing-cost',p=>delete p.slots[0].costs.readback,'COST_NOT_OBTAINED'],
 ['different-clock',p=>p.slots[0].costs.save.domain='foreign','COST_DOMAIN_OR_MISSING'],
 ['cpu',p=>p.slots[0].costs.save.clock='CPU','COST_DOMAIN_OR_MISSING'],
 ['cleanup-outside',p=>p.slots[0].costs.cleanup.end=90001,'COST_ORDER_OR_SLOT_BOUNDARY'],
 ['save-after-final',p=>Object.assign(p.slots[7].costs.save,{start:85000,end:85001}),'COST_ORDER_OR_SLOT_BOUNDARY'],
 ['readback-before-save',p=>p.slots[0].costs.readback.start=p.slots[0].costs.save.start,'COST_ORDER_OR_SLOT_BOUNDARY'],
 ['final-before-last',p=>p.costs.finalConfirm.start=80000,'CAMPAIGN_BOUNDARIES'],
 ['failure-then-success',p=>p.slots[0].status='FAILED','FAILURE_LATCH'],
];
export const recoveryTarget={vmUuid:grant.vmUuid,generation:grant.generation,epoch:grant.epoch,registrationSha256:'b'.repeat(64)};
export const events=(...types)=>types.map((type,i)=>({kind:'SYNTHETIC_ONLY',target:structuredClone(recoveryTarget),id:'event-'+i,sequence:i,type}));
