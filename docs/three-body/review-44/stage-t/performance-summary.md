# Stage T performance summary

Do not compare unrelated processes, browser flags or OS results as a before/after product improvement. Each raw run records its order, options, physical step delta, browser and source hashes. Synthetic minimal runs count frames; actual-app runs count physical steps. Targeted stops can shorten windows, so their p95 values are observational rather than matched-duration improvement claims.

Initial controls: 41/41 acquired, zero math/display acquisition errors, but64 capture runs NOT_TESTED due to the new plan snapshot collision. Nine real-app anchors all exceeded an input budget; additional instrumentation OFF still reached466.3292ms T0→T1. No result is discarded.

A representative OFF Task lasted479.414ms with32.205ms thread CPU and only5.443ms union Layout/UpdateLayoutTree overlap. A phase-only Task465.514ms had36.198ms CPU and198.367ms layout overlap. These counterexamples reject a universal explanation based only on expensive Layout CPU or only on instrumentation. They do not locate native waiting or OS execution delay.

Clock marks and pid/tid are retained in selected trace-attribution records. Union elapsed overlaps are clipped to the selected interval and cannot be added as independent cause contributions; event CPU is its full event CPU. Original1249ms common cause remains UNKNOWN.

Product changes0; product improvement rate NOT_TESTED. Existing scheduled p95/p99/max100/200/250ms, receive-stop20ms and stop-receipt100ms budgets remain unchanged. Final606-run CI includes three60-second repeats and five-minute playback; it is reported separately from short Stage T factors.

## Local measured windows

Local tools were uncommitted diagnostic edits atop34c4; exact tool/source snapshots and plan SHA identify each run. These are not stock34c4 product-before measurements. No product after-version exists.

| App anchor group | Requests | T0→T1 p50 / p95 / p99 / max (ms) | T-1→T1 p95 / p99 / max (ms) |
|---|---:|---|---|
| Initial (capture suite unavailable) | 804 | 6.4447 /349.8010 /444.8994 /466.3292 | 394.5444 /454.6422 /474.4444 |
| Re-execution | 1088 | 12.5263 /354.2244 /439.6770 /471.8540 | 405.8446 /464.4589 /493.7064 |

These are different targeted observation windows, not an improvement comparison. Both violate the original planned-input budgets. All individual runs and step deltas remain available.

Additional native evidence: one Task471.720ms/CPU33.581ms contains a193.9ms `stroke` and58.9ms `fillText` interval with zero Layout/GC overlap in those native intervals. Another geometry interval239.3ms overlaps239.025ms of layout. Thus one geometry cache cannot be justified as a universal remedy. Enclosing FunctionCall CPU belongs to the whole call, not to an individual native wrapper. No recorded wait event overlapped these native samples; unrecorded native/OS waiting remains UNKNOWN.

The final four-run stationary/moving pair produced late input in both states (max355.4ms, paint max15.4ms). Earlier short minimal trials were mostly fast. Duration, order and session state differ, so this is a counterexample to a bitmap-change-only explanation, not proof of a cumulative-session or OS cause. No further exploratory loop was run.

Dedicated sender local verification:18 actual-app stops, post-receive extra steps0, atomic A/B and no old timer/rAF. Full before/after clock envelopes confirm9 HIT;2 TARGET_MISS;7 NOT_TESTED (6 instrumentation-OFF targets and1 nominal HIT not confirmed by the full clock envelope). Preserve the failed strict-verifier log. Stop T1→T3 max1.8ms and T3→T4 max13.1ms; input delivery remains over budget. T4 is command receipt, not GPU presentation.
