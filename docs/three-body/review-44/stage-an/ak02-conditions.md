# AK02 creation-time containment

| M lost at boundary | Child at boundary | Membership at boundary | Handle ownership, stop and residual after loss |
|---|---|---|---|
| Before Job creation | no create recorded | UNKNOWN | UNKNOWN |
| Job/limits prepared | no create recorded | UNKNOWN | UNKNOWN |
| CreateProcess in progress | UNKNOWN | UNKNOWN | UNKNOWN |
| CreateProcess returned | original return/child identity required | UNKNOWN | UNKNOWN |
| Before membership query | child originally recorded | UNKNOWN | UNKNOWN |
| After membership before resume | child originally recorded | positive exact-Job receipt required | UNKNOWN |
| During resume | child originally recorded | prior receipt only | UNKNOWN |
| After resume before exit | child originally recorded | prior receipt only | UNKNOWN |

A boundary fact is historical evidence, not surviving state. Retain child birth/handle provenance and the exact Job/VM identity, refuse membership/exit/release by PID/handle value alone. Require independent exit and resource release receipts. A creator-loss attempt with missing originals remains UNKNOWN and blocks remaining slots.

Use an empty fresh Job with an audited security descriptor. Confirm actual returned Job identity and SetInformationJobObject limits/permissions before any future creation. InitializeProcThreadAttributeList sizing can report expected failure. Verify actual initialization and UpdateProcThreadAttribute with JOB_LIST, stable list storage and STARTUPINFOEX + EXTENDED_STARTUPINFO_PRESENT + CREATE_SUSPENDED. Verify API result and specific Job membership output separately, require retained live process/thread identity, and record ResumeThread previous count 1 on the approved path. Count zero, greater than one or failure keeps remaining work blocked; no retries. No post-create Assign fallback.

KILL_ON_JOB_CLOSE requires the final handle closure. Check inheritance, duplicates, aliases, owners and close receipts; nested hierarchy and inherited limits must be compatible with the exact guest and rights. A successful creation return is not evidence of complete initialization or creator-death rollback. Before any future generation, independently verify the platform-specific atomicity/no-orphan prerequisites, including the in-call creator-loss uncertainty. If unsupported or unproven, refuse generation. Physical state UNKNOWN; no Windows API tests were run.

Microsoft sources [CreateJobObjectW](https://learn.microsoft.com/windows/win32/api/jobapi2/nf-jobapi2-createjobobjectw), [SetInformationJobObject](https://learn.microsoft.com/windows/win32/api/jobapi2/nf-jobapi2-setinformationjobobject), [InitializeProcThreadAttributeList](https://learn.microsoft.com/windows/win32/api/processthreadsapi/nf-processthreadsapi-initializeprocthreadattributelist), [UpdateProcThreadAttribute and JOB_LIST](https://learn.microsoft.com/en-us/windows/win32/api/processthreadsapi/nf-processthreadsapi-updateprocthreadattribute), [CreateProcessW](https://learn.microsoft.com/windows/win32/api/processthreadsapi/nf-processthreadsapi-createprocessw), [Creation flags](https://learn.microsoft.com/windows/win32/procthread/process-creation-flags), [IsProcessInJob](https://learn.microsoft.com/windows/win32/api/jobapi/nf-jobapi-isprocessinjob), [ResumeThread](https://learn.microsoft.com/windows/win32/api/processthreadsapi/nf-processthreadsapi-resumethread), [Job Objects](https://learn.microsoft.com/en-us/windows/win32/procthread/job-objects), [Nested Jobs](https://learn.microsoft.com/en-us/windows/win32/procthread/nested-jobs). Exact fixed-guest comparison remains blocked by missing environment originals.
