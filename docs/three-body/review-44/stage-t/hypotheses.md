# Stage T hypotheses

| Hypothesis | Existing evidence | Stage T control | Current causal status |
|---|---|---|---|
| Pure JavaScript CPU explains every ~400ms interval | S Task467.957ms vs CPU39.008ms; Layout373.296ms vs CPU5.380ms | App native/phase/off and marked trace tasks | Not supported as a sole explanation; specific wait UNKNOWN |
| GC alone explains every long interval | Same-main GC overlap absent in the quoted S sample | Same-clock GC union overlap | Not supported as a sole explanation |
| Geometry read / forced layout participates | Large Layout wall interval within geometry observation | Geometry ON/OFF, DOM ON/OFF, trace/native instrumentation controls | Participation is observational; native mechanism UNKNOWN |
| Canvas resource/command path contributes | P/Q/S context and launch-path controls differ | Resources versus spacers; bitmap retention versus command replay | Limited path dependence SUPPORTED; mechanism UNKNOWN |
| Screenshot timeout is only Playwright waiting | Prior direct CDP errors also present | Playwright / surface / view, interleaved | Sole Playwright explanation insufficient; each API must be judged separately |
| Readback/metrics/trace order changes capture | Previously mixed outcomes | One-factor pairs, same dimensions/tape, pixel verification | UNKNOWN until measured; success alone is not equivalence |
| OS scheduler/native synchronization/GPU presentation is the specific cause | No kernel scheduling or GPU presentation evidence | Permission check only; no escalation/settings changes | UNKNOWN / NOT_TESTED |
| Additional instrumentation alone causes all spikes | Prior OFF samples also long | Instrument, trace and additional-CDP controls | Sole-instrument cause previously REJECTED; influence can still exist |

Wall minus thread CPU is not assigned to a wait mechanism. Parent/child categories are not additive. Cross-OS speed differences are not causal controls. Original1249ms sample has no proven same cause.
