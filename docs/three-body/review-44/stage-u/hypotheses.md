# Stage U hypotheses and stopping decision

This is a fixed two-sample-per-cell CDP experiment, not a performance-tail certification. See protocol.md and results.md. Stage P/Q/R/S/T observations remain unchanged.

|Hypothesis|Verdict in this cohort|Evidence and limits|
|---|---|---|
|Explicit layout request is itself the long operation|REJECTED in the acquired local OFF/current samples; unacquired old/ON UNKNOWN|All12 sent layout requests replied in milliseconds. Four planned layout requests were blocked by the old/ON intervention. This does not rule out long Layout events inside other browser tasks.|
|Screenshot request can fail without explicit preceding layout|SUPPORTED|Old/OFF B times out twice, as does C after a fast successful layout reply. No Page.getLayoutMetrics is sent by B.|
|Preceding explicit layout changes screenshot success|UNKNOWN|Both old B/C fail and both current B/C succeed. No reproducible success interaction in these samples; no distributional guarantee with n=2.|
|Explicit readback remedies the old-context failure|REJECTED as an observed remedy here|All6 old/ON intervention Runtime requests time out before primary operations are sent. This is not proof that getImageData itself executed for5000ms. Current ON succeeds.|
|The context/readback paths influence the observed acquisition|SUPPORTED, limited|Old/OFF capture timeout versus current/OFF capture success; same dimensions, tape and frozen DOM frame. Successful current images have identical actual decoded bitmaps, but no old image exists for a cross-context pixel comparison.|
|A common specific native wait, GPU mechanism or OS scheduler cause explains both|UNKNOWN|No kernel trace, thread CPU, pid/tid correlation or internal browser execution interval acquired. RTT alone cannot identify it.|
|The original1249ms, later400ms tasks and these timeouts share a cause|UNKNOWN|These are different samples, APIs and measurement scales. No linking trace acquired.|

No local product candidate is adopted or benchmarked; improvement rate NOT_TESTED. The product's30% improvement/10% deterioration criteria and input budgets remain unchanged and unfulfilled. Worker/OffscreenCanvas are not introduced.

Stop after the planned24 unique local trials plus the same fixed cohort per hosted Windows/Linux environment. Preserve failures and source versions. The next smallest experiment, requiring a separate plan, is browser-internal tracing of a single old/OFF B timeout versus current/OFF B success, with instrumentation OFF controls and target/thread clock mapping. Do not enlarge this Stage U plan or infer a wait location from CDP RTT.
