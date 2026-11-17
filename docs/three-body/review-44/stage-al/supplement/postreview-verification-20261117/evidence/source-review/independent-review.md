# Independent Stage AL P3 source review

Reviewer: al_p3_source_review; distinct from implementer and root formal-test operator.
Target: 88b9a85ee901084929afdc208ab5921d4f2a7c99 / tree254e168697086fb38b01134951b7c89d7c14934a. Fix17346c435f15d354423def224937720221d1736d; predecessor a627fa944b31b2e98e2dcb3908e2d84d62cd302f.

## Direct evidence and source-version alignment

I directly retrieved the GitHub commit API and contents API for all three revisions, contract/fixture/test/config (12 file versions), saving original API responses and decoded raw bytes. Git blob header SHA1, raw SHA256 and size match GitHub metadata and repository objects; updated logical bytes match actual checkout. Updated and fix commits have identical tested code; the later commit adds documentation/evidence only. Exact acquisition rows and GitHub URLs are in github-source-binding.json. I fetched review5938789436 and PR44 independently. PR44 remains bca7eb3abedf51679eaffff2f8eaee15b86b5ab6, Draft, no auto-merge.

## P3-AL02

PASS in synthetic pure-contract scope. ENROLL requires an explicit record of kind SYNTHETIC_EXTERNAL_LEDGER with strict booleans durable/independentReadback/nonceLedgerReady/targetBound/epochBound, nonblank record ID equal to readback ID, strict lowercase64hex record digest equal to readback digest. Missing, malformed or mismatched claims return ENROLL_PROOF_NOT_OBTAINED and leave enrollment NOT_ENROLLED and remaining BLOCKED. STOP, API_ACCEPTED, VM_STOPPED, GUEST_EXIT, RESOURCE_RELEASED, PERSISTED and later valid enrollment cannot clear the failed cohort. This is schema/state consistency over synthetic claims, not a real authenticated/persisted external record.

## P3-AL03

PASS in synthetic pure-contract scope. CREDENTIAL_REVOKED and VM_ROLLBACK each retain the exact named error, guarantee NONE and remaining BLOCKED. Later success or reenrollment does not promote VM stop or any other lane. The predecessor produced UNKNOWN_OR_MISSING_INDEPENDENT_PROOF rather than the requested specific reason. No real credential revocation/VM rollback was performed.

## Direct old/new execution

independent-probes.mjs imports the GitHub-downloaded predecessor and updated sources, using identical enrolled identity/events/expectations.31 finite cases:30 actual old RED,1 BASELINE_PASS positive,31 updated GREEN. This includes required official failures plus null/array/string proof, truthy nonboolean fields, missing/blank/type-invalid record IDs, missing/uppercase/null/mismatching SHA, successful late events and reenrollment. Full inputs, expected values and returned objects are in independent-probes-results.json. Old output lacks the newly added enrollment-state field; baseline classification excludes that new-only field so no RED is invented from an additive schema difference.

## Formal test crosscheck and independent rerun

I directly parsed root's new per-test JSON and previous historical672 JSON as multisets of suite-relative path plus fullName: all672 old test occurrences are present, exactly14 new cases,0 removed. Root new686 all passed. New14 comprise one positive synthetic enrollment assertion,11 proof-rejection cases and2 distinct-reason/latch cases. test-id-crosscheck.json lists every new ID.

I then independently ran the exact dedicated Stage AL config, separate TEMP and separate per-test JSON:686 total/686 PASS/0 FAIL/0 SKIP/0 NOT_TESTED, exit0. This is a fresh execution, not reuse of old672. vitest-independent-run.json records command/head/tree/start/end/TEMP, and vitest-independent.json is the raw per-test result. independent-test-index.json assigns occurrence ordinals where fullNames repeat, yielding686 unique result IDs without dropping duplicate tests.

## Closure, gate, regressions and prohibited scope

I read all49 local import-closure source files, matched each actual source SHA to commit88 and checked the recorded10 roots. No runtime import reaches src/three-body.test.ts. Original source read/AST inspection remains source-only. Literal dynamic matcher adapter and preinstalled YAML parser are the only reviewed dynamic exceptions; unused AE/AC physical-capable exports and guarded CLI entrypoints are not invoked. AF identity/Git functions receive explicit mock data/callbacks. Third-party runner internals beyond resolved package roots are not universally expanded.

AK28 Git blob/raw SHA and initial checkout SHA independently match all28 rows, including separately acknowledged newline conversions. Product/original test/AH/seal/ABAC policy/workflow/dependency diff between predecessor and updated source is empty. Five direct gate requests against the GitHub-downloaded code remain PLAN_ONLY/BLOCKED/APPROVAL_MISSING/HOLD/allowedfalse/physical NOT_TESTED. Existing AH/AI/AK regressions are covered in both686 runs.

## Decision and limits

No new P1/P2 finding in reviewed pure synthetic scope. P3-AL02 and P3-AL03 independent source/regression review PASS. Final formal closure remains conditional on independent retrieval/audit of the stored original ZIP plus correct GitHub report/readback; those are outside this review and cannot be inferred from test success.

NOT_VERIFIED by this reviewer: independent typecheck/build rerun, durable ZIP preservation/retrieval/CRC/manifest audit, later reporting commits or push, real API/native/VM/Job/IPC/authenticated persistence/R behavior. Physical implementation approval NO; qualification BLOCKED; AK01 actual guarantee NONE; AK02 physical UNKNOWN; original-stop NOT_TESTED; PR44 Draft/mergeNO.

2026-11-17 22:22:25 JST
