# Stage W fixed protocol (before acquisition)

Baseline 1e2e895826e69ab0ce8ad06e92d3e8c60a081313, review5866092831. Existing branch/Issue43 OPEN/PR44 Draft; no merge/auto-merge. Start tree aebbe16609ae24e15b38e856942e0e23146681a2, clean; origin/main9167e979b3c954e355d67c2b80e01dc4e733d8cc. Prior evidence/history is immutable. Product changes0, improvement NOT_TESTED, existing budgets/tolerances/timeouts unchanged.

## Diagnostic corrections, separate from browser experiments

P2-02: save baseline RED cases for on-time success, late success, cleanup rejection, no callback, deadline/callback race, fabricated T1–T3. T0 is actual CDPSession.send invocation in harness performance.now; wrapperStartedAt is separate and exact wire transmission is NOT_OBTAINED. Absolute deadline=T0+5000ms. T4 is only a normal protocol reply observed at/before deadline and before timeout decision. At equal time first observed decision wins; TIMEOUT is immutable. A callback after that decision is late even if clock resolution gives equal timestamps. Protocol rejection never supplies T4. Preserve callbackObservedAt/lateCallbackAt, responseKind and MEASURED_REQUEST/POST_DEADLINE/BROWSER_CLEANUP separately. deadlineObservedAt is actual decision observation, not invented due time. Missing legacy fields remain missing; old wrapper T0 is not recast as actual send. New audit results never rewrite old raw.

P3-06: bind execution HEAD/tree, exact runtime snapshot bytes/SHA256/blob ID, acquisition source reference, manifest and artifact index. Execute the diagnostic runner from exclusively created source snapshots; verify the runtime module paths/bytes before each trial. Record dirty diagnostic snapshots explicitly for local acquisition before commit; CI uses its actual checkout. Git HEAD blob bytes and checkout bytes are separate. Raw SHA cannot be replaced by LF-normalized comparison; logical newline equality is an additional field only. Reject swapped/missing/duplicate files, wrong revision/tree/HEAD/reference/index. Legacy absence means UNKNOWN, not reconstructed attestation. Record the independent auditor revision separately. Source-tree/file observations are not a kernel-level attestation of V8 execution or external dependencies; versions of Node/Playwright/esbuild/browser are recorded.

## Fixed primary cohort: 12 per environment, one cohort only

|Order|Context|Trace start|Repeat|
|---:|---|---|---:|
|1|default|OFF|1|
|2|readback|before navigation/draw|1|
|3|default|after frozen frame30|1|
|4|readback|OFF|1|
|5|default|before navigation/draw|1|
|6|readback|after frozen frame30|1|
|7|readback|after frozen frame30|2|
|8|default|before navigation/draw|2|
|9|readback|OFF|2|
|10|default|after frozen frame30|2|
|11|readback|before navigation/draw|2|
|12|default|OFF|2|

Start Windows local; repeat exactly this cohort once on hosted Windows and Linux only if preparation succeeds. No auxiliary readback cohort and no retries/additional browser trials. All explicit pre-capture readback OFF. "readback" is willReadFrequently:true, not getImageData intervention. Stage U static fixture is reused without changes: same HTML function/tape, frame30, no live physics, tape SHA3080cf71635e04f98f62d13927de156c142c7828a0674b548e2a65e512129291,3181 commands/Canvas. The source state26000 represented trail6000/graph1200, not live histories in the fixture.

Fresh browser/context/page/CDP session each trial. Existing Chromium145.0.7632.6 / Playwright1.58.2, flags --use-angle=swiftshader --enable-unsafe-swiftshader, viewport1280x900/DPR2,2 Canvas CSS438x330/backing876x660. Record actual versions/revision/features; a different browser/Playwright version blocks the cohort, never silently pools versions. Same Page.captureScreenshot parameters as U/V, fixed5000ms. No explicit Page.getLayoutMetrics, Playwright screenshot replacement, API fallback, GPU/OS setting changes or kernel ETW.

Early trace starts and acknowledges before page.goto, so the unchanged fixture's initial scheduled render/Canvas creation and subsequent frames are included. This needs no fixture source edit. OFF/late have the same pre-navigation50ms harness wait; all have post-freeze100ms wait and post-treatment50ms wait. Late starts tracing after frozen frame30; early stays active; OFF sends no Tracing command. Tracing/category and calibration RPC overheads differ and are disclosed, not called a pure tracing CPU cost. Source/tape/HTML canonical hashes, state, dimensions and post-capture bitmap checks verify fixture equivalence. Stage V lacked these explicit waits and used a different time-boundary version: cross-stage RTT differences are confounded and are not improvement percentages.

Trace parameters/categories/buffer/read/completion limits and strict clock/PID/TID validation are Stage V's. Only ON groups issue actual unique page/browser marks. Browser sync before/after capture, and target-page identity after navigation identify the measured renderer. Early-start coverage is established by trace-start acknowledgement before navigation invocation, plus acquired trace navigation/script/candidate events; event name alone does not bind a protocol request. Save raw PID/TID/ts/tts/dur/tdur and candidate args/flows. T1–T3 stay NOT_OBTAINED absent direct request/target mapping. Process-local async IDs are never joined across PIDs without an explicit flow. Interval union within one thread, no parent/child double sum or wall-minus-CPU allocation. GPU presentation/kernel scheduler NOT_OBTAINED. Root and original1249ms/400ms common cause UNKNOWN unless independently supported.

## Bitmap comparison, acceptance, stop and storage

Only acquired PNGs are decoded/compared. Same-capture Canvas pixel checks run after trace end, outside capture. Preserve PNG/decoded RGBA SHA, dimensions, per-Canvas CSS/backing, exact command/state hashes, and cross-context differing RGBA channel count, max differences and positions/difference image. Distinguish decoded captured image versus actual Canvas pixel checks; command hash is not bitmap identity. Missing image => NOT_OBTAINED. Never alter drawing to eliminate differences. Cross-context different bitmaps are not an equivalent-output performance comparison.

Run-local capture failure permits later fresh independent trials; unconfirmed browser disposal or environment/source mismatch blocks remaining trials and preserves partial evidence. Trace completion10000ms, stream read5000ms/max192MiB, cleanup5000ms plus bounded10000ms observation solely for disposal retain existing limits. Capture5000ms is never extended. Record all12 PLANNED/RUNNING/PASS/FAIL/BLOCKED, completion and acceptance separately. No p95/tail guarantee from2 observations/cell; no performance budget achievement declaration. Stop at the fixed count, or BLOCKED for serious inconsistency/capacity/environment failure.

Re-run bit/history6 cases, independent RK4/20-period/triangle/convergence, all unit/type/build, one existing target development and production GUI cohort, and final-HEAD existing formal/diagnostic CI. Old local4 timeout and focused WebKit wave1 failure are preserved; no retry into GREEN/skip addition/timeout extension. New diagnostic negative tests are not product regression results.

Full originals/source snapshots/traces/PNGs/diffs/raw/manifests/indices/failures/CI ZIPs go to independent Windows stage-w under the approved archive. Exclusive non-destructive copy, capacity checks, source/destination set/size/SHA and separate-process reread; old stage folders unchanged. Public Git only small anonymized summaries/indices/representative counterexamples. LOCAL_BACKUP_VERIFIED only on success, REMOTE_BACKUP_NOT_UPLOADED maintained. Record real artifact ID/run/digest/expires_at/obtained status. Final HEAD/tree/results/remaining UNKNOWN on existing Issue/PR, independent review requested, Draft/OPEN maintained, merge NO.
