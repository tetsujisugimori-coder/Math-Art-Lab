# Enrollment and clock domains

Enrollment ledger binds session nonce, process creation identity/opaque handle incarnation, parent incarnation, role, PID, trial, target HEAD/tree, AH plan/source SHA, channel, authenticated peer and clock-origin domain. IPC authentication is a future implementation requirement, not achieved by JSON equality. PID alone never authorizes a stop. Native creation time and retained handle must be rechecked before acting; PID reuse, identity drift or unknown membership rejects the request. No name-based/process-tree-by-PID fallback.

Each role has a separate enrollment and stream; the pure reducer handles one enrolled stream. Cross-role envelope verification and aggregation remain NOT_IMPLEMENTED. Per-stream IDs/sequence/monotonic timestamps reject replay, duplicates and reverse order. Old session/trial/incarnation/channel/peer responses fail closed. Late evidence may be preserved in a separate quarantine; it cannot reopen a terminal failure or unblock a remaining slot. Real IPC credentials and freshness verification need isolated tests.

| Actor | Wall interval | CPU | Not covered |
|---|---|---|---|
| M | enrollment/budget start to its own deadline/confirmation | M process.cpuUsage microseconds | P/C/W work |
| P | request issued to own exit receipt | P process.cpuUsage microseconds | W CPU, prelaunch |
| C | coordinator local hooks only if obtained | C process CPU | worker body |
| W | body.begin to body.end; timeout decision local ordering | W process CPU; thread CPU only when supported | import/setup/cleanup outside body |

Wall clock performance.now milliseconds, domain includes process incarnation, thread and origin token. Differences require identical domain; no subtraction across M/P/C/W. process.cpuUsage is process-wide; threadCpuUsage is thread-local and optional; absent support is NOT_OBTAINED. CPU is not elapsed time. Intervals overlap and omit work; do not sum to total or allocate residual to OS/GC/JIT. See [Node24 process](https://nodejs.org/docs/latest-v24.x/api/process.html) and [perf_hooks](https://nodejs.org/docs/latest-v24.x/api/perf_hooks.html), checked 2026-11-16; native versions/host support still need qualification.

Target dependency proposal is AH's Node24.20.0/Vitest3.2.7/win32 10.0.26300 x64, forks min=max1/isolate/fileParallelism false/node. Current static installed sources are not historical runtime evidence. Worker hook availability, native bridge ABI, security permissions, OS job behavior, environment and executable SHA must match an independently approved implementation plan before any run.
