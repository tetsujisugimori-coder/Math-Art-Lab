# Stage V local fixed-cohort results

Overall PARTIAL; product changes0; improvement NOT_TESTED; merge NO. Sole Windows cohort: primary8/8 completed,4 capture timeout; independent auxiliary6/6 completed,4 Runtime timeout; no unexecuted trials. All10 requested traces acquired and calibrated, evidence records verified, acceptance NOT_ACCEPTED. No local browser trials were repeated.

Chromium145.0.7632.6 revision47e20adcc15fc15f01825aa17e570c8f5492ac0f, Playwright1.58.2, Node24.20.0, Windows10.0.26300, i7-14650HX. SwiftShader/viewport/DPR/backing/tape remain fixed as in protocol. Readback context is a name, not an explicit primary readback.

|Primary context|Trace|Replies ms (two samples)|Outcome|
|---|---|---|---|
|default|OFF|NOT_OBTAINED / NOT_OBTAINED|2 timeout|
|default|ON|NOT_OBTAINED / NOT_OBTAINED|2 timeout|
|readback|OFF|202.576 /203.248|2 PASS|
|readback|ON|197.062 /202.492|2 PASS|

The configured5000ms timeout was not extended. Deadline callbacks were observed at6174.829/5000.247ms in default/OFF and5023.311/5010.809ms in default/ON. This is delayed deadline observation, not a measured response or browser execution time. The extra scheduling delay has no assigned OS/GC/native cause. Two samples cannot establish tail guarantees or a tracing-overhead improvement rate. ON includes trace startup and calibration/identity RPCs; OFF does not.

All4 acquired current-context images are2560x1800 and match the2 actual Canvas bitmaps with0 different channels. Failed captures have no image/pixel verdict. Frozen frame30 state is unchanged where acquired; this is not live stop-step evidence.

Auxiliary default/marked2 and default/unmarked2 timed out; current/marked2 replied in6.284/2.947ms. Marked default handlers emit start, both getImageData before/after markers and return. First-call marker intervals are6728.525ms and6505.681ms. These finish after the configured request deadline and are not invented harness reply times. Default unmarked main Tasks also span6478.229/6662.491ms; internal-marker instrumentation is not a necessary cause of these observed timeouts.

The initial local recorder retained timed-wrapper boundaries and discarded late replies from its returned deadline result. Exact local send invocation and late harness receive time are NOT_OBTAINED. Its raw/source snapshots remain unchanged. A bounded harness-only correction for hosted cohorts additionally records actual CDPSession.send invocation and protocol resolve/reject callback, kind and phase. A late reply or cleanup rejection never turns5000ms TIMEOUT into PASS. No local cohort is repeated to replace the missing information.
