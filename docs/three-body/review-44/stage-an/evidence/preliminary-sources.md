# Stage AN independent preliminary findings

Independent reviewer: an_independent. AM baseline dff9bcdbaad05a9e5a37514cfc48a14e7a332a03 / ba461a8d7214216e4febff3928f65fc7d0a2a599. The review concerns design and pure contracts. No physical API was called.

## Microsoft API scope

- [CreateJobObjectW](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-createjobobjectw) may return an existing named object with ERROR_ALREADY_EXISTS. Binding to a fresh Job is an independent condition. Associated processes share session.
- [SetInformationJobObject](https://learn.microsoft.com/en-us/windows/win32/api/jobapi2/nf-jobapi2-setinformationjobobject) requires JOB_OBJECT_SET_ATTRIBUTES. Limit setup receipt differs from creation or assignment receipts.
- [InitializeProcThreadAttributeList](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-initializeprocthreadattributelist) documents the expected error on NULL buffer size probe. Successful initialization and attribute lifetimes are separate.
- [UpdateProcThreadAttribute](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute) documents JOB_LIST order and support from Windows 10 / Windows Server 2016, HANDLE_LIST inheritance prerequisites and attribute value lifetime. This interface leaves creator-loss rollback unproven for the chosen kernel.
- [CreateProcessW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw) requires the extended startup flag with STARTUPINFOEX. Success can precede completion of initialization. A missing return leaves child existence UNKNOWN.
- [Creation flags](https://learn.microsoft.com/en-us/windows/win32/procthread/process-creation-flags) define CREATE_SUSPENDED for the primary thread. No creator-death rollback guarantee is stated there.
- [IsProcessInJob](https://learn.microsoft.com/en-us/windows/win32/api/jobapi/nf-jobapi-isprocessinjob) separates successful query from positive membership. A null Job queries any Job and cannot identify intended Job J.
- [ResumeThread](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-resumethread) returns the previous suspend count or DWORD(-1). Expected 1 reaches zero. A 0 result identifies an already-unsuspended thread and >1 leaves it suspended. Preserve unexpected result and block progression without retry.
- [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects) documents KILL_ON_JOB_CLOSE conditional on the last Job handle closing and the processes being associated. Creator hang, creator destruction, duplicated/inherited handle and unverified close require separate observations.
- [Nested Jobs](https://learn.microsoft.com/en-us/windows/win32/procthread/nested-jobs) documents hierarchy restrictions including UI limits. Exact guest OS and ambient Job constraints are still required.
- [WaitForSingleObject](https://learn.microsoft.com/en-us/windows/win32/api/synchapi/nf-synchapi-waitforsingleobject) documents exclusion of time in low-power states from Windows 8+ timeout. Guest waits alone cannot establish a wall ceiling. Closing a handle while a wait is pending has undefined behavior.

## Falsification focus

R enrollment/persistence/readback must prove service and management identity, generation/epoch and nonce ledger. VM rollback must leave external ledger state intact. Send, accept, VM power, guest EXIT, release and independently stored final evidence require separate observations. Management network or hypervisor failure can prevent confirmed stop and final readback. R failure retains NONE. Manual action supplies no finite automatic guarantee.

Creator loss after CreateProcess entry and before an attributable handle return leaves child existence UNKNOWN. Missing membership cannot be replaced by intended flags. Before-call absence needs positive order evidence. Recorded membership belongs to that incarnation and observation time. Resume in flight remains indeterminate until corroborated. A signaled process handle does not establish release of all resources. Preserve confirmed prior evidence, keep unknown residuals and block progression when predicates fail.

90-second accounting needs a single campaign elapsed authority spanning preparation through final readback, bound to boot/epoch and with defined suspend semantics. Local guest/R/management measures aid diagnosis but cannot be subtracted across domains. Counterexamples to a worst-case guarantee include frozen guest clock, R failure, saturated stop queue, asynchronously accepted stop with delayed polling, lost IPC EXIT and indefinite write/readback delay. Eight 10-second ceilings sum to 80 seconds. The arithmetic does not bound overhead. Actual budget remains NOT_TESTED.
