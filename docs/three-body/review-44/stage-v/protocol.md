# Stage V fixed protocol — recorded before browser measurement

Baseline9779cdb796eac3dab00f0ac73561cdf33be3ccdf; review5863884642; branch feat/017-three-body-dance, Issue43 OPEN, PR44 Draft, no auto-merge. Initial working tree clean, baseline tree376a41fd231c3d4ea65c14133b8e910c8113095b. origin/main9167e979b3c954e355d67c2b80e01dc4e733d8cc; no branch/head divergence observed. No repository AGENTS.md found; supplied final-JST instruction applies. Past P/Q/R/S/T/U evidence, failure history, SHA ledgers and source files are read-only.

## Primary fixed cohort (8 per environment)

Reuse the unmodified Stage U makeFixture, installStageQ/installMinimal and existing tape. source state26000, tape SHA3080cf71635e04f98f62d13927de156c142c7828a0674b548e2a65e512129291,3181 commands per Canvas, physical trail6000/graph1200 represented by the prerecorded source. The frozen diagnostic frame30 is not a live physics step. Same fresh Chromium/context/page/session each trial; headless SwiftShader flags --use-angle=swiftshader --enable-unsafe-swiftshader; viewport1280x900, DPR2, Canvas2, CSS438x330/backing876x660. Stage U's fixed Emulation.setDeviceMetricsOverride is common setup. SystemInfo.getInfo and Browser.getVersion are metadata collected before fixture creation for both groups. No live physics, explicit layout request, pre-operation bitmap readback, page.screenshot or API fallback.

|Order|Context|Trace|Repeat|
|---:|---|---|---:|
|1|default|OFF|1|
|2|readback|ON|1|
|3|default|ON|1|
|4|readback|OFF|1|
|5|readback|OFF|2|
|6|default|ON|2|
|7|readback|ON|2|
|8|default|OFF|2|

Here readback is the context name (willReadFrequently:true), not an explicit getImageData intervention. Explicit readback stays OFF in all8 primary trials. The single measured command is Page.captureScreenshot with exact Stage U parameters: format png, fromSurface true, clip{x:0,y:0,width:1280,height:900,scale:1}, captureBeyondViewport false. The per-command deadline stays5000ms. Timeout has no invented response timestamp. Late reply cannot pass. Success-only pixel checks occur after the command and after trace end, outside the measured interval. No captured pixels are judged for missing images.

## Trace treatment and clocks

OFF sends no Tracing command, starts no profiler/LongTask observer, and has no internal markers. ON uses the standard Chrome tracing backend, legacy JSON/gzip ReturnAsStream, recordContinuously, bounded buffer65536KiB, no system tracing, no screenshots category, no explicit GC. Request standard categories for toplevel/JavaScript/GC/user timing/devtools timeline/cc/gpu/viz/skia/renderer.scheduler/sequence_manager/ipc and available devtools protocol diagnostics; save requested and advertised categories. Unsupported setup is an acquisition failure, not an OFF substitute. No ETW/kernel trace, privilege change, dependency/tool addition or GPU/OS configuration change.

Start trace only after the fixture has frozen, so prior draw work is not part of the main capture interval. Trace ON includes necessary calibration/identity commands as part of its diagnostic treatment; ON/OFF differences cannot isolate tracing from these extra commands. Runtime.evaluate performance.mark with unique trial names identifies the actual target renderer main pid/tid. Two browser clock-sync marker requests before and two after capture bracket their event times against harness performance.now. Page identity marker requests also save send/ack brackets. Only uniquely identified actual events with compatible clock brackets can be aligned; missing, duplicated, inconsistent or mismatched pid/tid markers produce NOT_OBTAINED/UNCALIBRATED, never zero wait.

T0 harness capture send; T4 actual reply (null on timeout); deadline finish is separate. T1 browser receipt/T2 handler or capture processing start/T3 processing end are NOT_OBTAINED unless a trace schema and unique request/target correlation support those exact endpoints. Events that merely mention capture, snapshots or waits remain candidates, not endpoints. CDP wire IDs are not exposed by public Playwright; record truthful logical IDs/actual target ID. Trace ts/dur and thread tts/tdur retain their domains/units. Sum interval unions only within a named pid/tid; do not sum parent/child CPU or allocate wall-minus-CPU to IPC/OS/GPU. Event overlap is not causation, and a missing event does not establish no work. Native/OS/GPU mechanism and original1249ms common cause remain UNKNOWN absent direct evidence.

Trace completion has a separate10000ms acquisition deadline, each stream read5000ms, and max192MiB stream output. These bounds do not extend the capture5000ms budget. Stop trace and acquire whatever evidence exists before browser cleanup. Cleanup keeps Stage U's5000ms failure budget plus bounded10000ms observation solely to confirm safe disposal. Late cleanup remains FAIL. If disposal cannot be confirmed, block later trials; run-local capture/trace failures do not block independent fresh trials. Never discard partial stream/error data.

