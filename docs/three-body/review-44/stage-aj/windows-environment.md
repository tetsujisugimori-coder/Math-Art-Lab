# Candidate versus actual isolated environment

| Dependency | Obtained evidence | Qualification state |
|---|---|---|
| Node | current static v24.20.0; executable raw size93381448, SHA5c976096e04e5c2c1f091938926234cc9fbebfe9787ddd149351b3b0ecc707b5 | executable binding obtained, not exercised in isolation |
| Vitest / Vite | installed package metadata3.2.7 /7.3.7 | original Vitest not launched |
| Windows / architecture | current os.release10.0.26300 /win32 /x64 | current host, not an isolated image identity |
| Node ABI / N-API | process.versions in current-static-environment.json | bridge ABI UNKNOWN; not a substitute for a compiled addon |
| Native bridge / compiler / SDK | NOT_IMPLEMENTED /NOT_OBTAINED /NOT_OBTAINED | no binary or ABI selected/fabricated |
| Dependencies | package-lock bytes + full Git blob at accepted AI commit | install metadata is not native compatibility |
| Job hierarchy / host job restrictions | NOT_OBTAINED | no Job query or operation performed |
| Isolated VM/image / hypervisor / account / ACL | NOT_OBTAINED | no qualified sandbox exists as evidence |
| Out-of-band watchdog or operator recovery proof | NOT_OBTAINED | monitor hang guarantee NONE, start NO |

Acquisition used only read-only filesystem/Node package metadata, process.versions, process.execPath and os.release; no math/performance/stop test or Job API. Current static receipt is not historical runtime evidence or a future qualified machine receipt. Do not substitute latest Node/docs/another build for the candidate. Before any separately approved qualification, independently hash raw Node/native/compiler dependencies and image, size, path, signed artifact provenance, exact OS revision/architecture, startup environment, lock and source snapshot. Record module ABI and compiler/runtime/SDK; compatibility remains unknown until a real bridge exists.

Proposed isolated target is a disposable dedicated Windows VM, not this developer host. VM image/hash, VM identity, hypervisor, least-privilege account, disabled unrelated workload/network and external console owner must be separately fixed and reviewed. Their present identities are null/NOT_OBTAINED. M lives outside J but within that VM; P/C/W live inside J. This topology alone cannot recover a hung M or hung guest/kernel.

Future native admission must verify CREATE_SUSPENDED -> assign verified job -> confirm membership -> resume; retain handles/creation identities, forbid breakaway and job-handle inheritance, inspect actual nested-job constraints and owner ACLs. M must hold a unique non-inherited job handle with the rights required for its operations; query/synchronization/assignment/termination rights are subject to actual native design and least-privilege review. Failure during enrollment leaves a suspended process requiring separately proven cleanup; it must not be forgotten, resumed uncontained or killed by PID/name fallback. Assignment-before-resume does not itself eliminate a creator-death race: unresolved preassignment orphan recovery is another start blocker.

Primary design dependencies checked2026-11-16: [AssignProcessToJobObject](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-assignprocesstojobobject), [Nested Jobs](https://learn.microsoft.com/en-us/windows/win32/procthread/nested-jobs), [creation flags](https://learn.microsoft.com/en-us/windows/win32/procthread/process-creation-flags), [GetProcessTimes](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-getprocesstimes), [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects). Creation FILETIME is identity evidence, not an interchangeable performance.now domain. These specifications support a proposal; none proves this host/native implementation.
