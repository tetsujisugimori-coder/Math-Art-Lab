# Follow-up: zero-size recovery wakeup

The earlier P3 PASS is placed on hold following CI run41683574524 at4038c87a5a8b5e359b34018e04cdb14c086c7874. CI reports354 passed,2 existing skipped,2 failed in WebKit; production job skipped. Both failures poll for successful completion after width0 is restored to100%. This is separate from the initial-page-load UNKNOWN.

An independent native-browser counterexample is now reproduced in both Chromium145 and WebKit26, without suppressing/stubbing ResizeObserver deliveries. ResizeObserver is wrapped only to record and forward native entries:

1. Wait for normal draw and initial observer deliveries. Canvas width757.84375, rendered step0/revision1/count2.
2. In one task set Canvas width0, synchronously step the mathematical model (schedules the application's rAF), and then register another rAF callback.
3. The application's callback runs first and finds zero width. In the later callback of that same rendering opportunity restore width100%.
4. ResizeObserver delivery sees the original positive size, equal to its last observed size, and emits no entry. The intermediate zero was not delivered as a historical event.
5. After multiple frames and500ms the Canvas is positive-sized but drawStatus remains zero-size, modelStep1/requestedRevision2, renderedStep0/revision1/count2. The old PNG remains unchanged. Page errors are empty.

This is a real product missed-wakeup defect: completion records correctly do not advance on the failed draw, but a return to displayable size can leave them permanently stale until another external event. The local counterexample proves the lifecycle gap. It does not independently prove that the Linux CI's exact failure chronology was identical; CI tracing is still needed for that attribution.

Evidence: resize-coalescing-check.mjs and resize-coalescing-red.json. Script uses the existing isolated Vite port4187 and no product edits. Add --green after a repair to require submitted/revision equality/renderedStep1 and an actual changed PNG in both engines. Initial-page-load failures remain separate UNKNOWN history.

Suggested repair: preserve a small set of zero-size surfaces and one low-frequency retry timer while document is visible. Retry only size readiness until a surface becomes positive, then go through the ordinary coalesced requestDraw. Do not issue Canvas commands or mark completion for a zero-sized surface. Stop/reconcile the timer when surfaces succeed, comparison is disabled, document hides, or view is disposed. Use cancellation/token identity so old callbacks cannot revive work. Native ResizeObserver remains the fast path, but no longer the sole liveness guarantee.

A single extra rAF retry only closes the one-frame example; it can lose the same wakeup if zero persists beyond that retry and restoration again occurs before an observer delivery. A continuous rAF paint loop is unnecessarily expensive, especially if the other Canvas is already current. A style MutationObserver alone would couple recovery to particular style/class mutation locations. Bounded-cadence size-only checks give a simpler general fallback, provided they stop at the lifecycle boundaries.

Repair follow-up: zero-size surfaces now remain in waitingForSize, with one identity-guarded100ms size-only retry timer. Positive size goes through ordinary coalesced requestDraw; zero size issues no Canvas commands. Cancellation covers hidden/disposal, and disabling comparison removes its surface. Both engines pass the same native coalescing counterexample with no ResizeObserver deliveries: old count2/revision1 becomes count3/revision2/step1 and PNG changes. The new size-wait-lifecycle harness passes all11 assertions per engine, including an obsolete timer forced after its replacement is queued, current-main/reference no-repaint during zero, at most one timer, hidden/disable/dispose cancellation and forcibly invoked obsolete timer callbacks. Prior pixel11, extended22 and dashed-stroke exception cases also pass in both engines on the new source;1517 rational comparisons still agree.

Current independent judgment: P2 PASS; P3 scoped PASS after this repair; overall independent PARTIAL. Limited merge recommendation YES only if final HEAD fingerprints match and required final CI succeeds. The4038c87 CI failure remains failed history; this local repair result does not claim the new CI has passed or establish Linux failure chronology. No merge operation performed.

Recorded: 2026-11-04 JST.
