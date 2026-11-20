# Stage Z results

Overall PARTIAL. Product changes 0; performance improvement NOT_TESTED; merge NO. No Tracing.end trials. Historical six originals remain NOT_OBTAINED; historical backup LOCAL_BACKUP_PARTIAL_ORIGINAL_GAPS; REMOTE_BACKUP_NOT_UPLOADED.

## Preparation (no measurement browsers)

- Actual generated entry imports the observer, original-test runner, fixture and controller. Absolute module URLs derive from the generator location, not caller cwd. Normal and alternative cwd succeeded; deliberately wrong relative resolution failed. Interceptors recorded browser/child launch counts 0 during all three import checks.
- Old controller with real audit FAIL launched a mock and reported PASS (RED). Updated controller requires every prerequisite and audit status explicitly PASS. Nine process-path cases cover PASS, FAIL, BLOCKED, missing status, undefined return, invalid status, JSON parse exception, spawn failure and nonzero child exit. All expected outcomes and sealed indices passed. Audit failures launch 0; normal mock launches exactly 1. Failed spawn is an attempted launch, not a successfully started child.
- Eleven additional unit tests cover real index corruption, thrown audit, missing prerequisites and child failures. Execution result and evidence verification are separate fields; persisted result's NOT_VERIFIED is not silently upgraded. Independent index verification supplies evidence acceptance.
- Initial explicit V/W/X tests: 86 assertions PASS, process PASS. Final explicit V/W/X/Z list: 97 assertions PASS, process PASS. No skip added. Dedicated config selects current source files; archived snapshots are preserved as evidence, not current executable tests.
- Real Actions transfer run43292633910 succeeded: narrowly scoped three-file fixture including `.hidden.json`, upload/download and local API ZIP re-acquisition. Artifact13979006347, SHA256 `5c02b7ecc9d2e11623138294851875ed4c97617e4843a32536540c1b15a469d3`, 648 bytes, expires_at2026-11-26T19:47:33Z. Exact set/size/content SHA verified. This does not recover old missing originals or establish completeness of unrelated artifacts.

## Fixed observer cohort

Source/plan committed at79c396c5fa460a7e01c348c9d71154b704d5001a before execution. Actual file/index/test-list/transfer audits returned PASS through orchestrate before each measurement command.

| Trial | Result | Measurement browser |
|---|---|---|
| z-minimal-off | PASS; identity/prototype/receiver/return/chaining, cleanup | 1 |
| z-minimal-on | PASS; same checks plus click-issued/click-returned/step-read events | 1 |
| z-original-v | BLOCKED; bound child argument error before test preparation | 0 |
| z-original-w | BLOCKED; not started after error | 0 |

Windows WebKit26.0, Playwright1.58.2/revision2248. Two measured trials, two unexecuted, one diagnostic process failure. The original cohort subprocess exited1: function invocation supplied output in memory, while launchBound forwards process.argv; bound child received `--bound=...` as argv[2] and interpreted it as output directory. ENOENT was retained. This is an execution-adapter defect, not an import failure, Locator defect, or product pause failure. Actual import success cannot establish argument-adapter execution correctness.

Stopped immediately; no replacement/retry, no post-failure product measurements. Original stop timeline, 200ms internal/DOM checks and V/W source-restoration execution are NOT_OBTAINED. Existing insertion code is not evidence that those checks ran. Next separately authorized plan should first test function-to-bound-child argument propagation with a browser-free child, then fix the adapter and freeze a new cohort. Do not reuse these IDs.

## Historical failures retained

Stage Y entry resolved `../../../tools/...` outside the repository; old source/records unchanged. Its four trials remain BLOCKED. Its 86 successful assertions did not make the process PASS: archived stage-v, stage-w, stage-x snapshot suites failed collection due to unavailable relative imports. New explicit selection fixes current command scope without altering snapshots.

Formal run43227135133 is FAIL: unit/type/build success, development603PASS/1FAIL/2skip, productionNOT_RUN. Failure: WebKit reaction-diffusion-checks.ts disposed Worker test, `Target page, context or browser has been closed`. Root cause UNKNOWN; distinct from preparation and original segregation stop symptom. Original artifact13949674113 acquired unchanged: 46,123,457 bytes; API/ZIP SHA256 `ce6dca447a6b330b1d3a4f620254b89e724f35d8cd5b083d77eb6845fc48d501`; expires_at2026-11-26T13:55:52Z.

H1–H3, native/GPU/OS mechanism, 400ms/1249ms same-cause hypothesis unchanged UNKNOWN. No performance budget achievement claimed. Windows minimal observer success does not resolve Linux cumulative stop inconsistency.
