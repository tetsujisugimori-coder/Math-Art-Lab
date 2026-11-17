# Primary API references
Checked 2026-11-18 JST; all specification references, not physical validation. No API sample is executed.
- [Process creation flags](https://learn.microsoft.com/en-us/windows/win32/procthread/process-creation-flags): suspended primary thread; extended startup info. Not a complete creator-death rollback guarantee.
- [UpdateProcThreadAttribute](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute): JOB_LIST ordered job assignment supported Win10+/Server2016+; HANDLE_LIST requires inheritable real handles and bInheritHandles TRUE.
- [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects): breakaway, queries and final-handle dependent kill-on-close; general notification delivery is not universal proof.
- [Nested Jobs](https://learn.microsoft.com/en-us/windows/win32/procthread/nested-jobs): valid hierarchy constraints and inherited limits.
- [CreateProcessW](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw): creation is not initialization completion.
- [IsProcessInJob](https://learn.microsoft.com/en-us/windows/win32/api/jobapi/nf-jobapi-isprocessinjob): BOOL API success separate from output membership.
- [ResumeThread](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-resumethread): prior suspend count and failure; exact use needs native proof.
OS specification coverage is kept separate from application/actual VM guarantees. The selected platform and native ABI remain UNKNOWN; no unsupported atomicity inference.
