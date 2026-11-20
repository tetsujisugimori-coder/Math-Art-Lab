# Stage V bounded hypotheses

|Hypothesis|Verdict|Evidence/limit|
|---|---|---|
|Tracing is necessary for old-context capture timeout|REJECTED in local cohort|OFF2 and ON2 both timeout. No universal distributional claim.|
|Trace treatment changes acquisition success here|UNKNOWN / no outcome change observed|Current OFF2/ON2 succeed; old OFF2/ON2 fail. Calibration/identity RPCs are part of ON.|
|Explicit layout/readback is necessary for primary failure|REJECTED in observed primary conditions|Neither is sent before capture; all4 old captures timeout. Internal browser work is not excluded.|
|Internal readback markers are the sole timeout cause|REJECTED in auxiliary cohort|Old unmarked2 also timeout; Tasks still last about6.5s.|
|The readback path includes command-buffer completion waiting|SUPPORTED, limited localization|Named renderer scopes, exact-revision synchronous branch and overlapping GPU service scope. No kernel causal allocation.|
|Heavy renderer JavaScript CPU alone explains the long auxiliary Task|Not supported by observed full-Task CPU|About8–9ms CPU versus6.5–6.7s wall; other-thread work/waits not allocated.|
|A specific GPU backend/native IPC/OS mechanism is the root cause|UNKNOWN|No direct scheduler/presentation/cause-specific observation. Process/event overlap is insufficient.|
|The original1249ms and later400ms samples share this cause|UNKNOWN|Different workload/clock/sample; no linking evidence.|

Stop after the fixed8+6 per available environment. No extra local trials. Do not adopt worker/offscreen/cache/API changes. Next separate plan may target the specific copy-result/readback service completion boundary with instrumentation OFF controls and source-matched events, if approved; do not extend this cohort or infer a wait from missing trace events.
