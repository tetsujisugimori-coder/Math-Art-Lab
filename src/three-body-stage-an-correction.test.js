import {expect,it} from 'vitest';
import {archiveTarget,currentDecision,evaluateSyntheticArchive} from '../tools/three-body-stage-an-correction.mjs';

function fixture(){
  return {kind:'SYNTHETIC_ONLY',now:20,
    approval:{kind:'SYNTHETIC_OWNER_RECORD',target:{...archiveTarget},id:'synthetic-approval',owner:'synthetic-owner',
      writer:'a',reader:'b',writerScope:'CREATE_IN_NEW_DIRECTORY_ONLY',readerScope:'READ_ONLY',destinationKind:'NEW',
      classification:'NONCONFIDENTIAL_ONLY',logPolicy:'synthetic separate tool receipts',deletion:'EXPLICIT_OWNER_DECISION',
      issuedAt:10,expiresAt:30,retentionStart:10,retentionEnd:1000},
    save:{target:{...archiveTarget},approvalId:'synthetic-approval',actor:'a',exclusiveNewCopy:true,rawBytesMatch:true,previousEvidencePreserved:true},
    audit:{target:{...archiveTarget},approvalId:'synthetic-approval',actor:'b',acquiredFrom:'PERSISTENT_DESTINATION',exactBytes:true,
      centralDirectory:true,exactEntries:true,manifestCrcShaMatch:true,gitBindings:true,previousEvidencePreserved:true}};
}
it('design review acceptance stays separate from required persistent readback',()=>{
  expect(currentDecision()).toMatchObject({DESIGN_REVIEW_ACCEPTED:'YES',DESIGN_ACCEPTED:'PENDING_ARCHIVE',PERSISTENT_ARCHIVE:'BLOCKED',STAGE_AN_OVERALL:'PARTIAL'});
});
it('physical fact, decision and test status are distinct',()=>{
  expect(currentDecision()).toMatchObject({PHYSICAL_SAFETY_PROVEN:'UNKNOWN',PHYSICAL_SAFETY_APPROVAL:'NO',PHYSICAL_SAFETY_TEST:'NOT_TESTED'});
});
it('satisfied synthetic exercise never changes actual decisions',()=>{
  expect(evaluateSyntheticArchive(fixture())).toBe('SYNTHETIC_REQUIREMENTS_MET');
  expect(currentDecision(fixture())).toMatchObject({DESIGN_ACCEPTED:'PENDING_ARCHIVE',STORAGE_APPROVAL:'APPROVAL_MISSING',
    PERSISTENT_ARCHIVE:'BLOCKED',IMPLEMENTATION_APPROVED:'NO',QUALIFICATION_APPROVED:'BLOCKED',allowed:false});
});
const denials=[
 ['workspace readback',x=>x.audit.acquiredFrom='WORKSPACE','INDEPENDENT_READBACK_UNVERIFIED'],
 ['same reader and writer',x=>x.approval.reader=x.approval.writer,'APPROVAL_MISSING_OR_UNBOUND'],
 ['audit reuses writer',x=>x.audit.actor=x.save.actor,'INDEPENDENT_READBACK_UNVERIFIED'],
 ['no owner record',x=>delete x.approval,'APPROVAL_MISSING_OR_UNBOUND'],
 ['expired',x=>x.now=x.approval.expiresAt,'APPROVAL_MISSING_OR_UNBOUND'],
 ['wrong tree',x=>x.approval.target.tree='wrong','APPROVAL_MISSING_OR_UNBOUND'],
 ['alternate destination',x=>x.approval.target.destination='elsewhere','APPROVAL_MISSING_OR_UNBOUND'],
 ['confidential scope',x=>x.approval.classification='ALL','APPROVAL_MISSING_OR_UNBOUND'],
 ['archive scope drift',x=>x.approval.target.scopeManifestSha256='wrong','APPROVAL_MISSING_OR_UNBOUND'],
 ['broad write',x=>x.approval.writerScope='FULL_CONTROL','APPROVAL_MISSING_OR_UNBOUND'],
 ['existing area',x=>x.approval.destinationKind='EXISTING','APPROVAL_MISSING_OR_UNBOUND'],
 ['automatic deletion',x=>x.approval.deletion='AUTOMATIC','APPROVAL_MISSING_OR_UNBOUND'],
 ['logs unspecified',x=>delete x.approval.logPolicy,'APPROVAL_MISSING_OR_UNBOUND'],
 ['retention unspecified',x=>delete x.approval.retentionEnd,'APPROVAL_MISSING_OR_UNBOUND'],
 ['modified original',x=>x.save.previousEvidencePreserved=false,'SAVE_UNVERIFIED'],
 ['copy mismatch',x=>x.save.rawBytesMatch=false,'SAVE_UNVERIFIED'],
 ['write receipt wrong grant',x=>x.save.approvalId='wrong','SAVE_UNVERIFIED'],
 ['incomplete 208 entries',x=>x.audit.target.entries=208,'INDEPENDENT_READBACK_UNVERIFIED'],
 ['central directory unverified',x=>delete x.audit.centralDirectory,'INDEPENDENT_READBACK_UNVERIFIED'],
 ['manifest corruption',x=>x.audit.manifestCrcShaMatch=false,'INDEPENDENT_READBACK_UNVERIFIED'],
 ['git binding missing',x=>delete x.audit.gitBindings,'INDEPENDENT_READBACK_UNVERIFIED'],
 ['no audit',x=>delete x.audit,'INDEPENDENT_READBACK_UNVERIFIED'],
];
for(const [name,mutate,expected] of denials)it(name,()=>{
  const input=fixture();mutate(input);
  expect(evaluateSyntheticArchive(input)).toBe(expected);
  expect(currentDecision(input).allowed).toBe(false);
});
it.each([true,{},null,'OWNER_APPROVED',{kind:'REAL_APPROVAL'}])('refuses arbitrary input %#',input=>{
  expect(evaluateSyntheticArchive(input)).toBe('SYNTHETIC_INPUT_REQUIRED');
  expect(currentDecision(input).IMPLEMENTATION_APPROVED).toBe('NO');
});