## Independent auxiliary readback cohort (6, after primary)

A small separate cohort is necessary because Stage U could not distinguish handler entry from an unreturned Runtime request. Fixed sequence: default marked, readback marked, default unmarked, default unmarked, readback marked, default marked. Each of3 conditions has2 repeats, fresh browsers, same static state, trace ON. No screenshot/layout operation in auxiliary trials. The normal marked context is the observer-positive control; the old unmarked condition tests the added internal-marker treatment. All auxiliary calls explicitly getImageData on2 Canvases, with the same handler body/conditional marker calls and retained returned arrays. Marked handlers emit unique performance.mark events at handler start, before/after each call, normal return or exception. Unmarked handlers emit no internal markers. Save exact Runtime expression/parameters and original exceptions.

Runtime request5000ms unchanged, response null if absent. Extract any acquired internal marks from the trace even when the handler does not reply. Pre/post markers are part of instrumentation and can influence behavior; successful current-context marks do not prove a specific old-context native cause. No reply is neither5s CPU nor zero executed calls. If evidence is inconclusive, stop after6; do not add probes.

## Predictions, acceptance and stop

Default capture OFF and ON both timeout would refute tracing as a necessary cause here. ON-only outcome changes support an instrumentation interaction only; n=2 has no tail guarantee. Accurate unique capture endpoint events could narrow the blocked stage; absence yields UNKNOWN. Marked readback start/before without after can localize the observed JavaScript boundary but does not prove CPU execution or OS wait. Unmarked/marked differences are limited to this auxiliary treatment. Old default/current differences are not product optimization evidence.

Primary8 plus auxiliary6, total14 planned per local environment. Start Windows local; execute the same cohort on hosted Windows/Linux only if existing Chromium preparation succeeds. Save plan before CI dependency preparation. Environment failure => BLOCKED/NOT_RUN, never supplement from another environment. One predeclared cohort per environment; no adaptive exploration or browser retries. Diagnostic negative tests must detect missing response/trace, false endpoints, PID/TID mismatch, invalid calibration, incomplete plans, run-local continuation and raw/summary/manifest/index corruption, missing/duplicate sets and hashes. Completion, acquired evidence and acceptance are distinct. Actual capture failure keeps FAIL and a nonzero diagnostic CI exit.

Product code changes0, performance improvement NOT_TESTED, no worker/offscreen/cache/API adoption. Existing budgets/tolerances/skips unchanged. Re-run six bit/history cases, RK4/20-period/triangle/convergence, all unit/type/build, one targeted development/production GUI cohort; preserve the previously failed DPR1 case and Windows unit failures. Any followup must have a stated reason/count; do not rerun into green. Final existing formal CI supplies all-artworks GUI if its preparation succeeds; otherwise NOT_RUN/BLOCKED. No CI environment DNS fix/OS setting change is part of Stage V.

Store raw/trace/PNG/source snapshots/failures/index/CI ZIP in isolated Stage V roots; public Git only small anonymized summaries/index and representative image. Non-destructive exclusive Windows archive copy under approved Math-Art-Lab/PR-44-three-body-dance/stage-v, source/destination capacity/set/size/SHA checks and separate-process reread. Keep LOCAL_BACKUP_VERIFIED conditional on actual success, REMOTE_BACKUP_NOT_UPLOADED. Record actual artifact IDs/run/digest/expires_at/acquisition. Post final-head CI/tree/evidence/results on existing Issue43/PR44 and stop Draft, OPEN, no merge.

## Primary API references

- https://chromedevtools.github.io/devtools-protocol/tot/Tracing/ — Chrome tracing, clock sync marker and completion/data-loss metadata; runtime support is recorded rather than assumed from changing tip-of-tree documentation.
- https://chromedevtools.github.io/devtools-protocol/ — protocol/version scope; exact browser version/revision is saved per trial.
- https://chromium.googlesource.com/devtools/devtools-frontend/+/HEAD/front_end/panels/timeline/docs/tracing_profiling.md — trace start/end/complete acquisition lifecycle.

## Harness-boundary recording clarification (after the sole local cohort, before hosted cohorts)

The unchanged Stage U timedRequest measures wrapper start and first reply/deadline. Its CDP send runs in a following microtask, and it does not retain a reply occurring after its5000ms deadline. The sole local14 original records and source snapshots remain unchanged; exact local send invocation and late protocol callback time are NOT_OBTAINED. Trace handler-return markers beyond the deadline are not fabricated harness replies. No local trials are repeated.

A small harness-only correction records the actual CDPSession.send invocation and resolve/reject callback separately in both OFF/ON hosted conditions. Deadline status remains immutable: a late reply or cleanup-induced rejection cannot make a timeout PASS. Preserve wrapper timing, actual callback kind/phase and within-deadline reply separately. The call boundary is not exact pipe transmission. This adds no browser command, changes no fixture/parameters, and is not a product fix. Hosted source hashes identify the corrected version; no improvement comparison against the initial local timing definition is claimed.
