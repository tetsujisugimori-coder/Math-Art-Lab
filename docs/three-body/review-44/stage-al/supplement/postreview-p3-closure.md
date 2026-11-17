# Stage AL postreview P3-AL02 / P3-AL03 corrective supplement

Review anchor: PR #44 COMMENT review 5938640789; Stage AL predecessor a627fa944b31b2e98e2dcb3908e2d84d62cd302f. The predecessor's AL-review-v2, 672/672 Vitest result, source-binding JSON, and Windows archive remain historical originals, not evidence of new code execution or independent acceptance.

## P3-AL02: mock registration must model durable enrollment separately from physical proof

The pure recoveryTrace ENROLL transition now requires an explicit *synthetic* external-ledger record: exact modeled type, durable-write flag, independent readback flag, nonce-ledger readiness, target and epoch binding, nonblank matching record IDs, and strict 64-hex matching record/readback digests. Missing/false/mismatched fields reject with ENROLL_PROOF_NOT_OBTAINED, keep enrollment NOT_ENROLLED, and freeze later STOP/VM_STOPPED facts as BLOCKED. A synthetic match is never real persistence, authenticated readback, or enrollment permission: physical remains NOT_TESTED and actual R guarantee NONE. In a future physical implementation, real independently retained external raw records, source identity, byte count, SHA-256, authorized target/session/epoch and credential/ACL confirmation are separately mandatory. No mock boolean can grant admission to a guest VM.

## P3-AL03: failure reasons remain distinguishable

Synthetic CREDENTIAL_REVOKED and VM_ROLLBACK are now separate explicit failure events. Each preserves its own error code in the result, sets remaining BLOCKED, and rejects promotion by later VM_STOPPED or other evidence. New enrollment under changed credential or VM generation requires separate explicit approval and new identity/epoch; this supplement does not implement re-enrollment.

## Static-only test cases and limits

The dedicated Stage AL tests now include missing/false/mismatching enrollment evidence and both named failure reasons. These tests must be executed in the same case-isolated exact-test config; the original Vitest and physical observer/Job/R/VM/browser are excluded. The previous 672/672 result belongs strictly to predecessor a627fa9 and **must not be reused as the updated result**. New code and its tests require rerun plus independent review and evidence retention before P3 closure can be declared PASS.

No native component A-G/R, IPC, credential, VM, STOP, physical test, original Vitest, workflow, policy or dependency is changed. Gate remains PLAN_ONLY / APPROVAL_MISSING / HOLD / allowed=false, physical qualification BLOCKED, and PR #44 Draft / merge NO. The prior review and storage records are immutable; the new postreview commit will be independently identified by Git SHA and tree after publication.
