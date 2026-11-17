# AK01 external recovery evidence and falsification

| Condition | Required original evidence and independent confirmer | Falsifier |
|---|---|---|
| R registered before guest | pre-start record including exact VM, image, generation, epoch and rights, checked by independent controller auditor | start precedes receipt, enrollment missing |
| Fault independence | dependency map and isolated originals for M, R, power/network/host/hypervisor, checked by infrastructure reviewer | shared fault removes both observation and stop |
| Durable registry | external committed record, raw bytes/hash, consumed nonce ledger, same generation/epoch, checked by storage auditor | ledger rolled back with guest, ID/nonce reused |
| Independent retrieval | reader account distinct from writer, original bytes and receipt re-acquisition | same-process memory or missing raw |
| Detection | R-side monotonic heartbeat receive sequence and detection receipt, independently checked by trace reviewer | fabricated sample, clock loss or lost heartbeat classified as guaranteed exit |
| STOP and request acceptance | nonce/target binding, send and API response originals, independently checked by management auditor | wrong target, old epoch, accepted request used as final state |
| VM actually stopped | independently retrieved fresh state for same immutable VM generation after request | stale or ambiguous power state |
| Guest exit | retained process birth/handle and observed exit evidence, checked by native reviewer | VM stop used alone as guest EXIT |
| Resource release | separate ownership/close report checked by resource reviewer | inferred from request/exit alone |
| Evidence saved | bounded commit and exact independent reread, reviewer outside writer failure domain | partial, stale or missing original bytes |

All evidence rows are NOT_OBTAINED for the future environment. Missing prerequisites block launch and keep AK01 guarantee NONE. M failure, R failure, management network failure, hypervisor failure and rollback are separate failure codes. M death differs from hang: its timers may cease or its handles remain live. R fault has no independent proven automatic recovery path. Guest rollback invalidates earlier registration/command generation and does not reset the external nonce ledger. Safe recovery must not depend on indefinitely available storage. Manual escalation to a separately authorized console operator is a future runbook with exact identity and independent receipts. Manual response is outside finite automatic recovery.
