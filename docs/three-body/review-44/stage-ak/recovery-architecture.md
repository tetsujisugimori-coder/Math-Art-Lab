# P2-AK01 OPEN: external recovery proposal

Proposed fault domains: W/P/C in guest Job J; M outside J in the same guest; R on a dedicated management station outside the guest OS, using an authenticated hypervisor-management endpoint. Human operator H is a separate manual role. R is not a timer/IPC task in M. M hang, guest kernel hang and guest network loss therefore need not prevent R from attempting an operation, but the management service, hypervisor/host and R itself can still fail. No R implementation, station identity, owner, credentials, management ACL, independent console or actual hypervisor exists as qualified evidence here. Guarantee NONE, qualification NO.

R would start before any guest dispatch, enroll its own session clock and immutable VM UUID/hypervisor UUID/imageSHA/generation plus trial capability, and allow only that disposable VM. Guest process handles cannot be used from outside the VM. Job/worker incarnation proof remains guest-local; an emergency VM power action does not prove each guest process exit or handle release. No PID/name/global host kill is a fallback. Mutually authenticated management identity, a VM-scoped least-privilege role and replay-protected command nonce are prerequisites, not achieved by JSON equality. Only reviewed start/stop authority may provision R; this work provisions nothing.

| Event | Required separate evidence | Failure policy |
|---|---|---|
| M heartbeat expiry or hard ceiling | R own clock, enrolled session/epoch, failed heartbeat and independent status read | STOP progression; do not rely on M to send |
| Stop requested / accepted | authenticated management request ID and response bytes | success means request acceptance only |
| VM actually stopped | fresh independent hypervisor status/epoch, not stale IPC ACK | absent confirmation UNKNOWN/NOT_OBTAINED |
| Guest exits / job membership | retained guest native facts if obtained | forced VM loss may make these NOT_OBTAINED |
| Resource release | hypervisor VM resource state and guest handle closure separately | neither inferred from stop request |
| Evidence durable | R external append-only raw ledger and independently re-read receipt | guest buffer loss remains missing |
| R/management/host failure | independent actor/console status | automatic guarantee NONE, block all remaining |

Unapproved finite milestones on R's own clock: qualification detect/request/exit/release/persist by5000/6000/8000/9000/10000ms; AH proposal25000/26000/28000/29000/30000ms. They reserve time within existing ceilings, not after them; no grace is added. They are **not adopted execution settings**. R starts budget before guest dispatch; causal handshakes do not make R/guest clocks comparable. Management latency, start overhead and forced-power semantics are NOT_TESTED; missed milestone fails rather than extending. Total90000 and first-failure blocking remain unchanged. A separately approved implementation/plan must establish whether these candidate deadlines can fit without altering AH semantics.

Human recovery: designate actual VM owner/recovery operator, immutable target identity, independent console access, permission and a rehearsed disposable-VM-specific procedure before any experiment. H confirms target and blocks scheduling, preserves externally available evidence, and performs only an independently authorized action on that VM. Unknown ownership means no arbitrary stop. Human response has no proven finite deadline, and console/host loss can defeat it. H does not constitute automatic recovery. VM rollback must never overwrite externally acquired raw/receipt; new generation must get new namespace and old guest-volatile gaps remain missing.

Closure requires implemented R/management route, actual identity/ACL/owners, independent failure-domain review, bounded own-clock detection/request/exit/resource/persistence evidence and independent physical safety verification under separate authorization. A mock trace or proposed human action cannot close AK01.
