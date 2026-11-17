// This contract describes the current decision and evaluates synthetic controls.
// It performs no storage, authentication, environment discovery, or authorization.
export const archiveTarget = Object.freeze({
  repositoryId: '1428326650',
  pr: 44,
  head: '4252075c092280e2ccbf6b9f5e9fb7ac96044d91',
  tree: '4d4f72fd5fdac3b7061bbfdffc6e9a73f04019f2',
  destination: 'C:\\Users\\tetsu\\Dev-Artifact-Archive\\Math-Art-Lab\\PR-44\\Stage-AN-20261118',
  entries: 209,
  bytes: 809577,
  sha256: '6526020fa8420f1a54ee53520a869d646220152dd3182fc8d19e63049c7827b0',
  manifestSha256: 'abee846f6a3be13f1ee81fdd42e7af812004c544707c848e5e132060e825392d',
  manifestCrc32: '2307164c',
  scopeManifestSha256: 'fd77bf39039cb7db713d6a46d1c653e9914854ff4e61e3b07421babd2d92e886',
});
const record = x => x !== null && typeof x === 'object' && !Array.isArray(x);
const term = x => typeof x === 'string' && x.trim().length > 0;
const time = x => Number.isSafeInteger(x) && x>=0;
const exactTarget = x => record(x) && Object.entries(archiveTarget).every(([key,value])=>x[key]===value);

export function evaluateSyntheticArchive(input) {
  if (!record(input) || input.kind!=='SYNTHETIC_ONLY') return 'SYNTHETIC_INPUT_REQUIRED';
  const {approval, save, audit, now}=input;
  if (!record(approval) || !exactTarget(approval.target) || approval.kind!=='SYNTHETIC_OWNER_RECORD' ||
      !term(approval.id) || !term(approval.owner) || !term(approval.writer) || !term(approval.reader) ||
      approval.writer===approval.reader || approval.writerScope!=='CREATE_IN_NEW_DIRECTORY_ONLY' ||
      approval.readerScope!=='READ_ONLY' || approval.destinationKind!=='NEW' ||
      approval.classification!=='NONCONFIDENTIAL_ONLY' || !term(approval.logPolicy) ||
      approval.deletion!=='EXPLICIT_OWNER_DECISION' ||
      !time(now) || !time(approval.issuedAt) || !time(approval.expiresAt) ||
      !time(approval.retentionStart) || !time(approval.retentionEnd) ||
      approval.issuedAt>now || now>=approval.expiresAt || approval.retentionStart>now || now>=approval.retentionEnd ||
      approval.retentionStart<approval.issuedAt) return 'APPROVAL_MISSING_OR_UNBOUND';
  if (!record(save) || !exactTarget(save.target) || save.approvalId!==approval.id ||
      save.actor!==approval.writer || save.exclusiveNewCopy!==true || save.rawBytesMatch!==true ||
      save.previousEvidencePreserved!==true) return 'SAVE_UNVERIFIED';
  if (!record(audit) || !exactTarget(audit.target) || audit.approvalId!==approval.id ||
      audit.acquiredFrom!=='PERSISTENT_DESTINATION' || audit.actor!==approval.reader ||
      audit.actor===save.actor || audit.exactBytes!==true || audit.centralDirectory!==true ||
      audit.exactEntries!==true || audit.manifestCrcShaMatch!==true || audit.gitBindings!==true ||
      audit.previousEvidencePreserved!==true) return 'INDEPENDENT_READBACK_UNVERIFIED';
  return 'SYNTHETIC_REQUIREMENTS_MET';
}

export function currentDecision(input) {
  return {
    DESIGN_REVIEW_ACCEPTED:'YES',
    DESIGN_ACCEPTED:'PENDING_ARCHIVE',
    STAGE_AN_OVERALL:'PARTIAL',
    STORAGE_APPROVAL:'APPROVAL_MISSING',
    PERSISTENT_ARCHIVE:'BLOCKED',
    ENVIRONMENT_FROZEN:'BLOCKED',
    PHYSICAL_SAFETY_PROVEN:'UNKNOWN',
    PHYSICAL_SAFETY_APPROVAL:'NO',
    PHYSICAL_SAFETY_TEST:'NOT_TESTED',
    IMPLEMENTATION_APPROVED:'NO',
    IMPLEMENTATION_APPROVAL_STATE:'APPROVAL_MISSING/HOLD',
    QUALIFICATION_APPROVED:'BLOCKED',
    allowed:false,
    syntheticArchive:evaluateSyntheticArchive(input),
  };
}
