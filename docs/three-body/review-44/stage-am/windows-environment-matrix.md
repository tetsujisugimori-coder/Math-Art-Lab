# Environment acquisition matrix
| Field | Current static development tooling | Future dedicated guest/R environment |
|---|---|---|
|Windows edition/build/UBR/architecture|read-only tooling snapshot in environment.json; not isolated proof|UNKNOWN / NOT_OBTAINED|
|VM image source/SHA, UUID, generation|not a qualification environment|UNKNOWN / NOT_OBTAINED|
|hypervisor UUID/version, guest/host boundary|no VM operation|UNKNOWN|
|M account/token/ACL/Job ancestors|not queried by experiment|UNKNOWN|
|R station, owner/operator/recovery principal|not provisioned|UNKNOWN|
|VM-scoped endpoint/ACL/trust/secret store|not authenticated or changed|UNKNOWN|
|SDK/compiler/CRT/native EXE/ABI|no native binary exists|UNKNOWN / NOT_IMPLEMENTED|
|Node/Vitest/Vite/package-lock|actual current paths/size/SHA in environment.json|UNKNOWN, no substitution|
|IPC endpoint and authenticated peer|design only|UNKNOWN / NOT_TESTED|
|clock provider|M QPC/QPF and GetProcessTimes candidates; Node P/W performance.now/process.cpuUsage|R UNKNOWN, native capture NOT_TESTED|
|cleanup/verified stop|contract only|NOT_TESTED|
Read-only Node executable/lock and dependency package metadata do not identify historical measurement runtime. Current host is never approved as experiment VM. VM creation/start/stop, account/ACL/hypervisor changes and credentials remain prohibited.
