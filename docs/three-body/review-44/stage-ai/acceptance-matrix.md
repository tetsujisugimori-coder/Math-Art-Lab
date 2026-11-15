# Finite acceptance matrix

All mock results are synthetic; native containment, liveness and termination require the separately authorized qualification campaign. Required artifacts are original identity/channel/exit/receipt records; synthetic records are never historical originals.

| ID | Component | Fault | Expected lanes | Raw | Method | Criterion | Unmet |
|---|---|---|---|---|---|---|---|
| AI-01 | classification | normal | PASS / COMPLETE synthetic only | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-02 | classification | runner-fail-zero | FAIL; exit0 contradiction | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-03 | classification | fail-monitor | FAIL / observation FAIL | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-04 | classification | fail-save | FAIL / evidence incomplete | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-05 | classification | timeout-before | BEFORE_BODY_BEGIN | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-06 | classification | timeout-during | BETWEEN_BODY_BEGIN_AND_END | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-07 | classification | timeout-after | AFTER_BODY_END | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-08 | classification | end-missing | completion UNKNOWN | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-09 | classification | body-throw | FAIL; throw evidence | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-10 | classification | duplicate | INVALID evidence | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-11 | classification | reverse | INVALID evidence | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-12 | classification | domain | INVALID domain | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-13 | verified-stop and collector | pid-reuse | REJECT identity | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-14 | verified-stop and collector | foreign-trial | REJECT trial | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-15 | verified-stop and collector | stale-reply | REJECT incarnation/sequence | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-16 | verified-stop and collector | worker-silent | BLOCKED; stop request only | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-17 | verified-stop and collector | parent-silent | BLOCKED; independent monitor required | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-18 | verified-stop and collector | monitor-failed | BLOCKED; guarantee NONE if hung | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-19 | verified-stop and collector | stop-send-failed | SEND_FAILED; exit NOT_OBTAINED | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-20 | verified-stop and collector | exit-missing | UNCONFIRMED; BLOCKED | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-21 | verified-stop and collector | save-interrupted | FAILED; raw missing | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-22 | verified-stop and collector | capacity | FAILED; stop independent | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-23 | verified-stop and collector | receipt | INCOMPLETE; BLOCKED | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-24 | verified-stop and collector | buffer | FAIL; remaining BLOCKED | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-25 | verified-stop and collector | communication | FAIL; remaining BLOCKED | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
| AI-26 | verified-stop and collector | stop-refused | REJECTED; exit unknown | identity ledger + event bytes + receipt + exit proof | SYNTHETIC_ONLY | exact expected lanes; no physical PASS promotion | BLOCKED |
