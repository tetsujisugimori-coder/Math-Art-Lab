import {it,expect} from 'vitest';
import {gate,grantFields,canonicalGrant,inspectSynthetic,creatorBoundaries,lostCreator,recoveryTrace,budget,transition} from '../tools/three-body-stage-an-contract.mjs';
import {grant,packet,approvalFaults,campaign,budgetFaults,recoveryTarget,events} from '../tools/three-body-stage-an-fixtures.mjs';

it('complete synthetic proof has no authority',()=>{
  const p=packet();
  expect(inspectSynthetic(p.input,p.expected)).toEqual({model:'SYNTHETIC_REQUIREMENTS_MET',externalApprovalAccepted:false,gate:gate()});
});
for(const field of grantFields)it('requires field '+field,()=>{
  const copy={...grant};delete copy[field];expect(canonicalGrant(copy)).toBeNull();
});
for(const [id,mutate,reason] of approvalFaults)it('approval denial '+id,()=>{
  const p=packet();mutate(p);
  expect(inspectSynthetic(p.input,p.expected)).toMatchObject({reason,model:'REJECTED',externalApprovalAccepted:false,gate:gate()});
});
for(const [id,mutate,reason] of budgetFaults)it('budget denial '+id,()=>{
  const p=campaign();mutate(p);expect(budget(p)).toEqual({reason,physicalTiming:'NOT_TESTED',gate:gate()});
});
it('synthetic budget boundary is not physical evidence',()=>expect(budget(campaign()).reason).toBe('SYNTHETIC_LIMITS_MET'));
it('sparse slot array is structurally rejected',()=>{
  const p=campaign();delete p.slots[2];expect(budget(p).reason).toBe('SLOT_ORDER');
});
it('sparse path array is structurally rejected',()=>{
  const paths=['tools/a.cc','tools/b.cc','tools/c.cc'];delete paths[1];
  expect(canonicalGrant({...grant,paths})).toBeNull();
});
it('failed slot keeps suffix blocked without timing',()=>{
  const p=campaign();p.slots[0].status='FAILED';p.slots[0].costs.stopConfirm='NOT_OBTAINED';p.slots=p.slots.map((s,i)=>i?{name:s.name,status:'BLOCKED'}:s);
  expect(budget(p).reason).toBe('SYNTHETIC_FAILURE_RETAINED');
});
for(const b of creatorBoundaries)it('creator loss '+b,()=>expect(lostCreator(b)).toMatchObject({
  boundaryKnown:true,child:'UNKNOWN',membership:'UNKNOWN',handleOwnership:'UNKNOWN',exit:'UNKNOWN',release:'NOT_OBTAINED',residual:'UNKNOWN',remaining:'BLOCKED',physical:'UNKNOWN',
}));
const prefix=['ENROLLED','DURABLE','READBACK','HEARTBEAT_MISSING','STOP_REQUEST','API_ACCEPTED'];
it('API acceptance is distinct from STOP and EXIT',()=>expect(recoveryTrace(recoveryTarget,events(...prefix))).toMatchObject({seen:prefix,guarantee:'NONE'}));
it('release without EXIT is rejected',()=>expect(recoveryTrace(recoveryTarget,events(...prefix,'VM_STOPPED','RELEASE')).failures).toEqual(['LANE_ORDER']));
for(const failure of ['M_FAILURE','R_FAILURE','NETWORK_FAILURE','HYPERVISOR_FAILURE','VM_ROLLBACK'])
  it('preserves '+failure+' after apparent stop',()=>expect(recoveryTrace(recoveryTarget,events(...prefix,failure,'VM_STOPPED','GUEST_EXIT'))).toMatchObject({seen:prefix,failures:[failure],remaining:'BLOCKED'}));
it('rejects old epoch trace',()=>{
  const e=events(...prefix);e[4].target.epoch='stale';expect(recoveryTrace(recoveryTarget,e).failures).toEqual(['EVENT_BINDING']);
});
for(const [from,to] of [['OWNER_REQUEST_READY','IMPLEMENT_ONLY'],['IMPLEMENT_ONLY','QUALIFICATION_REVIEWED'],['QUALIFICATION_REVIEWED','QUALIFICATION_RUN'],['BLOCKED','REVIEW_ACCEPTED'],['PLAN_ONLY','OWNER_REQUEST_READY']])
  it('rejects transition '+from+' to '+to,()=>expect(transition(from,to)).toEqual({state:from,gate:gate()}));
for(const [from,to] of [['PLAN_ONLY','SPEC_FROZEN'],['SPEC_FROZEN','REVIEW_ACCEPTED'],['REVIEW_ACCEPTED','OWNER_REQUEST_READY']])
  it('design transition '+from+' to '+to,()=>expect(transition(from,to)).toEqual({state:to,gate:gate()}));
it.each([undefined,null,true,{},packet().input])('operational gate is constant %#',v=>expect(gate(v)).toMatchObject({allowed:false,status:'BLOCKED',approval:'APPROVAL_MISSING'}));
