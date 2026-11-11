# Fixed local12, no performance improvement claim

|Context|Trace start|Two normal RTT samples ms|Timeout|
|---|---|---|---|
|default|off|TIMEOUT / TIMEOUT|2/2|
|default|late|TIMEOUT / TIMEOUT|2/2|
|default|early|TIMEOUT / TIMEOUT|2/2|
|readback|off|198.065 / 204.804|0/2|
|readback|late|191.837 / 203.296|0/2|
|readback|early|200.234 / 188.233|0/2|

T0 is send invocation, T4 is normal within-deadline protocol reply. TIMEOUT cells have no RTT endpoint; configured budget remains5000ms and actual deadline observation is retained separately. All8 trace streams acquired/calibrated, early4 starts acknowledged before navigation. Old trace ON4 deliver PNG payloads after deadline; original TIMEOUT remains FAIL, late payload timestamps are not T4. OFF2 end in cleanup rejection, not images. Current6 normal images pass their actual Canvas checks. n2/cell is descriptive, not a p95/tail guarantee, causal tracing effect or performance budget certification.

Trace treatment includes calibration/category/identity RPCs. Tracing start and waits change work timing; machine/environment differences and source-bound diagnostic versions must not be pooled into product improvement percentages. Product changes0, improvement NOT_TESTED.
