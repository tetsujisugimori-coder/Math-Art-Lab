# Finite plan and worst-case review target

Retain original-off/on OFF→ON, original 5000ms, parent 30000ms and campaign 90000ms. Qualification order normal → worker-silent → parent-silent → monitor-hang → stop-send-failed → exit-missing → save-interrupted → PID-reuse. Each at most 10000ms end to end. Retry and replacement zero, no reorder. First failure blocks every subsequent slot. If a control intentionally shows a fault, preserve that outcome and any unexecuted coverage.

| Cost | Primary observation and clock | Current estimate |
|---|---|---|
| VM prep / R register | independent campaign origin through setup and verified enrollment, same monotonic source | NOT_TESTED |
| process creation | M QPC bounded request to retained identity and membership | NOT_TESTED |
| heartbeat detection | R receive-clock last valid sample to detection | NOT_TESTED |
| external STOP send | R send/accept observations within its domain | NOT_TESTED |
| independent stop confirmation | external campaign observer request receipt to fresh power state receipt | NOT_TESTED |
| exit confirmation | retained-handle observer own monotonic endpoints and generation | NOT_TESTED |
| save and independent readback | campaign observer storage request to independently verified receipt | NOT_TESTED |
| cleanup and final check | campaign observer captured outcomes to verified final boundary | NOT_TESTED |

One independent campaign wall clock brackets the first preparation through final confirmation, including interruptions, export and readback. Each slot has separately bound start/end through its required cleanup, with shared setup/final work also inside total. R/M/Node/campaign boot epochs and wall/CPU domains stay separate. Record local spans with original units and frequency, link observations by authenticated IDs. Subtract only endpoints from the same bound monotonic epoch. Missing or reversed clocks block, no zero-fill, slack or grace inference. A guest wait timeout may exclude low-power time ([Microsoft WaitForSingleObject](https://learn.microsoft.com/windows/win32/api/synchapi/nf-synchapi-waitforsingleobject)); this is not the campaign clock.

The accounting inequality is shared preparation + ordered slot envelopes + shared final work plus any uncovered gaps ≤ 90000ms on the campaign clock. Costs nested in an envelope are not summed again. Eight times 10000ms is an upper bound on slot envelopes only. The arithmetic cannot bound a stalled control plane, R failure, missing EXIT, storage outage or clock outage. Each is a falsification path for unconditional safe completion. There are no measured durations or supported worst-case bounds. Feasibility NOT_TESTED and QUALIFICATION_BLOCKED. The pure budget fixture is an artificial campaign, with interval consistency/refusal checks and no real assurance.
