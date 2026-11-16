# Recovery safety: unresolved, start NO

| Failure | Required future behavior/evidence | Current guarantee |
|---|---|---|
| W/P loop unresponsive | M independent local clock and own ledger, authenticated enrolled job, bounded stop and handle-based exit proof | NOT_TESTED |
| M death | last valid job handle closes under verified KILL_ON_JOB_CLOSE and validated inheritance/ownership; separate exit facts | CONDITIONAL /NOT_TESTED |
| M hang | a different execution actor would have to enforce recovery independently; own M timer cannot run | NONE |
| Job assignment denied /nested incompatibility | refuse resume; confirm containment or proven suspended-child cleanup | NOT_TESTED, BLOCKED |
| creation identity/PID reuse/foreign peer | refuse stop; preserve original ledger and quarantine foreign response | pure classification only |
| stop send rejected /ACK absent | record SEND_FAILED/REJECTED; no inference of exit | actual native path NOT_IMPLEMENTED |
| exit unconfirmed | UNCONFIRMED, remaining slots BLOCKED; late reply separate | pure contract only |
| save/capacity/receipt/buffer/IPC failure | failed observation/evidence, keep prior FAIL and partial bytes; stop path independent of writes | runtime NOT_TESTED |
| host/kernel/VM unresponsive | external authority and target identity required; no internal timer guarantee | NOT_OBTAINED |

No external watchdog is implemented or installed. A future watchdog would require a distinct actor outside the hung monitor (potentially outside the VM), independently enrolled VM/process identity and non-shared failure domain, least privilege, authenticated private capability, independent wall deadline within approved ceilings, and an original external ledger proving request/actual exit/resource release. Its actor, privileges, API/implementation, timing, failure response and immutable evidence are presently NOT_OBTAINED. Designing such an actor is a separate reviewed implementation stage; no timeout extension is silently authorized.

Human recovery is separate: before any qualification, name a real operator, verify a disposable VM's immutable identity and ownership, ensure an independently reachable console and a rehearsed isolated-target recovery procedure. If M becomes unresponsive, stop scheduling, preserve what can be read without delaying safety, confirm the enrolled target at the independent console, and use only the specifically approved recovery path for that VM/process group. Unknown identity means no arbitrary process stop; escalate to the designated environment owner. No image/owner/console/procedure has been demonstrated here. Human response has no proven finite deadline and is not an automatic stopping guarantee. Therefore neither human intentions nor a proposed watchdog permits the hang fixture to start.

Stop request, send outcome, ACK, actual exit proof, release and persistence are independent. No global process kill, executable-name kill or arbitrary PID tree traversal is permitted. A monitor may not hold a save lock while determining stop, and writers must use bounded queues/time; force termination may lose unflushed bytes, which remain NOT_OBTAINED. Exactly how this is enforced is deferred to real implementation and qualification; mock cannot supply it.
