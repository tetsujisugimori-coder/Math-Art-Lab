# Bounded hypothesis judgments

|Hypothesis|Judgment|Evidence/limit|
|---|---|---|
|Internal trace is necessary for every timeout|REJECTED within local cohort|old OFF2 also timeout|
|Earlier trace startup eliminates old timeout|REJECTED within local cohort|old early2 timeout; all12 fixed trials retained|
|Pre-frame30 work is now observable|SUPPORTED instrumentation coverage only|early start ack before navigation, navigation/script/render events and frozen state; no unique outstanding-work ownership|
|Delayed GPU task path accompanies pending capture|SUPPORTED limited source-consistent path|observed source_location/2ms helper and repeated GPU tasks; individual screenshot/poll ownership and root mechanism UNKNOWN|
|Trace.end itself causes late reply|UNKNOWN|late ON replies follow end request; OFF cleanup/observation opportunity differs|
|Primary capture and V Runtime readback share one exact wait cause|UNKNOWN|no direct request/target/flow binding; different operations|
|Old/current contexts yield identical bitmap|REJECTED for obtained local images|actual decoded RGBA differs; old late Canvas source check unavailable|
|Exact native/OS/GPU mechanism or first1249ms/prior400ms common cause|UNKNOWN|no kernel scheduler/GPU presentation or unique endpoint chain|
|T4 can include late reply/rejection|REJECTED diagnostic contract|baseline3 RED, corrected separate callback fields and negative tests|
|Raw-byte source identity can be replaced by newline normalization|REJECTED diagnostic contract|separate raw SHA/blob and logical digest tests; legacy runtime references stay UNKNOWN|

No product candidate/Worker/OffscreenCanvas/cache/API change adopted. No improvement rate, performance budget attainment or p95/tail guarantee asserted.
