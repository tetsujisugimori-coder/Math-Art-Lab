# Stage U protocol — fixed before measurement

Baseline7c5f7845e7b5db31c915b4a3e2749d18b2c1be20, review5859191700, Issue43 OPEN, PR44 Draft, no auto-merge. No AGENTS.md file was found in the repository; the supplied instruction to include the final JST timestamp applies. Existing P/Q/R/S/T files and ledgers are read-only.

## Primary plan and limits

Windows local Chromium, then the existing hosted Windows/Linux Chromium environments. Per environment24 fresh-browser trials: old/default context first12, current/readback context second12. For each context perform four blocks: operation order ABC, CBA, ABC, CBA; block readback OFF, ON, ON, OFF. Each of A/B/C consequently has exactly2 OFF and2 ON samples (ABBA). No adaptive extra trials, trace, Worker input source, LongTask observer or native API wrappers. No kernel ETW, privilege work, installations or GPU/OS settings changes.

A = Page.getLayoutMetrics only. B = Page.captureScreenshot only. C = layout then capture. Same dedicated Playwright CDPSession object and actual target within a trial; fresh browser/session per trial. No page.screenshot. Capture parameters fixed for B/C: PNG, fromSurface=true, clip{x:0,y:0,width:1280,height:900,scale:1}, captureBeyondViewport=false. C never derives capture parameters from its layout reply. Both requests have separate5000ms deadlines; a failed layout blocks C's capture, with NOT_TESTED rather than invented zero time. No API substitution/retry/timeout extension.

Launch --use-angle=swiftshader --enable-unsafe-swiftshader, viewport1280x900, DPR2, Canvas2, CSS438x330/backing876x660. Explicit Emulation.setDeviceMetricsOverride is constant setup, matching Stage T pixel-check conditions, and is recorded separately. GPU feature metadata is collected before fixture creation, not between measured calls.

Reuse Stage Q installMinimal and its exact Canvas tape generated from immutable b07 source at physics step26000 (history6000/graph1200). No live physics in this minimal page. Diagnostic frame count is not physics time. One explicit change from Stage T's1200ms timed window: stop on the30th committed diagnostic frame and allow its final same-frame draw, so DOM/frame/bitmap state is fixed rather than29/30 frames depending on scheduling. Existing drawing/DOM/geometry code otherwise unchanged. Record tape SHA, canonical HTML SHA, rendered HTML SHA, before/after frame state and dimensions. No snapshot() geometry reads after freeze; metadata reads use Canvas width/height/style and previously obtained context attributes. Existing geometry reads inside the reused drawing fixture are not a CDP layout request.

Readback ON performs only explicit getImageData on the two Canvases immediately before A/B/C, retains the arrays, and records node/page elapsed intervals separately. Hashing retained pixels occurs after the measured operation; no pre-operation digest/PNG decode. OFF performs no getImageData/toDataURL/toBlob or equivalent bitmap read before the operation. Browser-internal readback is NOT_TESTED. Only successful captures undergo post-operation PNG decode/dimension/actual Canvas-pixel comparison. A never captures or evaluates captured-bitmap identity.

## Clocks and availability

Primary timestamps use one harness performance.now clock: request start, actual reply (null on timeout), finished/deadline, elapsed, and C layout-reply→capture-send gap. This is protocol RTT including transport/harness/browser scheduling, NOT browser execution or CPU time. Page readback wall times have their own clock domain; no cross-clock absolute comparison is made. Primary trace pid/tid, OS waits, native wait and GPU presentation are NOT_TESTED. Do not infer them from RTT.

Public Playwright CDPSession exposes no wire session/request ID: record an explicitly labelled unique logical session/request ID, the actual Target.getTargetInfo targetId, methods/parameters, and object identity for same-session C. Wire IDs remain NOT_EXPOSED; do not invent them or switch to a different CDP transport. Setup calls and measured calls are separate lists.

## Predictions and negative controls

Layout-alone delay would support a layout-request RTT hypothesis; capture-only failures with fast layout would refute layout as a necessary predecessor for those failures. C differing reproducibly from B would support an ordering interaction in this fixture. ON/OFF differing reproducibly would support the defined readback intervention, not its native mechanism. Mixed2-sample outcomes remain UNKNOWN. Shared slow replies alone do not identify OS/native/browser synchronization. Original1249ms common cause stays UNKNOWN.

Fake-transport tests must prove A calls no capture, B calls no explicit layout, C records both RTTs and its gap separately, timeout has null actual-reply time and fails, protocol errors fail, failed layout blocks subsequent capture, and screenshot errors are separate from state/math. Plan/manifest/raw/summary/image/artifact hashes/counts are audited. Independent fresh trials continue after run-local failures; invalid environment or evidence integrity blocks continuation. Completion, available evidence and acceptance are distinct.

## Stop, regression, storage

After the fixed24 trials per environment, stop with UNKNOWN/PARTIAL if mechanism is unconfirmed. Do not adopt product changes. Existing input budgets and30%/10% adoption criteria are unchanged and are not reinterpreted as CDP screenshot budgets. Re-run all unit contracts, typecheck/build, six Float64/history cases, independent reference, target development/production GUI and final formal CI. Retain timeouts/skips/unselected targeted cases explicitly.

New raw data stays isolated under Stage U. Copy to the already approved real Windows archive stage-u without modifying old stages, using exclusive copies and source/destination SHA/size/set checks. A separate process must reread and reverify before LOCAL_BACKUP_VERIFIED is reported. Per-file provenance records local/base commit+dirty tool hashes or actual CI run/artifact/commit. Publish only small anonymous summaries/index/source snapshots; record actual artifact ID/digest/expiry/acquisition. REMOTE_BACKUP_NOT_UPLOADED remains. Capacity/access failure stops backup without deleting evidence. Final commit/push updates only existing branch/Issue/PR, Draft maintained, no merge.

## Preparation failure and bounded continuation (before remaining trials)

First A/OFF layout reply2.2465ms and fixed frame30 state were acquired. The newly added5000ms cleanup watchdog expired; trial1 retained D_MEASUREMENT and the other23 were BLOCKED. The driver subsequently exited. A read-only owned-child check is required before resumption. No screenshot was attempted or failed in this first A trial.

Correction: cleanup's5000ms failure remains a failure. Observe the same close promise for at most a further10000ms solely to confirm disposal and permit independent later trials; this grace is not a longer acceptance budget and never makes a late cleanup PASS. If disposal stays unconfirmed, block remaining trials. Resume into a new evidence directory by importing completed trial1 byte-for-byte (including its failure), then execute only previously unexecuted trials2–24. Thus no condition exceeds its2 planned samples. Preserve old manifest/source version and the original harness clock domain for imported telemetry. The capture-evidence completeness field must also be false for an incomplete plan; an all-A acquired prefix is not complete capture evidence.

Telemetry correction after local collection: the first version's explicitGetImageDataCalls was assigned only after a successful handler reply. Its value0 on timed-out ON trials does NOT prove zero native calls. Those original bytes are retained. Derived reports mark actual native count NOT_TESTED for that case. The committed diagnostic version separates requested2, completed=null, response=null and TIMEOUT; OFF remains requested/completed0. The failed readback blocks the primary operation and leaves post-state unavailable rather than producing zero latency or a physical-state PASS. No additional local primary trials are scheduled.
